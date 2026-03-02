/**
 * Componente de Paginação de Pedidos
 * 
 * Fornece controles de navegação entre páginas e seletor de itens por página.
 */

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface OrdersPaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  isLoading?: boolean;
  onPrefetchNextPage?: () => void;
}

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export function OrdersPagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  onPrefetchNextPage
}: OrdersPaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      {/* Informações de página e seletor de itens por página */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div>
          Mostrando <span className="font-medium text-foreground">{startItem}</span> a{' '}
          <span className="font-medium text-foreground">{endItem}</span> de{' '}
          <span className="font-medium text-foreground">{totalItems}</span>{' '}
          {totalItems === 1 ? 'pedido' : 'pedidos'}
        </div>

        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap">Itens por página:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(Number(value))}
            disabled={isLoading}
          >
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Controles de navegação */}
      <div className="flex items-center gap-2">
        <div className="text-sm text-muted-foreground mr-2">
          Página <span className="font-medium text-foreground">{currentPage}</span> de{' '}
          <span className="font-medium text-foreground">{totalPages}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Primeira página */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={!canGoPrevious || isLoading}
            aria-label="Primeira página"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Página anterior */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canGoPrevious || isLoading}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Página seguinte */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage + 1)}
            onMouseEnter={() => onPrefetchNextPage?.()}
            onFocus={() => onPrefetchNextPage?.()}
            disabled={!canGoNext || isLoading}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Última página */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={!canGoNext || isLoading}
            aria-label="Última página"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
