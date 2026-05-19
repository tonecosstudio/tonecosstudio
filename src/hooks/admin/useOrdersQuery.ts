/**
 * Hook de Query para Pedidos Unificados
 * 
 * Este hook usa TanStack Query para gerenciar o estado de busca de pedidos,
 * incluindo cache, prefetch e tratamento de erros.
 * 
 * IMPORTANTE: Tipagem completa habilitada para garantir segurança de tipos.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { fetchUnifiedOrders } from '@/services/admin/orders-service';
import type {
  UnifiedOrder,
  OrderFilters,
  PaginationParams,
  PaginatedResponse
} from '@/types/admin/orders';

// ============================================================================
// Constantes
// ============================================================================

/**
 * Chave base para queries de pedidos
 */
export const ORDERS_QUERY_KEY = 'admin-orders';

/**
 * Configuração de cache
 */
const CACHE_CONFIG = {
  staleTime: 30000,      // 30 segundos - dados considerados frescos
  gcTime: 300000,        // 5 minutos - tempo que dados ficam em cache (garbage collection time)
  refetchOnWindowFocus: false,
  retry: 2
};

// ============================================================================
// Hook Principal
// ============================================================================

export interface UseOrdersQueryOptions {
  filters: OrderFilters;
  pagination: PaginationParams;
  enabled?: boolean;
}

export interface UseOrdersQueryReturn {
  orders: UnifiedOrder[];
  total: number;
  totalPages: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  prefetchNextPage: () => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
  data: PaginatedResponse<UnifiedOrder> | undefined;
  refetch: () => void;
}

/**
 * Hook para buscar pedidos unificados com cache e prefetch
 * 
 * @example
 * ```tsx
 * const { orders, isLoading, error, prefetchNextPage } = useOrdersQuery({
 *   filters: {
 *     type: 'all',
 *     status: [],
 *     dateFrom: null,
 *     dateTo: null,
 *     searchQuery: ''
 *   },
 *   pagination: {
 *     page: 1,
 *     pageSize: 20
 *   }
 * });
 * ```
 */
export function useOrdersQuery({
  filters,
  pagination,
  enabled = true
}: UseOrdersQueryOptions): UseOrdersQueryReturn {
  const queryClient = useQueryClient();

  // Query principal
  const query = useQuery({
    queryKey: [ORDERS_QUERY_KEY, filters, pagination],
    queryFn: () => fetchUnifiedOrders(filters, pagination),
    enabled,
    ...CACHE_CONFIG
  });

  // Função para prefetch manual da próxima página
  const prefetchNextPage = useCallback(() => {
    if (query.data && pagination.page < query.data.totalPages) {
      const nextPagination = {
        ...pagination,
        page: pagination.page + 1
      };
      
      queryClient.prefetchQuery({
        queryKey: [ORDERS_QUERY_KEY, filters, nextPagination],
        queryFn: () => fetchUnifiedOrders(filters, nextPagination),
        staleTime: CACHE_CONFIG.staleTime
      });
    }
  }, [filters, pagination, query.data, queryClient]);

  // Prefetch automático da próxima página quando dados são carregados
  // Requisito 11.1: Melhorar performance percebida
  useEffect(() => {
    if (query.data && query.isSuccess && pagination.page < query.data.totalPages) {
      // Pequeno delay para não competir com a renderização
      const timeoutId = setTimeout(() => {
        prefetchNextPage();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [query.data, query.isSuccess, pagination.page, prefetchNextPage]);

  return {
    orders: query.data?.data || [],
    total: query.data?.total || 0,
    totalPages: query.data?.totalPages || 0,
    isFirstPage: pagination.page === 1,
    isLastPage: pagination.page === (query.data?.totalPages || 1),
    prefetchNextPage,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isSuccess: query.isSuccess,
    data: query.data,
    refetch: query.refetch
  };
}

// ============================================================================
// Hooks Auxiliares
// ============================================================================

/**
 * Hook para invalidar cache de pedidos
 * 
 * Útil após mutações (criar, atualizar, deletar pedidos)
 */
export function useInvalidateOrders() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
  };
}

/**
 * Hook para prefetch de pedidos
 * 
 * Útil para carregar dados antes de navegar para a página
 */
export function usePrefetchOrders() {
  const queryClient = useQueryClient();

  return (filters: OrderFilters, pagination: PaginationParams) => {
    queryClient.prefetchQuery({
      queryKey: [ORDERS_QUERY_KEY, filters, pagination],
      queryFn: () => fetchUnifiedOrders(filters, pagination),
      staleTime: CACHE_CONFIG.staleTime
    });
  };
}

/**
 * Hook para obter dados de pedidos do cache
 * 
 * Retorna dados imediatamente se estiverem em cache, sem fazer nova requisição
 */
export function useOrdersCache(filters: OrderFilters, pagination: PaginationParams) {
  const queryClient = useQueryClient();

  return queryClient.getQueryData<PaginatedResponse<UnifiedOrder>>([
    ORDERS_QUERY_KEY,
    filters,
    pagination
  ]);
}

/**
 * Hook para limpar cache de pedidos
 * 
 * Remove todos os dados de pedidos do cache
 */
export function useClearOrdersCache() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.removeQueries({ queryKey: [ORDERS_QUERY_KEY] });
  };
}

// ============================================================================
// Hooks de Contagem
// ============================================================================

/**
 * Hook para buscar contagem de pedidos por status
 */
export function useOrdersCountByStatus(
  type: 'all' | 'subscription_delivery' | 'standalone_purchase'
) {
  const { countOrdersByStatus } = require('@/services/admin/orders-service');

  return useQuery({
    queryKey: [ORDERS_QUERY_KEY, 'count-by-status', type],
    queryFn: () => countOrdersByStatus(type),
    staleTime: 60000, // 1 minuto
    gcTime: 300000 // 5 minutos
  });
}

// ============================================================================
// Hooks de Busca Individual
// ============================================================================

export interface UseOrderByIdOptions {
  orderId: string;
  orderType: 'subscription_delivery' | 'standalone_purchase';
  enabled?: boolean;
}

/**
 * Hook para buscar um pedido específico por ID
 */
export function useOrderById({
  orderId,
  orderType,
  enabled = true
}: UseOrderByIdOptions) {
  const { fetchOrderById } = require('@/services/admin/orders-service');

  return useQuery({
    queryKey: [ORDERS_QUERY_KEY, 'detail', orderId, orderType],
    queryFn: () => fetchOrderById(orderId, orderType),
    enabled: enabled && !!orderId,
    staleTime: 30000,
    gcTime: 300000
  });
}

// ============================================================================
// Utilitários
// ============================================================================

/**
 * Gera chave de query para pedidos
 * 
 * Útil para invalidação seletiva de cache
 */
export function getOrdersQueryKey(
  filters?: OrderFilters,
  pagination?: PaginationParams
): unknown[] {
  if (filters && pagination) {
    return [ORDERS_QUERY_KEY, filters, pagination];
  }
  if (filters) {
    return [ORDERS_QUERY_KEY, filters];
  }
  return [ORDERS_QUERY_KEY];
}

/**
 * Verifica se há dados de pedidos em cache
 */
export function hasOrdersInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: OrderFilters,
  pagination: PaginationParams
): boolean {
  const data = queryClient.getQueryData<PaginatedResponse<UnifiedOrder>>([
    ORDERS_QUERY_KEY,
    filters,
    pagination
  ]);
  
  return !!data && data.data.length > 0;
}

/**
 * Atualiza dados de um pedido específico no cache
 * 
 * Útil após mutações para atualizar UI sem refetch
 */
export function updateOrderInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  orderId: string,
  updater: (order: UnifiedOrder) => UnifiedOrder
) {
  // Atualizar em todas as queries de lista
  queryClient.setQueriesData<PaginatedResponse<UnifiedOrder>>(
    { queryKey: [ORDERS_QUERY_KEY] },
    (oldData) => {
      if (!oldData) return oldData;

      return {
        ...oldData,
        data: oldData.data.map(order =>
          order.id === orderId ? updater(order) : order
        )
      };
    }
  );

  // Atualizar query de detalhe se existir
  const detailQueryKey = [ORDERS_QUERY_KEY, 'detail', orderId];
  const detailData = queryClient.getQueryData<UnifiedOrder>(detailQueryKey);
  
  if (detailData) {
    queryClient.setQueryData(detailQueryKey, updater(detailData));
  }
}
