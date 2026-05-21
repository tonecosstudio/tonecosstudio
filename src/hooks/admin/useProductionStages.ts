import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeStage,
  getStageHistory,
  uploadStagePhoto,
} from "@/services/admin/stage-service";
import { validateStageTransition } from "@/services/admin/stage-validation";
import type { ProductionStageRecord, StageType } from "@/services/admin/stage-types";
import type { StageValidationResult } from "@/services/admin/stage-validation";

export type { ProductionStageRecord, StageType };

export const productionStageQueryKeys = {
  history: (productionQueueId: string) => ["production-stages", productionQueueId] as const,
  productionQueue: () => ["production-queue"] as const,
  metrics: () => ["production-metrics"] as const,
};

export class ProductionStageValidationError extends Error {
  readonly validation: Pick<StageValidationResult, "canOverride" | "requiresJustification">;

  constructor(validation: StageValidationResult) {
    super(validation.error || "Stage transition validation failed");
    this.name = "ProductionStageValidationError";
    this.validation = {
      canOverride: validation.canOverride,
      requiresJustification: validation.requiresJustification,
    };
  }
}

interface CompleteProductionStageInput {
  productionQueueId: string;
  stageId: string;
  notes?: string;
  photos?: File[];
  enableOverride?: boolean;
  overrideJustification?: string;
}

export function useProductionStageHistory(productionQueueId: string) {
  return useQuery({
    queryKey: productionStageQueryKeys.history(productionQueueId),
    queryFn: () => getStageHistory(productionQueueId),
    refetchInterval: 30000,
  });
}

export function useCompleteProductionStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productionQueueId,
      stageId,
      notes,
      photos = [],
      enableOverride = false,
      overrideJustification,
    }: CompleteProductionStageInput): Promise<ProductionStageRecord> => {
      if (!enableOverride) {
        const validation = await validateStageTransition(productionQueueId, stageId);

        if (!validation.isValid) {
          throw new ProductionStageValidationError(validation);
        }
      } else if (!overrideJustification?.trim()) {
        throw new Error("Justification is required for admin override");
      }

      const uploadedUrls = await Promise.all(
        photos.map((photo) => uploadStagePhoto(stageId, photo))
      );

      return completeStage(
        stageId,
        notes,
        uploadedUrls.length > 0 ? uploadedUrls : undefined,
        enableOverride,
        enableOverride ? overrideJustification : undefined
      );
    },
    onSuccess: (_updatedStage, variables) => {
      void queryClient.invalidateQueries({
        queryKey: productionStageQueryKeys.history(variables.productionQueueId),
      });
      void queryClient.invalidateQueries({
        queryKey: productionStageQueryKeys.productionQueue(),
      });
      void queryClient.invalidateQueries({
        queryKey: productionStageQueryKeys.metrics(),
      });
    },
  });
}
