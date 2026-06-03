
/**
 * Tipos TypeScript para o Sistema de Preços Contextuais
 * 
 * Este arquivo contém tipos auxiliares, constantes e validações
 * para o sistema de preços contextuais implementado.
 */

import { Database } from '@/integrations/supabase/types';

// ============================================================================
// TIPOS DE TABELAS DO BANCO DE DADOS
// ============================================================================

export type CollectionType = Database['public']['Tables']['collection_types']['Row'];
export type CollectionTypeInsert = Database['public']['Tables']['collection_types']['Insert'];
export type CollectionTypeUpdate = Database['public']['Tables']['collection_types']['Update'];

export type CollectionBasePricing = Database['public']['Tables']['collection_base_pricing']['Row'];
export type CollectionBasePricingInsert = Database['public']['Tables']['collection_base_pricing']['Insert'];
export type CollectionBasePricingUpdate = Database['public']['Tables']['collection_base_pricing']['Update'];

export type PricingContextMultiplier = Database['public']['Tables']['pricing_context_multipliers']['Row'];
export type PricingContextMultiplierInsert = Database['public']['Tables']['pricing_context_multipliers']['Insert'];
export type PricingContextMultiplierUpdate = Database['public']['Tables']['pricing_context_multipliers']['Update'];

export type ContextualPricingHistory = Database['public']['Tables']['pricing_history']['Row'];
export type ContextualPricingHistoryInsert = Database['public']['Tables']['pricing_history']['Insert'];
export type ContextualPricingHistoryUpdate = Database['public']['Tables']['pricing_history']['Update'];

// ============================================================================
// TIPOS DE CONTEXTO DE USUÁRIO
// ============================================================================

/**
 * Contextos de usuário disponíveis para cálculo de preço
 */
export type UserContext = 
  | 'subscribed_chosen'      // Assinante com coleção escolhida (desconto aplicado)
  | 'subscribed_not_chosen'  // Assinante sem coleção escolhida (multiplicador aplicado)
  | 'no_subscription';       // Não assinante (multiplicador aplicado)

/**
 * Tipos de coleção disponíveis
 */
export type CollectionTypeName = 
  | 'subscription'       // Coleção de assinatura (preço contextual)
  | 'standard_catalog'   // Catálogo padrão (preço fixo)
  | 'premium_catalog';   // Catálogo premium (preço fixo)

// ============================================================================
// TIPOS DE MUDANÇA DE HISTÓRICO
// ============================================================================

/**
 * Tipos de mudança registrados no histórico
 */
export type ChangeType = 
  | 'base_price'                        // Mudança no preço base
  | 'multiplier'                        // Mudança no multiplicador
  | 'chosen_collection_discount';       // Mudança no desconto de coleções escolhidas

// ============================================================================
// TIPOS DE VALIDAÇÃO
// ============================================================================

/**
 * Percentual de desconto (0-100%)
 * Usado para desconto de coleções escolhidas
 */
export type DiscountPercentage = number;

/**
 * Valida se um número é um percentual válido (0-100)
 */
export function isValidDiscountPercentage(value: number): value is DiscountPercentage {
  return typeof value === 'number' && value >= 0 && value <= 100 && Number.isInteger(value);
}

/**
 * Multiplicador de preço (deve ser > 0)
 * Usado para ajustar preços baseado em contexto
 */
export type PriceMultiplier = number;

/**
 * Valida se um número é um multiplicador válido (> 0)
 */
export function isValidMultiplier(value: number): value is PriceMultiplier {
  return typeof value === 'number' && value > 0;
}

/**
 * Preço em coins (sempre INTEGER, nunca decimal)
 */
export type PriceInCoins = number;

/**
 * Valida se um número é um preço válido em coins (INTEGER > 0)
 */
export function isValidPriceInCoins(value: number): value is PriceInCoins {
  return typeof value === 'number' && value > 0 && Number.isInteger(value);
}

// ============================================================================
// TIPOS DE RESPOSTA DE FUNÇÕES RPC
// ============================================================================

/**
 * Resposta da função get_collection_price()
 * Retorna o preço calculado em coins (INTEGER)
 */
export type CollectionPriceResponse = PriceInCoins;

/**
 * Resposta da função validate_collection_limit()
 */
export interface CollectionLimitValidation {
  can_add: boolean;
  current_count: number;
  limit: number;
  is_unlimited: boolean;
  remaining: number;
}

// ============================================================================
// TIPOS PARA HOOKS REACT
// ============================================================================

/**
 * Dados de preço base com informações do tipo
 */
export interface BasePricingWithType extends CollectionBasePricing {
  collection_type?: CollectionType;
}

/**
 * Dados de multiplicador com cálculo de percentual
 */
export interface MultiplierWithPercentage extends PricingContextMultiplier {
  percentage: number; // Calculado: (multiplier - 1) * 100
}

/**
 * Preview de preço calculado
 */
export interface PricePreview {
  collection_type_id: string;
  collection_type_name: string;
  user_context: UserContext;
  base_price: PriceInCoins;
  multiplier?: PriceMultiplier;
  discount_percentage?: DiscountPercentage;
  final_price: PriceInCoins;
  formula: string; // Ex: "1000 - (1000 × 20%) = 800 coins"
  has_discount: boolean;
}

/**
 * Informações de limite de coleções para UI
 */
export interface CollectionLimitInfo extends CollectionLimitValidation {
  usageText: string;        // Ex: "2 de 3 coleções"
  progressPercentage: number; // Ex: 66.67
}

// ============================================================================
// CONSTANTES
// ============================================================================

/**
 * Constantes de contexto de usuário
 */
export const USER_CONTEXTS = {
  SUBSCRIBED_CHOSEN: 'subscribed_chosen' as UserContext,
  SUBSCRIBED_NOT_CHOSEN: 'subscribed_not_chosen' as UserContext,
  NO_SUBSCRIPTION: 'no_subscription' as UserContext,
} as const;

/**
 * Constantes de tipos de coleção
 */
export const COLLECTION_TYPE_NAMES = {
  SUBSCRIPTION: 'subscription' as CollectionTypeName,
  STANDARD_CATALOG: 'standard_catalog' as CollectionTypeName,
  PREMIUM_CATALOG: 'premium_catalog' as CollectionTypeName,
} as const;

/**
 * Constantes de tipos de mudança
 */
export const CHANGE_TYPES = {
  BASE_PRICE: 'base_price' as ChangeType,
  MULTIPLIER: 'multiplier' as ChangeType,
  CHOSEN_COLLECTION_DISCOUNT: 'chosen_collection_discount' as ChangeType,
} as const;

/**
 * Limites de validação
 */
export const VALIDATION_LIMITS = {
  MIN_DISCOUNT_PERCENTAGE: 0,
  MAX_DISCOUNT_PERCENTAGE: 100,
  MIN_MULTIPLIER: 0.01,
  MAX_MULTIPLIER: 10.0,
  MIN_PRICE_COINS: 1,
  UNLIMITED_COLLECTIONS: -1,
} as const;

/**
 * Configuração de cache (RN010)
 */
export const CACHE_CONFIG = {
  STALE_TIME: 5 * 60 * 1000,  // 5 minutos
  CACHE_TIME: 10 * 60 * 1000, // 10 minutos
} as const;

/**
 * Chaves de query para React Query
 */
export const QUERY_KEYS = {
  BASE_PRICING: 'base-pricing',
  CONTEXT_PRICING: 'context-pricing',
  COLLECTION_PRICE: 'collection-price',
  COLLECTION_LIMIT: 'collection-limit',
  COLLECTION_TYPES: 'collection-types',
  PRICING_HISTORY: 'pricing-history',
} as const;

// ============================================================================
// HELPERS DE CÁLCULO
// ============================================================================

/**
 * Calcula o percentual de um multiplicador
 * Ex: 1.2 → 20% (acréscimo), 0.8 → -20% (desconto)
 */
export function calculateMultiplierPercentage(multiplier: PriceMultiplier): number {
  return (multiplier - 1) * 100;
}

/**
 * Calcula o preço com desconto percentual
 * Ex: base=1000, discount=20 → 800 coins
 */
export function calculateDiscountedPrice(
  basePrice: PriceInCoins,
  discountPercentage: DiscountPercentage
): PriceInCoins {
  return Math.round(basePrice - (basePrice * discountPercentage / 100));
}

/**
 * Calcula o preço com multiplicador
 * Ex: base=1000, multiplier=1.2 → 1200 coins
 */
export function calculateMultipliedPrice(
  basePrice: PriceInCoins,
  multiplier: PriceMultiplier
): PriceInCoins {
  return Math.round(basePrice * multiplier);
}

/**
 * Formata preço em coins com emoji
 * Ex: 1000 → "1000 🪙"
 */
export function formatPriceInCoins(price: PriceInCoins): string {
  return `${price} 🪙`;
}

/**
 * Calcula a economia em coins
 * Ex: original=1000, final=800 → 200 coins
 */
export function calculateSavings(originalPrice: PriceInCoins, finalPrice: PriceInCoins): PriceInCoins {
  return originalPrice - finalPrice;
}

/**
 * Calcula o percentual de economia
 * Ex: original=1000, final=800 → 20%
 */
export function calculateSavingsPercentage(originalPrice: PriceInCoins, finalPrice: PriceInCoins): number {
  if (originalPrice === 0) return 0;
  return Math.round(((originalPrice - finalPrice) / originalPrice) * 100);
}

// ============================================================================
// HELPERS DE VALIDAÇÃO
// ============================================================================

/**
 * Valida dados de preço base
 */
export function validateBasePricing(data: Partial<CollectionBasePricingInsert>): string[] {
  const errors: string[] = [];
  
  if (data.base_price_coins !== undefined && !isValidPriceInCoins(data.base_price_coins)) {
    errors.push('Preço base deve ser um número inteiro maior que 0');
  }
  
  if (!data.collection_type_id) {
    errors.push('Tipo de coleção é obrigatório');
  }
  
  return errors;
}

/**
 * Valida dados de multiplicador
 */
export function validateMultiplier(data: Partial<PricingContextMultiplierInsert>): string[] {
  const errors: string[] = [];
  
  if (data.multiplier !== undefined && !isValidMultiplier(data.multiplier)) {
    errors.push('Multiplicador deve ser maior que 0');
  }
  
  if (data.chosen_collection_discount_percentage !== undefined && 
      data.chosen_collection_discount_percentage !== null &&
      !isValidDiscountPercentage(data.chosen_collection_discount_percentage)) {
    errors.push('Desconto deve ser um número inteiro entre 0 e 100');
  }
  
  if (!data.user_context) {
    errors.push('Contexto de usuário é obrigatório');
  }
  
  return errors;
}

/**
 * Valida dados de tipo de coleção
 */
export function validateCollectionType(data: Partial<CollectionTypeInsert>): string[] {
  const errors: string[] = [];
  
  if (!data.name || data.name.trim() === '') {
    errors.push('Nome é obrigatório');
  }
  
  if (!data.display_name || data.display_name.trim() === '') {
    errors.push('Nome de exibição é obrigatório');
  }
  
  return errors;
}
