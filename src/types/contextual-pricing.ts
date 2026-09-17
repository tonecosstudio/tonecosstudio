/**
 * Tipos auxiliares para as superficies de precificacao ainda vigentes.
 *
 * O schema Supabase gerado e a fonte de verdade. O antigo modelo de contexto
 * de assinante e pricing_history foi aposentado e nao deve ser recriado aqui.
 */

import type { Database } from "@/integrations/supabase/types";

export type CollectionType = Database["public"]["Tables"]["collection_types"]["Row"];
export type CollectionTypeInsert = Database["public"]["Tables"]["collection_types"]["Insert"];
export type CollectionTypeUpdate = Database["public"]["Tables"]["collection_types"]["Update"];

export type CollectionBasePricing = Database["public"]["Tables"]["collection_base_pricing"]["Row"];
export type CollectionBasePricingInsert = Database["public"]["Tables"]["collection_base_pricing"]["Insert"];
export type CollectionBasePricingUpdate = Database["public"]["Tables"]["collection_base_pricing"]["Update"];

export type PricingContextMultiplier = Database["public"]["Tables"]["pricing_context_multipliers"]["Row"];
export type PricingContextMultiplierInsert = Database["public"]["Tables"]["pricing_context_multipliers"]["Insert"];
export type PricingContextMultiplierUpdate = Database["public"]["Tables"]["pricing_context_multipliers"]["Update"];

export type CollectionTypeName = "subscription" | "standard_catalog" | "premium_catalog";

export type PriceMultiplier = number;
export type PriceInCoins = number;

export function isValidMultiplier(value: number): value is PriceMultiplier {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function isValidPriceInCoins(value: number): value is PriceInCoins {
  return typeof value === "number" && value > 0 && Number.isInteger(value);
}

export type CollectionPriceResponse = PriceInCoins;

export interface BasePricingWithType extends CollectionBasePricing {
  collection_type?: CollectionType;
}

export interface MultiplierWithPercentage extends PricingContextMultiplier {
  percentage: number;
}

export const COLLECTION_TYPE_NAMES = {
  SUBSCRIPTION: "subscription" as CollectionTypeName,
  STANDARD_CATALOG: "standard_catalog" as CollectionTypeName,
  PREMIUM_CATALOG: "premium_catalog" as CollectionTypeName,
} as const;

export const VALIDATION_LIMITS = {
  MIN_MULTIPLIER: 0.01,
  MAX_MULTIPLIER: 10.0,
  MIN_PRICE_COINS: 1,
  UNLIMITED_COLLECTIONS: -1,
} as const;

export const CACHE_CONFIG = {
  STALE_TIME: 5 * 60 * 1000,
  CACHE_TIME: 10 * 60 * 1000,
} as const;

export const QUERY_KEYS = {
  BASE_PRICING: "base-pricing",
  CONTEXT_PRICING: "context-pricing",
  COLLECTION_PRICE: "collection-price",
  COLLECTION_TYPES: "collection-types",
} as const;

export function calculateMultiplierPercentage(multiplier: PriceMultiplier): number {
  return (multiplier - 1) * 100;
}

export function calculateMultipliedPrice(
  basePrice: PriceInCoins,
  multiplier: PriceMultiplier,
): PriceInCoins {
  return Math.round(basePrice * multiplier);
}

export function formatPriceInCoins(price: PriceInCoins): string {
  return `${price} 🪙`;
}

export function calculateSavings(originalPrice: PriceInCoins, finalPrice: PriceInCoins): PriceInCoins {
  return originalPrice - finalPrice;
}

export function calculateSavingsPercentage(originalPrice: PriceInCoins, finalPrice: PriceInCoins): number {
  if (originalPrice === 0) return 0;
  return Math.round(((originalPrice - finalPrice) / originalPrice) * 100);
}

export function validateBasePricing(data: Partial<CollectionBasePricingInsert>): string[] {
  const errors: string[] = [];

  if (data.base_price_coins !== undefined && !isValidPriceInCoins(data.base_price_coins)) {
    errors.push("Preço base deve ser um número inteiro maior que 0");
  }

  if (!data.collection_type_id) {
    errors.push("Tipo de coleção é obrigatório");
  }

  return errors;
}

export function validateMultiplier(data: Partial<PricingContextMultiplierInsert>): string[] {
  const errors: string[] = [];

  if (data.multiplier !== undefined && !isValidMultiplier(data.multiplier)) {
    errors.push("Multiplicador deve ser maior que 0");
  }

  if (!data.context_type?.trim()) {
    errors.push("Tipo de contexto é obrigatório");
  }

  if (!data.name?.trim()) {
    errors.push("Nome do multiplicador é obrigatório");
  }

  if (!data.display_name?.trim()) {
    errors.push("Nome de exibição é obrigatório");
  }

  return errors;
}

export function validateCollectionType(data: Partial<CollectionTypeInsert>): string[] {
  const errors: string[] = [];

  if (!data.name || data.name.trim() === "") {
    errors.push("Nome é obrigatório");
  }

  if (!data.display_name || data.display_name.trim() === "") {
    errors.push("Nome de exibição é obrigatório");
  }

  return errors;
}
