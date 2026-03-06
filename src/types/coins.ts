// @ts-nocheck
/**
 * Tipos unificados para o sistema de Coins
 * 
 * Este arquivo centraliza todos os tipos relacionados a coins,
 * substituindo tipos duplicados e inconsistentes.
 * 
 * @module types/coins
 */

// ============================================================================
// TIPOS BASE
// ============================================================================

/**
 * Quantidade de coins (sempre inteiro positivo)
 */
export type CoinsAmount = number;

/**
 * ID de usuário (UUID)
 */
export type UserId = string;

/**
 * ID de transação (UUID)
 */
export type TransactionId = string;

// ============================================================================
// SALDO DE COINS
// ============================================================================

/**
 * Saldo de coins de um usuário
 */
export interface CoinsBalance {
  /** ID do usuário */
  user_id: UserId;
  /** Saldo atual em coins */
  balance: CoinsAmount;
  /** Última atualização do saldo */
  last_updated: string;
}

// ============================================================================
// TRANSAÇÕES
// ============================================================================

/**
 * Tipos de transação de coins
 */
export enum CoinsTransactionType {
  /** Compra de pacote de coins */
  PURCHASE = 'purchase',
  /** Gasto em personagem/coleção */
  SPEND = 'spend',
  /** Reembolso de coins */
  REFUND = 'refund',
  /** Ajuste manual pelo admin */
  ADMIN_ADJUSTMENT = 'admin_adjustment',
  /** Crédito de assinatura (mensal) */
  SUBSCRIPTION_CREDIT = 'subscription_credit',
  /** Bônus promocional */
  BONUS = 'bonus',
}

/**
 * Transação de coins
 */
export interface CoinsTransaction {
  /** ID da transação */
  id: TransactionId;
  /** ID do usuário */
  user_id: UserId;
  /** Quantidade (positivo = crédito, negativo = débito) */
  amount: number;
  /** Tipo de transação */
  type: CoinsTransactionType;
  /** Descrição da transação */
  description: string;
  /** ID de referência (character_id, package_id, etc) */
  reference_id?: string | null;
  /** Tipo de referência (character, package, subscription, etc) */
  reference_type?: string | null;
  /** Data/hora da transação */
  created_at: string;
}

// ============================================================================
// PACOTES DE COINS
// ============================================================================

/**
 * Pacote de coins disponível para compra
 */
export interface CoinsPackage {
  /** ID do pacote */
  id: string;
  /** Nome do pacote (ex: "Starter", "Premium") */
  name: string;
  /** Descrição do pacote */
  description?: string | null;
  /** Quantidade base de coins */
  coins_amount: CoinsAmount;
  /** Coins bônus */
  bonus_coins: CoinsAmount;
  /** Total de coins (amount + bonus) */
  total_coins: CoinsAmount;
  /** Preço em reais */
  price_brl: number;
  /** Pacote está ativo? */
  is_active: boolean;
  /** Ordem de exibição */
  display_order: number;
  /** Data de criação */
  created_at: string;
  /** Data de atualização */
  updated_at: string;
}

// ============================================================================
// COMPRAS COM COINS
// ============================================================================

/**
 * Tipo de aquisição de item
 */
export enum AcquisitionType {
  /** Compra com coins */
  COIN_PURCHASE = 'coin_purchase',
  /** Incluído na assinatura */
  SUBSCRIPTION = 'subscription',
  /** Presente/bônus */
  GIFT = 'gift',
  /** Concedido pelo admin */
  ADMIN_GRANT = 'admin_grant',
  /** Promoção especial */
  PROMOTION = 'promotion',
}

/**
 * Personagem adquirido por usuário
 */
export interface UserCharacter {
  /** ID do registro */
  id: string;
  /** ID do usuário */
  user_id: UserId;
  /** ID do personagem */
  character_id: string;
  /** Tipo de aquisição */
  acquisition_type: AcquisitionType;
  /** Preço pago em coins (null se não foi compra) */
  price_paid: CoinsAmount | null;
  /** Data/hora de aquisição */
  acquired_at: string;
  /** Data de criação do registro */
  created_at: string;
}

// ============================================================================
// PREÇOS CONTEXTUAIS
// ============================================================================

/**
 * Contexto do usuário para cálculo de preço
 */
export enum UserContext {
  /** Assinante que escolheu esta coleção */
  SUBSCRIBED_CHOSEN = 'subscribed_chosen',
  /** Assinante que não escolheu esta coleção */
  SUBSCRIBED_NOT_CHOSEN = 'subscribed_not_chosen',
  /** Não assinante */
  NO_SUBSCRIPTION = 'no_subscription',
}

/**
 * Tipo de coleção (para precificação)
 */
export interface CollectionType {
  /** ID do tipo */
  id: string;
  /** Nome do tipo (ex: "subscription", "standard_catalog") */
  name: string;
  /** Descrição */
  description?: string | null;
  /** Tipo está ativo? */
  is_active: boolean;
}

/**
 * Preço base de uma coleção (em coins)
 */
export interface CollectionBasePrice {
  /** ID do tipo de coleção */
  collection_type_id: string;
  /** Preço base em coins */
  base_price_coins: CoinsAmount;
  /** Preço está ativo? */
  is_active: boolean;
  /** Data de criação */
  created_at: string;
  /** Data de atualização */
  updated_at: string;
}

/**
 * Multiplicador de preço por contexto
 */
export interface PricingMultiplier {
  /** Contexto do usuário */
  user_context: UserContext;
  /** Multiplicador (1.0 = 100%, 1.2 = +20%, 0.8 = -20%) */
  multiplier: number;
  /** Desconto percentual para coleção escolhida (0-100) */
  chosen_collection_discount_percentage: number;
  /** Descrição */
  description?: string | null;
  /** Multiplicador está ativo? */
  is_active: boolean;
  /** Data de criação */
  created_at: string;
  /** Data de atualização */
  updated_at: string;
}

/**
 * Resultado do cálculo de preço contextual
 */
export interface ContextualPrice {
  /** Preço final em coins */
  final_price: CoinsAmount;
  /** Preço base (antes de multiplicadores/descontos) */
  base_price: CoinsAmount;
  /** Contexto aplicado */
  context: UserContext;
  /** Multiplicador aplicado (se houver) */
  multiplier?: number;
  /** Desconto aplicado em % (se houver) */
  discount_percentage?: number;
  /** Fórmula de cálculo (para debug) */
  formula: string;
}

// ============================================================================
// HISTÓRICO DE MUDANÇAS DE PREÇO
// ============================================================================

/**
 * Tipo de mudança de preço
 */
export enum PriceChangeType {
  /** Mudança de preço base */
  BASE_PRICE = 'base_price',
  /** Mudança de multiplicador */
  MULTIPLIER = 'multiplier',
  /** Mudança de desconto para escolhida */
  CHOSEN_DISCOUNT = 'chosen_discount',
}

/**
 * Registro de mudança de preço (auditoria)
 */
export interface PricingHistory {
  /** ID do registro */
  id: string;
  /** Tipo de mudança */
  change_type: PriceChangeType;
  /** ID do tipo de coleção (se aplicável) */
  collection_type_id?: string | null;
  /** Contexto do usuário (se aplicável) */
  user_context?: UserContext | null;
  /** Valor antigo */
  old_value: number;
  /** Valor novo */
  new_value: number;
  /** Admin que fez a mudança */
  changed_by: UserId;
  /** Data/hora da mudança */
  changed_at: string;
}

// ============================================================================
// PARÂMETROS DE FUNÇÕES
// ============================================================================

/**
 * Parâmetros para adicionar coins
 */
export interface AddCoinsParams {
  /** ID do usuário */
  user_id: UserId;
  /** Quantidade de coins */
  amount: CoinsAmount;
  /** Descrição da transação */
  description: string;
  /** ID de referência (opcional) */
  reference_id?: string;
  /** Tipo de referência (opcional) */
  reference_type?: string;
}

/**
 * Parâmetros para debitar coins
 */
export interface DebitCoinsParams {
  /** ID do usuário */
  user_id: UserId;
  /** Quantidade de coins */
  amount: CoinsAmount;
  /** Descrição da transação */
  description: string;
  /** ID de referência (opcional) */
  reference_id?: string;
  /** Tipo de referência (opcional) */
  reference_type?: string;
}

/**
 * Parâmetros para comprar personagem com coins
 */
export interface PurchaseCharacterParams {
  /** ID do usuário */
  user_id: UserId;
  /** ID do personagem */
  character_id: string;
  /** Quantidade de coins (para validação) */
  coins_amount: CoinsAmount;
}

/**
 * Parâmetros para calcular preço de coleção
 */
export interface GetCollectionPriceParams {
  /** ID da coleção */
  collection_id: string;
  /** ID do usuário (para contexto) */
  user_id?: UserId | null;
}

/**
 * Parâmetros para calcular preço de personagem
 */
export interface GetCharacterPriceParams {
  /** ID do personagem */
  character_id: string;
  /** ID do usuário (para contexto) */
  user_id?: UserId | null;
}

// ============================================================================
// RESPOSTAS DE API
// ============================================================================

/**
 * Resposta de saldo de coins
 */
export interface CoinsBalanceResponse {
  /** Saldo atual */
  balance: CoinsAmount;
  /** Última atualização */
  last_updated: string;
}

/**
 * Resposta de lista de transações
 */
export interface CoinsTransactionsResponse {
  /** Lista de transações */
  transactions: CoinsTransaction[];
  /** Total de registros */
  total: number;
  /** Página atual */
  page: number;
  /** Registros por página */
  per_page: number;
  /** Tem próxima página? */
  has_next: boolean;
}

/**
 * Resposta de lista de pacotes
 */
export interface CoinsPackagesResponse {
  /** Lista de pacotes */
  packages: CoinsPackage[];
  /** Total de pacotes ativos */
  total: number;
}

/**
 * Resposta de compra com coins
 */
export interface PurchaseWithCoinsResponse {
  /** Compra foi bem-sucedida? */
  success: boolean;
  /** Mensagem de resultado */
  message: string;
  /** Novo saldo após compra */
  new_balance: CoinsAmount;
  /** ID do item adquirido */
  item_id: string;
  /** ID da transação */
  transaction_id: TransactionId;
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Verifica se quantidade de coins é válida
 */
export function isValidCoinsAmount(amount: unknown): amount is CoinsAmount {
  return typeof amount === 'number' && amount >= 0 && Number.isInteger(amount);
}

/**
 * Formata quantidade de coins para exibição
 */
export function formatCoins(amount: CoinsAmount): string {
  return `${amount.toLocaleString('pt-BR')} coins`;
}

/**
 * Converte reais para coins
 */
export function brlToCoins(brl: number, rate: number = 100): CoinsAmount {
  return Math.round(brl * rate);
}

/**
 * Converte coins para reais
 */
export function coinsToBrl(coins: CoinsAmount, rate: number = 100): number {
  return coins / rate;
}

/**
 * Formata tipo de transação para exibição
 */
export function formatTransactionType(type: CoinsTransactionType): string {
  const labels: Record<CoinsTransactionType, string> = {
    [CoinsTransactionType.PURCHASE]: 'Compra de Coins',
    [CoinsTransactionType.SPEND]: 'Compra de Personagem',
    [CoinsTransactionType.REFUND]: 'Reembolso',
    [CoinsTransactionType.ADMIN_ADJUSTMENT]: 'Ajuste Manual',
    [CoinsTransactionType.SUBSCRIPTION_CREDIT]: 'Crédito de Assinatura',
    [CoinsTransactionType.BONUS]: 'Bônus',
  };
  return labels[type] || type;
}

/**
 * Formata contexto de usuário para exibição
 */
export function formatUserContext(context: UserContext): string {
  const labels: Record<UserContext, string> = {
    [UserContext.SUBSCRIBED_CHOSEN]: 'Assinante (Coleção Escolhida)',
    [UserContext.SUBSCRIBED_NOT_CHOSEN]: 'Assinante (Coleção Não Escolhida)',
    [UserContext.NO_SUBSCRIPTION]: 'Não Assinante',
  };
  return labels[context] || context;
}
