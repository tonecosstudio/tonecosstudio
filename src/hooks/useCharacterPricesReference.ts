// @ts-nocheck
/**
 * Hook para buscar preços de personagens como referência
 * 
 * Usado pela página Admin Planos para:
 * - Exibir preços atuais de personagens
 * - Calcular poder de compra dos planos
 * - Validar se planos são suficientes
 * - Sugerir valores ideais
 * 
 * SSOT: /admin/coins define os preços
 * Este hook apenas CONSOME (leitura)
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// =====================================================
// TYPES
// =====================================================

export interface CharacterPricesReference {
  colecaoAtiva: number;           // 200 coins (base × 1.0)
  colecaoSecundaria: number;      // 240 coins (base × 1.2)
  catalogoGeral: number;          // 300 coins (base × 1.5)
  premium: number;                // 450 coins (base × 2.25)
  baseReference: number;          // 200 coins (referência)
  multipliers: {
    chosen: number;               // 1.0
    notChosen: number;            // 1.2
    noSubscription: number;       // 1.5
  };
}

export interface PurchasingPower {
  totalCoins: number;
  canBuy: {
    colecaoAtiva: number;         // Quantos personagens pode comprar
    colecaoSecundaria: number;
    catalogoGeral: number;
    premium: number;
  };
  remaining: {
    colecaoAtiva: number;         // Coins que sobram
    colecaoSecundaria: number;
    catalogoGeral: number;
    premium: number;
  };
  suggestions: string[];          // Sugestões de combinações
}

// =====================================================
// QUERY KEYS
// =====================================================

export const characterPricesReferenceKeys = {
  all: ["character-prices-reference"] as const,
  prices: () => [...characterPricesReferenceKeys.all, "prices"] as const,
};

// =====================================================
// QUERIES
// =====================================================

/**
 * Hook para buscar preços de personagens do banco
 * 
 * Busca de:
 * - collection_base_pricing (preços base)
 * - pricing_context_multipliers (multiplicadores)
 * 
 * Cache: 5 minutos (preços não mudam frequentemente)
 * 
 * @returns Preços atuais de todos os tipos de personagens
 */
export function useCharacterPricesReference() {
  return useQuery({
    queryKey: characterPricesReferenceKeys.prices(),
    queryFn: async (): Promise<CharacterPricesReference> => {
      // Buscar preços base
      const { data: basePrices, error: basePricesError } = await supabase
        .from("collection_base_pricing")
        .select(`
          base_price_coins,
          collection_types (name)
        `)
        .eq("is_active", true);

      if (basePricesError) {
        throw basePricesError;
      }

      // Buscar multiplicadores
      const { data: multipliers, error: multipliersError } = await supabase
        .from("pricing_context_multipliers")
        .select("*")
        .eq("is_active", true);

      if (multipliersError) {
        throw multipliersError;
      }

      // Extrair valores
      const subscriptionBase =
        basePrices?.find((p: any) => p.collection_types?.name === "subscription")
          ?.base_price_coins || 200;
      const standardBase =
        basePrices?.find((p: any) => p.collection_types?.name === "standard_catalog")
          ?.base_price_coins || 300;
      const premiumBase =
        basePrices?.find((p: any) => p.collection_types?.name === "premium_catalog")
          ?.base_price_coins || 450;

      const chosenMultiplier =
        multipliers?.find((m: any) => m.user_context === "subscribed_chosen")
          ?.multiplier || 1.0;
      const notChosenMultiplier =
        multipliers?.find((m: any) => m.user_context === "subscribed_not_chosen")
          ?.multiplier || 1.2;
      const noSubscriptionMultiplier =
        multipliers?.find((m: any) => m.user_context === "no_subscription")
          ?.multiplier || 1.5;

      // Calcular preços finais
      const baseReference = subscriptionBase; // 200 coins
      const colecaoAtiva = Math.round(baseReference * chosenMultiplier); // 200
      const colecaoSecundaria = Math.round(baseReference * notChosenMultiplier); // 240
      const catalogoGeral = standardBase; // 300
      const premium = premiumBase; // 450

      return {
        colecaoAtiva,
        colecaoSecundaria,
        catalogoGeral,
        premium,
        baseReference,
        multipliers: {
          chosen: chosenMultiplier,
          notChosen: notChosenMultiplier,
          noSubscription: noSubscriptionMultiplier,
        },
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: 1,
  });
}

/**
 * Hook para calcular poder de compra de um plano
 * 
 * Dado um total de coins, calcula:
 * - Quantos personagens de cada tipo pode comprar
 * - Quantos coins sobram
 * - Sugestões de combinações
 * 
 * @param totalCoins - Total de coins do plano
 * @returns Poder de compra detalhado
 */
export function usePurchasingPower(totalCoins: number): PurchasingPower | null {
  const { data: prices } = useCharacterPricesReference();

  if (!prices || totalCoins <= 0) return null;

  // Calcular quantos pode comprar de cada tipo
  const canBuy = {
    colecaoAtiva: Math.floor(totalCoins / prices.colecaoAtiva),
    colecaoSecundaria: Math.floor(totalCoins / prices.colecaoSecundaria),
    catalogoGeral: Math.floor(totalCoins / prices.catalogoGeral),
    premium: Math.floor(totalCoins / prices.premium),
  };

  // Calcular coins que sobram
  const remaining = {
    colecaoAtiva: totalCoins % prices.colecaoAtiva,
    colecaoSecundaria: totalCoins % prices.colecaoSecundaria,
    catalogoGeral: totalCoins % prices.catalogoGeral,
    premium: totalCoins % prices.premium,
  };

  // Gerar sugestões de combinações
  const suggestions: string[] = [];

  // Sugestão 1: Apenas Coleção Ativa
  if (canBuy.colecaoAtiva > 0) {
    suggestions.push(
      `${canBuy.colecaoAtiva} personagens da Coleção Ativa (${canBuy.colecaoAtiva} × ${prices.colecaoAtiva} = ${canBuy.colecaoAtiva * prices.colecaoAtiva} coins)`
    );
  }

  // Sugestão 2: Mix Ativa + Secundária
  if (canBuy.colecaoAtiva >= 2 && canBuy.colecaoSecundaria > 0) {
    const ativas = canBuy.colecaoAtiva - 1;
    const secundarias = Math.floor(
      (totalCoins - ativas * prices.colecaoAtiva) / prices.colecaoSecundaria
    );
    if (secundarias > 0) {
      suggestions.push(
        `${ativas} da Coleção Ativa + ${secundarias} da Secundária`
      );
    }
  }

  // Sugestão 3: Catálogo Geral
  if (canBuy.catalogoGeral > 0) {
    suggestions.push(
      `${canBuy.catalogoGeral} personagens do Catálogo Geral`
    );
  }

  // Sugestão 4: Premium
  if (canBuy.premium > 0) {
    suggestions.push(
      `${canBuy.premium} personagens Premium`
    );
  }

  return {
    totalCoins,
    canBuy,
    remaining,
    suggestions,
  };
}

/**
 * Hook para validar se um plano é adequado
 * 
 * Verifica se o plano tem coins suficientes para comprar
 * pelo menos 1 personagem do tipo mais barato
 * 
 * @param totalCoins - Total de coins do plano
 * @returns Validação e mensagens
 */
export function useValidatePlan(totalCoins: number) {
  const { data: prices } = useCharacterPricesReference();

  if (!prices || totalCoins <= 0) {
    return {
      isValid: false,
      message: "Plano sem coins definidos",
      severity: "error" as const,
    };
  }

  const cheapestPrice = prices.colecaoAtiva; // 200 coins

  if (totalCoins < cheapestPrice) {
    return {
      isValid: false,
      message: `Plano insuficiente! Mínimo: ${cheapestPrice} coins (1 personagem)`,
      severity: "error" as const,
      suggestion: `Aumente para pelo menos ${cheapestPrice} coins`,
    };
  }

  const canBuyCount = Math.floor(totalCoins / cheapestPrice);
  const remaining = totalCoins % cheapestPrice;

  if (remaining > 0 && remaining < cheapestPrice * 0.5) {
    return {
      isValid: true,
      message: `Plano adequado (${canBuyCount} personagens)`,
      severity: "warning" as const,
      suggestion: `Sobram ${remaining} coins. Considere ajustar para ${totalCoins + (cheapestPrice - remaining)} coins (${canBuyCount + 1} personagens)`,
    };
  }

  return {
    isValid: true,
    message: `Plano adequado (${canBuyCount} personagens)`,
    severity: "success" as const,
  };
}

/**
 * Hook para sugerir valores ideais de coins para planos
 * 
 * Baseado nos preços atuais, sugere valores que:
 * - Permitem comprar quantidade exata de personagens
 * - Não deixam coins sobrando
 * - Oferecem bom custo-benefício
 * 
 * @returns Sugestões de valores ideais
 */
export function usePlanSuggestions() {
  const { data: prices } = useCharacterPricesReference();

  if (!prices) return [];

  const basePrice = prices.colecaoAtiva; // 200 coins

  return [
    {
      label: "Plano Básico",
      coins: basePrice * 2, // 400 coins
      characters: 2,
      description: "2 personagens da Coleção Ativa",
    },
    {
      label: "Plano Intermediário",
      coins: basePrice * 4, // 800 coins
      characters: 4,
      description: "4 personagens da Coleção Ativa",
    },
    {
      label: "Plano Avançado",
      coins: basePrice * 6, // 1200 coins
      characters: 6,
      description: "6 personagens da Coleção Ativa",
    },
    {
      label: "Plano Premium",
      coins: basePrice * 8, // 1600 coins
      characters: 8,
      description: "8 personagens da Coleção Ativa",
    },
  ];
}
