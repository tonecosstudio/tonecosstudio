import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  bulkAssignProduction,
  bulkUpdateStage,
} from "@/services/admin/bulk-operations-service";
import type { ProductionStage } from "@/types/production";

interface BulkAssignProductionInput {
  itemIds: string[];
  userId: string;
}

interface BulkUpdateProductionStageInput {
  itemIds: string[];
  newStage: ProductionStage;
}

function useProductionBulkInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ["production-queue"] });
    void queryClient.invalidateQueries({ queryKey: ["production-metrics"] });
  };
}

export function useBulkAssignProductionItems() {
  const invalidateProduction = useProductionBulkInvalidation();

  return useMutation({
    mutationFn: ({ itemIds, userId }: BulkAssignProductionInput) =>
      bulkAssignProduction(itemIds, userId),
    onSuccess: invalidateProduction,
  });
}

export function useBulkUpdateProductionStages() {
  const invalidateProduction = useProductionBulkInvalidation();

  return useMutation({
    mutationFn: ({ itemIds, newStage }: BulkUpdateProductionStageInput) =>
      bulkUpdateStage(itemIds, newStage),
    onSuccess: invalidateProduction,
  });
}
