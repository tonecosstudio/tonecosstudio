/**
 * Subscription Management Service
 *
 * Serviço responsável por gerenciar o ciclo de vida de assinaturas.
 * Fornece funções para:
 * - Ativar nova assinatura
 * - Processar pagamento (stub para MVP)
 * - Criar pedido automático com coleção padrão
 * - Integrar com serviços de crédito e transação
 *
 * Validações:
 * - Requisito 1.2: Plano Trimestral gera 600 créditos
 * - Requisito 1.3: Plano Semestral gera 1200 créditos base
 * - Requisito 1.4: Plano Semestral adiciona 200 créditos de bônus
 * - Requisito 1.5: Créditos liberados imediatamente
 * - Requisito 6.1: Pedido automático criado na ativação
 * - Requisito 6.2: Pedido vinculado ao ciclo aberto atual
 */

import { getPrismaClient } from '../config/database';
import { PlanType } from '../models/types';
import { allocateCredits, expireCredits } from './credit.service';
import { recordTransaction } from './transaction.service';
import { calculateCreditsForPlan } from './subscription-plan.service';

const prisma = getPrismaClient();

/**
 * Resultado da ativação de assinatura
 */
export interface ActivateSubscriptionResult {
  subscriptionId: number;
  userId: number;
  planType: PlanType;
  creditsAllocated: number;
  automaticOrderId: number;
  startDate: Date;
  endDate: Date;
  nextBillingDate: Date;
}

/**
 * Resultado do processamento de pagamento (stub)
 */
interface PaymentResult {
  success: boolean;
  transactionId: string;
  amount: number;
}

/**
 * Resultado da renovação de assinatura
 */
export interface RenewSubscriptionResult {
  subscriptionId: number;
  userId: number;
  planType: PlanType;
  creditsAllocated: number;
  automaticOrderId: number;
  startDate: Date;
  endDate: Date;
  nextBillingDate: Date;
  planChanged: boolean;
  previousPlanType?: PlanType;
}

/**
 * Processa pagamento via gateway (stub para MVP)
 *
 * Esta é uma implementação stub para o MVP. Em produção, deve integrar
 * com gateway real (Stripe, Mercado Pago, etc).
 *
 * @param planType - Tipo de plano
 * @param paymentMethodId - ID do método de pagamento
 * @returns Resultado do pagamento
 */
async function processPayment(planType: PlanType, paymentMethodId: string): Promise<PaymentResult> {
  // Busca preço do plano
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { planType },
  });

  if (!plan) {
    throw new Error(`Plan type '${planType}' not found`);
  }

  // Stub: simula pagamento bem-sucedido
  // TODO: Integrar com gateway real (Stripe/Mercado Pago)
  return {
    success: true,
    transactionId: `stub_${Date.now()}_${paymentMethodId}`,
    amount: Number(plan.price),
  };
}

/**
 * Processa reembolso via gateway (stub para MVP)
 *
 * Esta é uma implementação stub para o MVP. Em produção, deve integrar
 * com gateway real (Stripe, Mercado Pago, etc).
 *
 * @param amount - Valor a reembolsar
 * @param originalTransactionId - ID da transação original (opcional)
 * @returns Resultado do reembolso
 */
async function processRefund(
  amount: number,
  originalTransactionId?: string
): Promise<PaymentResult> {
  // Stub: simula reembolso bem-sucedido
  // TODO: Integrar com gateway real (Stripe/Mercado Pago)
  return {
    success: true,
    transactionId: `refund_${Date.now()}_${originalTransactionId || 'unknown'}`,
    amount: amount,
  };
}

/**
 * Busca o ciclo de produção aberto atual
 *
 * Retorna o primeiro ciclo com status 'open' e capacidade disponível,
 * ordenado por data de fechamento (mais próximo primeiro).
 *
 * @returns ID do ciclo aberto ou null se não houver
 */
async function getCurrentOpenCycle(): Promise<number | null> {
  const cycle = await prisma.productionCycle.findFirst({
    where: {
      status: 'open',
      currentCount: {
        lt: prisma.productionCycle.fields.capacityLimit,
      },
    },
    orderBy: {
      closeDate: 'asc',
    },
  });

  return cycle ? Number(cycle.id) : null;
}

/**
 * Busca personagens da coleção padrão
 *
 * Retorna todos os personagens ativos marcados como parte da coleção padrão.
 *
 * @returns Array de personagens da coleção padrão
 */
async function getStandardCollectionCharacters() {
  return await prisma.character.findMany({
    where: {
      isStandardCollection: true,
      isActive: true,
    },
  });
}

/**
 * Ativa uma nova assinatura para um usuário
 *
 * Esta função executa o fluxo completo de ativação:
 * 1. Valida dados de entrada
 * 2. Processa pagamento via gateway
 * 3. Cria registro de assinatura com datas calculadas
 * 4. Aloca créditos (base + bônus se semestral)
 * 5. Registra transação de alocação
 * 6. Cria pedido automático com coleção padrão
 * 7. Vincula pedido ao ciclo aberto atual
 *
 * Tudo é executado em uma transação atômica para garantir consistência.
 * Se qualquer etapa falhar, toda a operação é revertida.
 *
 * @param userId - ID do usuário
 * @param planType - Tipo de plano (trimestral ou semestral)
 * @param paymentMethodId - ID do método de pagamento
 * @returns Resultado da ativação com detalhes da assinatura e créditos
 * @throws Error se validação falhar, pagamento falhar, ou não houver ciclo aberto
 */
export async function activateSubscription(
  userId: number,
  planType: PlanType,
  paymentMethodId: string
): Promise<ActivateSubscriptionResult> {
  // Valida que usuário existe
  const user = await prisma.user.findUnique({
    where: { id: BigInt(userId) },
  });

  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  // Valida que plano existe e está ativo
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { planType },
  });

  if (!plan) {
    throw new Error(`Plan type '${planType}' not found`);
  }

  if (!plan.isActive) {
    throw new Error(`Plan type '${planType}' is not active`);
  }

  // Processa pagamento
  const paymentResult = await processPayment(planType, paymentMethodId);

  if (!paymentResult.success) {
    throw new Error('Payment processing failed');
  }

  // Calcula créditos do plano
  const creditsCalculation = await calculateCreditsForPlan(planType);
  const totalCredits = creditsCalculation.totalCredits;

  // Busca ciclo aberto
  const cycleId = await getCurrentOpenCycle();

  if (!cycleId) {
    throw new Error('No open production cycle available');
  }

  // Busca personagens da coleção padrão
  const standardCharacters = await getStandardCollectionCharacters();

  if (standardCharacters.length === 0) {
    throw new Error('No standard collection characters found');
  }

  // Executa tudo em transação atômica
  return await prisma.$transaction(async (tx) => {
    // 1. Cria assinatura
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + plan.durationMonths);

    const subscription = await tx.subscription.create({
      data: {
        userId: BigInt(userId),
        planType: planType,
        status: 'active',
        startDate: startDate,
        endDate: endDate,
        nextBillingDate: endDate,
        autoRenew: true,
      },
    });

    // 2. Aloca créditos
    const creditsResult = await allocateCredits(userId, Number(subscription.id), totalCredits);

    // 3. Registra transação de alocação
    await recordTransaction(userId, 'allocation', totalCredits, {
      description: `Ativação de assinatura ${planType} - ${creditsCalculation.baseCredits} créditos base${creditsCalculation.bonusCredits > 0 ? ` + ${creditsCalculation.bonusCredits} bônus` : ''}`,
    });

    // 4. Calcula total de créditos do pedido automático
    const orderTotalCredits = standardCharacters.reduce((sum, char) => sum + char.priceCredits, 0);

    // 5. Cria pedido automático
    const order = await tx.order.create({
      data: {
        userId: BigInt(userId),
        subscriptionId: subscription.id,
        productionCycleId: BigInt(cycleId),
        orderType: 'automatic',
        status: 'pending',
        isPriority: planType === 'semestral', // Semestral tem prioridade
        isLocked: false,
        totalCredits: orderTotalCredits,
        creditsDebited: false,
      },
    });

    // 6. Cria itens do pedido (personagens da coleção padrão)
    await tx.orderItem.createMany({
      data: standardCharacters.map((char) => ({
        orderId: order.id,
        characterId: char.id,
        creditsCost: char.priceCredits,
      })),
    });

    // 7. Incrementa contador do ciclo
    await tx.productionCycle.update({
      where: { id: BigInt(cycleId) },
      data: {
        currentCount: { increment: standardCharacters.length },
      },
    });

    return {
      subscriptionId: Number(subscription.id),
      userId: Number(subscription.userId),
      planType: subscription.planType as PlanType,
      creditsAllocated: creditsResult.creditsAllocated,
      automaticOrderId: Number(order.id),
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      nextBillingDate: subscription.nextBillingDate!,
    };
  });
}

/**
 * Renova uma assinatura existente
 *
 * Esta função executa o fluxo completo de renovação:
 * 1. Valida que a assinatura existe e está ativa
 * 2. Verifica se há pending_plan_change
 * 3. Se pending_plan_change existe:
 *    - Encerra assinatura anterior
 *    - Cria nova assinatura com o novo tipo de plano
 *    - Processa pagamento do novo plano
 * 4. Se não há pending_plan_change:
 *    - Estende as datas da assinatura atual
 *    - Processa pagamento do plano atual
 * 5. Aloca créditos do plano (atual ou novo)
 * 6. Soma novos créditos ao saldo existente (não reseta)
 * 7. Registra transação de alocação
 * 8. Cria novo pedido automático com coleção padrão
 * 9. Limpa pending_plan_change após processar
 *
 * Tudo é executado em uma transação atômica para garantir consistência.
 *
 * @param subscriptionId - ID da assinatura a renovar
 * @returns Resultado da renovação com detalhes da assinatura e créditos
 * @throws Error se assinatura não existir, não estiver ativa, pagamento falhar, ou não houver ciclo aberto
 *
 * **Valida: Requisitos 2.4, 2.5, 8.3, 8.4, 8.5**
 */
export async function renewSubscription(subscriptionId: number): Promise<RenewSubscriptionResult> {
  // Busca assinatura existente
  const subscription = await prisma.subscription.findUnique({
    where: { id: BigInt(subscriptionId) },
  });

  if (!subscription) {
    throw new Error(`Subscription ${subscriptionId} not found`);
  }

  if (subscription.status !== 'active') {
    throw new Error(`Subscription ${subscriptionId} is not active`);
  }

  const userId = Number(subscription.userId);
  const hasPendingChange = subscription.pendingPlanChange !== null;
  const previousPlanType = subscription.planType as PlanType;
  const newPlanType = hasPendingChange
    ? (subscription.pendingPlanChange as PlanType)
    : previousPlanType;

  // Busca plano (atual ou novo)
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { planType: newPlanType },
  });

  if (!plan) {
    throw new Error(`Plan type '${newPlanType}' not found`);
  }

  if (!plan.isActive) {
    throw new Error(`Plan type '${newPlanType}' is not active`);
  }

  // Processa pagamento do plano (atual ou novo)
  const paymentResult = await processPayment(newPlanType, 'renewal_auto');

  if (!paymentResult.success) {
    throw new Error('Payment processing failed for renewal');
  }

  // Calcula créditos do plano (atual ou novo)
  const creditsCalculation = await calculateCreditsForPlan(newPlanType);
  const totalCredits = creditsCalculation.totalCredits;

  // Busca ciclo aberto
  const cycleId = await getCurrentOpenCycle();

  if (!cycleId) {
    throw new Error('No open production cycle available');
  }

  // Busca personagens da coleção padrão
  const standardCharacters = await getStandardCollectionCharacters();

  if (standardCharacters.length === 0) {
    throw new Error('No standard collection characters found');
  }

  // Executa tudo em transação atômica
  return await prisma.$transaction(async (tx) => {
    let newSubscription;
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + plan.durationMonths);

    if (hasPendingChange) {
      // CASO 1: Há mudança de plano agendada
      // Encerra assinatura anterior
      await tx.subscription.update({
        where: { id: BigInt(subscriptionId) },
        data: {
          status: 'cancelled',
          cancelledAt: startDate,
          autoRenew: false,
          nextBillingDate: null,
        },
      });

      // Cria nova assinatura com o novo tipo de plano
      newSubscription = await tx.subscription.create({
        data: {
          userId: BigInt(userId),
          planType: newPlanType,
          status: 'active',
          startDate: startDate,
          endDate: endDate,
          nextBillingDate: endDate,
          autoRenew: true,
          pendingPlanChange: null, // Limpa pending_plan_change
        },
      });
    } else {
      // CASO 2: Renovação simples do plano atual
      // Estende as datas da assinatura atual
      newSubscription = await tx.subscription.update({
        where: { id: BigInt(subscriptionId) },
        data: {
          startDate: startDate,
          endDate: endDate,
          nextBillingDate: endDate,
        },
      });
    }

    // Aloca créditos (soma ao saldo existente)
    const creditsResult = await allocateCredits(userId, Number(newSubscription.id), totalCredits);

    // Registra transação de alocação
    const transactionDescription = hasPendingChange
      ? `Renovação com mudança de plano de ${previousPlanType} para ${newPlanType} - ${creditsCalculation.baseCredits} créditos base${creditsCalculation.bonusCredits > 0 ? ` + ${creditsCalculation.bonusCredits} bônus` : ''}`
      : `Renovação de assinatura ${newPlanType} - ${creditsCalculation.baseCredits} créditos base${creditsCalculation.bonusCredits > 0 ? ` + ${creditsCalculation.bonusCredits} bônus` : ''}`;

    await recordTransaction(userId, 'allocation', totalCredits, {
      description: transactionDescription,
    });

    // Calcula total de créditos do pedido automático
    const orderTotalCredits = standardCharacters.reduce((sum, char) => sum + char.priceCredits, 0);

    // Cria novo pedido automático
    const order = await tx.order.create({
      data: {
        userId: BigInt(userId),
        subscriptionId: newSubscription.id,
        productionCycleId: BigInt(cycleId),
        orderType: 'automatic',
        status: 'pending',
        isPriority: newPlanType === 'semestral', // Semestral tem prioridade
        isLocked: false,
        totalCredits: orderTotalCredits,
        creditsDebited: false,
      },
    });

    // Cria itens do pedido (personagens da coleção padrão)
    await tx.orderItem.createMany({
      data: standardCharacters.map((char) => ({
        orderId: order.id,
        characterId: char.id,
        creditsCost: char.priceCredits,
      })),
    });

    // Incrementa contador do ciclo
    await tx.productionCycle.update({
      where: { id: BigInt(cycleId) },
      data: {
        currentCount: { increment: standardCharacters.length },
      },
    });

    return {
      subscriptionId: Number(newSubscription.id),
      userId: Number(newSubscription.userId),
      planType: newSubscription.planType as PlanType,
      creditsAllocated: creditsResult.creditsAllocated,
      automaticOrderId: Number(order.id),
      startDate: newSubscription.startDate,
      endDate: newSubscription.endDate,
      nextBillingDate: newSubscription.nextBillingDate!,
      planChanged: hasPendingChange,
      previousPlanType: hasPendingChange ? previousPlanType : undefined,
    };
  });
}

/**
 * Resultado do agendamento de mudança de plano
 */
export interface SchedulePlanChangeResult {
  subscriptionId: number;
  currentPlanType: PlanType;
  pendingPlanChange: PlanType;
  effectiveDate: Date;
  message: string;
}

/**
 * Resultado da não-renovação
 */
export interface SetNoRenewalResult {
  subscriptionId: number;
  userId: number;
  endDate: Date;
  creditsValidUntil: Date;
  message: string;
}

/**
 * Agenda mudança de plano para próxima renovação
 *
 * Esta função permite que usuários façam upgrade ou downgrade de plano,
 * mas a mudança só entra em vigor na próxima renovação. Isso previne
 * exploits financeiros onde usuário poderia:
 * - Comprar plano barato
 * - Usar todos os créditos
 * - Fazer upgrade e receber créditos cheios do plano caro
 *
 * Com agendamento, o upgrade só ocorre na renovação, quando o usuário
 * paga o valor cheio do novo plano.
 *
 * @param subscriptionId - ID da assinatura
 * @param newPlanType - Novo tipo de plano (trimestral ou semestral)
 * @returns Resultado do agendamento com data efetiva
 * @throws Error se assinatura não existir, não estiver ativa, novo plano for igual ao atual, ou novo plano não existir/não estiver ativo
 *
 * **Valida: Requisitos 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8**
 */
export async function schedulePlanChange(
  subscriptionId: number,
  newPlanType: PlanType
): Promise<SchedulePlanChangeResult> {
  // Busca assinatura existente
  const subscription = await prisma.subscription.findUnique({
    where: { id: BigInt(subscriptionId) },
  });

  if (!subscription) {
    throw new Error(`Subscription ${subscriptionId} not found`);
  }

  if (subscription.status !== 'active') {
    throw new Error(`Subscription ${subscriptionId} is not active`);
  }

  const currentPlanType = subscription.planType as PlanType;

  // Valida que novo plano é diferente do atual
  if (newPlanType === currentPlanType) {
    throw new Error(`New plan type '${newPlanType}' is the same as current plan type`);
  }

  // Valida que novo plano existe e está ativo
  const newPlan = await prisma.subscriptionPlan.findUnique({
    where: { planType: newPlanType },
  });

  if (!newPlan) {
    throw new Error(`Plan type '${newPlanType}' not found`);
  }

  if (!newPlan.isActive) {
    throw new Error(`Plan type '${newPlanType}' is not active`);
  }

  // Marca assinatura com pending_plan_change
  const updatedSubscription = await prisma.subscription.update({
    where: { id: BigInt(subscriptionId) },
    data: {
      pendingPlanChange: newPlanType,
    },
  });

  // Para MVP, notificação é um console.log simples
  // Em produção, isso seria substituído por envio de email/SMS
  console.log(
    `[NOTIFICATION] User ${subscription.userId}: Plan change scheduled from ${currentPlanType} to ${newPlanType}, effective on ${subscription.nextBillingDate}`
  );

  return {
    subscriptionId: Number(updatedSubscription.id),
    currentPlanType: currentPlanType,
    pendingPlanChange: newPlanType,
    effectiveDate: subscription.nextBillingDate!,
    message: `Plan change scheduled. Your subscription will change from ${currentPlanType} to ${newPlanType} on ${subscription.nextBillingDate?.toISOString().split('T')[0]}. You will continue with your current plan until then.`,
  };
}

/**
 * Desativa renovação automática da assinatura (não-renovação)
 *
 * Esta função executa o fluxo de não-renovação:
 * 1. Valida que a assinatura existe e está ativa
 * 2. Desativa auto_renew (renovação automática)
 * 3. Remove next_billing_date (não haverá próxima cobrança)
 * 4. Limpa pending_plan_change se existir (mudança agendada é cancelada)
 * 5. Mantém assinatura ativa até end_date
 * 6. Créditos permanecem disponíveis até end_date
 * 7. Após end_date, um job agendado expirará a assinatura e os créditos
 *
 * Diferenças entre não-renovação e cancelamento com extorno:
 * - Não-renovação: sem reembolso, acesso até end_date, créditos válidos até end_date
 * - Cancelamento com extorno: reembolso proporcional, acesso encerrado imediatamente, créditos expiram imediatamente
 *
 * @param subscriptionId - ID da assinatura
 * @returns Resultado da não-renovação com data de expiração
 * @throws Error se assinatura não existir ou não estiver ativa
 *
 * **Valida: Requisitos 2.2.1, 2.2.2, 2.2.3, 2.2.6**
 */
export async function setNoRenewal(subscriptionId: number): Promise<SetNoRenewalResult> {
  // Busca assinatura existente
  const subscription = await prisma.subscription.findUnique({
    where: { id: BigInt(subscriptionId) },
  });

  if (!subscription) {
    throw new Error(`Subscription ${subscriptionId} not found`);
  }

  if (subscription.status !== 'active') {
    throw new Error(`Subscription ${subscriptionId} is not active`);
  }

  const userId = Number(subscription.userId);

  // Atualiza assinatura para não-renovação
  const updatedSubscription = await prisma.subscription.update({
    where: { id: BigInt(subscriptionId) },
    data: {
      autoRenew: false,
      nextBillingDate: null,
      cancellationType: 'no_renewal',
      pendingPlanChange: null, // Limpa mudança agendada se existir
    },
  });

  // Para MVP, notificação é um console.log simples
  // Em produção, isso seria substituído por envio de email/SMS
  console.log(
    `[NOTIFICATION] User ${userId}: Auto-renewal disabled. Subscription will remain active until ${subscription.endDate.toISOString().split('T')[0]}. Credits remain valid until that date.`
  );

  return {
    subscriptionId: Number(updatedSubscription.id),
    userId: userId,
    endDate: subscription.endDate,
    creditsValidUntil: subscription.endDate,
    message: `Auto-renewal disabled successfully. Your subscription will remain active until ${subscription.endDate.toISOString().split('T')[0]}. Your credits will remain valid until that date. No refund will be processed.`,
  };
}
