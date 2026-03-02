/**
 * Hook para gerenciar modalidades de compra (Purchase Modes)
 * 
 * Fornece queries e mutations para listar e atualizar modalidades.
 * Requisitos: 3.3, 3.4, 3.5, 11.6
 * Tarefa: 7.3
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type {
  PurchaseMode,
  UpdatePurchaseModeInput,
  UpdatePurchaseModeMultiplierResult,
} from "@/types/pricing-restructure";
import { updatePurchaseModeSchema, updateMultiplierSchema } from "@/lib/validations/pricing-restructure";

// =====================================================
// QUERY KEYS
// =====================================================

export const purchaseModesKeys = {
  all: ["purchase-modes"] as const,
  lists: () => [...purchaseModesKeys.all, "list"] as const,
  active: () => [...purchaseModesKeys.all, "active"] as const,
  detail: (modeKey: string) => [...purchaseModesKeys.all, "detail", modeKey] as const,
};

// =====================================================
// QUERIES
// =====================================================

/**
 * Hook para buscar todas as modalidades de compra
 * Requisitos: 3.1, 3.2
 */
export function usePurchaseModes() {
  return useQuery({
    queryKey: purchaseModesKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_modes")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) {
        throw new Error(`Erro ao buscar modalidades: ${error.message}`);
      }

      return data as PurchaseMode[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook para buscar apenas modalidades ativas
 * Requisitos: 3.1
 */
export function useActivePurchaseModes() {
  return useQuery({
    queryKey: purchaseModesKeys.active(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_modes")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) {
        throw new Error(`Erro ao buscar modalidades ativas: ${error.message}`);
      }

      return data as PurchaseMode[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Hook para atualizar uma modalidade de compra
 * Requisitos: 3.3, 3.4
 */
export function useUpdatePurchaseMode() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      modeKey,
      input,
    }: {
      modeKey: string;
      input: UpdatePurchaseModeInput;
    }) => {
      // Validar input
      const validated = updatePurchaseModeSchema.parse(input);

      // Atualizar no banco de dados
      const { error } = await supabase
        .from("purchase_modes")
        .update(validated)
        .eq("mode_key", modeKey);

      if (error) {
        throw new Error(`Erro ao atualizar modalidade: ${error.message}`);
      }

      return modeKey;
    },
    onSuccess: (modeKey) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: purchaseModesKeys.all });
      queryClient.invalidateQueries({ queryKey: purchaseModesKeys.detail(modeKey) });

      toast({
        title: "Modalidade atualizada",
        description: "A modalidade de compra foi atualizada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar modalidade",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para atualizar o multiplicador de uma modalidade
 * Atualiza o multiplicador e recalcula todos os planos dessa modalidade
 * Requisitos: 3.3, 3.4, 3.7
 */
export function useUpdatePurchaseModeMultiplier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      modeKey,
      newMultiplier,
    }: {
      modeKey: string;
      newMultiplier: number;
    }) => {
      // Validar input
      const validated = updateMultiplierSchema.parse({ mode_key: modeKey, new_multiplier: newMultiplier });

      // Obter usuário atual
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Chamar função do banco de dados
      const { data, error } = await supabase.rpc("update_purchase_mode_multiplier", {
        p_mode_key: validated.mode_key,
        p_new_multiplier: validated.new_multiplier,
        p_changed_by: user.id,
      });

      if (error) {
        throw new Error(`Erro ao atualizar multiplicador: ${error.message}`);
      }

      return data as UpdatePurchaseModeMultiplierResult;
    },
    onSuccess: (result, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: purchaseModesKeys.all });
      queryClient.invalidateQueries({ queryKey: purchaseModesKeys.detail(variables.modeKey) });
      queryClient.invalidateQueries({ queryKey: ["pricing-tiers"] });
      queryClient.invalidateQueries({ queryKey: ["tier-with-plans"] });

      toast({
        title: "Multiplicador atualizado",
        description: `${result.plans_updated} planos recalculados em ${result.tiers_affected} níveis.`,
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
