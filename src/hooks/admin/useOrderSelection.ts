/**
 * Hook de Gerenciamento de Seleção de Pedidos
 * 
 * IMPORTANTE: Tipagem completa habilitada para garantir segurança de tipos.
 */
/**
 * Hook de Seleção Múltipla de Pedidos
 * 
 * Este hook gerencia a seleção de múltiplos pedidos para ações em massa.
 */

import { useState, useCallback, useMemo } from 'react';
import type { UnifiedOrder } from '@/types/admin/orders';

// ============================================================================
// Tipos
// ============================================================================

export interface UseOrderSelectionReturn {
  selectedIds: Set<string>;
  selectedOrders: UnifiedOrder[];
  isSelected: (orderId: string) => boolean;
  toggleSelection: (orderId: string) => void;
  selectOrder: (orderId: string) => void;
  deselectOrder: (orderId: string) => void;
  selectAll: (orders: UnifiedOrder[]) => void;
  deselectAll: () => void;
  selectPage: (orders: UnifiedOrder[]) => void;
  isAllSelected: (orders: UnifiedOrder[]) => boolean;
  isPageSelected: (orders: UnifiedOrder[]) => boolean;
  selectionCount: number;
  hasSelection: boolean;
}

// ============================================================================
// Hook Principal
// ============================================================================

/**
 * Hook para gerenciar seleção múltipla de pedidos
 * 
 * @param orders - Array de pedidos disponíveis para seleção
 * @returns Objeto com estado e funções de seleção
 * 
 * @example
 * ```tsx
 * const {
 *   selectedIds,
 *   isSelected,
 *   toggleSelection,
 *   selectAll,
 *   deselectAll,
 *   selectionCount
 * } = useOrderSelection(orders);
 * ```
 */
export function useOrderSelection(orders: UnifiedOrder[] = []): UseOrderSelectionReturn {
  // Estado: Set de IDs selecionados (Set é mais eficiente para lookup)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Verificar se um pedido está selecionado
  const isSelected = useCallback((orderId: string): boolean => {
    return selectedIds.has(orderId);
  }, [selectedIds]);

  // Alternar seleção de um pedido
  const toggleSelection = useCallback((orderId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  }, []);

  // Selecionar um pedido específico
  const selectOrder = useCallback((orderId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.add(orderId);
      return newSet;
    });
  }, []);

  // Desselecionar um pedido específico
  const deselectOrder = useCallback((orderId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(orderId);
      return newSet;
    });
  }, []);

  // Selecionar todos os pedidos
  const selectAll = useCallback((ordersToSelect: UnifiedOrder[]) => {
    const allIds = new Set(ordersToSelect.map(order => order.id));
    setSelectedIds(allIds);
  }, []);

  // Desselecionar todos os pedidos
  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Selecionar todos os pedidos da página atual
  const selectPage = useCallback((pageOrders: UnifiedOrder[]) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      pageOrders.forEach(order => newSet.add(order.id));
      return newSet;
    });
  }, []);

  // Verificar se todos os pedidos estão selecionados
  const isAllSelected = useCallback((ordersToCheck: UnifiedOrder[]): boolean => {
    if (ordersToCheck.length === 0) return false;
    return ordersToCheck.every(order => selectedIds.has(order.id));
  }, [selectedIds]);

  // Verificar se todos os pedidos da página estão selecionados
  const isPageSelected = useCallback((pageOrders: UnifiedOrder[]): boolean => {
    if (pageOrders.length === 0) return false;
    return pageOrders.every(order => selectedIds.has(order.id));
  }, [selectedIds]);

  // Obter array de pedidos selecionados
  const selectedOrders = useMemo(() => {
    return orders.filter(order => selectedIds.has(order.id));
  }, [orders, selectedIds]);

  // Contagem de selecionados
  const selectionCount = selectedIds.size;

  // Verificar se há alguma seleção
  const hasSelection = selectionCount > 0;

  return {
    selectedIds,
    selectedOrders,
    isSelected,
    toggleSelection,
    selectOrder,
    deselectOrder,
    selectAll,
    deselectAll,
    selectPage,
    isAllSelected,
    isPageSelected,
    selectionCount,
    hasSelection
  };
}

// ============================================================================
// Hooks Auxiliares
// ============================================================================

/**
 * Hook para gerenciar seleção com limite máximo
 * 
 * Útil para limitar o número de pedidos que podem ser selecionados
 * (ex: limite de 100 pedidos para ações em massa)
 */
export function useOrderSelectionWithLimit(
  orders: UnifiedOrder[],
  maxSelection: number = 100
) {
  const selection = useOrderSelection(orders);

  // Sobrescrever funções de seleção para respeitar o limite
  const selectOrder = useCallback((orderId: string) => {
    if (selection.selectionCount >= maxSelection) {
      return; // Não adicionar se já atingiu o limite
    }
    selection.selectOrder(orderId);
  }, [selection, maxSelection]);

  const toggleSelection = useCallback((orderId: string) => {
    if (!selection.isSelected(orderId) && selection.selectionCount >= maxSelection) {
      return; // Não adicionar se já atingiu o limite
    }
    selection.toggleSelection(orderId);
  }, [selection, maxSelection]);

  const selectAll = useCallback((ordersToSelect: UnifiedOrder[]) => {
    // Selecionar apenas até o limite
    const limitedOrders = ordersToSelect.slice(0, maxSelection);
    selection.selectAll(limitedOrders);
  }, [selection, maxSelection]);

  const selectPage = useCallback((pageOrders: UnifiedOrder[]) => {
    const remainingSlots = maxSelection - selection.selectionCount;
    if (remainingSlots <= 0) return;

    const ordersToAdd = pageOrders.slice(0, remainingSlots);
    selection.selectPage(ordersToAdd);
  }, [selection, maxSelection]);

  return {
    ...selection,
    selectOrder,
    toggleSelection,
    selectAll,
    selectPage,
    maxSelection,
    isLimitReached: selection.selectionCount >= maxSelection,
    remainingSlots: Math.max(0, maxSelection - selection.selectionCount)
  };
}

/**
 * Hook para seleção com filtro por tipo
 * 
 * Permite selecionar apenas pedidos de um tipo específico
 */
export function useOrderSelectionByType(
  orders: UnifiedOrder[],
  allowedType?: 'subscription_delivery' | 'standalone_purchase'
) {
  const selection = useOrderSelection(orders);

  // Filtrar pedidos pelo tipo permitido
  const selectableOrders = useMemo(() => {
    if (!allowedType) return orders;
    return orders.filter(order => order.type === allowedType);
  }, [orders, allowedType]);

  // Verificar se um pedido pode ser selecionado
  const canSelect = useCallback((order: UnifiedOrder): boolean => {
    if (!allowedType) return true;
    return order.type === allowedType;
  }, [allowedType]);

  // Sobrescrever funções para respeitar o filtro de tipo
  const selectOrder = useCallback((orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order && canSelect(order)) {
      selection.selectOrder(orderId);
    }
  }, [orders, canSelect, selection]);

  const toggleSelection = useCallback((orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order && canSelect(order)) {
      selection.toggleSelection(orderId);
    }
  }, [orders, canSelect, selection]);

  const selectAll = useCallback(() => {
    selection.selectAll(selectableOrders);
  }, [selection, selectableOrders]);

  return {
    ...selection,
    selectOrder,
    toggleSelection,
    selectAll,
    selectableOrders,
    canSelect,
    allowedType
  };
}

// ============================================================================
// Utilitários
// ============================================================================

/**
 * Agrupa pedidos selecionados por tipo
 */
export function groupSelectedOrdersByType(selectedOrders: UnifiedOrder[]): {
  subscriptionDeliveries: UnifiedOrder[];
  standalonePurchases: UnifiedOrder[];
} {
  return {
    subscriptionDeliveries: selectedOrders.filter(
      order => order.type === 'subscription_delivery'
    ),
    standalonePurchases: selectedOrders.filter(
      order => order.type === 'standalone_purchase'
    )
  };
}

/**
 * Agrupa pedidos selecionados por status
 */
export function groupSelectedOrdersByStatus(selectedOrders: UnifiedOrder[]): Map<string, UnifiedOrder[]> {
  const grouped = new Map<string, UnifiedOrder[]>();

  selectedOrders.forEach(order => {
    const existing = grouped.get(order.status) || [];
    grouped.set(order.status, [...existing, order]);
  });

  return grouped;
}

/**
 * Valida se os pedidos selecionados podem receber uma ação específica
 */
export function validateSelectionForAction(
  selectedOrders: UnifiedOrder[],
  action: 'update_status' | 'generate_labels' | 'export_csv'
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (selectedOrders.length === 0) {
    errors.push('Nenhum pedido selecionado');
    return { valid: false, errors };
  }

  switch (action) {
    case 'update_status':
      // Verificar se todos os pedidos são do mesmo tipo
      const types = new Set(selectedOrders.map(o => o.type));
      if (types.size > 1) {
        errors.push('Não é possível atualizar status de pedidos de tipos diferentes simultaneamente');
      }
      break;

    case 'generate_labels':
      // Verificar se todos os pedidos têm endereço
      const withoutAddress = selectedOrders.filter(o => !o.trackingCode);
      if (withoutAddress.length > 0) {
        errors.push(`${withoutAddress.length} pedido(s) sem endereço de entrega`);
      }
      break;

    case 'export_csv':
      // Exportação não tem restrições específicas
      break;
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Calcula estatísticas da seleção
 */
export function getSelectionStats(selectedOrders: UnifiedOrder[]): {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  totalAmount: number;
} {
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let totalAmount = 0;

  selectedOrders.forEach(order => {
    // Contar por tipo
    byType[order.type] = (byType[order.type] || 0) + 1;

    // Contar por status
    byStatus[order.status] = (byStatus[order.status] || 0) + 1;

    // Somar valores
    totalAmount += order.amount;
  });

  return {
    total: selectedOrders.length,
    byType,
    byStatus,
    totalAmount
  };
}
