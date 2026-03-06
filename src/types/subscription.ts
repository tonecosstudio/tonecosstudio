// @ts-nocheck
/**
 * Tipos unificados para o sistema de Assinaturas
 * 
 * Este arquivo centraliza todos os tipos relacionados a assinaturas,
 * integrando com o sistema de coins.
 * 
 * @module types/subscription
 */

import { CoinsAmount, UserId } from './coins';

// ============================================================================
// TIPOS DE PLANO
// ============================================================================

/**
 * Tipos de plano de assinatura disponíveis
 */
export enum PlanType {
  /** Plano avulso (não recorrente) */
  AVULSO = 'avulso',
  /** Plano bimestral (2 meses) */
  BIMESTRAL = 'bimestral',
  /** Plano trimestral (3 meses) */
  TRIMESTRAL = 'trimestral',
  /** Plano semestral (6 meses) */
  SEMESTRAL = 'semestral',
  /** Plano anual (12 meses) */
  ANUAL = 'anual',
}

/**
 * Tipo de bônus do plano
 */
export enum BonusType {
  /** Bônus em peças adicionais */
  PIECES = 'pieces',
  /** Bônus em coins diretos */
  COINS = 'coins',
}

// ============================================================================
// PLANO DE ASSINATURA
// ============================================================================

/**
 * Configuração de um plano de assinatura
 */
export interface SubscriptionPlan {
  /** ID do plano */
  id: string;
  /** Tipo do plano */
  plan_type: PlanType;
  /** Preço total do plano (R$) */
  total_price: number;
  /** Tipo de bônus */
  bonus_type: BonusType;
  
  // Peças
  /** Quantidade de peças base */
  base_pieces: number;
  /** Quantidade de peças bônus */
  bonus_pieces: number;
  /** Total de peças (base + bônus) */
  total_pieces: number;
  
  // Coins
  /** Coins por peça base */
  coins_per_piece: CoinsAmount;
  /** Coins por peça bônus */
  coins_per_bonus_piece: CoinsAmount;
  /** Total de coins base */
  base_credits: CoinsAmount;
  /** Total de coins bônus */
  bonus_credits: CoinsAmount;
  /** Total de coins (base + bônus) */
  total_credits: CoinsAmount;
  /** Custo unitário por coin (R$/coin) */
  coin_unit_cost: number;
  
  // Metadados
  /** Plano está ativo? */
  is_active: boolean;
  /** Data de criação */
  created_at: string;
  /** Data de atualização */
  updated_at: string;
}

// ============================================================================
// STATUS DE ASSINATURA
// ============================================================================

/**
 * Status possíveis de uma assinatura
 */
export enum SubscriptionStatus {
  /** Assinatura ativa */
  ACTIVE = 'active',
  /** Assinatura pausada */
  PAUSED = 'paused',
  /** Assinatura cancelada */
  CANCELLED = 'cancelled',
  /** Assinatura expirada */
  EXPIRED = 'expired',
  /** Aguardando pagamento */
  PENDING_PAYMENT = 'pending_payment',
}

// ============================================================================
// ASSINATURA
// ============================================================================

/**
 * Assinatura de um usuário
 */
export interface Subscription {
  /** ID da assinatura */
  id: string;
  /** ID do usuário */
  user_id: UserId;
  /** Tipo do plano */
  plan_type: PlanType;
  /** Status da assinatura */
  status: SubscriptionStatus;
  
  // Datas
  /** Data de início */
  start_date: string;
  /** Data de término (se houver) */
  end_date?: string | null;
  /** Próxima data de cobrança */
  next_billing_date?: string | null;
  /** Data de cancelamento (se houver) */
  cancelled_at?: string | null;
  
  // Pagamento
  /** Valor da mensalidade (R$) */
  monthly_price: number;
  /** Método de pagamento */
  payment_method?: string | null;
  
  // Coins
  /** Coins recebidos por mês */
  coins_per_month: CoinsAmount;
  /** Total de coins já recebidos */
  total_coins_received: CoinsAmount;
  
  // Metadados
  /** Data de criação */
  created_at: string;
  /** Data de atualização */
  updated_at: string;
}

// ============================================================================
// HISTÓRICO DE PAGAMENTOS
// ============================================================================

/**
 * Status de um pagamento
 */
export enum PaymentStatus {
  /** Pagamento pendente */
  PENDING = 'pending',
  /** Pagamento aprovado */
  APPROVED = 'approved',
  /** Pagamento rejeitado */
  REJECTED = 'rejected',
  /** Pagamento reembolsado */
  REFUNDED = 'refunded',
}

/**
 * Registro de pagamento de assinatura
 */
export interface SubscriptionPayment {
  /** ID do pagamento */
  id: string;
  /** ID da assinatura */
  subscription_id: string;
  /** ID do usuário */
  user_id: UserId;
  /** Valor pago (R$) */
  amount: number;
  /** Status do pagamento */
  status: PaymentStatus;
  /** Método de pagamento */
  payment_method: string;
  /** Referência externa (ID do gateway) */
  external_reference?: string | null;
  /** Coins creditados neste pagamento */
  coins_credited: CoinsAmount;
  /** Data do pagamento */
  paid_at?: string | null;
  /** Data de criação */
  created_at: string;
  /** Data de atualização */
  updated_at: string;
}

// ============================================================================
// COLEÇÕES ESCOLHIDAS
// ============================================================================

/**
 * Coleção escolhida por assinante
 */
export interface SubscriptionCollection {
  /** ID do registro */
  id: string;
  /** ID da assinatura */
  subscription_id: string;
  /** ID do usuário */
  user_id: UserId;
  /** ID da coleção */
  collection_id: string;
  /** ID do ciclo */
  cycle_id: string;
  /** Preço pago em coins */
  price_paid_coins: CoinsAmount;
  /** Data de escolha */
  chosen_at: string;
  /** Data de criação */
  created_at: string;
}

// ============================================================================
// PARÂMETROS DE FUNÇÕES
// ============================================================================

/**
 * Parâmetros para criar assinatura
 */
export interface CreateSubscriptionParams {
  /** ID do usuário */
  user_id: UserId;
  /** Tipo do plano */
  plan_type: PlanType;
  /** Método de pagamento */
  payment_method: string;
  /** Data de início (opcional, padrão: hoje) */
  start_date?: string;
}

/**
 * Parâmetros para processar pagamento de assinatura
 */
export interface ProcessSubscriptionPaymentParams {
  /** ID da assinatura */
  subscription_id: string;
  /** Valor pago (R$) */
  amount: number;
  /** Método de pagamento */
  payment_method: string;
  /** Referência externa (ID do gateway) */
  external_reference?: string;
}

/**
 * Parâmetros para escolher coleção
 */
export interface ChooseCollectionParams {
  /** ID da assinatura */
  subscription_id: string;
  /** ID do usuário */
  user_id: UserId;
  /** ID da coleção */
  collection_id: string;
  /** ID do ciclo */
  cycle_id: string;
}

/**
 * Parâmetros para cancelar assinatura
 */
export interface CancelSubscriptionParams {
  /** ID da assinatura */
  subscription_id: string;
  /** Motivo do cancelamento */
  reason?: string;
  /** Reembolsar coins não usados? */
  refund_unused_coins?: boolean;
}

// ============================================================================
// RESPOSTAS DE API
// ============================================================================

/**
 * Resposta de criação de assinatura
 */
export interface CreateSubscriptionResponse {
  /** Assinatura criada */
  subscription: Subscription;
  /** Plano escolhido */
  plan: SubscriptionPlan;
  /** Mensagem de sucesso */
  message: string;
}

/**
 * Resposta de processamento de pagamento
 */
export interface ProcessPaymentResponse {
  /** Pagamento foi aprovado? */
  success: boolean;
  /** Registro de pagamento */
  payment: SubscriptionPayment;
  /** Coins creditados */
  coins_credited: CoinsAmount;
  /** Novo saldo de coins */
  new_balance: CoinsAmount;
  /** Mensagem de resultado */
  message: string;
}

/**
 * Resposta de escolha de coleção
 */
export interface ChooseCollectionResponse {
  /** Escolha foi bem-sucedida? */
  success: boolean;
  /** Registro de escolha */
  choice: SubscriptionCollection;
  /** Coins gastos */
  coins_spent: CoinsAmount;
  /** Novo saldo de coins */
  new_balance: CoinsAmount;
  /** Mensagem de resultado */
  message: string;
}

/**
 * Resposta de cancelamento de assinatura
 */
export interface CancelSubscriptionResponse {
  /** Cancelamento foi bem-sucedido? */
  success: boolean;
  /** Assinatura atualizada */
  subscription: Subscription;
  /** Coins reembolsados (se houver) */
  coins_refunded?: CoinsAmount;
  /** Mensagem de resultado */
  message: string;
}

// ============================================================================
// BENEFÍCIOS DO PLANO
// ============================================================================

/**
 * Benefícios de um plano de assinatura
 */
export interface PlanBenefits {
  /** Tipo do plano */
  plan_type: PlanType;
  /** Coins por mês */
  coins_per_month: CoinsAmount;
  /** Peças por mês */
  pieces_per_month: number;
  /** Desconto em coleções escolhidas (%) */
  chosen_collection_discount: number;
  /** Acesso a personagens exclusivos? */
  exclusive_characters: boolean;
  /** Prioridade em lançamentos? */
  priority_access: boolean;
  /** Frete grátis? */
  free_shipping: boolean;
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Verifica se assinatura está ativa
 */
export function isSubscriptionActive(subscription: Subscription): boolean {
  return subscription.status === SubscriptionStatus.ACTIVE;
}

/**
 * Calcula coins por mês baseado no plano
 */
export function getCoinsPerMonth(plan: SubscriptionPlan): CoinsAmount {
  const months = getPlanDurationInMonths(plan.plan_type);
  return Math.round(plan.total_credits / months);
}

/**
 * Retorna duração do plano em meses
 */
export function getPlanDurationInMonths(planType: PlanType): number {
  const durations: Record<PlanType, number> = {
    [PlanType.AVULSO]: 1,
    [PlanType.BIMESTRAL]: 2,
    [PlanType.TRIMESTRAL]: 3,
    [PlanType.SEMESTRAL]: 6,
    [PlanType.ANUAL]: 12,
  };
  return durations[planType];
}

/**
 * Formata tipo de plano para exibição
 */
export function formatPlanType(planType: PlanType): string {
  const labels: Record<PlanType, string> = {
    [PlanType.AVULSO]: 'Avulso',
    [PlanType.BIMESTRAL]: 'Bimestral',
    [PlanType.TRIMESTRAL]: 'Trimestral',
    [PlanType.SEMESTRAL]: 'Semestral',
    [PlanType.ANUAL]: 'Anual',
  };
  return labels[planType];
}

/**
 * Formata status de assinatura para exibição
 */
export function formatSubscriptionStatus(status: SubscriptionStatus): string {
  const labels: Record<SubscriptionStatus, string> = {
    [SubscriptionStatus.ACTIVE]: 'Ativa',
    [SubscriptionStatus.PAUSED]: 'Pausada',
    [SubscriptionStatus.CANCELLED]: 'Cancelada',
    [SubscriptionStatus.EXPIRED]: 'Expirada',
    [SubscriptionStatus.PENDING_PAYMENT]: 'Aguardando Pagamento',
  };
  return labels[status];
}

/**
 * Formata status de pagamento para exibição
 */
export function formatPaymentStatus(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    [PaymentStatus.PENDING]: 'Pendente',
    [PaymentStatus.APPROVED]: 'Aprovado',
    [PaymentStatus.REJECTED]: 'Rejeitado',
    [PaymentStatus.REFUNDED]: 'Reembolsado',
  };
  return labels[status];
}

/**
 * Calcula valor mensal do plano
 */
export function getMonthlyPrice(plan: SubscriptionPlan): number {
  const months = getPlanDurationInMonths(plan.plan_type);
  return plan.total_price / months;
}

/**
 * Calcula economia em relação ao plano avulso
 */
export function calculateSavings(plan: SubscriptionPlan, avulsoPrice: number): number {
  const months = getPlanDurationInMonths(plan.plan_type);
  const totalAvulso = avulsoPrice * months;
  return totalAvulso - plan.total_price;
}

/**
 * Calcula percentual de economia
 */
export function calculateSavingsPercentage(plan: SubscriptionPlan, avulsoPrice: number): number {
  const months = getPlanDurationInMonths(plan.plan_type);
  const totalAvulso = avulsoPrice * months;
  const savings = totalAvulso - plan.total_price;
  return (savings / totalAvulso) * 100;
}
