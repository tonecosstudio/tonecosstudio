// @ts-nocheck
/**
 * Hook de Dados para Pedidos V2
 * 
 * Gerencia o estado de busca de pedidos com TanStack Query
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAllOrders } from '@/services/admin/orders-service-v3';
import type {
  OrderFilters,
  PaginationParams,
  UnifiedOrder,
} from '@/types/admin/orders';

// ============================================================================
// Constantes
// ============================================================================

const QUERY_KEY = 'admin-orders-v2';

const CACHE_CONFIG = {
  staleTime: 30000,      // 30 segundos
  gcTime: 300000,        // 5 minutos
  refetchOnWindowFocus: false,
  retry: 2,
};

// ============================================================================
// Hook Principal
// ============================================================================

export interface UseOrdersDataOptions {
  filters: OrderFilters;
  pagination: PaginationParams;
  enabled?: boolean;
}

export interface UseOrdersDataReturn {
  orders: UnifiedOrder[];
  total: number;
  totalPages: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  prefetchNextPage: () => void;
}

export function useOrdersData({
  filters,
  pagination,
  enabled = true,
}: UseOrdersDataOptions): UseOrdersDataReturn {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, filters, pagination],
    queryFn: () => fetchAllOrders(filters, pagination),
    enabled,
    ...CACHE_CONFIG,
  });

  const prefetchNextPage = () => {
    if (query.data && pagination.page < query.data.totalPages) {
      const nextPagination = {
        ...pagination,
        page: pagination.page + 1,
      };

      queryClient.prefetchQuery({
        queryKey: [QUERY_KEY, filters, nextPagination],
        queryFn: () => fetchAllOrders(filters, nextPagination),
        staleTime: CACHE_CONFIG.staleTime,
      });
    }
  };

  return {
    orders: query.data?.orders || [],
    total: query.data?.total || 0,
    totalPages: Math.ceil((query.data?.total || 0) / pagination.pageSize),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    prefetchNextPage,
  };
}

// ============================================================================
// Hook para Invalidar Cache
// ============================================================================

export function useInvalidateOrdersData() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  };
}
