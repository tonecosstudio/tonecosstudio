import { useQuery, type QueryClient } from "@tanstack/react-query";
import {
  getCoinTransaction,
  getCoinTransactionStats,
  listCoinsTransactions,
  listRecentCoinTransactions,
  type TransactionFilters,
  type TransactionStats,
} from "@/services/coins/coins-transactions-service";
import { CoinsTransactionType } from "@/types/coins";
import type { CoinsTransaction, TransactionId, UserId } from "@/types/coins";

export type { TransactionFilters, TransactionStats } from "@/services/coins/coins-transactions-service";

export const coinsTransactionsKeys = {
  all: ["coins", "transactions"] as const,
  lists: () => [...coinsTransactionsKeys.all, "list"] as const,
  list: (filters: TransactionFilters) =>
    [...coinsTransactionsKeys.lists(), filters] as const,
  detail: (id: TransactionId) =>
    [...coinsTransactionsKeys.all, "detail", id] as const,
  user: (userId: UserId) =>
    [...coinsTransactionsKeys.all, "user", userId] as const,
  userByType: (userId: UserId, type: CoinsTransactionType) =>
    [...coinsTransactionsKeys.user(userId), "type", type] as const,
};

export interface UseTransactionsOptions extends TransactionFilters {
  enabled?: boolean;
}

const CACHE_CONFIG = {
  STALE_TIME: 60 * 1000,
  CACHE_TIME: 5 * 60 * 1000,
};

export function invalidateCoinsTransactions(queryClient: QueryClient) {
  queryClient.invalidateQueries({
    queryKey: coinsTransactionsKeys.all,
  });
  queryClient.invalidateQueries({
    queryKey: ["coin-transactions"],
  });
}

export function useCoinsTransactions(options: UseTransactionsOptions = {}) {
  const {
    userId,
    type,
    startDate,
    endDate,
    page = 1,
    perPage = 20,
    orderBy = "created_at",
    orderDirection = "desc",
    enabled = true,
  } = options;

  const filters: TransactionFilters = {
    userId,
    type,
    startDate,
    endDate,
    page,
    perPage,
    orderBy,
    orderDirection,
  };

  return useQuery({
    queryKey: coinsTransactionsKeys.list(filters),
    queryFn: () => listCoinsTransactions(filters),
    enabled,
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
  });
}

export function useTransactionsByType(
  userId: UserId | null,
  type: CoinsTransactionType,
  options: Omit<UseTransactionsOptions, "userId" | "type"> = {},
) {
  return useCoinsTransactions({
    ...options,
    userId,
    type,
  });
}

export function useTransaction(transactionId: TransactionId) {
  return useQuery({
    queryKey: coinsTransactionsKeys.detail(transactionId),
    queryFn: (): Promise<CoinsTransaction> => getCoinTransaction(transactionId),
    enabled: !!transactionId,
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
  });
}

export function useTransactionStats(
  userId: UserId | null,
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: ["coins", "transactions", "stats", userId, startDate, endDate],
    queryFn: (): Promise<TransactionStats> =>
      getCoinTransactionStats(userId, startDate, endDate),
    enabled: true,
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
  });
}

export function useRecentTransactions(
  userId: UserId | null,
  limit: number = 10,
) {
  return useQuery({
    queryKey: ["coins", "transactions", "recent", userId, limit],
    queryFn: (): Promise<CoinsTransaction[]> => listRecentCoinTransactions(userId, limit),
    enabled: true,
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
  });
}

export function groupTransactionsByDate(
  transactions: CoinsTransaction[],
): Record<string, CoinsTransaction[]> {
  return transactions.reduce((acc, tx) => {
    const date = tx.created_at.split("T")[0];

    if (!acc[date]) {
      acc[date] = [];
    }

    acc[date].push(tx);

    return acc;
  }, {} as Record<string, CoinsTransaction[]>);
}

export function groupTransactionsByType(
  transactions: CoinsTransaction[],
): Record<CoinsTransactionType, CoinsTransaction[]> {
  return transactions.reduce((acc, tx) => {
    if (!acc[tx.type]) {
      acc[tx.type] = [];
    }

    acc[tx.type].push(tx);

    return acc;
  }, {} as Record<CoinsTransactionType, CoinsTransaction[]>);
}

export function calculateTotalByType(
  transactions: CoinsTransaction[],
): Record<CoinsTransactionType, number> {
  return transactions.reduce((acc, tx) => {
    if (!acc[tx.type]) {
      acc[tx.type] = 0;
    }

    acc[tx.type] += tx.amount;

    return acc;
  }, {} as Record<CoinsTransactionType, number>);
}

export function filterTransactionsByPeriod(
  transactions: CoinsTransaction[],
  startDate: Date,
  endDate: Date,
): CoinsTransaction[] {
  return transactions.filter((tx) => {
    const txDate = new Date(tx.created_at);
    return txDate >= startDate && txDate <= endDate;
  });
}
