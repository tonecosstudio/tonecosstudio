import { useQuery } from "@tanstack/react-query";
import {
  getCollectionPricing,
  getGlobalPricingSettings,
} from "@/services/pricing/collection-pricing-service";

export type { CollectionPricing } from "@/services/pricing/collection-pricing-service";

export function useCollectionPricing(collectionId: string | undefined) {
  return useQuery({
    queryKey: ["collection-pricing", collectionId],
    queryFn: async () => {
      if (!collectionId) {
        throw new Error("Collection ID is required");
      }

      return getCollectionPricing(collectionId);
    },
    enabled: !!collectionId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useGlobalPricingSettings() {
  return useQuery({
    queryKey: ["global-pricing-settings"],
    queryFn: getGlobalPricingSettings,
  });
}
