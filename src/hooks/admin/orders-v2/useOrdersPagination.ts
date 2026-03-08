/**
 * Hook de Paginação para Pedidos V2
 * 
 * Gerencia o estado de paginação
 */

import { useState, useCallback } from 'react';
import type { PaginationParams } from '@/types/admin/orders';

// ============================================================================
// Hook Principal
// ============================================================================

export interface UseOrdersPaginationReturn {
  pagination: PaginationParams;
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  resetPagination: () => void;
}

const DEFAULT_PAGE_SIZE = 20;

export function useOrdersPagination(): UseOrdersPaginationReturn {
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);

  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
  }, []);

  const setPageSize = useCallback((newPageSize: number) => {
    setPageSizeState(newPageSize);
    setPageState(1); // Reset to first page when changing page size
  }, []);

  const resetPagination = useCallback(() => {
    setPageState(1);
    setPageSizeState(DEFAULT_PAGE_SIZE);
  }, []);

  return {
    pagination: { page, pageSize },
    page,
    pageSize,
    setPage,
    setPageSize,
    resetPagination,
  };
}
