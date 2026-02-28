/**
 * Pagination Controls Component
 * 
 * Reusable pagination UI component with accessibility support.
 */

import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { generatePageLinks } from '@/lib/performance/pagination';

export interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  maxLinks?: number;
  disabled?: boolean;
  className?: string;
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  maxLinks = 7,
  disabled = false,
  className = ''
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const pageLinks = generatePageLinks(currentPage, totalPages, maxLinks);
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      {/* First Page */}
      {showFirstLast && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={!hasPrevious || disabled}
          aria-label="Primeira página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Previous Page */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPrevious || disabled}
        aria-label="Página anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Page Numbers */}
      {pageLinks.map((page, index) => {
        if (page === '...') {
          return (
            <span
              key={`ellipsis-${index}`}
              className="px-2 text-muted-foreground"
            >
              ...
            </span>
          );
        }

        const isActive = page === currentPage;

        return (
          <Button
            key={page}
            variant={isActive ? 'default' : 'outline'}
            size="icon"
            onClick={() => onPageChange(page as number)}
            disabled={disabled}
            aria-label={`Página ${page}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {page}
          </Button>
        );
      })}

      {/* Next Page */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNext || disabled}
        aria-label="Próxima página"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Last Page */}
      {showFirstLast && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNext || disabled}
          aria-label="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * Pagination Info Component
 * Shows current range and total items
 */
export interface PaginationInfoProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  className?: string;
}

export function PaginationInfo({
  currentPage,
  pageSize,
  totalItems,
  className = ''
}: PaginationInfoProps) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  if (totalItems === 0) {
    return (
      <p className={`text-sm text-muted-foreground ${className}`}>
        Nenhum item encontrado
      </p>
    );
  }

  return (
    <p className={`text-sm text-muted-foreground ${className}`}>
      Mostrando <span className="font-medium">{start}</span> a{' '}
      <span className="font-medium">{end}</span> de{' '}
      <span className="font-medium">{totalItems}</span> itens
    </p>
  );
}

/**
 * Complete Pagination Component
 * Combines controls and info
 */
export interface PaginationProps extends PaginationControlsProps {
  pageSize: number;
  totalItems: number;
  showInfo?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  showInfo = true,
  showFirstLast = true,
  maxLinks = 7,
  disabled = false,
  className = ''
}: PaginationProps) {
  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {showInfo && (
        <PaginationInfo
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalItems}
        />
      )}

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        showFirstLast={showFirstLast}
        maxLinks={maxLinks}
        disabled={disabled}
      />
    </div>
  );
}
