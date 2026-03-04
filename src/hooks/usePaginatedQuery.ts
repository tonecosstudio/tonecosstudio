// @ts-nocheck
/**
 * Custom Hook for Paginated Queries
 * 
 * Simplifies pagination with React Query and Supabase.
 * Automatically handles page state, loading, and errors.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PaginationParams, PaginationResult } from '@/lib/performance/pagination';
import { getQueryConfig } from '@/lib/performance/cache-config';

export interface UsePaginatedQueryOptions<T> {
  queryKey: string[];
  queryFn: (params: PaginationParams) => Promise<PaginationResult<T>>;
  initialPage?: number;
  pageSize?: number;
  cacheConfig?: keyof typeof import('@/lib/performance/cache-config').QUERY_CONFIGS;
  enabled?: boolean;
}

/**
 * Hook for paginated queries
 * 
 * @param options - Query options
 * @returns Paginated query state and handlers
 */
export function usePaginatedQuery<T>({
  queryKey,
  queryFn,
  initialPage = 1,
  pageSize = 20,
  cacheConfig = 'adminList',
  enabled = true
}: UsePaginatedQueryOptions<T>) {
  const [page, setPage] = useState(initialPage);

  const query = useQuery<PaginationResult<T>>({
    queryKey: [...queryKey, 'paginated', page, pageSize],
    queryFn: () => queryFn({ page, pageSize }),
    enabled,
    ...getQueryConfig(cacheConfig)
  });

  const goToPage = (newPage: number) => {
    if (newPage < 1) return;
    if (query.data && newPage > query.data.pagination.totalPages) return;
    setPage(newPage);
  };

  const nextPage = () => {
    if (query.data?.pagination.hasNextPage) {
      setPage(prev => prev + 1);
    }
  };

  const previousPage = () => {
    if (query.data?.pagination.hasPreviousPage) {
      setPage(prev => prev - 1);
    }
  };

  const goToFirstPage = () => setPage(1);

  const goToLastPage = () => {
    if (query.data) {
      setPage(query.data.pagination.totalPages);
    }
  };

  return {
    // Data
    data: query.data?.data || [],
    pagination: query.data?.pagination,
    
    // State
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
    
    // Pagination controls
    page,
    setPage,
    goToPage,
    nextPage,
    previousPage,
    goToFirstPage,
    goToLastPage,
    
    // Query controls
    refetch: query.refetch,
  };
}

/**
 * Hook for cursor-based paginated queries (infinite scroll)
 * 
 * @param options - Query options
 * @returns Infinite query state and handlers
 */
export function useInfinitePaginatedQuery<T>({
  queryKey,
  queryFn,
  pageSize = 20,
  cacheConfig = 'adminList',
  enabled = true
}: Omit<UsePaginatedQueryOptions<T>, 'initialPage'>) {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [allData, setAllData] = useState<T[]>([]);

  const query = useQuery<PaginationResult<T>>({
    queryKey: [...queryKey, 'infinite', cursor, pageSize],
    queryFn: () => queryFn({ cursor, pageSize }),
    enabled,
    ...getQueryConfig(cacheConfig)
  });

  const loadMore = () => {
    if (query.data?.pagination.nextCursor) {
      setCursor(query.data.pagination.nextCursor);
      if (query.data.data) {
        setAllData(prev => [...prev, ...query.data.data]);
      }
    }
  };

  const reset = () => {
    setCursor(undefined);
    setAllData([]);
  };

  return {
    // Data
    data: [...allData, ...(query.data?.data || [])],
    hasMore: query.data?.pagination.hasNextPage || false,
    
    // State
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
    
    // Controls
    loadMore,
    reset,
    refetch: query.refetch,
  };
}
