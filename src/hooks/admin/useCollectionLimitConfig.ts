import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSubscriptionPlanCollectionLimit } from "@/services/admin/pricing/collection-limit-config-service";

export function useUpdateCollectionLimitConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, newLimit }: { planId: string; newLimit: number }) =>
      updateSubscriptionPlanCollectionLimit(planId, newLimit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["collection-limit"] });
    },
  });
}
