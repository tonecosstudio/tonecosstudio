/**
 * Hook para Contadores de Status de Pedidos
 * 
 * Busca e gerencia contadores de pedidos por status
 */

import { useQuery } from '@tanstack/react-query';
import { countOrdersByStatus } from '@/services/admin/orders/orders-service';
import type { OrderFilters, OrderStatus } from '@/types/admin/orders';

// ============================================================================
// Hook Principal
// ============================================================================

export interface UseOrderStatusCountsReturn {
  counts: Record<OrderStatus, number>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook para buscar contadores de pedidos por status
 * 
 * @param type - Tipo de pedido para filtrar contadores
 * @returns Contadores de pedidos por status
 * 
 * @example
 * ```tsx
 * const { counts, isLoading } = useOrderStatusCounts('all');
 * 
 * // Exibir contagem de um status específico
 * <span>{counts['pending_choice'] || 0}</span>
 * ```
 */
export function useOrderStatusCounts(
  type: OrderFilters['type']
): UseOrderStatusCountsReturn {
  const query = useQuery({
    queryKey: ['order-status-counts', type],
    queryFn: () => countOrdersByStatus(type),
    staleTime: 30000, // 30 segundos
    gcTime: 300000, // 5 minutos (anteriormente cacheTime)
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  return {
    counts: query.data || ({} as Record<OrderStatus, number>),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch
  };
}

// ============================================================================
// Hooks Auxiliares
// ============================================================================

/**
 * Hook para obter contagem de um status específico
 */
export function useStatusCount(
  type: OrderFilters['type'],
  status: OrderStatus
): number {
  const { counts } = useOrderStatusCounts(type);
  return counts[status] || 0;
}

/**
 * Hook para obter contagem total de pedidos
 */
export function useTotalOrdersCount(type: OrderFilters['type']): number {
  const { counts } = useOrderStatusCounts(type);
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}
