/**
 * usePaginatedPayments Hook
 * Requirements: 18.1-18.15
 * Task: 25.1 Implementar otimizações de performance
 *
 * Provides paginated payment list with infinite scroll support
 */

import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchPaginatedPayments } from "@/services/payments/paginated-payments-service";
import type { PaymentFilters } from "@/types/manual-payment";

export function usePaginatedPayments(filters: PaymentFilters = {}) {
  return useInfiniteQuery({
    queryKey: ["paginated-payments", filters],
    queryFn: ({ pageParam = 0 }) => fetchPaginatedPayments(filters, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

export function useInfiniteScrollPayments(filters: PaymentFilters = {}) {
  const query = usePaginatedPayments(filters);

  // Flatten pages into single array
  const payments = query.data?.pages.flatMap((page) => page.payments) || [];

  return {
    ...query,
    payments,
    hasMore: query.hasNextPage,
    loadMore: query.fetchNextPage,
    isLoadingMore: query.isFetchingNextPage,
  };
}
