/**
 * Unit Tests for Subscription Expiration Job
 * 
 * Testa o job de expiração de assinaturas que:
 * - Busca assinaturas com end_date <= NOW() e auto_renew = FALSE
 * - Atualiza status para 'expired'
 * - Expira créditos
 * - Registra transações
 */

import { getPrismaClient } from '../config/database';
import { runExpirationJob } from './expire-subscriptions.job';
import { allocateCredits } from '../services/credit.service';

const prisma = getPrismaClient();

describe('Subscription Expiration Job', () => {
  beforeEach(async () => {
    // Limpa dados de teste
    await prisma.creditTransaction.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.userCredit.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('runExpirationJob', () => {
    it('should expire subscription with end_date in the past and auto_renew = false', async () => {
      // Arrange: Cria usuário
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      // Cria assinatura expirada com auto_renew = false
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          planType: 'trimestral',
          status: 'active',
          startDate: new Date('2024-01-01'),
          endDate: yesterday,
          autoRenew: false,
          cancellationType: 'no_renewal'
        }
      });

      // Aloca créditos para o usuário
      await allocateCredits(Number(user.id), Number(subscription.id), 600);

      // Act: Executa o job
      await runExpirationJob();

      // Assert: Verifica que a assinatura foi expirada
      const updatedSubscription = await prisma.subscription.findUnique({
        where: { id: subscription.id }
      });
      expect(updatedSubscription?.status).toBe('expired');

      // Verifica que os créditos foram expirados
      const userCredits = await prisma.userCredit.findUnique({
        where: { userId: user.id }
      });
      expect(userCredits?.availableCredits).toBe(0);
      expect(userCredits?.expiredCredits).toBe(600);

      // Verifica que a transação foi registrada
      const transactions = await prisma.creditTransaction.findMany({
        where: {
          userId: user.id,
          transactionType: 'expiration'
        }
      });
      expect(transactions).toHaveLength(1);
      expect(transactions[0]?.creditsAmount).toBe(-600);
      expect(transactions[0]?.description).toBe('Expiração natural - não-renovação');
    });

    it('should NOT expire subscription with auto_renew = true', async () => {
      // Arrange: Cria usuário
      const user = await prisma.user.create({
        data: {
          email: 'test2@example.com',
          name: 'Test User 2'
        }
      });

      // Cria assinatura expirada mas com auto_renew = true
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          planType: 'trimestral',
          status: 'active',
          startDate: new Date('2024-01-01'),
          endDate: yesterday,
          autoRenew: true, // Renovação automática ativa
          nextBillingDate: new Date()
        }
      });

      // Aloca créditos
      await allocateCredits(Number(user.id), Number(subscription.id), 600);

      // Act: Executa o job
      await runExpirationJob();

      // Assert: Verifica que a assinatura NÃO foi expirada
      const updatedSubscription = await prisma.subscription.findUnique({
        where: { id: subscription.id }
      });
      expect(updatedSubscription?.status).toBe('active');

      // Verifica que os créditos NÃO foram expirados
      const userCredits = await prisma.userCredit.findUnique({
        where: { userId: user.id }
      });
      expect(userCredits?.availableCredits).toBe(600);
      expect(userCredits?.expiredCredits).toBe(0);
    });

    it('should NOT expire subscription with end_date in the future', async () => {
      // Arrange: Cria usuário
      const user = await prisma.user.create({
        data: {
          email: 'test3@example.com',
          name: 'Test User 3'
        }
      });

      // Cria assinatura com end_date no futuro
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          planType: 'trimestral',
          status: 'active',
          startDate: new Date('2024-01-01'),
          endDate: tomorrow, // Ainda não expirou
          autoRenew: false
        }
      });

      // Aloca créditos
      await allocateCredits(Number(user.id), Number(subscription.id), 600);

      // Act: Executa o job
      await runExpirationJob();

      // Assert: Verifica que a assinatura NÃO foi expirada
      const updatedSubscription = await prisma.subscription.findUnique({
        where: { id: subscription.id }
      });
      expect(updatedSubscription?.status).toBe('active');

      // Verifica que os créditos NÃO foram expirados
      const userCredits = await prisma.userCredit.findUnique({
        where: { userId: user.id }
      });
      expect(userCredits?.availableCredits).toBe(600);
      expect(userCredits?.expiredCredits).toBe(0);
    });

    it('should handle multiple expired subscriptions', async () => {
      // Arrange: Cria múltiplos usuários com assinaturas expiradas
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const users = await Promise.all([
        prisma.user.create({ data: { email: 'user1@example.com', name: 'User 1' } }),
        prisma.user.create({ data: { email: 'user2@example.com', name: 'User 2' } }),
        prisma.user.create({ data: { email: 'user3@example.com', name: 'User 3' } })
      ]);

      for (const user of users) {
        const subscription = await prisma.subscription.create({
          data: {
            userId: user.id,
            planType: 'trimestral',
            status: 'active',
            startDate: new Date('2024-01-01'),
            endDate: yesterday,
            autoRenew: false
          }
        });

        await allocateCredits(Number(user.id), Number(subscription.id), 600);
      }

      // Act: Executa o job
      await runExpirationJob();

      // Assert: Verifica que todas as assinaturas foram expiradas
      for (const user of users) {
        const subscription = await prisma.subscription.findFirst({
          where: { userId: user.id }
        });
        expect(subscription?.status).toBe('expired');

        const userCredits = await prisma.userCredit.findUnique({
          where: { userId: user.id }
        });
        expect(userCredits?.availableCredits).toBe(0);
        expect(userCredits?.expiredCredits).toBe(600);
      }
    });

    it('should handle subscription with no credits gracefully', async () => {
      // Arrange: Cria usuário com assinatura expirada mas sem créditos
      const user = await prisma.user.create({
        data: {
          email: 'test4@example.com',
          name: 'Test User 4'
        }
      });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          planType: 'trimestral',
          status: 'active',
          startDate: new Date('2024-01-01'),
          endDate: yesterday,
          autoRenew: false
        }
      });

      // Aloca créditos e depois usa todos
      await allocateCredits(Number(user.id), Number(subscription.id), 600);
      await prisma.userCredit.update({
        where: { userId: user.id },
        data: {
          usedCredits: 600,
          availableCredits: 0
        }
      });

      // Act: Executa o job
      await runExpirationJob();

      // Assert: Verifica que a assinatura foi expirada mesmo sem créditos disponíveis
      const updatedSubscription = await prisma.subscription.findUnique({
        where: { id: subscription.id }
      });
      expect(updatedSubscription?.status).toBe('expired');

      // Verifica que não houve mudança nos créditos (já estavam zerados)
      const userCredits = await prisma.userCredit.findUnique({
        where: { userId: user.id }
      });
      expect(userCredits?.availableCredits).toBe(0);
      expect(userCredits?.expiredCredits).toBe(0);

      // Verifica que nenhuma transação de expiração foi criada (não havia créditos para expirar)
      const transactions = await prisma.creditTransaction.findMany({
        where: {
          userId: user.id,
          transactionType: 'expiration'
        }
      });
      expect(transactions).toHaveLength(0);
    });

    it('should handle empty result set gracefully', async () => {
      // Arrange: Não cria nenhuma assinatura expirada

      // Act: Executa o job
      await expect(runExpirationJob()).resolves.not.toThrow();

      // Assert: Job deve completar sem erros
    });
  });
});
