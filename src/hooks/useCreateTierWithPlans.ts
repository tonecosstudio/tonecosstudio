import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { createTierWithPlansSchema } from "@/lib/validations/pricing-restructure";
import { createTierWithPlans } from "@/services/pricing/pricing-tier-plan-service";
import type { CreateTierWithPlansInput } from "@/types/pricing-restructure";
import { purchaseModesKeys } from "./usePurchaseModes";
import { tierWithPlansKeys } from "./useTierWithPlans";

export function useCreateTierWithPlans() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateTierWithPlansInput) => {
      const validated = createTierWithPlansSchema.parse(input);
      return createTierWithPlans(validated);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["pricing-tiers"] });
      queryClient.invalidateQueries({ queryKey: tierWithPlansKeys.all });
      queryClient.invalidateQueries({ queryKey: purchaseModesKeys.all });

      toast({
        title: "Nivel criado com sucesso",
        description: `Nivel criado com ${result.plans_created} planos automaticos.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar nivel",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
