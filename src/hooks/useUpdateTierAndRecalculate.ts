// @ts-nocheck
/**
 * Hook para atualizar nível e recalcular preços de planos
 * 
 * Mutation hook que atualiza um nível e recalcula automaticamente os preços de todos os seus planos.
 * Requisitos: 1.2, 4.1, 4.4, 6.5, 11.4
 * Tarefa: 7.3
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { UpdateTierAndRecalculateResult } from "@/types/pricing-restructure";
import { updateTierAndRecalculateSchema } from "@/lib/validations/pricing-restructure";
import { tierWithPlansKeys } from "./useTierWithPlans";

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Hook para atualizar nível e recalcular planos
 * Atualiza o nível e recalcula automaticamente os preços de todos os planos
 * Requisitos: 1.2, 4.1, 4.4, 6.5, 11.4
 */
export function useUpdateTierAndRecalculate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      tierId,
      priceFull,
      depositAmount,
      pixDiscountPercentage,
    }: {
      tierId: string;
      priceFull?: number;
      depositAmount?: number;
      pixDiscountPercentage?: number;
    }) => {
      // Validar input
      const validated = updateTierAndRecalculateSchema.parse({
        tier_id: tierId,
        price_full: priceFull,
        deposit_amount: depositAmount,
        pix_discount_percentage: pixDiscountPercentage,
      });

      // Obter usuário atual
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Chamar função do banco de dados
      const { data, error } = await supabase.rpc("update_tier_and_recalculate_plans", {
        p_tier_id: validated.tier_id,
        p_price_full: validated.price_full || null,
        p_deposit_amount: validated.deposit_amount || null,
        p_pix_discount_percentage: validated.pix_discount_percentage || null,
        p_updated_by: user.id,
      });

      if (error) {
        throw new Error(`Erro ao atualizar nível: ${error.message}`);
      }

      return data as UpdateTierAndRecalculateResult;
    },
    onSuccess: (result, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["pricing-tiers"] });
      queryClient.invalidateQueries({ queryKey: tierWithPlansKeys.all });
      queryClient.invalidateQueries({ queryKey: tierWithPlansKeys.detail(variables.tierId) });
      queryClient.invalidateQueries({ queryKey: ["collections"] });

      const message =
        result.collections_updated > 0
          ? `${result.plans_updated} planos e ${result.collections_updated} coleções atualizados.`
          : `${result.plans_updated} planos atualizados.`;

      toast({
        title: "Nível atualizado com sucesso",
        description: message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar nível",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
