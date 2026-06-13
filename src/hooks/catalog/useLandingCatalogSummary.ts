import { useQuery } from "@tanstack/react-query";
import { getPublicCatalogSummary } from "@/services/catalog/catalog-models-service";

export function useLandingCatalogSummary() {
  return useQuery({
    queryKey: ["landing-catalog-summary"],
    queryFn: getPublicCatalogSummary,
  });
}
