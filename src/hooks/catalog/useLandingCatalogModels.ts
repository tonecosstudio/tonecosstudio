import { useQuery } from "@tanstack/react-query";
import { listRecentLandingCharacters } from "@/services/catalog/catalog-models-service";

export function useLandingCatalogModels(limit = 6) {
  return useQuery({
    queryKey: ["landing-recent-characters", limit],
    queryFn: () => listRecentLandingCharacters(limit),
  });
}
