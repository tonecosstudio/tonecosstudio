/**
 * Unit tests for Subscription Service
 *
 * Testa o serviço de ativação de assinatura, incluindo:
 * - Ativação de plano trimestral (600 créditos)
 * - Ativação de plano semestral (1400 créditos = 1200 base + 200 bônus)
 * - Criação de pedido automático
 * - Validações de entrada
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getPrismaClient } from '../config/database';
import { activateSubscription } from './subscription.service';
import { getUserCredits } from './credit.service';

const prisma = getPrismaClient();

describe('Subscription Service', () => {
  let testUserId: number;
  let testCycleId: number;

  beforeEach(async () => {
    // Cria usuário de teste
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
      },
    });
    testUserId = Number(user.id);

    // Cria ciclo de produção aberto
    const cycle = await prisma.productionCycle.create({
      data: {
        name: `Test Cycle ${Date.now()}`,
        capacityLimit: 1000,
        currentCount: 0,
        status: 'open',
        closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias no futuro
      },
    });
    testCycleId = Number(cycle.id);

    // Cria personagens da coleção padrão
    await prisma.character.createMany({
      data: [
        {
          name: 'Standard Character 1',
          priceCash: 50.0,
          priceCredits: 100,
          isStandardCollection: true,
          isActive: true,
        },
        {
          name: 'Standard Character 2',
          priceCash: 75.0,
          priceCredits: 150,
          isStandardCollection: true,
          isActive: true,
        },
      ],
    });
  });

  afterEach(async () => {
    // Limpa dados de teste
    await prisma.orderItem.deleteMany({
      where: {
        order: {
          userId: BigInt(testUserId),
        },
      },
    });

    await prisma.order.deleteMany({
      where: { userId: BigInt(testUserId) },
    });

    await prisma.creditTransaction.deleteMany({
      where: { userId: BigInt(testUserId) },
    });

    await prisma.userCredit.deleteMany({
      where: { userId: BigInt(testUserId) },
    });

    await prisma.subscription.deleteMany({
      where: { userId: BigInt(testUserId) },
    });

    await prisma.user.deleteMany({
      where: { id: BigInt(testUserId) },
    });

    await prisma.character.deleteMany({
      where: { isStandardCollection: true },
    });

    await prisma.productionCycle.deleteMany({
      where: { id: BigInt(testCycleId) },
    });
  });

  describe('activateSubscription', () => {
    it('should activate trimestral subscription with 600 credits', async () => {
      // Act
      const result = await activateSubscription(testUserId, 'trimestral', 'test_payment_method');

      // Assert
      expect(result.subscriptionId).toBeGreaterThan(0);
      expect(result.userId).toBe(testUserId);
      expect(result.planType).toBe('trimestral');
      expect(result.creditsAllocated).toBe(600);
      expect(result.automaticOrderId).toBeGreaterThan(0);

      // Verifica que créditos foram alocados corretamente
      const credits = await getUserCredits(testUserId);
      expect(credits).not.toBeNull();
      expect(credits!.totalCredits).toBe(600);
      expect(credits!.availableCredits).toBe(600);
      expect(credits!.usedCredits).toBe(0);

      // Verifica que assinatura foi criada
      const subscription = await prisma.subscription.findUnique({
        where: { id: BigInt(result.subscriptionId) },
      });
      expect(subscription).not.toBeNull();
      expect(subscription!.status).toBe('active');
      expect(subscription!.autoRenew).toBe(true);

      // Verifica que pedido automático foi criado
      const order = await prisma.order.findUnique({
        where: { id: BigInt(result.automaticOrderId) },
        include: { orderItems: true },
      });
      expect(order).not.toBeNull();
      expect(order!.orderType).toBe('automatic');
      expect(order!.status).toBe('pending');
      expect(order!.isPriority).toBe(false); // Trimestral não tem prioridade
      expect(order!.isLocked).toBe(false);
      expect(order!.creditsDebited).toBe(false);
      expect(order!.orderItems.length).toBe(2); // 2 personagens da coleção padrão
    });

    it('should activate semestral subscription with 1400 credits (1200 base + 200 bonus)', async () => {
      // Act
      const result = await activateSubscription(testUserId, 'semestral', 'test_payment_method');

      // Assert
      expect(result.subscriptionId).toBeGreaterThan(0);
      expect(result.userId).toBe(testUserId);
      expect(result.planType).toBe('semestral');
      expect(result.creditsAllocated).toBe(1400); // 1200 base + 200 bônus

      // Verifica que créditos foram alocados corretamente
      const credits = await getUserCredits(testUserId);
      expect(credits).not.toBeNull();
      expect(credits!.totalCredits).toBe(1400);
      expect(credits!.availableCredits).toBe(1400);
      expect(credits!.usedCredits).toBe(0);

      // Verifica que pedido automático tem prioridade
      const order = await prisma.order.findUnique({
        where: { id: BigInt(result.automaticOrderId) },
      });
      expect(order).not.toBeNull();
      expect(order!.isPriority).toBe(true); // Semestral tem prioridade
    });

    it('should throw error if user does not exist', async () => {
      // Act & Assert
      await expect(
        activateSubscription(999999, 'trimestral', 'test_payment_method')
      ).rejects.toThrow('User 999999 not found');
    });

    it('should throw error if plan type is invalid', async () => {
      // Act & Assert
      await expect(
        activateSubscription(testUserId, 'invalid' as any, 'test_payment_method')
      ).rejects.toThrow();
    });

    it('should throw error if no open production cycle exists', async () => {
      // Arrange: fecha o ciclo de teste
      await prisma.productionCycle.update({
        where: { id: BigInt(testCycleId) },
        data: { status: 'closed' },
      });

      // Act & Assert
      await expect(
        activateSubscription(testUserId, 'trimestral', 'test_payment_method')
      ).rejects.toThrow('No open production cycle available');
    });

    it('should calculate subscription dates correctly', async () => {
      // Act
      const result = await activateSubscription(testUserId, 'trimestral', 'test_payment_method');

      // Assert
      const startDate = new Date(result.startDate);
      const endDate = new Date(result.endDate);
      const nextBillingDate = new Date(result.nextBillingDate);

      // Verifica que endDate é 3 meses após startDate
      const expectedEndDate = new Date(startDate);
      expectedEndDate.setMonth(expectedEndDate.getMonth() + 3);

      expect(endDate.getTime()).toBeCloseTo(expectedEndDate.getTime(), -4); // Tolerância de ~10 segundos
      expect(nextBillingDate.getTime()).toBe(endDate.getTime());
    });

    it('should create automatic order with standard collection characters', async () => {
      // Act
      const result = await activateSubscription(testUserId, 'trimestral', 'test_payment_method');

      // Assert
      const order = await prisma.order.findUnique({
        where: { id: BigInt(result.automaticOrderId) },
        include: {
          orderItems: {
            include: {
              character: true,
            },
          },
        },
      });

      expect(order).not.toBeNull();
      expect(order!.orderItems.length).toBe(2);

      // Verifica que todos os personagens são da coleção padrão
      order!.orderItems.forEach((item) => {
        expect(item.character.isStandardCollection).toBe(true);
        expect(item.character.isActive).toBe(true);
      });

      // Verifica que total de créditos está correto
      const expectedTotal = order!.orderItems.reduce((sum, item) => sum + item.creditsCost, 0);
      expect(order!.totalCredits).toBe(expectedTotal);
    });

    it('should increment production cycle count', async () => {
      // Arrange
      const cycleBefore = await prisma.productionCycle.findUnique({
        where: { id: BigInt(testCycleId) },
      });
      const countBefore = cycleBefore!.currentCount;

      // Act
      await activateSubscription(testUserId, 'trimestral', 'test_payment_method');

      // Assert
      const cycleAfter = await prisma.productionCycle.findUnique({
        where: { id: BigInt(testCycleId) },
      });

      // Deve incrementar em 2 (2 personagens da coleção padrão)
      expect(cycleAfter!.currentCount).toBe(countBefore + 2);
    });
  });
});

describe('schedulePlanChange', () => {
  let testUserId: number;
  let testSubscriptionId: number;
  let testCycleId: number;

  beforeEach(async () => {
    // Cria usuário de teste
    const user = await prisma.user.create({
      data: {
        email: `test-schedule-${Date.now()}@example.com`,
        name: 'Test Schedule User',
      },
    });
    testUserId = Number(user.id);

    // Cria ciclo de produção aberto
    const cycle = await prisma.productionCycle.create({
      data: {
        name: `Test Cycle ${Date.now()}`,
        capacityLimit: 1000,
        currentCount: 0,
        status: 'open',
        closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    testCycleId = Number(cycle.id);

    // Cria personagens da coleção padrão
    await prisma.character.createMany({
      data: [
        {
          name: 'Standard Character 1',
          priceCash: 50.0,
          priceCredits: 100,
          isStandardCollection: true,
          isActive: true,
        },
      ],
    });

    // Ativa assinatura trimestral
    const result = await activateSubscription(testUserId, 'trimestral', 'test_payment_method');
    testSubscriptionId = result.subscriptionId;
  });

  afterEach(async () => {
    // Limpa dados de teste
    await prisma.orderItem.deleteMany({
      where: {
        order: {
          userId: BigInt(testUserId),
        },
      },
    });

    await prisma.order.deleteMany({
      where: { userId: BigInt(testUserId) },
    });

    await prisma.creditTransaction.deleteMany({
      where: { userId: BigInt(testUserId) },
    });

    await prisma.userCredit.deleteMany({
      where: { userId: BigInt(testUserId) },
    });

    await prisma.subscription.deleteMany({
      where: { userId: BigInt(testUserId) },
    });

    await prisma.user.deleteMany({
      where: { id: BigInt(testUserId) },
    });

    await prisma.character.deleteMany({
      where: { isStandardCollection: true },
    });

    await prisma.productionCycle.deleteMany({
      where: { id: BigInt(testCycleId) },
    });
  });

  it('should schedule upgrade from trimestral to semestral', async () => {
    // Arrange
    const { schedulePlanChange } = await import('./subscription.service');

    // Act
    const result = await schedulePlanChange(testSubscriptionId, 'semestral');

    // Assert
    expect(result.subscriptionId).toBe(testSubscriptionId);
    expect(result.currentPlanType).toBe('trimestral');
    expect(result.pendingPlanChange).toBe('semestral');
    expect(result.effectiveDate).toBeInstanceOf(Date);
    expect(result.message).toContain('Plan change scheduled');

    // Verifica que assinatura foi atualizada
    const subscription = await prisma.subscription.findUnique({
      where: { id: BigInt(testSubscriptionId) },
    });
    expect(subscription!.pendingPlanChange).toBe('semestral');
    expect(subscription!.planType).toBe('trimestral'); // Plano atual não muda
  });

  it('should schedule downgrade from semestral to trimestral', async () => {
    // Arrange
    const { schedulePlanChange } = await import('./subscription.service');

    // Primeiro cria uma assinatura semestral
    const user2 = await prisma.user.create({
      data: {
        email: `test-downgrade-${Date.now()}@example.com`,
        name: 'Test Downgrade User',
      },
    });
    const result = await activateSubscription(Number(user2.id), 'semestral', 'test_payment_method');

    // Act
    const scheduleResult = await schedulePlanChange(result.subscriptionId, 'trimestral');

    // Assert
    expect(scheduleResult.currentPlanType).toBe('semestral');
    expect(scheduleResult.pendingPlanChange).toBe('trimestral');

    // Cleanup
    await prisma.orderItem.deleteMany({
      where: { order: { userId: user2.id } },
    });
    await prisma.order.deleteMany({
      where: { userId: user2.id },
    });
    await prisma.creditTransaction.deleteMany({
      where: { userId: BigInt(Number(user2.id)) },
    });
    await prisma.userCredit.deleteMany({
      where: { userId: BigInt(Number(user2.id)) },
    });
    await prisma.subscription.deleteMany({
      where: { userId: user2.id },
    });
    await prisma.user.deleteMany({
      where: { id: user2.id },
    });
  });

  it('should reject if subscription does not exist', async () => {
    // Arrange
    const { schedulePlanChange } = await import('./subscription.service');
    const nonExistentId = 999999;

    // Act & Assert
    await expect(schedulePlanChange(nonExistentId, 'semestral')).rejects.toThrow(
      `Subscription ${nonExistentId} not found`
    );
  });

  it('should reject if subscription is not active', async () => {
    // Arrange
    const { schedulePlanChange } = await import('./subscription.service');

    // Cancela a assinatura
    await prisma.subscription.update({
      where: { id: BigInt(testSubscriptionId) },
      data: { status: 'cancelled' },
    });

    // Act & Assert
    await expect(schedulePlanChange(testSubscriptionId, 'semestral')).rejects.toThrow(
      `Subscription ${testSubscriptionId} is not active`
    );
  });

  it('should reject if new plan is same as current plan', async () => {
    // Arrange
    const { schedulePlanChange } = await import('./subscription.service');

    // Act & Assert
    await expect(schedulePlanChange(testSubscriptionId, 'trimestral')).rejects.toThrow(
      "New plan type 'trimestral' is the same as current plan type"
    );
  });

  it('should reject if new plan does not exist', async () => {
    // Arrange
    const { schedulePlanChange } = await import('./subscription.service');

    // Desativa o plano semestral temporariamente
    await prisma.subscriptionPlan.update({
      where: { planType: 'semestral' },
      data: { isActive: false },
    });

    // Act & Assert
    await expect(schedulePlanChange(testSubscriptionId, 'semestral')).rejects.toThrow(
      "Plan type 'semestral' is not active"
    );

    // Cleanup: reativa o plano
    await prisma.subscriptionPlan.update({
      where: { planType: 'semestral' },
      data: { isActive: true },
    });
  });

  it('should return effective date as next billing date', async () => {
    // Arrange
    const { schedulePlanChange } = await import('./subscription.service');

    const subscription = await prisma.subscription.findUnique({
      where: { id: BigInt(testSubscriptionId) },
    });

    // Act
    const result = await schedulePlanChange(testSubscriptionId, 'semestral');

    // Assert
    expect(result.effectiveDate.getTime()).toBe(subscription!.nextBillingDate!.getTime());
  });

  it('should allow changing pending plan change', async () => {
    // Arrange
    const { schedulePlanChange } = await import('./subscription.service');

    // Primeiro agenda upgrade para semestral
    await schedulePlanChange(testSubscriptionId, 'semestral');

    // Verifica que foi agendado
    let subscription = await prisma.subscription.findUnique({
      where: { id: BigInt(testSubscriptionId) },
    });
    expect(subscription!.pendingPlanChange).toBe('semestral');

    // Act: Cancela a mudança agendando o mesmo plano atual
    // (isso deve falhar conforme a validação)
    await expect(schedulePlanChange(testSubscriptionId, 'trimestral')).rejects.toThrow(
      "New plan type 'trimestral' is the same as current plan type"
    );

    // Verifica que pending_plan_change ainda está como semestral
    subscription = await prisma.subscription.findUnique({
      where: { id: BigInt(testSubscriptionId) },
    });
    expect(subscription!.pendingPlanChange).toBe('semestral');
  });
});

describe('setNoRenewal', () => {
  let testUserId: number;
  let testSubscriptionId: number;
  let testCycleId: number;

  beforeEach(async () => {
    // Cria usuário de teste
    const user = await prisma.user.create({
      data: {
        email: `test-norenewal-${Date.now()}@example.com`,
        name: 'Test NoRenewal User',
      },
    });
    testUserId = Number(user.id);

    // Cria ciclo de produção aberto
    const cycle = await prisma.productionCycle.create({
      data: {
        name: `Test Cycle ${Date.now()}`,
        capacityLimit: 1000,
        currentCount: 0,
        status: 'open',
        closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    testCycleId = Number(cycle.id);

    // Cria personagens da coleção padrão
    await prisma.character.createMany({
      data: [
        {
          name: 'Standard Character 1',
          priceCash: 50.0,
          priceCredits: 100,
          isStandardCollection: true,
          isActive: true,
        },
      ],
    });

    // Ativa assinatura trimestral
    const result = await activateSubscription(testUserId, 'trimestral', 'test_payment_method');
    testSubscriptionId = result.subscriptionId;
  });

  afterEach(async () => {
    // Limpa dados de teste
    await prisma.orderItem.deleteMany({
      where: {
        order: {
          userId: BigInt(testUserId),
        },
      },
    });

    await prisma.order.deleteMany({
      where: { userId: BigInt(testUserId) },
    });

    await prisma.creditTransaction.deleteMany({
      where: { userId: BigInt(testUserId) },
    });

    await prisma.userCredit.deleteMany({
      where: { userId: BigInt(testUserId) },
    });

    await prisma.subscription.deleteMany({
      where: { userId: BigInt(testUserId) },
    });

    await prisma.user.deleteMany({
      where: { id: BigInt(testUserId) },
    });

    await prisma.character.deleteMany({
      where: { isStandardCollection: true },
    });

    await prisma.productionCycle.deleteMany({
      where: { id: BigInt(testCycleId) },
    });
  });

  it('should disable auto-renewal and keep subscription active until end_date', async () => {
    // Arrange
    const { setNoRenewal } = await import('./subscription.service');

    // Busca assinatura antes
    const subscriptionBefore = await prisma.subscription.findUnique({
      where: { id: BigInt(testSubscriptionId) },
    });
    expect(subscriptionBefore!.autoRenew).toBe(true);
    expect(subscriptionBefore!.nextBillingDate).not.toBeNull();

    // Act
    const result = await setNoRenewal(testSubscriptionId);

    // Assert
    expect(result.subscriptionId).toBe(testSubscriptionId);
    expect(result.userId).toBe(testUserId);
    expect(result.endDate).toBeInstanceOf(Date);
    expect(result.creditsValidUntil).toBeInstanceOf(Date);
    expect(result.endDate.getTime()).toBe(result.creditsValidUntil.getTime());
    expect(result.message).toContain('Auto-renewal disabled successfully');
    expect(result.message).toContain('No refund will be processed');

    // Verifica que assinatura foi atualizada corretamente
    const subscription = await prisma.subscription.findUnique({
      where: { id: BigInt(testSubscriptionId) },
    });
    expect(subscription!.status).toBe('active'); // Permanece ativa
    expect(subscription!.autoRenew).toBe(false); // Auto-renovação desativada
    expect(subscription!.nextBillingDate).toBeNull(); // Próxima cobrança removida
    expect(subscription!.cancellationType).toBe('no_renewal');
    expect(subscription!.cancelledAt).toBeNull(); // Não é cancelada imediatamente
  });

  it('should keep credits available until end_date', async () => {
    // Arrange
    const { setNoRenewal } = await import('./subscription.service');

    // Verifica créditos antes
    const creditsBefore = await getUserCredits(testUserId);
    expect(creditsBefore!.availableCredits).toBe(600);

    // Act
    await setNoRenewal(testSubscriptionId);

    // Assert
    // Créditos devem permanecer disponíveis
    const creditsAfter = await getUserCredits(testUserId);
    expect(creditsAfter!.availableCredits).toBe(600);
    expect(creditsAfter!.expiredCredits).toBe(0);
    expect(creditsAfter!.usedCredits).toBe(0);
  });

  it('should clear pending_plan_change if exists', async () => {
    // Arrange
    const { setNoRenewal, schedulePlanChange } = await import('./subscription.service');

    // Agenda mudança de plano
    await schedulePlanChange(testSubscriptionId, 'semestral');

    // Verifica que mudança foi agendada
    const subscriptionBefore = await prisma.subscription.findUnique({
      where: { id: BigInt(testSubscriptionId) },
    });
    expect(subscriptionBefore!.pendingPlanChange).toBe('semestral');

    // Act
    await setNoRenewal(testSubscriptionId);

    // Assert
    // pending_plan_change deve ser limpo
    const subscription = await prisma.subscription.findUnique({
      where: { id: BigInt(testSubscriptionId) },
    });
    expect(subscription!.pendingPlanChange).toBeNull();
  });

  it('should throw error if subscription does not exist', async () => {
    // Arrange
    const { setNoRenewal } = await import('./subscription.service');

    // Act & Assert
    await expect(setNoRenewal(999999)).rejects.toThrow('Subscription 999999 not found');
  });

  it('should throw error if subscription is not active', async () => {
    // Arrange
    const { setNoRenewal } = await import('./subscription.service');

    // Cancela assinatura primeiro
    await prisma.subscription.update({
      where: { id: BigInt(testSubscriptionId) },
      data: { status: 'cancelled' },
    });

    // Act & Assert
    await expect(setNoRenewal(testSubscriptionId)).rejects.toThrow(
      `Subscription ${testSubscriptionId} is not active`
    );
  });

  it('should not process any refund', async () => {
    // Arrange
    const { setNoRenewal } = await import('./subscription.service');

    // Act
    const result = await setNoRenewal(testSubscriptionId);

    // Assert
    // Não deve haver campo de reembolso no resultado
    expect((result as any).refundAmount).toBeUndefined();
    expect(result.message).toContain('No refund will be processed');
  });
});
