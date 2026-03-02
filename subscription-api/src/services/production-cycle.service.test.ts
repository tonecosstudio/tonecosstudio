/**
 * Production Cycle Service Tests
 * 
 * Testes unitários para o serviço de gerenciamento de ciclos de produção.
 * Foca especialmente no fluxo crítico de fechamento de ciclo com débito
 * de pedidos automáticos.
 */

import { describe, it, expect, afterEach } from '@jest/globals';
import { getPrismaClient } from '../config/database';
import {
  createProductionCycle,
  getCurrentOpenCycle,
  getCycleById,
  closeProductionCycle
} from './production-cycle.service';
import { allocateCredits } from './credit.service';

const prisma = getPrismaClient();

describe('Production Cycle Service', () => {
  // Limpa dados de teste após cada teste
  afterEach(async () => {
    await prisma.creditTransaction.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.productionCycle.deleteMany({});
    await prisma.userCredit.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.character.deleteMany({});
  });

  describe('createProductionCycle', () => {
    it('deve criar um ciclo de produção válido', async () => {
      const closeDate = new Date();
      closeDate.setDate(closeDate.getDate() + 30); // 30 dias no futuro

      const cycle = await createProductionCycle(
        'Ciclo Teste Janeiro',
        1000,
        closeDate
      );

      expect(cycle.name).toBe('Ciclo Teste Janeiro');
      expect(cycle.capacityLimit).toBe(1000);
      expect(cycle.currentCount).toBe(0);
      expect(cycle.status).toBe('open');
      expect(cycle.closeDate).toEqual(closeDate);
    });

    it('deve rejeitar nome vazio', async () => {
      const closeDate = new Date();
      closeDate.setDate(closeDate.getDate() + 30);

      await expect(
        createProductionCycle('', 1000, closeDate)
      ).rejects.toThrow('Nome do ciclo é obrigatório');
    });

    it('deve rejeitar capacidade negativa', async () => {
      const closeDate = new Date();
      closeDate.setDate(closeDate.getDate() + 30);

      await expect(
        createProductionCycle('Ciclo Teste', -100, closeDate)
      ).rejects.toThrow('Capacidade deve ser positiva');
    });

    it('deve rejeitar data de fechamento no passado', async () => {
      const closeDate = new Date();
      closeDate.setDate(closeDate.getDate() - 1); // 1 dia no passado

      await expect(
        createProductionCycle('Ciclo Teste', 1000, closeDate)
      ).rejects.toThrow('Data de fechamento deve ser no futuro');
    });
  });

  describe('getCurrentOpenCycle', () => {
    it('deve retornar o ciclo aberto atual', async () => {
      const closeDate = new Date();
      closeDate.setDate(closeDate.getDate() + 30);

      const created = await createProductionCycle(
        'Ciclo Aberto',
        1000,
        closeDate
      );

      const current = await getCurrentOpenCycle();

      expect(current).not.toBeNull();
      expect(current?.id).toBe(created.id);
      expect(current?.status).toBe('open');
    });

    it('deve retornar null se não houver ciclo aberto', async () => {
      const current = await getCurrentOpenCycle();
      expect(current).toBeNull();
    });
  });

  describe('getCycleById', () => {
    it('deve retornar ciclo por ID', async () => {
      const closeDate = new Date();
      closeDate.setDate(closeDate.getDate() + 30);

      const created = await createProductionCycle(
        'Ciclo Teste',
        1000,
        closeDate
      );

      const found = await getCycleById(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Ciclo Teste');
    });

    it('deve retornar null para ID inexistente', async () => {
      const found = await getCycleById(99999);
      expect(found).toBeNull();
    });
  });

  describe('closeProductionCycle', () => {
    it('deve fechar ciclo e confirmar pedidos com saldo suficiente', async () => {
      // Cria usuário
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      // Cria assinatura
      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          planType: 'trimestral',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          autoRenew: true
        }
      });

      // Aloca créditos suficientes
      await allocateCredits(Number(user.id), Number(subscription.id), 1000);

      // Cria ciclo
      const closeDate = new Date();
      closeDate.setDate(closeDate.getDate() + 30);
      const cycle = await createProductionCycle('Ciclo Teste', 1000, closeDate);

      // Cria personagem
      const character = await prisma.character.create({
        data: {
          name: 'Personagem Teste',
          priceCredits: 100,
          priceCash: 50.0,
          isActive: true
        }
      });

      // Cria pedido automático
      const order = await prisma.order.create({
        data: {
          userId: user.id,
          subscriptionId: subscription.id,
          productionCycleId: BigInt(cycle.id),
          orderType: 'automatic',
          status: 'pending',
          isLocked: false,
          creditsDebited: false,
          totalCredits: 100
        }
      });

      // Cria item do pedido
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          characterId: character.id,
          creditsCost: 100
        }
      });

      // Fecha o ciclo
      const result = await closeProductionCycle(cycle.id);

      // Verifica resultado
      expect(result.cycleId).toBe(cycle.id);
      expect(result.totalOrders).toBe(1);
      expect(result.confirmedOrders).toBe(1);
      expect(result.pendingOrders).toBe(0);

      // Verifica que o ciclo foi fechado
      const closedCycle = await getCycleById(cycle.id);
      expect(closedCycle?.status).toBe('closed');
      expect(closedCycle?.closedAt).not.toBeNull();

      // Verifica que o pedido foi confirmado e bloqueado
      const updatedOrder = await prisma.order.findUnique({
        where: { id: order.id }
      });
      expect(updatedOrder?.status).toBe('confirmed');
      expect(updatedOrder?.creditsDebited).toBe(true);
      expect(updatedOrder?.isLocked).toBe(true);
      expect(updatedOrder?.lockedAt).not.toBeNull();

      // Verifica que os créditos foram debitados
      const userCredits = await prisma.userCredit.findUnique({
        where: { userId: user.id }
      });
      expect(userCredits?.usedCredits).toBe(100);
      expect(userCredits?.availableCredits).toBe(900);

      // Verifica que a transação foi registrada
      const transactions = await prisma.creditTransaction.findMany({
        where: { userId: user.id, transactionType: 'debit_cycle_close' }
      });
      expect(transactions.length).toBe(1);
      expect(transactions[0]?.creditsAmount).toBe(-100);
    });

    it('deve manter pedido pendente quando saldo insuficiente', async () => {
      // Cria usuário
      const user = await prisma.user.create({
        data: {
          email: 'test2@example.com',
          name: 'Test User 2'
        }
      });

      // Cria assinatura
      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          planType: 'trimestral',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          autoRenew: true
        }
      });

      // Aloca créditos INSUFICIENTES
      await allocateCredits(Number(user.id), Number(subscription.id), 50);

      // Cria ciclo
      const closeDate = new Date();
      closeDate.setDate(closeDate.getDate() + 30);
      const cycle = await createProductionCycle('Ciclo Teste 2', 1000, closeDate);

      // Cria personagem
      const character = await prisma.character.create({
        data: {
          name: 'Personagem Teste 2',
          priceCredits: 100,
          priceCash: 50.0,
          isActive: true
        }
      });

      // Cria pedido automático
      const order = await prisma.order.create({
        data: {
          userId: user.id,
          subscriptionId: subscription.id,
          productionCycleId: BigInt(cycle.id),
          orderType: 'automatic',
          status: 'pending',
          isLocked: false,
          creditsDebited: false,
          totalCredits: 100
        }
      });

      // Cria item do pedido
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          characterId: character.id,
          creditsCost: 100
        }
      });

      // Fecha o ciclo
      const result = await closeProductionCycle(cycle.id);

      // Verifica resultado
      expect(result.cycleId).toBe(cycle.id);
      expect(result.totalOrders).toBe(1);
      expect(result.confirmedOrders).toBe(0);
      expect(result.pendingOrders).toBe(1);

      // Verifica que o pedido permanece pendente mas está bloqueado
      const updatedOrder = await prisma.order.findUnique({
        where: { id: order.id }
      });
      expect(updatedOrder?.status).toBe('pending');
      expect(updatedOrder?.creditsDebited).toBe(false);
      expect(updatedOrder?.isLocked).toBe(true);

      // Verifica que os créditos NÃO foram debitados
      const userCredits = await prisma.userCredit.findUnique({
        where: { userId: user.id }
      });
      expect(userCredits?.usedCredits).toBe(0);
      expect(userCredits?.availableCredits).toBe(50);

      // Verifica que NÃO há transação de débito
      const transactions = await prisma.creditTransaction.findMany({
        where: { userId: user.id, transactionType: 'debit_cycle_close' }
      });
      expect(transactions.length).toBe(0);
    });

    it('deve rejeitar fechamento de ciclo inexistente', async () => {
      await expect(
        closeProductionCycle(99999)
      ).rejects.toThrow('Production cycle 99999 not found');
    });

    it('deve rejeitar fechamento de ciclo já fechado', async () => {
      // Cria e fecha um ciclo
      const closeDate = new Date();
      closeDate.setDate(closeDate.getDate() + 30);
      const cycle = await createProductionCycle('Ciclo Teste', 1000, closeDate);

      // Fecha o ciclo manualmente
      await prisma.productionCycle.update({
        where: { id: BigInt(cycle.id) },
        data: { status: 'closed', closedAt: new Date() }
      });

      // Tenta fechar novamente
      await expect(
        closeProductionCycle(cycle.id)
      ).rejects.toThrow('is not open');
    });

    it('deve processar múltiplos pedidos corretamente', async () => {
      // Cria dois usuários
      const user1 = await prisma.user.create({
        data: { email: 'user1@example.com', name: 'User 1' }
      });
      const user2 = await prisma.user.create({
        data: { email: 'user2@example.com', name: 'User 2' }
      });

      // Cria assinaturas
      const sub1 = await prisma.subscription.create({
        data: {
          userId: user1.id,
          planType: 'trimestral',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          autoRenew: true
        }
      });
      const sub2 = await prisma.subscription.create({
        data: {
          userId: user2.id,
          planType: 'semestral',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          autoRenew: true
        }
      });

      // User1 tem créditos suficientes, User2 não
      await allocateCredits(Number(user1.id), Number(sub1.id), 200);
      await allocateCredits(Number(user2.id), Number(sub2.id), 50);

      // Cria ciclo
      const closeDate = new Date();
      closeDate.setDate(closeDate.getDate() + 30);
      const cycle = await createProductionCycle('Ciclo Multi', 1000, closeDate);

      // Cria personagem
      const character = await prisma.character.create({
        data: {
          name: 'Personagem Multi',
          priceCredits: 100,
          priceCash: 50.0,
          isActive: true
        }
      });

      // Cria pedidos para ambos os usuários
      const order1 = await prisma.order.create({
        data: {
          userId: user1.id,
          subscriptionId: sub1.id,
          productionCycleId: BigInt(cycle.id),
          orderType: 'automatic',
          status: 'pending',
          isLocked: false,
          creditsDebited: false,
          totalCredits: 100
        }
      });
      await prisma.orderItem.create({
        data: {
          orderId: order1.id,
          characterId: character.id,
          creditsCost: 100
        }
      });

      const order2 = await prisma.order.create({
        data: {
          userId: user2.id,
          subscriptionId: sub2.id,
          productionCycleId: BigInt(cycle.id),
          orderType: 'automatic',
          status: 'pending',
          isLocked: false,
          creditsDebited: false,
          totalCredits: 100
        }
      });
      await prisma.orderItem.create({
        data: {
          orderId: order2.id,
          characterId: character.id,
          creditsCost: 100
        }
      });

      // Fecha o ciclo
      const result = await closeProductionCycle(cycle.id);

      // Verifica resultado
      expect(result.totalOrders).toBe(2);
      expect(result.confirmedOrders).toBe(1); // Apenas user1
      expect(result.pendingOrders).toBe(1); // user2 fica pendente

      // Verifica pedido do user1 (confirmado)
      const updatedOrder1 = await prisma.order.findUnique({
        where: { id: order1.id }
      });
      expect(updatedOrder1?.status).toBe('confirmed');
      expect(updatedOrder1?.creditsDebited).toBe(true);

      // Verifica pedido do user2 (pendente)
      const updatedOrder2 = await prisma.order.findUnique({
        where: { id: order2.id }
      });
      expect(updatedOrder2?.status).toBe('pending');
      expect(updatedOrder2?.creditsDebited).toBe(false);
    });
  });
});
