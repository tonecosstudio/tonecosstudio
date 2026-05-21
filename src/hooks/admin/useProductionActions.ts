import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  blockProduction,
  updateProductionSchedule,
} from "@/services/admin/production-service";

interface UseBlockProductionOptions {
  productionQueueId: string;
  onSuccess?: () => void;
}

export function useBlockProduction({
  productionQueueId,
  onSuccess,
}: UseBlockProductionOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reason: string) => blockProduction(productionQueueId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["production-queue"] });
      void queryClient.invalidateQueries({ queryKey: ["production-metrics"] });
      void queryClient.invalidateQueries({
        queryKey: ["production-stages", productionQueueId],
      });
      onSuccess?.();
    },
  });
}

export function useRescheduleProduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, date }: { itemId: string; date: string }) =>
      updateProductionSchedule(itemId, date),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["production-queue"] });
      void queryClient.invalidateQueries({ queryKey: ["production-metrics"] });
    },
  });
}
