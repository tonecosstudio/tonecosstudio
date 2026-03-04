// @ts-nocheck
/**
 * Hook para criar nível de preço com planos automáticos
 * 
 * Mutation hook que cria um nível e automaticamente cria planos para todas as modalidades ativas.
 * Requisitos: 1.1, 1.2, 8.1, 8.5, 11.3
 * Tarefa: 7.3
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type {
  CreateTierWithPlansInput,
  CreateTierWithPlansResult,
} from "@/types/pricing-restructure";
import { createTierWithPlansSchema } from "@/lib/validations/pricing-restructure";
import { purchaseModesKeys } from "./usePurchaseModes";
import { tierWithPlansKeys } from "./useTierWithPlans";

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Hook para criar nível com planos automáticos
 * Cria um nível e automaticamente cria um plano para cada modalidade ativa
 * Requisitos: 1.1, 1.2, 8.1, 8.5, 11.3
 */
export function useCreateTierWithPlans() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateTierWithPlansInput) => {
      // Validar input
      const validated = createTierWithPlansSchema.parse(input);

      // Obter usuário atual
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Chamar função do banco de dados
      const { data, error } = await supabase.rpc("create_tier_with_plans", {
        p_name: validated.name,
        p_description: validated.description || null,
        p_price_full: validated.price_full,
        p_deposit_amount: validated.deposit_amount,
        p_pix_discount_percentage: validated.pix_discount_percentage,
        p_is_default: validated.is_default,
        p_display_order: validated.display_order,
        p_created_by: user.id,
      });

      if (error) {
        throw new Error(`Erro ao criar nível com planos: ${error.message}`);
      }

      return data as CreateTierWithPlansResult;
    },
    onSuccess: (result) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["pricing-tiers"] });
      queryClient.invalidateQueries({ queryKey: tierWithPlansKeys.all });
      queryClient.invalidateQueries({ queryKey: purchaseModesKeys.all });

      toast({
        title: "Nível criado com sucesso",
        description: `Nível criado com ${result.plans_created} planos automáticos.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar nível",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
