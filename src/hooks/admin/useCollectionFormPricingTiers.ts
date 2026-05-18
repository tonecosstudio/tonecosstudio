import { useQuery } from "@tanstack/react-query";
import { fetchCollectionFormPricingTiers } from "@/services/admin/collection-form-pricing-tiers-service";

export function useCollectionFormPricingTiers(open: boolean) {
  return useQuery({
    queryKey: ["collection-form-pricing-tiers"],
    queryFn: fetchCollectionFormPricingTiers,
    enabled: open,
  });
}
