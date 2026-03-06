/**
 * Refund Service
 *
 * Serviço responsável por cálculo e processamento de reembolsos
 * segundo o Código de Defesa do Consumidor (CDC).
 *
 * Regra CDC:
 * Reembolso = Valor Pago - (Personagens Entregues × Valor Avulso)
 *
 * Exemplo:
 * - Cliente pagou: R$ 2.400 (plano anual)
 * - Recebeu 3 personagens standard: 3 × R$ 500 = R$ 1.500
 * - Reembolso: R$ 2.400 - R$ 1.500 = R$ 900
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// Types
// ============================================================================

export interface RefundCalculation {
  refundAmount: number;
  amountPaid: number;
  charactersDelivered: number;
  totalStandaloneValue: number;
  breakdown: CharacterBreakdown[];
}

export interface CharacterBreakdown {
  characterId: string;
  characterName: string;
  characterType: 'standard' | 'premium';
  deliveryMonth: string;
  standalonePrice: number;
}

export interface CancellationResult {
  success: boolean;
  message: string;
  refundAmount: number;
  charactersDelivered: number;
  breakdown: CharacterBreakdown[];
}

// ============================================================================
// Public Functions
// ============================================================================

/**
 * Calcula reembolso segundo CDC
 *
 * Fórmula: Reembolso = Valor Pago - (Personagens Entregues × Valor Avulso)
 *
 * @param subscriptionId - UUID da assinatura
 * @returns Cálculo detalhado do reembolso
 * @throws Error se assinatura não existir ou não estiver ativa
 */
export async function calculateRefund(subscriptionId: string): Promise<RefundCalculation> {
  const { data, error } = await supabase.rpc('calculate_cdc_refund', {
    p_subscription_id: subscriptionId,
  });

  if (error) {
    throw new Error(`Failed to calculate refund: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error(`No refund calculation returned for subscription ${subscriptionId}`);
  }

  const result = data[0];

  return {
    refundAmount: parseFloat(result.refund_amount),
    amountPaid: parseFloat(result.amount_paid),
    charactersDelivered: result.characters_delivered,
    totalStandaloneValue: parseFloat(result.total_standalone_value),
    breakdown: result.breakdown || [],
  };
}

/**
 * Processa cancelamento com reembolso
 *
 * Fluxo:
 * 1. Calcula reembolso segundo CDC
 * 2. Processa reembolso no gateway de pagamento
 * 3. Atualiza status da assinatura
 * 4. Registra transação de reembolso
 *
 * @param subscriptionId - UUID da assinatura
 * @returns Resultado do cancelamento
 * @throws Error se cancelamento falhar
 */
export async function cancelSubscriptionWithRefund(
  subscriptionId: string
): Promise<CancellationResult> {
  // 1. Calcular reembolso
  const refundCalc = await calculateRefund(subscriptionId);

  // 2. Processar reembolso no gateway (se houver valor a reembolsar)
  let refundTransactionId: string | null = null;

  if (refundCalc.refundAmount > 0) {
    refundTransactionId = await processRefundInGateway(subscriptionId, refundCalc.refundAmount);
  }

  // 3. Processar cancelamento no banco
  const { data, error } = await supabase.rpc('process_subscription_cancellation_with_refund', {
    p_subscription_id: subscriptionId,
    p_refund_transaction_id: refundTransactionId,
  });

  if (error) {
    throw new Error(`Failed to process cancellation: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error(`No cancellation result returned for subscription ${subscriptionId}`);
  }

  const result = data[0];

  if (!result.success) {
    throw new Error(result.message);
  }

  // 4. Enviar notificação ao cliente
  await sendCancellationNotification(subscriptionId, result);

  return {
    success: result.success,
    message: result.message,
    refundAmount: parseFloat(result.refund_amount),
    charactersDelivered: result.characters_delivered,
    breakdown: result.breakdown || [],
  };
}

/**
 * Simula cancelamento (dry-run)
 *
 * Calcula quanto seria reembolsado sem efetuar o cancelamento.
 * Útil para mostrar ao cliente antes de confirmar.
 *
 * @param subscriptionId - UUID da assinatura
 * @returns Cálculo do reembolso
 */
export async function simulateCancellation(subscriptionId: string): Promise<RefundCalculation> {
  return calculateRefund(subscriptionId);
}

// ============================================================================
// Private Functions
// ============================================================================

/**
 * Processa reembolso no gateway de pagamento
 *
 * TODO: Implementar integração real com gateway (Stripe, PagSeguro, etc.)
 * Por enquanto, retorna um ID mockado.
 *
 * @param subscriptionId - UUID da assinatura
 * @param amount - Valor a reembolsar
 * @returns ID da transação de reembolso
 */
async function processRefundInGateway(subscriptionId: string, amount: number): Promise<string> {
  // TODO: Implementar integração real
  // Exemplo com Stripe:
  // const refund = await stripe.refunds.create({
  //   payment_intent: paymentIntentId,
  //   amount: Math.round(amount * 100) // Stripe usa centavos
  // });
  // return refund.id;

  console.log(
    `[REFUND] Processing refund for subscription ${subscriptionId}: R$ ${amount.toFixed(2)}`
  );

  // Mock: retornar ID fictício
  return `refund_${Date.now()}_${subscriptionId.substring(0, 8)}`;
}

/**
 * Envia notificação de cancelamento ao cliente
 *
 * TODO: Implementar envio real de email
 * Por enquanto, apenas loga.
 *
 * @param subscriptionId - UUID da assinatura
 * @param result - Resultado do cancelamento
 */
async function sendCancellationNotification(
  subscriptionId: string,
  result: CancellationResult
): Promise<void> {
  // TODO: Implementar envio de email
  // Exemplo:
  // await sendEmail({
  //   to: user.email,
  //   subject: 'Cancelamento de Assinatura',
  //   template: 'cancellation',
  //   data: {
  //     refundAmount: result.refundAmount,
  //     charactersDelivered: result.charactersDelivered
  //   }
  // });

  console.log(
    `[NOTIFICATION] Cancellation notification for subscription ${subscriptionId}:`,
    result.message
  );
}
