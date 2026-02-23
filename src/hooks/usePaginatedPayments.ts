// @ts-nocheck
/**
 * usePaginatedPayments Hook
 * Requirements: 18.1-18.15
 * Task: 25.1 Implementar otimizações de performance
 * 
 * Provides paginated payment list with infinite scroll support
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ManualPayment, PaymentFilters } from '@/types/manual-payment';

const PAGE_SIZE = 25;

interface PaginatedPaymentsResult {
  payments: ManualPayment[];
  nextCursor: number | null;
}

async function fetchPayments(
  filters: PaymentFilters,
  pageParam: number = 0
): Promise<PaginatedPaymentsResult> {
  let query = supabase
    .from('manual_payments')
    .select('*', { count: 'exact' });

  // Apply filters
  if (filters.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  if (filters.payment_method_id) {
    query = query.eq('payment_method_id', filters.payment_method_id);
  }

  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from);
  }

  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to);
  }

  if (filters.search) {
    query = query.or(`reference_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`);
  }

  // Apply pagination
  const from = pageParam * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  query = query
    .range(from, to)
    .order('created_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch payments: ${error.message}`);
  }

  const payments = (data || []) as ManualPayment[];
  const hasMore = count ? from + payments.length < count : false;
  const nextCursor = hasMore ? pageParam + 1 : null;

  return {
    payments,
    nextCursor,
  };
}

export function usePaginatedPayments(filters: PaymentFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['paginated-payments', filters],
    queryFn: ({ pageParam = 0 }) => fetchPayments(filters, pageParam),
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
