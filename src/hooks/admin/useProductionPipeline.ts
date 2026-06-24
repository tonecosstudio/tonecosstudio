import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PRODUCTION_STAGE_LABELS, PRODUCTION_STAGE_ORDER } from "@/config/production-stages";
import {
  fetchProductionQueue,
  updateProductionStage,
  type PaginatedResponse,
} from "@/services/admin/production/production-service";
import type { ProductionFilters, ProductionQueueItem, ProductionStage } from "@/types/production";

export const STAGE_LABELS = PRODUCTION_STAGE_LABELS;
export const STAGE_ORDER = PRODUCTION_STAGE_ORDER;

interface UseProductionPipelineQueueOptions {
  enabled?: boolean;
}

export function useProductionPipelineQueue(
  filters: ProductionFilters,
  options: UseProductionPipelineQueueOptions = {}
) {
  return useQuery({
    queryKey: ["production-queue", filters],
    queryFn: () => fetchProductionQueue(filters, { page: 1, pageSize: 1000 }),
    enabled: options.enabled,
  });
}

export function useInvalidateProductionQueries() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ["production-queue"] });
    void queryClient.invalidateQueries({ queryKey: ["production-metrics"] });
  };
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
      void queryClient.invalidateQueries({ queryKey: ["production-queue"] });
    },
  });
}

export function useMoveProductionKanbanItem(filters: ProductionFilters) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, newStage }: { itemId: string; newStage: ProductionStage }) =>
      updateProductionStage(itemId, newStage),
    onMutate: async ({ itemId, newStage }) => {
      const queryKey = ["production-queue", filters] as const;
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData<PaginatedResponse<ProductionQueueItem>>(queryKey);

      if (previousData) {
        queryClient.setQueryData<PaginatedResponse<ProductionQueueItem>>(queryKey, {
          ...previousData,
          data: previousData.data.map((item) =>
            item.id === itemId ? { ...item, currentStage: newStage } : item
          ),
        });
      }

      return { previousData, queryKey };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["production-metrics"] });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["production-queue"] });
    },
  });
}
