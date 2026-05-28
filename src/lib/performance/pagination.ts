/**
 * Pagination Utilities
 * 
 * Provides server-side pagination utilities for efficient data loading.
 * Supports cursor-based and offset-based pagination.
 * 
 * Features:
 * - Cursor-based pagination (recommended for large datasets)
 * - Offset-based pagination (simpler, but less efficient)
 * - Page info calculation
 * - Integration with React Query
 */

import { errorTracking, DatabaseError } from '@/lib/error-tracking';

type PaginationQueryError = {
  message: string;
};

type PaginationCountResult = {
  count: number | null;
  error: PaginationQueryError | null;
};

type PaginationDataResult<T> = {
  data: T[] | null;
  error: PaginationQueryError | null;
};

type OffsetPaginatedQuery<T> = {
  select(
    columns: string,
    options: { count: 'exact'; head: true }
  ): PromiseLike<PaginationCountResult>;
  range(from: number, to: number): PromiseLike<PaginationDataResult<T>>;
};

type CursorRow = Record<string, unknown>;

type CursorPaginatedQuery<T extends CursorRow> = {
  gt(column: string, value: string): CursorPaginatedQuery<T>;
  order(
    column: string,
    options: { ascending: boolean }
  ): {
    limit(count: number): PromiseLike<PaginationDataResult<T>>;
  };
};

function toCursor(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  return undefined;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number; // Page number (1-indexed)
  pageSize?: number; // Items per page
  cursor?: string; // Cursor for cursor-based pagination
}

/**
 * Pagination result
 */
export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextCursor?: string;
    previousCursor?: string;
  };
}

/**
 * Default pagination settings
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Validate and normalize pagination parameters
 * 
 * @param params - Raw pagination parameters
 * @returns Normalized parameters
 */
export function normalizePaginationParams(params: PaginationParams = {}): Required<Omit<PaginationParams, 'cursor'>> & { cursor?: string } {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, params.pageSize || DEFAULT_PAGE_SIZE)
  );

  return {
    page,
    pageSize,
    cursor: params.cursor
  };
}

/**
 * Calculate offset from page number
 * 
 * @param page - Page number (1-indexed)
 * @param pageSize - Items per page
 * @returns Offset for database query
 */
export function calculateOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

/**
 * Calculate total pages
 * 
 * @param totalItems - Total number of items
 * @param pageSize - Items per page
 * @returns Total number of pages
 */
export function calculateTotalPages(totalItems: number, pageSize: number): number {
  return Math.ceil(totalItems / pageSize);
}

/**
 * Paginate Supabase query (offset-based)
 * 
 * @param query - Supabase query builder
 * @param params - Pagination parameters
 * @returns Paginated result
 */
export async function paginateQuery<T>(
  query: OffsetPaginatedQuery<T>,
  params: PaginationParams = {}
): Promise<PaginationResult<T>> {
  const { page, pageSize } = normalizePaginationParams(params);
  const offset = calculateOffset(page, pageSize);

  try {
    // Get total count
    const { count, error: countError } = await query.select('*', { count: 'exact', head: true });

    if (countError) {
      throw new DatabaseError(
        `Failed to get count: ${countError.message}`,
        { error: countError }
      );
    }

    const totalItems = count || 0;
    const totalPages = calculateTotalPages(totalItems, pageSize);

    // Get paginated data
    const { data, error: dataError } = await query
      .range(offset, offset + pageSize - 1);

    if (dataError) {
      throw new DatabaseError(
        `Failed to fetch data: ${dataError.message}`,
        { error: dataError }
      );
    }

    return {
      data: data || [],
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
  } catch (error) {
    errorTracking.trackError(error as Error);
    throw error;
  }
}

/**
 * Cursor-based pagination (more efficient for large datasets)
 * 
 * @param query - Supabase query builder
 * @param params - Pagination parameters with cursor
 * @param cursorColumn - Column to use for cursor (must be unique and indexed)
 * @returns Paginated result with cursors
 */
export async function paginateWithCursor<T extends CursorRow>(
  query: CursorPaginatedQuery<T>,
  params: PaginationParams = {},
  cursorColumn: string = 'id'
): Promise<PaginationResult<T>> {
  const { pageSize, cursor } = normalizePaginationParams(params);

  try {
    let paginatedQuery = query;

    // Apply cursor if provided
    if (cursor) {
      paginatedQuery = paginatedQuery.gt(cursorColumn, cursor);
    }

    // Fetch one extra item to determine if there's a next page
    const { data, error } = await paginatedQuery
      .order(cursorColumn, { ascending: true })
      .limit(pageSize + 1);

    if (error) {
      throw new DatabaseError(
        `Failed to fetch data: ${error.message}`,
        { error }
      );
    }

    const items = data || [];
    const hasNextPage = items.length > pageSize;

    // Remove the extra item if it exists
    const resultItems = hasNextPage ? items.slice(0, pageSize) : items;

    // Generate cursors
    const nextCursor = hasNextPage && resultItems.length > 0
      ? toCursor(resultItems[resultItems.length - 1][cursorColumn])
      : undefined;

    return {
      data: resultItems,
      pagination: {
        page: 1, // Cursor-based doesn't use page numbers
        pageSize,
        totalItems: -1, // Unknown with cursor-based pagination
        totalPages: -1, // Unknown with cursor-based pagination
        hasNextPage,
        hasPreviousPage: !!cursor,
        nextCursor,
        previousCursor: cursor
      }
    };
  } catch (error) {
    errorTracking.trackError(error as Error);
    throw error;
  }
}

/**
 * React Query pagination hook helper
 * 
 * @param queryFn - Function that fetches data
 * @param params - Pagination parameters
 * @returns Query key and function
 */
export function usePaginationQuery<T>(
  queryKey: string[],
  queryFn: (params: PaginationParams) => Promise<PaginationResult<T>>,
  params: PaginationParams = {}
) {
  const normalizedParams = normalizePaginationParams(params);

  return {
    queryKey: [...queryKey, 'paginated', normalizedParams],
    queryFn: () => queryFn(normalizedParams)
  };
}

/**
 * Generate pagination links for UI
 * 
 * @param currentPage - Current page number
 * @param totalPages - Total number of pages
 * @param maxLinks - Maximum number of page links to show
 * @returns Array of page numbers to display
 */
export function generatePageLinks(
  currentPage: number,
  totalPages: number,
  maxLinks: number = 7
): (number | '...')[] {
  if (totalPages <= maxLinks) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const links: (number | '...')[] = [];
  const halfMax = Math.floor(maxLinks / 2);

  // Always show first page
  links.push(1);

  let startPage = Math.max(2, currentPage - halfMax);
  let endPage = Math.min(totalPages - 1, currentPage + halfMax);

  // Adjust if we're near the start
  if (currentPage <= halfMax) {
    endPage = maxLinks - 1;
  }

  // Adjust if we're near the end
  if (currentPage >= totalPages - halfMax) {
    startPage = totalPages - maxLinks + 2;
  }

  // Add ellipsis after first page if needed
  if (startPage > 2) {
    links.push('...');
  }

  // Add middle pages
  for (let i = startPage; i <= endPage; i++) {
    links.push(i);
  }

  // Add ellipsis before last page if needed
  if (endPage < totalPages - 1) {
    links.push('...');
  }

  // Always show last page
  if (totalPages > 1) {
    links.push(totalPages);
  }

  return links;
}

/**
 * Infinite scroll helper
 * 
 * @param params - Current pagination parameters
 * @returns Next page parameters
 */
export function getNextPageParams(
  lastPage: PaginationResult<unknown>,
  _allPages: PaginationResult<unknown>[]
): PaginationParams | undefined {
  if (!lastPage.pagination.hasNextPage) {
    return undefined;
  }

  // For cursor-based pagination
  if (lastPage.pagination.nextCursor) {
    return {
      cursor: lastPage.pagination.nextCursor,
      pageSize: lastPage.pagination.pageSize
    };
  }

  // For offset-based pagination
  return {
    page: lastPage.pagination.page + 1,
    pageSize: lastPage.pagination.pageSize
  };
}

/**
 * Calculate items range for current page
 * 
 * @param page - Current page
 * @param pageSize - Items per page
 * @param totalItems - Total number of items
 * @returns Range string (e.g., "1-20 of 100")
 */
export function getItemsRange(
  page: number,
  pageSize: number,
  totalItems: number
): string {
  if (totalItems === 0) {
    return '0-0 of 0';
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return `${start}-${end} of ${totalItems}`;
}
