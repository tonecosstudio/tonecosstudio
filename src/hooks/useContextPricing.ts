/**
 * Hook para gerenciar multiplicadores e descontos contextuais
 * 
 * Fornece queries e mutations para operações de multiplicadores de contexto
 * e percentual de desconto para coleções escolhidas.
 * Spec: contextual-pricing-system
 * Task: 5.2
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  PricingContextMultiplier,
  QUERY_KEYS,
  CACHE_CONFIG,
  isValidMultiplier,
  isValidDiscountPercentage,
} from "@/types/contextual-pricing";

// =====================================================
// TYPES
// =====================================================

export interface UpdateMultiplierInput {
  user_context: string;
  new_multiplier: number;
  reason?: string;
}

export interface UpdateDiscountInput {
  new_discount_percentage: number;
  reason?: string;
}

export interface UpdateMultiplierResponse {
  success: boolean;
  old_multiplier: number;
  new_multiplier: number;
  message: string;
}

export interface UpdateDiscountResponse {
  success: boolean;
  old_discount: number;
  new_discount: number;
  message: string;
}

// =====================================================
// QUERY KEYS
// =====================================================

export const contextPricingKeys = {
  all: [QUERY_KEYS.CONTEXT_PRICING] as const,
  lists: () => [...contextPricingKeys.all, "list"] as const,
  list: (filters?: string) => [...contextPricingKeys.lists(), filters] as const,
  detail: (context: string) => [...contextPricingKeys.all, "detail", context] as const,
};

// =====================================================
// QUERIES
// =====================================================

/**
 * Hook para buscar todos os multiplicadores de contexto ativos
 */
export function useContextPricing() {
  return useQuery({
    queryKey: contextPricingKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_context_multipliers")
        .select("*")
        .eq("is_active", true)
        .order("user_context", { ascending: true });

      if (error) {
        throw new Error(`Erro ao buscar multiplicadores: ${error.message}`);
      }

      return data as PricingContextMultiplier[];
    },
    staleTime: CACHE_CONFIG.STALE_TIME, // 5 minutos (RN010)
  });
}

/**
 * Hook para buscar multiplicador de um contexto específico
 */
export function useContextMultiplier(userContext: string | null | undefined) {
  return useQuery({
    queryKey: contextPricingKeys.detail(userContext || ""),
    queryFn: async () => {
      if (!userContext) return null;

      const { data, error } = await supabase
        .from("pricing_context_multipliers")
        .select("*")
        .eq("user_context", userContext)
        .eq("is_active", true)
        .single();

      if (error) {
        throw new Error(`Erro ao buscar multiplicador: ${error.message}`);
      }

      return data as PricingContextMultiplier;
    },
    enabled: !!userContext,
    staleTime: CACHE_CONFIG.STALE_TIME, // 5 minutos (RN010)
  });
}

/**
 * Hook para buscar apenas o desconto de coleções escolhidas
 */
export function useChosenCollectionDiscount() {
  return useQuery({
    queryKey: [...contextPricingKeys.all, "chosen-discount"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_context_multipliers")
        .select("chosen_collection_discount_percentage")
        .eq("user_context", "subscribed_chosen")
        .eq("is_active", true)
        .single();

      if (error) {
        throw new Error(`Erro ao buscar desconto: ${error.message}`);
      }

      return data.chosen_collection_discount_percentage as number;
    },
    staleTime: CACHE_CONFIG.STALE_TIME, // 5 minutos (RN010)
  });
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Hook para atualizar multiplicador de contexto com histórico
 */
export function useUpdateMultiplier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: UpdateMultiplierInput) => {
      // Validar input
      if (!isValidMultiplier(input.new_multiplier)) {
        throw new Error("Multiplicador deve ser maior que 0");
      }

      // Obter usuário atual
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Chamar função do banco de dados
      const { data, error } = await supabase.rpc("update_multiplier_with_history", {
        p_user_context: input.user_context,
        p_new_multiplier: input.new_multiplier,
        p_changed_by: user.id,
        p_reason: input.reason || undefined,
      });

      if (error) {
        throw new Error(`Erro ao atualizar multiplicador: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error("Nenhum resultado retornado");
      }

      const result = data[0] as UpdateMultiplierResponse;

      if (!result.success) {
        throw new Error(result.message);
      }

      return result;
    },
    onSuccess: (result, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: contextPricingKeys.all });
      queryClient.invalidateQueries({ queryKey: contextPricingKeys.detail(variables.user_context) });
      
      // Invalidar também preços de coleções (afetados pela mudança) - RN010
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COLLECTION_PRICE] });
      queryClient.invalidateQueries({ queryKey: ["character-price"] });

      toast({
        title: "Multiplicador atualizado",
        description: result.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar multiplicador",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para atualizar desconto de coleções escolhidas com histórico
 */
export function useUpdateChosenDiscount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: UpdateDiscountInput) => {
      // Validar input
      if (!isValidDiscountPercentage(input.new_discount_percentage)) {
        throw new Error("Desconto deve ser um número inteiro entre 0 e 100%");
      }

      // Obter usuário atual
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Chamar função do banco de dados
      const { data, error } = await supabase.rpc("update_chosen_discount_with_history", {
        p_new_discount_percentage: input.new_discount_percentage,
        p_changed_by: user.id,
        p_reason: input.reason || undefined,
      });

      if (error) {
        throw new Error(`Erro ao atualizar desconto: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error("Nenhum resultado retornado");
      }

      const result = data[0] as UpdateDiscountResponse;

      if (!result.success) {
        throw new Error(result.message);
      }

      return result;
    },
    onSuccess: (result) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: contextPricingKeys.all });
      queryClient.invalidateQueries({ queryKey: [...contextPricingKeys.all, "chosen-discount"] });
      
      // Invalidar também preços de coleções (afetados pela mudança) - RN010
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COLLECTION_PRICE] });
      queryClient.invalidateQueries({ queryKey: ["character-price"] });

      toast({
        title: "Desconto atualizado",
        description: result.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar desconto",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
