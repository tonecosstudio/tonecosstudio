/**
 * Hook de Gerenciamento de Filtros de Pedidos
 * 
 * Este hook gerencia o estado dos filtros de pedidos e sincroniza
 * com URL query params para persistência entre navegações.
 * 
 * IMPORTANTE: Tipagem completa habilitada para garantir segurança de tipos.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { OrderFilters, OrderStatus } from '@/types/admin/orders';

// ============================================================================
// Constantes
// ============================================================================

/**
 * Filtros padrão iniciais
 */
export const DEFAULT_FILTERS: OrderFilters = {
  type: 'all',
  status: [],
  dateFrom: null,
  dateTo: null,
  searchQuery: ''
};

/**
 * Nomes dos parâmetros de URL
 */
const URL_PARAMS = {
  TYPE: 'type',
  STATUS: 'status',
  DATE_FROM: 'dateFrom',
  DATE_TO: 'dateTo',
  SEARCH: 'q',
  PAGE: 'page',
  PAGE_SIZE: 'pageSize'
} as const;

// ============================================================================
// Hook Principal
// ============================================================================

export interface UseOrderFiltersReturn {
  filters: OrderFilters;
  setType: (type: OrderFilters['type']) => void;
  setStatus: (status: OrderStatus[]) => void;
  toggleStatus: (status: OrderStatus) => void;
  setDateRange: (dateFrom: string | null, dateTo: string | null) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
}

/**
 * Hook para gerenciar filtros de pedidos com persistência em URL
 * 
 * @example
 * ```tsx
 * const {
 *   filters,
 *   setType,
 *   setStatus,
 *   setSearchQuery,
 *   resetFilters,
 *   hasActiveFilters
 * } = useOrderFilters();
 * ```
 */
export function useOrderFilters(): UseOrderFiltersReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Estado local dos filtros
  const [filters, setFilters] = useState<OrderFilters>(() => {
    // Inicializar a partir dos query params da URL
    return parseFiltersFromURL(searchParams);
  });

  // Sincronizar filtros com URL quando mudarem
  useEffect(() => {
    const newParams = new URLSearchParams();

    // Adicionar type se não for 'all'
    if (filters.type !== 'all') {
      newParams.set(URL_PARAMS.TYPE, filters.type);
    }

    // Adicionar status se houver algum selecionado
    if (filters.status.length > 0) {
      newParams.set(URL_PARAMS.STATUS, filters.status.join(','));
    }

    // Adicionar datas se definidas
    if (filters.dateFrom) {
      newParams.set(URL_PARAMS.DATE_FROM, filters.dateFrom);
    }
    if (filters.dateTo) {
      newParams.set(URL_PARAMS.DATE_TO, filters.dateTo);
    }

    // Adicionar busca se não estiver vazia
    if (filters.searchQuery.trim()) {
      newParams.set(URL_PARAMS.SEARCH, filters.searchQuery);
    }

    // Atualizar URL sem recarregar a página
    setSearchParams(newParams, { replace: true });
  }, [filters, setSearchParams]);

  // Função para alterar tipo de pedido
  const setType = useCallback((type: OrderFilters['type']) => {
    setFilters(prev => ({ ...prev, type }));
  }, []);

  // Função para definir status (substitui todos)
  const setStatus = useCallback((status: OrderStatus[]) => {
    setFilters(prev => ({ ...prev, status }));
  }, []);

  // Função para alternar um status específico
  const toggleStatus = useCallback((status: OrderStatus) => {
    setFilters(prev => {
      const currentStatus = prev.status;
      const isSelected = currentStatus.includes(status);

      return {
        ...prev,
        status: isSelected
          ? currentStatus.filter(s => s !== status)
          : [...currentStatus, status]
      };
    });
  }, []);

  // Função para definir intervalo de datas
  const setDateRange = useCallback((dateFrom: string | null, dateTo: string | null) => {
    setFilters(prev => ({ ...prev, dateFrom, dateTo }));
  }, []);

  // Função para definir query de busca
  const setSearchQuery = useCallback((searchQuery: string) => {
    setFilters(prev => ({ ...prev, searchQuery }));
  }, []);

  // Função para resetar todos os filtros
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Verificar se há filtros ativos
  const hasActiveFilters = useMemo(() => {
    return (
      filters.type !== 'all' ||
      filters.status.length > 0 ||
      filters.dateFrom !== null ||
      filters.dateTo !== null ||
      filters.searchQuery.trim() !== ''
    );
  }, [filters]);

  // Contar filtros ativos
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.type !== 'all') count++;
    if (filters.status.length > 0) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.searchQuery.trim()) count++;
    return count;
  }, [filters]);

  return {
    filters,
    setType,
    setStatus,
    toggleStatus,
    setDateRange,
    setSearchQuery,
    resetFilters,
    hasActiveFilters,
    activeFilterCount
  };
}

// ============================================================================
// Funções Auxiliares
// ============================================================================

/**
 * Parse filtros a partir dos query params da URL
 */
function parseFiltersFromURL(searchParams: URLSearchParams): OrderFilters {
  const filters: OrderFilters = { ...DEFAULT_FILTERS };

  // Parse type
  const type = searchParams.get(URL_PARAMS.TYPE);
  if (type === 'subscription_delivery' || type === 'standalone_purchase' || type === 'manual_payment' || type === 'quote') {
    filters.type = type;
  } else if (type === 'subscription') {
    // Compatibilidade com URLs antigas
    filters.type = 'subscription_delivery';
  } else if (type === 'standalone') {
    // Compatibilidade com URLs antigas
    filters.type = 'standalone_purchase';
  }

  // Parse status
  const statusParam = searchParams.get(URL_PARAMS.STATUS);
  if (statusParam) {
    filters.status = statusParam.split(',') as OrderStatus[];
  }

  // Parse dates
  const dateFrom = searchParams.get(URL_PARAMS.DATE_FROM);
  if (dateFrom) {
    filters.dateFrom = dateFrom;
  }

  const dateTo = searchParams.get(URL_PARAMS.DATE_TO);
  if (dateTo) {
    filters.dateTo = dateTo;
  }

  // Parse search query (sanitize: limit length, strip control chars)
  const searchQuery = searchParams.get(URL_PARAMS.SEARCH);
  if (searchQuery) {
    filters.searchQuery = searchQuery
      .replace(/[\x00-\x1F]/g, "")
      .trim()
      .slice(0, 200);
  }

  return filters;
}

// ============================================================================
// Hooks Auxiliares
// ============================================================================

/**
 * Hook para gerenciar apenas o tipo de pedido
 */
export function useOrderType() {
  const { filters, setType } = useOrderFilters();
  return {
    type: filters.type,
    setType
  };
}

/**
 * Hook para gerenciar apenas os status
 */
export function useOrderStatus() {
  const { filters, setStatus, toggleStatus } = useOrderFilters();
  return {
    status: filters.status,
    setStatus,
    toggleStatus,
    hasStatus: filters.status.length > 0
  };
}

/**
 * Hook para gerenciar apenas o intervalo de datas
 */
export function useOrderDateRange() {
  const { filters, setDateRange } = useOrderFilters();
  return {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    setDateRange,
    hasDateRange: filters.dateFrom !== null || filters.dateTo !== null
  };
}

/**
 * Hook para gerenciar apenas a busca
 */
export function useOrderSearch() {
  const { filters, setSearchQuery } = useOrderFilters();
  return {
    searchQuery: filters.searchQuery,
    setSearchQuery,
    hasSearch: filters.searchQuery.trim() !== ''
  };
}

// ============================================================================
// Validações
// ============================================================================

/**
 * Valida se o intervalo de datas é válido
 */
export function validateDateRange(
  dateFrom: string | null,
  dateTo: string | null
): { valid: boolean; error?: string } {
  if (!dateFrom && !dateTo) {
    return { valid: true };
  }

  if (dateFrom && dateTo) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);

    if (from > to) {
      return {
        valid: false,
        error: 'A data inicial não pode ser posterior à data final'
      };
    }

    // Verificar se o intervalo não é muito grande (ex: mais de 1 ano)
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (to.getTime() - from.getTime() > oneYear) {
      return {
        valid: false,
        error: 'O intervalo de datas não pode ser maior que 1 ano'
      };
    }
  }

  return { valid: true };
}

/**
 * Valida se os filtros são válidos
 */
export function validateFilters(filters: OrderFilters): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validar tipo
  if (!['all', 'subscription_delivery', 'standalone_purchase', 'manual_payment', 'quote'].includes(filters.type)) {
    errors.push('Tipo de pedido inválido');
  }

  // Validar intervalo de datas
  const dateValidation = validateDateRange(filters.dateFrom, filters.dateTo);
  if (!dateValidation.valid && dateValidation.error) {
    errors.push(dateValidation.error);
  }

  // Validar query de busca (não pode ser muito longa)
  if (filters.searchQuery.length > 100) {
    errors.push('Termo de busca muito longo (máximo 100 caracteres)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// Utilitários
// ============================================================================

/**
 * Serializa filtros para string (útil para logging/debugging)
 */
export function serializeFilters(filters: OrderFilters): string {
  const parts: string[] = [];

  if (filters.type !== 'all') {
    parts.push(`type:${filters.type}`);
  }

  if (filters.status.length > 0) {
    parts.push(`status:${filters.status.join(',')}`);
  }

  if (filters.dateFrom) {
    parts.push(`from:${filters.dateFrom}`);
  }

  if (filters.dateTo) {
    parts.push(`to:${filters.dateTo}`);
  }

  if (filters.searchQuery) {
    parts.push(`search:"${filters.searchQuery}"`);
  }

  return parts.length > 0 ? parts.join(' ') : 'no-filters';
}

/**
 * Compara dois conjuntos de filtros
 */
export function areFiltersEqual(a: OrderFilters, b: OrderFilters): boolean {
  return (
    a.type === b.type &&
    a.status.length === b.status.length &&
    a.status.every(s => b.status.includes(s)) &&
    a.dateFrom === b.dateFrom &&
    a.dateTo === b.dateTo &&
    a.searchQuery === b.searchQuery
  );
}
