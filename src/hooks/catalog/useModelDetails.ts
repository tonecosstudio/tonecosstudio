import { useQuery } from "@tanstack/react-query";
import { getCatalogModelDetails } from "@/services/catalog/catalog-models-service";

export function useModelDetails(modelId: string | undefined) {
  return useQuery({
    queryKey: ["model-details-arcade", modelId ?? null],
    queryFn: () => (modelId ? getCatalogModelDetails(modelId) : null),
    enabled: Boolean(modelId),
  });
}
