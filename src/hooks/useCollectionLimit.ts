/**
 * Hook para validar limite de coleções por plano
 * 
 * Valida se usuário pode escolher mais coleções baseado no limite do plano.
 * Spec: contextual-pricing-system
 * Task: 5.5
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QUERY_KEYS } from "@/types/contextual-pricing";

// =====================================================
// TYPES
// =====================================================

// Tipo interno para resposta da função RPC
interface CollectionLimitRPCResponse {
  can_add: boolean;
  current_count: number;
  max_count: number;
  message: string;
  is_unlimited: boolean;
}

// =====================================================
// QUERY KEYS
// =====================================================

export const collectionLimitKeys = {
  all: [QUERY_KEYS.COLLECTION_LIMIT] as const,
  detail: (userId: string) => [...collectionLimitKeys.all, userId] as const,
};

// =====================================================
// QUERIES
// =====================================================

/**
 * Hook para validar limite de coleções do usuário
 * 
 * Retorna informações sobre:
 * - Se pode adicionar mais coleções
 * - Quantas coleções já escolheu
 * - Limite máximo do plano
 * - Se o plano é ilimitado
 */
export function useCollectionLimit(userId?: string | null) {
  return useQuery({
    queryKey: collectionLimitKeys.detail(userId || ""),
    queryFn: async () => {
      if (!userId) {
        return {
          can_add: false,
          current_count: 0,
          max_count: 0,
          message: "Usuário não autenticado",
          is_unlimited: false,
        } as CollectionLimitRPCResponse;
      }

      const { data, error } = await supabase.rpc("validate_collection_limit", {
        p_user_id: userId,
        p_new_collection_id: null,
      });

      if (error) {
        throw new Error(`Erro ao validar limite: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error("Nenhum resultado retornado");
      }

      return data[0] as CollectionLimitRPCResponse;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook para verificar se pode adicionar uma coleção específica
 * 
 * Útil para validar antes de permitir escolha de coleção
 */
export function useCanAddCollection(userId?: string | null, collectionId?: string | null) {
  return useQuery({
    queryKey: [...collectionLimitKeys.all, "can-add", userId || "", collectionId || ""],
    queryFn: async () => {
      if (!userId || !collectionId) {
        return {
          can_add: false,
          current_count: 0,
          max_count: 0,
          message: "Parâmetros inválidos",
          is_unlimited: false,
        } as CollectionLimitRPCResponse;
      }

      const { data, error } = await supabase.rpc("validate_collection_limit", {
        p_user_id: userId,
        p_new_collection_id: collectionId,
      });

      if (error) {
        throw new Error(`Erro ao validar limite: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error("Nenhum resultado retornado");
      }

      return data[0] as CollectionLimitRPCResponse;
    },
    enabled: !!userId && !!collectionId,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook helper para obter informações formatadas do limite
 * 
 * Retorna helpers úteis para UI:
 * - canAddMore: boolean
 * - remainingSlots: number
 * - usageText: string (ex: "2 de 3 coleções")
 * - isUnlimited: boolean
 */
export function useCollectionLimitHelpers(userId?: string | null) {
  const { data: limitInfo, isLoading, error } = useCollectionLimit(userId);

  const canAddMore = limitInfo?.can_add ?? false;
  const isUnlimited = limitInfo?.is_unlimited ?? false;
  const currentCount = limitInfo?.current_count ?? 0;
  const maxCount = limitInfo?.max_count ?? 0;
  const remainingSlots = isUnlimited ? Infinity : Math.max(0, maxCount - currentCount);

  const usageText = isUnlimited
    ? `${currentCount} coleções (ilimitado)`
    : `${currentCount} de ${maxCount} coleções`;

  const progressPercentage = isUnlimited ? 0 : (currentCount / maxCount) * 100;

  return {
    canAddMore,
    isUnlimited,
    currentCount,
    maxCount,
    remainingSlots,
    usageText,
    progressPercentage,
    message: limitInfo?.message ?? "",
    isLoading,
    error,
  };
}
