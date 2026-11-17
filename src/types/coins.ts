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

/** Coins support exact hundredths, for example 237.50 Coins. */
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
  /** Total positive Coins ledger entries */
  total_earned: CoinsAmount;
  /** Absolute total of negative Coins ledger entries */
  total_spent: CoinsAmount;
  /** Última atualização do saldo */
  updated_at: string | null;
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
  ADMIN_ADJUSTMENT = 'adjustment',
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
  /** Quantidade base de coins */
  amount: CoinsAmount;
  /** Coins bônus */
  bonus: CoinsAmount;
  /** Preço em reais */
  price_brl: number;
  /** Pacote está ativo? */
  is_active: boolean;
  /** Pacote destacado como popular? */
  is_popular: boolean;
  /** Pacote destacado como melhor valor? */
  is_best_value: boolean;
  /** Ordem de exibicao */
  sort_order: number;
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
  /** User id for this balance */
  user_id: UserId;
  /** Saldo atual */
  balance: CoinsAmount;
  /** Total positive Coins ledger entries */
  total_earned: CoinsAmount;
  /** Absolute total of negative Coins ledger entries */
  total_spent: CoinsAmount;
  /** Última atualização */
  last_updated: string | null;
  /** Database updated_at timestamp */
  updated_at: string | null;
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
