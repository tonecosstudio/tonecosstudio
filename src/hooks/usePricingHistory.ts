import { useQuery } from "@tanstack/react-query";
import {
  getPricingHistoryStats,
  listAllPricingHistory,
  listCollectionPricingHistory,
  listTierPricingHistory,
  type PricingHistoryFilters,
} from "@/services/pricing/pricing-history-service";

export type { PricingHistoryFilters } from "@/services/pricing/pricing-history-service";
export { exportPricingHistoryToCSV } from "@/services/pricing/pricing-history-service";

export const pricingHistoryKeys = {
  all: ["pricing-history"] as const,
  lists: () => [...pricingHistoryKeys.all, "list"] as const,
  list: (filters?: PricingHistoryFilters) => [...pricingHistoryKeys.lists(), filters] as const,
  byTier: (tierId: string, filters?: PricingHistoryFilters) =>
    [...pricingHistoryKeys.all, "tier", tierId, filters] as const,
  byCollection: (collectionId: string, filters?: PricingHistoryFilters) =>
    [...pricingHistoryKeys.all, "collection", collectionId, filters] as const,
};

export function useTierPricingHistory(
  tierId: string | null | undefined,
  filters?: PricingHistoryFilters,
) {
  return useQuery({
    queryKey: pricingHistoryKeys.byTier(tierId || "", filters),
    queryFn: () => listTierPricingHistory(tierId, filters),
    enabled: !!tierId,
    staleTime: 1 * 60 * 1000,
  });
}

export function useCollectionPricingHistory(
  collectionId: string | null | undefined,
  filters?: PricingHistoryFilters,
) {
  return useQuery({
    queryKey: pricingHistoryKeys.byCollection(collectionId || "", filters),
    queryFn: () => listCollectionPricingHistory(collectionId, filters),
    enabled: !!collectionId,
    staleTime: 1 * 60 * 1000,
  });
}

export function useAllPricingHistory(filters?: PricingHistoryFilters) {
  return useQuery({
    queryKey: pricingHistoryKeys.list(filters),
    queryFn: () => listAllPricingHistory(filters),
    staleTime: 1 * 60 * 1000,
  });
}

export function usePricingHistoryStats(filters?: PricingHistoryFilters) {
  return useQuery({
    queryKey: [...pricingHistoryKeys.all, "stats", filters],
    queryFn: () => getPricingHistoryStats(filters),
    staleTime: 2 * 60 * 1000,
  });
}
