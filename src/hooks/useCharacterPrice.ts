/**
 * Hook para calcular preço contextual de personagens
 * 
 * Calcula o preço de um personagem baseado em:
 * 1. Preço contextual da coleção (get_collection_price)
 * 2. Multiplicador individual do personagem (price_multiplier)
 * 
 * Fórmula: collection_price × COALESCE(character.price_multiplier, 1.0)
 * 
 * Spec: contextual-pricing-system
 * Task: 5.5 (RN008 - Character Price Multiplier)
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  PriceInCoins,
  QUERY_KEYS,
  CACHE_CONFIG,
} from "@/types/contextual-pricing";

// =====================================================
// TYPES
// =====================================================

export interface CharacterPriceParams {
  characterId: string;
  userId?: string | null;
}

export interface CharacterPriceResponse {
  price: PriceInCoins;
  collection_price: PriceInCoins;
  price_multiplier: number;
  has_multiplier: boolean;
}

// =====================================================
// QUERY KEYS
// =====================================================

export const characterPriceKeys = {
  all: ["character-price"] as const,
  detail: (characterId: string, userId?: string | null) => 
    [...characterPriceKeys.all, characterId, userId || "anonymous"] as const,
};

// =====================================================
// QUERIES
// =====================================================

/**
 * Hook para calcular preço contextual de um personagem
 * 
 * Retorna o preço em COINS baseado em:
 * - Preço contextual da coleção (baseado em tipo, assinatura, escolha)
 * - Multiplicador individual do personagem (opcional, padrão 1.0)
 * 
 * Exemplo:
 * - Coleção escolhida: 800 coins
 * - Personagem normal (1.0): 800 × 1.0 = 800 coins
 * - Personagem premium (1.5): 800 × 1.5 = 1200 coins
 * - Personagem raro (2.0): 800 × 2.0 = 1600 coins
 * 
 * Cache: 5 minutos (RN010)
 * Invalidação: Quando preço base, multiplicador, desconto ou price_multiplier mudam
 */
export function useCharacterPrice(params: CharacterPriceParams) {
  const { characterId, userId } = params;

  return useQuery({
    queryKey: characterPriceKeys.detail(characterId, userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_character_price", {
        p_character_id: characterId,
        p_user_id: userId || null,
      });

      if (error) {
        throw new Error(`Erro ao calcular preço do personagem: ${error.message}`);
      }

      // A função RPC retorna um INTEGER (preço final em COINS)
      return data as PriceInCoins;
    },
    enabled: !!characterId,
    staleTime: CACHE_CONFIG.STALE_TIME, // 5 minutos (RN010)
    gcTime: CACHE_CONFIG.CACHE_TIME, // 10 minutos (RN010)
  });
}

/**
 * Hook para calcular preços de múltiplos personagens
 * 
 * Útil para exibir catálogo completo com preços contextuais
 */
export function useCharacterPrices(characterIds: string[], userId?: string | null) {
  return useQuery({
    queryKey: [...characterPriceKeys.all, "batch", characterIds.join(","), userId || "anonymous"],
    queryFn: async () => {
      // Buscar preços em paralelo
      const pricePromises = characterIds.map(async (characterId) => {
        const { data, error } = await supabase.rpc("get_character_price", {
          p_character_id: characterId,
          p_user_id: userId || null,
        });

        if (error) {
          console.error(`Erro ao calcular preço de ${characterId}:`, error);
          return { characterId, price: null, error: error.message };
        }

        return { characterId, price: data as PriceInCoins, error: null };
      });

      const results = await Promise.all(pricePromises);

      // Retornar como mapa para fácil acesso
      return results.reduce((acc, result) => {
        acc[result.characterId] = result.price;
        return acc;
      }, {} as Record<string, PriceInCoins | null>);
    },
    enabled: characterIds.length > 0,
    staleTime: CACHE_CONFIG.STALE_TIME, // 5 minutos (RN010)
    gcTime: CACHE_CONFIG.CACHE_TIME, // 10 minutos (RN010)
  });
}

/**
 * Hook para obter detalhes do multiplicador de um personagem
 * 
 * Retorna informações sobre o multiplicador aplicado ao personagem
 */
export function useCharacterPriceDetails(characterId: string, userId?: string | null) {
  return useQuery({
    queryKey: [...characterPriceKeys.all, "details", characterId, userId || "anonymous"],
    queryFn: async () => {
      // Buscar dados do personagem
      const { data: character, error: charError } = await supabase
        .from("characters")
        .select("id, name, price_multiplier, collection_id")
        .eq("id", characterId)
        .single();

      if (charError) {
        throw new Error(`Erro ao buscar personagem: ${charError.message}`);
      }

      // Buscar preço da coleção
      const { data: collectionPrice, error: priceError } = await supabase.rpc("get_collection_price", {
        p_collection_id: character.collection_id,
        p_user_id: userId || null,
      });

      if (priceError) {
        throw new Error(`Erro ao calcular preço da coleção: ${priceError.message}`);
      }

      // Calcular preço final
      const multiplier = character.price_multiplier ?? 1.0;
      const finalPrice = Math.round(collectionPrice * multiplier);

      return {
        character_id: character.id,
        character_name: character.name,
        collection_price: collectionPrice as PriceInCoins,
        price_multiplier: multiplier,
        final_price: finalPrice as PriceInCoins,
        has_multiplier: character.price_multiplier !== null && character.price_multiplier !== 1.0,
        formula: `${collectionPrice} × ${multiplier} = ${finalPrice} coins`,
      };
    },
    enabled: !!characterId,
    staleTime: CACHE_CONFIG.STALE_TIME, // 5 minutos (RN010)
  });
}

/**
 * Hook helper para verificar se personagem tem multiplicador ativo
 * 
 * Retorna true se o personagem tem multiplicador diferente de 1.0
 */
export function useHasCharacterMultiplier(characterId: string) {
  return useQuery({
    queryKey: ["character-multiplier-status", characterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("characters")
        .select("price_multiplier")
        .eq("id", characterId)
        .single();

      if (error) {
        console.error("Erro ao verificar multiplicador:", error);
        return false;
      }

      return data.price_multiplier !== null && data.price_multiplier !== 1.0;
    },
    enabled: !!characterId,
    staleTime: CACHE_CONFIG.STALE_TIME, // 5 minutos (RN010)
  });
}
