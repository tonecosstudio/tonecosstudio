import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { updateTierAndRecalculateSchema } from "@/lib/validations/pricing-restructure";
import { updateTierAndRecalculatePlans } from "@/services/pricing/pricing-tier-plan-service";
import { tierWithPlansKeys } from "./useTierWithPlans";

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
      const validated = updateTierAndRecalculateSchema.parse({
        tier_id: tierId,
        price_full: priceFull,
        deposit_amount: depositAmount,
        pix_discount_percentage: pixDiscountPercentage,
      });

      return updateTierAndRecalculatePlans({
        tierId: validated.tier_id,
        priceFull: validated.price_full,
        depositAmount: validated.deposit_amount,
        pixDiscountPercentage: validated.pix_discount_percentage,
      });
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pricing-tiers"] });
      queryClient.invalidateQueries({ queryKey: tierWithPlansKeys.all });
      queryClient.invalidateQueries({ queryKey: tierWithPlansKeys.detail(variables.tierId) });
      queryClient.invalidateQueries({ queryKey: ["collections"] });

      const message =
        result.collections_updated > 0
          ? `${result.plans_updated} planos e ${result.collections_updated} colecoes atualizados.`
          : `${result.plans_updated} planos atualizados.`;

      toast({
        title: "Nivel atualizado com sucesso",
        description: message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar nivel",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
