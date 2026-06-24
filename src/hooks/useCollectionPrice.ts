import { useQuery } from "@tanstack/react-query";
import {
  getCollectionPrice,
  getCollectionPrices,
  hasCollectionDiscount,
} from "@/services/pricing/collection-price-service";
import {
  CACHE_CONFIG,
  CollectionPriceResponse,
  QUERY_KEYS,
} from "@/types/contextual-pricing";

export interface CollectionPriceParams {
  collectionId: string;
  userId?: string | null;
}

export const collectionPriceKeys = {
  all: [QUERY_KEYS.COLLECTION_PRICE] as const,
  detail: (collectionId: string, userId?: string | null) =>
    [...collectionPriceKeys.all, collectionId, userId ?? "anonymous"] as const,
};

export function useCollectionPrice(params: CollectionPriceParams) {
  const { collectionId, userId } = params;

  return useQuery({
    queryKey: collectionPriceKeys.detail(collectionId, userId),
    queryFn: () => getCollectionPrice({ collectionId, userId }),
    enabled: !!collectionId,
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
  });
}

export function useCollectionPrices(collectionIds: string[], userId?: string | null) {
  return useQuery({
    queryKey: [...collectionPriceKeys.all, "batch", collectionIds.join(","), userId ?? "anonymous"],
    queryFn: () => getCollectionPrices(collectionIds, userId),
    enabled: collectionIds.length > 0,
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
  });
}

export function useHasCollectionDiscount(collectionId: string, userId?: string | null) {
  return useQuery({
    queryKey: ["collection-discount", collectionId, userId ?? "anonymous"],
    queryFn: () => hasCollectionDiscount(collectionId, userId),
    enabled: !!collectionId,
    staleTime: CACHE_CONFIG.STALE_TIME,
  });
}

export type { CollectionPriceResponse };
