import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchProductionQueue,
  STAGE_LABELS,
  updateProductionStage,
} from "@/services/admin/production-service";
import type { ProductionFilters, ProductionStage } from "@/types/production";

export { STAGE_LABELS };

export function useProductionPipelineQueue(filters: ProductionFilters) {
  return useQuery({
    queryKey: ["production-queue", filters],
    queryFn: () => fetchProductionQueue(filters, { page: 1, pageSize: 1000 }),
  });
}

export function useMoveProductionPipelineItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemIds,
      targetStage,
    }: {
      itemIds: string[];
      targetStage: ProductionStage;
    }) => Promise.all(itemIds.map((id) => updateProductionStage(id, targetStage))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-queue"] });
    },
  });
}
