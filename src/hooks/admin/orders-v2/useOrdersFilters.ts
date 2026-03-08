/**
 * Hook de Filtros para Pedidos V2
 * 
 * Gerencia o estado dos filtros de busca
 */

import { useState, useCallback } from 'react';
import type { OrderFilters, OrderStatus } from '@/types/admin/orders';

// ============================================================================
// Hook Principal
// ============================================================================

export interface UseOrdersFiltersReturn {
  filters: OrderFilters;
  setType: (type: OrderFilters['type']) => void;
  setStatus: (status: OrderStatus[]) => void;
  toggleStatus: (status: OrderStatus) => void;
  setDateRange: (from: string | null, to: string | null) => void;
  setSearchQuery: (query: string) => void;
  setPlanType: (planType: 'trimestral' | 'semestral' | 'anual' | null) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
}

const DEFAULT_FILTERS: OrderFilters = {
  type: 'all',
  status: [],
  dateFrom: null,
  dateTo: null,
  searchQuery: '',
  planType: null,
};

export function useOrdersFilters(): UseOrdersFiltersReturn {
  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS);

  const setType = useCallback((type: OrderFilters['type']) => {
    setFilters((prev: OrderFilters) => ({ ...prev, type }));
  }, []);

  const setStatus = useCallback((status: OrderStatus[]) => {
    setFilters((prev: OrderFilters) => ({ ...prev, status }));
  }, []);

  const toggleStatus = useCallback((status: OrderStatus) => {
    setFilters((prev: OrderFilters) => {
      const newStatus = prev.status.includes(status)
        ? prev.status.filter((s: OrderStatus) => s !== status)
        : [...prev.status, status];
      return { ...prev, status: newStatus };
    });
  }, []);

  const setDateRange = useCallback((from: string | null, to: string | null) => {
    setFilters((prev: OrderFilters) => ({ ...prev, dateFrom: from, dateTo: to }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev: OrderFilters) => ({ ...prev, searchQuery: query }));
  }, []);

  const setPlanType = useCallback((planType: 'trimestral' | 'semestral' | 'anual' | null) => {
    setFilters((prev: OrderFilters) => ({ ...prev, planType }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const hasActiveFilters =
    filters.type !== 'all' ||
    filters.status.length > 0 ||
    filters.dateFrom !== null ||
    filters.dateTo !== null ||
    filters.searchQuery !== '' ||
    filters.planType !== null;

  const activeFilterCount =
    (filters.type !== 'all' ? 1 : 0) +
    (filters.status.length > 0 ? 1 : 0) +
    (filters.dateFrom !== null || filters.dateTo !== null ? 1 : 0) +
    (filters.searchQuery !== '' ? 1 : 0) +
    (filters.planType !== null ? 1 : 0);

  return {
    filters,
    setType,
    setStatus,
    toggleStatus,
    setDateRange,
    setSearchQuery,
    setPlanType,
    resetFilters,
    hasActiveFilters,
    activeFilterCount,
  };
}
