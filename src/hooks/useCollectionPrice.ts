/**
 * Hook para calcular preço contextual de coleções
 * 
 * Calcula o preço de uma coleção baseado no contexto do usuário
 * (assinante com coleção escolhida, assinante sem coleção escolhida, não assinante).
 * Spec: contextual-pricing-system
 * Task: 5.3
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CollectionPriceResponse,
  QUERY_KEYS,
  CACHE_CONFIG,
} from "@/types/contextual-pricing";
import { log } from "@/lib/logger";

interface CollectionPriceRpcClient {
  rpc(
    functionName: "get_collection_price",
    args: { p_collection_id: string; p_user_id: string | null }
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

const collectionPriceRpc = supabase as unknown as CollectionPriceRpcClient;

// =====================================================
// TYPES
// =====================================================

export interface CollectionPriceParams {
  collectionId: string;
  userId?: string | null;
}

// =====================================================
// QUERY KEYS
// =====================================================

export const collectionPriceKeys = {
  all: [QUERY_KEYS.COLLECTION_PRICE] as const,
  detail: (collectionId: string, userId?: string | null) => 
    [...collectionPriceKeys.all, collectionId, userId ?? "anonymous"] as const,
};

// =====================================================
// QUERIES
// =====================================================

/**
 * Hook para calcular preço contextual de uma coleção
 * 
 * Retorna o preço em COINS baseado em:
 * - Tipo da coleção (subscription, standard_catalog, premium_catalog)
 * - Status de assinatura do usuário
 * - Se a coleção foi escolhida pelo usuário
 * 
 * Cache: 5 minutos (RN010)
 * Invalidação: Quando preço base, multiplicador ou desconto mudam
 */
export function useCollectionPrice(params: CollectionPriceParams) {
  const { collectionId, userId } = params;

  return useQuery({
    queryKey: collectionPriceKeys.detail(collectionId, userId),
    queryFn: async () => {
      const { data, error } = await collectionPriceRpc.rpc("get_collection_price", {
        p_collection_id: collectionId,
        p_user_id: userId ?? null,
      });

      if (error) {
        throw new Error(`Erro ao calcular preço: ${error.message}`);
      }

      return data as CollectionPriceResponse; // Retorna preço em COINS (INTEGER)
    },
    enabled: !!collectionId,
    staleTime: CACHE_CONFIG.STALE_TIME, // 5 minutos (RN010)
    gcTime: CACHE_CONFIG.CACHE_TIME, // 10 minutos (RN010)
  });
}

/**
 * Hook para calcular preços de múltiplas coleções
 * 
 * Útil para exibir catálogo completo com preços contextuais
 */
export function useCollectionPrices(collectionIds: string[], userId?: string | null) {
  return useQuery({
    queryKey: [...collectionPriceKeys.all, "batch", collectionIds.join(","), userId ?? "anonymous"],
    queryFn: async () => {
      // Buscar preços em paralelo
      const pricePromises = collectionIds.map(async (collectionId) => {
        const { data, error } = await collectionPriceRpc.rpc("get_collection_price", {
          p_collection_id: collectionId,
          p_user_id: userId ?? null,
        });

        if (error) {
          log.error("Failed to calculate collection price", { error, collectionId, userId });
          return { collectionId, price: null, error: error.message };
        }

        return { collectionId, price: data as CollectionPriceResponse, error: null };
      });

      const results = await Promise.all(pricePromises);

      // Retornar como mapa para fácil acesso
      return results.reduce((acc, result) => {
        acc[result.collectionId] = result.price;
        return acc;
      }, {} as Record<string, CollectionPriceResponse | null>);
    },
    enabled: collectionIds.length > 0,
    staleTime: CACHE_CONFIG.STALE_TIME, // 5 minutos (RN010)
    gcTime: CACHE_CONFIG.CACHE_TIME, // 10 minutos (RN010)
  });
}

/**
 * Hook helper para verificar se usuário tem desconto em uma coleção
 * 
 * Retorna true se a coleção foi escolhida pelo usuário (tem desconto)
 */
export function useHasCollectionDiscount(collectionId: string, userId?: string | null) {
  return useQuery({
    queryKey: ["collection-discount", collectionId, userId ?? "anonymous"],
    queryFn: async () => {
      if (!userId) return false;

      const { data, error } = await supabase
        .from("subscription_collections")
        .select("id")
        .eq("collection_id", collectionId)
        .limit(1);

      if (error) {
        log.error("Failed to check collection discount", { error, collectionId, userId });
        return false;
      }

      return data && data.length > 0;
    },
    enabled: !!collectionId,
    staleTime: CACHE_CONFIG.STALE_TIME, // 5 minutos (RN010)
  });
}
