import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCoinsBalance } from "@/services/coins/coins-balance-service";
import type { CoinsBalanceResponse, UserId } from "@/types/coins";

export const coinsBalanceKeys = {
  all: ["coins", "balance"] as const,
  user: (userId: UserId) => [...coinsBalanceKeys.all, userId] as const,
};

const CACHE_CONFIG = {
  STALE_TIME: 30 * 1000,
  CACHE_TIME: 5 * 60 * 1000,
};

interface UseCoinsBalanceOptions {
  enabled?: boolean;
}

export function useCoinsBalance(userId?: UserId | null, options: UseCoinsBalanceOptions = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: userId ? coinsBalanceKeys.user(userId) : coinsBalanceKeys.all,
    queryFn: (): Promise<CoinsBalanceResponse> => fetchCoinsBalance(userId),
    enabled,
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
    retry: 2,
  });
}

export function invalidateCoinsBalance(
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: UserId,
) {
  queryClient.invalidateQueries({
    queryKey: coinsBalanceKeys.all,
  });

  if (userId) {
    queryClient.invalidateQueries({
      queryKey: coinsBalanceKeys.user(userId),
    });
  }
}
