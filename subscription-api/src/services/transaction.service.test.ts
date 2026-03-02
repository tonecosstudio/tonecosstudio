/**
 * Unit tests for Transaction Service
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getPrismaClient } from '../config/database';
import {
  recordTransaction,
  getTransactionHistory,
  TransactionMetadata
} from './transaction.service';
import { TransactionType } from '../models/types';

const prisma = getPrismaClient();

describe('Transaction Service', () => {
  let testUserId: number;
  let testSubscriptionId: number;

  beforeEach(async () => {
    // Cria usuário de teste
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User'
      }
    });
    testUserId = Number(user.id);

    // Cria assinatura ativa de teste
    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        planType: 'trimestral',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 dias
        nextBillingDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        autoRenew: true
      }
    });
    testSubscriptionId = Number(subscription.id);

    // Cria registro de créditos
    await prisma.userCredit.create({
      data: {
        userId: user.id,
        subscriptionId: subscription.id,
        totalCredits: 600,
        usedCredits: 0,
        availableCredits: 600,
        expiredCredits: 0
      }
    });
  });

  afterEach(async () => {
    // Limpa dados de teste
    await prisma.creditTransaction.deleteMany({
      where: { userId: BigInt(testUserId) }
    });
    await prisma.userCredit.deleteMany({
      where: { userId: BigInt(testUserId) }
    });
    await prisma.subscription.deleteMany({
      where: { userId: BigInt(testUserId) }
    });
    await prisma.user.deleteMany({
      where: { id: BigInt(testUserId) }
    });
  });

  describe('recordTransaction', () => {
    it('deve registrar transação de alocação de créditos', async () => {
      const result = await recordTransaction(
        testUserId,
        'allocation',
        600,
        { description: 'Alocação inicial - Plano Trimestral' }
      );

      expect(result).toBeDefined();
      expect(result.userId).toBe(testUserId);
      expect(result.subscriptionId).toBe(testSubscriptionId);
      expect(result.transactionType).toBe('allocation');
      expect(result.creditsAmount).toBe(600);
      expect(result.description).toBe('Alocação inicial - Plano Trimestral');
      expect(result.characterId).toBeNull();
      expect(result.orderId).toBeNull();
      expect(result.productionCycleId).toBeNull();
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('deve registrar transação de débito imediato com metadados', async () => {
      const metadata: TransactionMetadata = {
        characterId: 1,
        orderId: 1,
        description: 'Compra individual de personagem'
      };

      const result = await recordTransaction(
        testUserId,
        'debit_immediate',
        -100,
        metadata
      );

      expect(result.transactionType).toBe('debit_immediate');
      expect(result.creditsAmount).toBe(-100);
      expect(result.characterId).toBe(1);
      expect(result.orderId).toBe(1);
      expect(result.description).toBe('Compra individual de personagem');
    });

    it('deve registrar transação de débito no fechamento de ciclo', async () => {
      const metadata: TransactionMetadata = {
        characterId: 2,
        orderId: 2,
        productionCycleId: 1,
        description: 'Débito automático - Ciclo Janeiro 2024'
      };

      const result = await recordTransaction(
        testUserId,
        'debit_cycle_close',
        -150,
        metadata
      );

      expect(result.transactionType).toBe('debit_cycle_close');
      expect(result.creditsAmount).toBe(-150);
      expect(result.productionCycleId).toBe(1);
    });

    it('deve registrar transação de expiração de créditos', async () => {
      const result = await recordTransaction(
        testUserId,
        'expiration',
        -600,
        { description: 'Cancelamento com extorno' }
      );

      expect(result.transactionType).toBe('expiration');
      expect(result.creditsAmount).toBe(-600);
      expect(result.description).toBe('Cancelamento com extorno');
    });

    it('deve registrar transação de ajuste manual', async () => {
      const result = await recordTransaction(
        testUserId,
        'adjustment',
        50,
        { description: 'Ajuste manual - Compensação' }
      );

      expect(result.transactionType).toBe('adjustment');
      expect(result.creditsAmount).toBe(50);
      expect(result.description).toBe('Ajuste manual - Compensação');
    });

    it('deve lançar erro se usuário não tem assinatura ativa', async () => {
      // Cancela a assinatura
      await prisma.subscription.update({
        where: { id: BigInt(testSubscriptionId) },
        data: { status: 'cancelled' }
      });

      await expect(
        recordTransaction(testUserId, 'allocation', 600)
      ).rejects.toThrow(`No active subscription found for user ${testUserId}`);
    });

    it('deve registrar transação sem metadados opcionais', async () => {
      const result = await recordTransaction(
        testUserId,
        'allocation',
        600
      );

      expect(result.characterId).toBeNull();
      expect(result.orderId).toBeNull();
      expect(result.productionCycleId).toBeNull();
      expect(result.description).toBeNull();
    });
  });

  describe('getTransactionHistory', () => {
    beforeEach(async () => {
      // Cria múltiplas transações para testar paginação
      const transactions: Array<{
        type: TransactionType;
        amount: number;
        description: string;
      }> = [
        { type: 'allocation', amount: 600, description: 'Alocação inicial' },
        { type: 'debit_immediate', amount: -100, description: 'Compra 1' },
        { type: 'debit_immediate', amount: -150, description: 'Compra 2' },
        { type: 'debit_cycle_close', amount: -200, description: 'Débito ciclo' },
        { type: 'adjustment', amount: 50, description: 'Ajuste' }
      ];

      for (const tx of transactions) {
        await recordTransaction(testUserId, tx.type, tx.amount, {
          description: tx.description
        });
        // Pequeno delay para garantir ordem de createdAt
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    });

    it('deve retornar histórico completo sem paginação', async () => {
      const result = await getTransactionHistory(testUserId);

      expect(result.transactions).toHaveLength(5);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.perPage).toBe(20);
      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrev).toBe(false);
    });

    it('deve retornar transações ordenadas da mais recente para mais antiga', async () => {
      const result = await getTransactionHistory(testUserId);

      // Última transação criada deve ser a primeira no resultado
      expect(result.transactions[0]?.description).toBe('Ajuste');
      expect(result.transactions[4]?.description).toBe('Alocação inicial');
    });

    it('deve paginar corretamente com limit=2', async () => {
      const page1 = await getTransactionHistory(testUserId, {
        page: 1,
        limit: 2
      });

      expect(page1.transactions).toHaveLength(2);
      expect(page1.pagination.currentPage).toBe(1);
      expect(page1.pagination.perPage).toBe(2);
      expect(page1.pagination.total).toBe(5);
      expect(page1.pagination.totalPages).toBe(3);
      expect(page1.pagination.hasNext).toBe(true);
      expect(page1.pagination.hasPrev).toBe(false);

      const page2 = await getTransactionHistory(testUserId, {
        page: 2,
        limit: 2
      });

      expect(page2.transactions).toHaveLength(2);
      expect(page2.pagination.currentPage).toBe(2);
      expect(page2.pagination.hasNext).toBe(true);
      expect(page2.pagination.hasPrev).toBe(true);

      const page3 = await getTransactionHistory(testUserId, {
        page: 3,
        limit: 2
      });

      expect(page3.transactions).toHaveLength(1);
      expect(page3.pagination.currentPage).toBe(3);
      expect(page3.pagination.hasNext).toBe(false);
      expect(page3.pagination.hasPrev).toBe(true);
    });

    it('deve respeitar limite máximo de 100 por página', async () => {
      const result = await getTransactionHistory(testUserId, {
        limit: 200 // Tenta pedir 200, mas deve limitar a 100
      });

      expect(result.pagination.perPage).toBe(100);
    });

    it('deve retornar array vazio para usuário sem transações', async () => {
      // Cria novo usuário sem transações
      const newUser = await prisma.user.create({
        data: {
          email: `empty-${Date.now()}@example.com`,
          name: 'Empty User'
        }
      });

      const result = await getTransactionHistory(Number(newUser.id));

      expect(result.transactions).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);

      // Limpa
      await prisma.user.delete({ where: { id: newUser.id } });
    });

    it('deve incluir todos os campos da transação', async () => {
      const result = await getTransactionHistory(testUserId);
      const transaction = result.transactions[0];

      expect(transaction).toBeDefined();
      expect(transaction).toHaveProperty('id');
      expect(transaction).toHaveProperty('userId');
      expect(transaction).toHaveProperty('subscriptionId');
      expect(transaction).toHaveProperty('transactionType');
      expect(transaction).toHaveProperty('creditsAmount');
      expect(transaction).toHaveProperty('characterId');
      expect(transaction).toHaveProperty('orderId');
      expect(transaction).toHaveProperty('productionCycleId');
      expect(transaction).toHaveProperty('description');
      expect(transaction).toHaveProperty('createdAt');
    });
  });
});
