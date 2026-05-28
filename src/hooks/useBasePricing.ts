/**
 * Hook para gerenciar preços base do sistema de preços contextuais
 * 
 * Fornece queries e mutations para operações de preços base por tipo de coleção.
 * Spec: contextual-pricing-system
 * Task: 5.2
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  CACHE_CONFIG,
  isValidPriceInCoins
} from "@/types/contextual-pricing";

// =====================================================
// TYPES
// =====================================================

export interface CollectionBasePrice {
  collection_type_id: string;
  collection_type_name: string;
  collection_type_display_name: string;
  base_price_coins: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sort_order?: number | null;
}

export interface UpdateBasePriceInput {
  collection_type_id: string;
  new_base_price_coins: number;
  reason?: string;
}

export interface UpdateBasePriceResponse {
  success: boolean;
  old_price: number;
  new_price: number;
  message: string;
}

interface CollectionTypeJoin {
  name: string;
  display_name: string;
  sort_order?: number | null;
}

interface CollectionBasePricingRow {
  collection_type_id: string;
  base_price_coins: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  collection_types: CollectionTypeJoin;
}

interface BasePricingRpcClient {
  rpc(
    fn: "update_base_price_with_history",
    args: {
      p_collection_type_id: string;
      p_new_base_price_coins: number;
      p_changed_by: string;
      p_reason: string | null;
    }
  ): Promise<{ data: UpdateBasePriceResponse[] | null; error: { message: string } | null }>;
}

const basePricingRpc = supabase as unknown as BasePricingRpcClient;

// =====================================================
// QUERY KEYS
// =====================================================

export const basePricingKeys = {
  all: ["base-pricing"] as const,
  lists: () => [...basePricingKeys.all, "list"] as const,
  list: (filters?: string) => [...basePricingKeys.lists(), filters] as const,
  detail: (typeId: string) => [...basePricingKeys.all, "detail", typeId] as const,
};

// =====================================================
// QUERIES
// =====================================================

/**
 * Hook para buscar todos os preços base ativos
 */
export function useBasePricing() {
  return useQuery({
    queryKey: basePricingKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_base_pricing")
        .select(`
          collection_type_id,
          base_price_coins,
          is_active,
          created_at,
          updated_at,
          collection_types!inner (
            name,
            display_name,
            sort_order
          )
        `)
        .eq("is_active", true)
        .order("collection_type_id", { ascending: true });

      if (error) {
        throw new Error(`Erro ao buscar preços base: ${error.message}`);
      }

      // Transformar dados para formato mais amigável
      const transformed: CollectionBasePrice[] = ((data || []) as unknown as CollectionBasePricingRow[]).map((item) => ({
        collection_type_id: item.collection_type_id,
        collection_type_name: item.collection_types.name,
        collection_type_display_name: item.collection_types.display_name,
        base_price_coins: item.base_price_coins,
        is_active: item.is_active,
        created_at: item.created_at,
        updated_at: item.updated_at,
        sort_order: item.collection_types.sort_order,
      }));

      // Ordenar por sort_order no cliente
      return transformed.sort((a, b) =>
        (a.sort_order || 0) - (b.sort_order || 0)
      );
    },
    staleTime: CACHE_CONFIG.STALE_TIME, // 5 minutos (RN010)
  });
}

/**
 * Hook para buscar preço base de um tipo específico
 */
export function useBasePriceByType(collectionTypeId: string | null | undefined) {
  return useQuery({
    queryKey: basePricingKeys.detail(collectionTypeId || ""),
    queryFn: async () => {
      if (!collectionTypeId) return null;

      const { data, error } = await supabase
        .from("collection_base_pricing")
        .select(`
          collection_type_id,
          base_price_coins,
          is_active,
          created_at,
          updated_at,
          collection_types!inner (
            name,
            display_name
          )
        `)
        .eq("collection_type_id", collectionTypeId)
        .eq("is_active", true)
        .single();

      if (error) {
        throw new Error(`Erro ao buscar preço base: ${error.message}`);
      }

      return {
        collection_type_id: data.collection_type_id,
        collection_type_name: data.collection_types.name,
        collection_type_display_name: data.collection_types.display_name,
        base_price_coins: data.base_price_coins,
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
      } as CollectionBasePrice;
    },
    enabled: !!collectionTypeId,
    staleTime: CACHE_CONFIG.STALE_TIME, // 5 minutos (RN010)
  });
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Hook para atualizar preço base com histórico
 */
export function useUpdateBasePrice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: UpdateBasePriceInput) => {
      // Validar input
      if (!isValidPriceInCoins(input.new_base_price_coins)) {
        throw new Error("Preço deve ser um número inteiro maior que 0");
      }

      // Obter usuário atual
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Chamar função do banco de dados
      const { data, error } = await basePricingRpc.rpc("update_base_price_with_history", {
        p_collection_type_id: input.collection_type_id,
        p_new_base_price_coins: input.new_base_price_coins,
        p_changed_by: user.id,
        p_reason: input.reason || null,
      });

      if (error) {
        throw new Error(`Erro ao atualizar preço base: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error("Nenhum resultado retornado");
      }

      const result = data[0] as UpdateBasePriceResponse;

      if (!result.success) {
        throw new Error(result.message);
      }

      return result;
    },
    onSuccess: (result, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: basePricingKeys.all });
      queryClient.invalidateQueries({ queryKey: basePricingKeys.detail(variables.collection_type_id) });
      
      // Invalidar também preços de coleções (afetados pela mudança)
      queryClient.invalidateQueries({ queryKey: ["collection-price"] });
      queryClient.invalidateQueries({ queryKey: ["character-price"] });

      toast({
        title: "Preço base atualizado",
        description: result.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar preço base",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
