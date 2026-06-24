import { useQuery } from "@tanstack/react-query";
import {
  invalidCollectionLimitParameters,
  unauthenticatedCollectionLimit,
  validateCollectionLimit,
} from "@/services/collections/collection-limit-service";
import { QUERY_KEYS } from "@/types/contextual-pricing";

export const collectionLimitKeys = {
  all: [QUERY_KEYS.COLLECTION_LIMIT] as const,
  detail: (userId: string) => [...collectionLimitKeys.all, userId] as const,
};

export function useCollectionLimit(userId?: string | null) {
  return useQuery({
    queryKey: collectionLimitKeys.detail(userId || ""),
    queryFn: async () => {
      if (!userId) {
        return unauthenticatedCollectionLimit();
      }

      return validateCollectionLimit({ userId });
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCanAddCollection(userId?: string | null, collectionId?: string | null) {
  return useQuery({
    queryKey: [...collectionLimitKeys.all, "can-add", userId || "", collectionId || ""],
    queryFn: async () => {
      if (!userId || !collectionId) {
        return invalidCollectionLimitParameters();
      }

      return validateCollectionLimit({ userId, collectionId });
    },
    enabled: !!userId && !!collectionId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCollectionLimitHelpers(userId?: string | null) {
  const { data: limitInfo, isLoading, error } = useCollectionLimit(userId);

  const canAddMore = limitInfo?.can_add ?? false;
  const isUnlimited = limitInfo?.is_unlimited ?? false;
  const currentCount = limitInfo?.current_count ?? 0;
  const maxCount = limitInfo?.max_count ?? 0;
  const remainingSlots = isUnlimited ? Infinity : Math.max(0, maxCount - currentCount);

  const usageText = isUnlimited
    ? `${currentCount} colecoes (ilimitado)`
    : `${currentCount} de ${maxCount} colecoes`;

  const progressPercentage = isUnlimited ? 0 : (currentCount / maxCount) * 100;

  return {
    canAddMore,
    isUnlimited,
    currentCount,
    maxCount,
    remainingSlots,
    usageText,
    progressPercentage,
    message: limitInfo?.message ?? "",
    isLoading,
    error,
  };
}
