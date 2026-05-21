import { useQuery } from "@tanstack/react-query";
import { listRecentLandingModels } from "@/services/catalog/catalog-models-service";

export function useLandingCatalogModels(limit = 6) {
  return useQuery({
    queryKey: ["landing-recent-models", limit],
    queryFn: () => listRecentLandingModels(limit),
  });
}
