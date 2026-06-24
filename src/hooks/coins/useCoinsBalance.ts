import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { assertCurrentUserId } from "@/services/auth/current-user";
import { fetchCoinsBalance } from "@/services/coins/coins-balance-service";
import { initializeCurrentUserCoinBalanceRpc } from "@/services/coins/coins-mutations-service";
import { invalidateCoinsTransactions } from "./useCoinsTransactions";
import type { CoinsAmount, CoinsBalanceResponse, UserId } from "@/types/coins";

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

export function useHasSufficientBalance(
  userId: UserId | null,
  requiredAmount: CoinsAmount,
) {
  const { data: balance } = useCoinsBalance(userId);

  return useQuery({
    queryKey: ["coins", "sufficient", userId, requiredAmount],
    queryFn: async (): Promise<boolean> => {
      if (!balance) return false;
      return balance.balance >= requiredAmount;
    },
    enabled: !!balance && requiredAmount > 0,
    staleTime: CACHE_CONFIG.STALE_TIME,
  });
}

export function useBalanceAfterPurchase(
  userId: UserId | null,
  price: CoinsAmount,
) {
  const { data: balance } = useCoinsBalance(userId);

  return useQuery({
    queryKey: ["coins", "balance-after", userId, price],
    queryFn: async (): Promise<CoinsAmount | null> => {
      if (!balance) return null;

      const balanceAfter = balance.balance - price;
      return balanceAfter < 0 ? null : balanceAfter;
    },
    enabled: !!balance && price > 0,
    staleTime: CACHE_CONFIG.STALE_TIME,
  });
}

export function useInitializeBalance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      userId: UserId;
      description?: string | null;
    }) => {
      const { userId, description } = params;
      await assertCurrentUserId(userId);

      return initializeCurrentUserCoinBalanceRpc({
        description,
      });
    },
    onSuccess: (data, variables) => {
      invalidateCoinsBalance(queryClient, variables.userId);
      invalidateCoinsTransactions(queryClient);

      toast({
        title: "Saldo preparado!",
        description: `Saldo atual: ${data.balance} coins.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao inicializar saldo",
        description: error.message,
        variant: "destructive",
      });
    },
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

export function updateCoinsBalanceCache(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: UserId,
  newBalance: CoinsAmount,
) {
  queryClient.setQueryData<CoinsBalanceResponse>(
    coinsBalanceKeys.user(userId),
    (old) => {
      if (!old) return old;

      const now = new Date().toISOString();

      return {
        ...old,
        balance: newBalance,
        last_updated: now,
        updated_at: now,
      };
    },
  );
}
