// @ts-nocheck
/**
 * Hook de Gerenciamento de Paginação de Pedidos
 * 
 * Este hook gerencia o estado de paginação e sincroniza
 * com URL query params para persistência entre navegações.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PaginationParams } from '@/types/admin/orders';

// ============================================================================
// Constantes
// ============================================================================

/**
 * Configuração padrão de paginação
 */
export const DEFAULT_PAGINATION: PaginationParams = {
  page: 1,
  pageSize: 20
};

/**
 * Tamanhos de página disponíveis
 */
export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

/**
 * Nomes dos parâmetros de URL
 */
const URL_PARAMS = {
  PAGE: 'page',
  PAGE_SIZE: 'pageSize'
} as const;

// ============================================================================
// Hook Principal
// ============================================================================

export interface UseOrderPaginationReturn {
  pagination: PaginationParams;
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  firstPage: () => void;
  lastPage: (totalPages: number) => void;
  resetPagination: () => void;
}

/**
 * Hook para gerenciar paginação de pedidos com persistência em URL
 * 
 * @example
 * ```tsx
 * const {
 *   pagination,
 *   page,
 *   pageSize,
 *   setPage,
 *   setPageSize,
 *   nextPage,
 *   previousPage
 * } = useOrderPagination();
 * ```
 */
export function useOrderPagination(): UseOrderPaginationReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Estado local de paginação
  const [pagination, setPagination] = useState<PaginationParams>(() => {
    // Inicializar a partir dos query params da URL
    return parsePaginationFromURL(searchParams);
  });

  // Sincronizar paginação com URL quando mudar
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);

    // Adicionar page se não for 1
    if (pagination.page !== 1) {
      newParams.set(URL_PARAMS.PAGE, pagination.page.toString());
    } else {
      newParams.delete(URL_PARAMS.PAGE);
    }

    // Adicionar pageSize se não for o padrão (20)
    if (pagination.pageSize !== DEFAULT_PAGINATION.pageSize) {
      newParams.set(URL_PARAMS.PAGE_SIZE, pagination.pageSize.toString());
    } else {
      newParams.delete(URL_PARAMS.PAGE_SIZE);
    }

    // Atualizar URL sem recarregar a página
    setSearchParams(newParams, { replace: true });
  }, [pagination, searchParams, setSearchParams]);

  // Função para definir página
  const setPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page: Math.max(1, page) }));
  }, []);

  // Função para definir tamanho de página
  const setPageSize = useCallback((pageSize: number) => {
    // Validar que o pageSize é um dos valores permitidos
    const validPageSize = PAGE_SIZE_OPTIONS.includes(pageSize as any)
      ? pageSize
      : DEFAULT_PAGINATION.pageSize;

    setPagination(prev => ({
      ...prev,
      pageSize: validPageSize,
      page: 1 // Resetar para primeira página ao mudar tamanho
    }));
  }, []);

  // Função para ir para próxima página
  const nextPage = useCallback(() => {
    setPagination(prev => ({ ...prev, page: prev.page + 1 }));
  }, []);

  // Função para ir para página anterior
  const previousPage = useCallback(() => {
    setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }));
  }, []);

  // Função para ir para primeira página
  const firstPage = useCallback(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // Função para ir para última página
  const lastPage = useCallback((totalPages: number) => {
    setPagination(prev => ({ ...prev, page: Math.max(1, totalPages) }));
  }, []);

  // Função para resetar paginação
  const resetPagination = useCallback(() => {
    setPagination(DEFAULT_PAGINATION);
  }, []);

  return {
    pagination,
    page: pagination.page,
    pageSize: pagination.pageSize,
    setPage,
    setPageSize,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    resetPagination
  };
}

// ============================================================================
// Funções Auxiliares
// ============================================================================

/**
 * Parse paginação a partir dos query params da URL
 */
function parsePaginationFromURL(searchParams: URLSearchParams): PaginationParams {
  const pagination: PaginationParams = { ...DEFAULT_PAGINATION };

  // Parse page
  const pageParam = searchParams.get(URL_PARAMS.PAGE);
  if (pageParam) {
    const page = parseInt(pageParam, 10);
    if (!isNaN(page) && page > 0) {
      pagination.page = page;
    }
  }

  // Parse pageSize
  const pageSizeParam = searchParams.get(URL_PARAMS.PAGE_SIZE);
  if (pageSizeParam) {
    const pageSize = parseInt(pageSizeParam, 10);
    if (!isNaN(pageSize) && PAGE_SIZE_OPTIONS.includes(pageSize as any)) {
      pagination.pageSize = pageSize;
    }
  }

  return pagination;
}

// ============================================================================
// Hooks Auxiliares
// ============================================================================

/**
 * Hook para calcular informações de paginação
 */
export function usePaginationInfo(
  currentPage: number,
  pageSize: number,
  totalItems: number
) {
  return useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);
    const isFirstPage = currentPage === 1;
    const isLastPage = currentPage >= totalPages;
    const canGoPrevious = currentPage > 1;
    const canGoNext = currentPage < totalPages;

    return {
      totalPages,
      startItem,
      endItem,
      isFirstPage,
      isLastPage,
      canGoPrevious,
      canGoNext
    };
  }, [currentPage, pageSize, totalItems]);
}

/**
 * Hook para gerenciar paginação com reset automático ao mudar filtros
 */
export function useOrderPaginationWithReset(filterDependencies: any[]) {
  const paginationControls = useOrderPagination();
  const { firstPage } = paginationControls;

  // Resetar para primeira página quando filtros mudarem
  useEffect(() => {
    firstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, filterDependencies);

  return paginationControls;
}

// ============================================================================
// Validações
// ============================================================================

/**
 * Valida se os parâmetros de paginação são válidos
 */
export function validatePagination(
  pagination: PaginationParams
): { valid: boolean; error?: string } {
  if (pagination.page < 1) {
    return {
      valid: false,
      error: 'Número de página deve ser maior que 0'
    };
  }

  if (!PAGE_SIZE_OPTIONS.includes(pagination.pageSize as any)) {
    return {
      valid: false,
      error: `Tamanho de página deve ser um dos valores: ${PAGE_SIZE_OPTIONS.join(', ')}`
    };
  }

  return { valid: true };
}

// ============================================================================
// Utilitários
// ============================================================================

/**
 * Calcula o offset para queries de banco de dados
 */
export function calculateOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

/**
 * Calcula o número total de páginas
 */
export function calculateTotalPages(totalItems: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

/**
 * Verifica se uma página está dentro do intervalo válido
 */
export function isValidPage(page: number, totalPages: number): boolean {
  return page >= 1 && page <= totalPages;
}

/**
 * Ajusta a página atual se estiver fora do intervalo válido
 */
export function adjustPageToValidRange(
  currentPage: number,
  totalPages: number
): number {
  if (currentPage < 1) return 1;
  if (currentPage > totalPages) return Math.max(1, totalPages);
  return currentPage;
}
