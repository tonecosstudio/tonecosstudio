/**
 * Página de Pedidos V2 - Nova Implementação Profissional
 *
 * Esta página substitui OrdersPage.tsx com melhorias:
 * - Mostra TODOS os tipos de pedidos (assinaturas, avulsos, pagamentos, orçamentos)
 * - Queries otimizadas
 * - Logs detalhados para debug
 * - Código mais limpo e manutenível
 */

import { useState } from 'react';
import { AdminLayout } from '@/components/admin/shared/AdminLayout';
import SEOHead from '@/components/SEOHead';
import { useOrdersFilters } from '@/hooks/admin/orders-v2/useOrdersFilters';
import { useOrdersPagination } from '@/hooks/admin/orders-v2/useOrdersPagination';
import { useOrdersData } from '@/hooks/admin/orders-v2/useOrdersData';
import { useOrdersCounts } from '@/hooks/admin/orders-v2/useOrdersCounts';
import { useOrderSelection } from '@/hooks/admin/useOrderSelection';
import { useDebouncedValue } from '@/hooks/useDebounce';
import { useScrollPrefetch } from '@/hooks/useScrollPrefetch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Package } from 'lucide-react';
import { OrdersTable } from '@/components/admin/orders/OrdersTable';
import { OrderFilters } from '@/components/admin/orders/OrderFilters';
import { OrderSearchBar } from '@/components/admin/orders/OrderSearchBar';
import { OrderDetailPanel } from '@/components/admin/orders/OrderDetailPanel';
import { OrdersPagination } from '@/components/admin/orders/OrdersPagination';
import { BulkActionsBar } from '@/components/admin/orders/BulkActionsBar';
import { OrderTypeFilter } from '@/components/admin/orders-v2/OrderTypeFilter';
import { OrdersStats } from '@/components/admin/orders-v2/OrdersStats';
import { useToast } from '@/hooks/use-toast';
import { exportOrdersToCSV, triggerDownload } from '@/services/admin/orders/orders-export';
import type { UnifiedOrder } from '@/types/admin/orders';

export default function OrdersPageV2() {
  const { toast } = useToast();

  // Estado do painel de detalhes
  const [selectedOrder, setSelectedOrder] = useState<UnifiedOrder | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Gerenciamento de filtros
  const filterControls = useOrdersFilters();
  const {
    filters,
    setType,
    toggleStatus,
    setDateRange,
    setSearchQuery,
    setPlanType,
    resetFilters,
    hasActiveFilters,
    activeFilterCount,
  } = filterControls;

  // Gerenciamento de paginação
  const paginationControls = useOrdersPagination();
  const { pagination, page, pageSize, setPage, setPageSize } = paginationControls;

  // Debounce da busca
  const [debouncedSearchQuery, isSearching] = useDebouncedValue(filters.searchQuery, 300);

  // Query de pedidos (usa searchQuery debounced)
  const ordersQuery = useOrdersData({
    filters: {
      ...filters,
      searchQuery: debouncedSearchQuery,
    },
    pagination,
  });

  const { orders, total, totalPages, prefetchNextPage, isLoading, isError, error } = ordersQuery;

  // Buscar contagens por tipo
  const { data: counts } = useOrdersCounts();

  // Prefetch baseado em scroll
  useScrollPrefetch({
    onPrefetch: prefetchNextPage,
    threshold: 0.5,
    enabled: !isLoading && !isError && page < totalPages,
  });

  // Seleção de pedidos
  const selection = useOrderSelection(orders);
  const { selectedIds, isAllSelected, selectAll, deselectAll, toggleSelection, selectionCount } =
    selection;

  // Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      selectAll(orders);
    } else {
      deselectAll();
    }
  };

  const handleSelectOrder = (_orderId: string, _checked: boolean) => {
    toggleSelection(_orderId);
  };

  const handleOrderClick = (order: UnifiedOrder) => {
    setSelectedOrder(order);
    setIsDetailPanelOpen(true);
  };

  const handleCloseDetailPanel = () => {
    setIsDetailPanelOpen(false);
    setTimeout(() => setSelectedOrder(null), 300);
  };

  const handleClearSelection = () => {
    deselectAll();
  };

  const handleExportCSV = async () => {
    if (selection.selectedOrders.length === 0) {
      toast({
        title: 'Nenhum pedido selecionado',
        description: 'Selecione pelo menos um pedido para exportar.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      const { blob, filename, rowCount } = await exportOrdersToCSV(selection.selectedOrders);
      triggerDownload(blob, filename);
      toast({
        title: 'CSV exportado',
        description: `${rowCount} ${rowCount === 1 ? 'pedido exportado' : 'pedidos exportados'}.`,
      });
    } catch (exportError) {
      toast({
        title: 'Erro ao exportar CSV',
        description:
          exportError instanceof Error
            ? exportError.message
            : 'Nao foi possivel exportar os pedidos selecionados.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Admin - Pedidos V2"
        description="Gerenciamento unificado de todos os pedidos"
        noindex={true}
      />

      <AdminLayout>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1
                className="text-2xl md:text-3xl tracking-[0.2em] uppercase text-[hsl(var(--gold-accent))]"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", textShadow: "0 0 20px hsl(var(--gold-accent) / 0.2)" }}
              >
                Pedidos
              </h1>
              <p className="text-[hsl(0,0%,45%)] text-xs tracking-wider font-mono uppercase mt-1">
                Gerencie todos os pedidos: assinaturas, avulsos, pagamentos e orçamentos
              </p>
            </div>
          </div>

          {/* Estatísticas Rápidas */}
          <div className="mb-6">
            <OrdersStats counts={counts} isLoading={isLoading} />
          </div>

          <div className="space-y-6">
            {/* Filtro de Tipo - Sempre Visível */}
            {!isLoading && !isError && (
              <OrderTypeFilter
                selectedType={filters.type}
                onTypeChange={setType}
                counts={counts}
              />
            )}

            {/* Estado de erro */}
            {isError && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Erro ao carregar pedidos: {error instanceof Error ? error.message : 'Erro desconhecido'}
                </AlertDescription>
              </Alert>
            )}

            {/* Estado de loading */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
                <p className="text-muted-foreground mt-4">Carregando pedidos...</p>
              </div>
            )}

            {/* Estado vazio */}
            {!isLoading && !isError && orders.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum pedido encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  {hasActiveFilters
                    ? 'Tente ajustar os filtros para ver mais resultados'
                    : 'Não há pedidos cadastrados no sistema'}
                </p>
                {hasActiveFilters && (
                  <button onClick={resetFilters} className="text-sm text-primary hover:underline">
                    Limpar filtros
                  </button>
                )}
              </div>
            )}

            {/* Conteúdo principal */}
            {!isLoading && !isError && orders.length > 0 && (
              <div className="space-y-6">
                {/* Filtros Adicionais */}
                <OrderFilters
                  filters={filters}
                  onTypeChange={setType}
                  onStatusToggle={toggleStatus}
                  onDateRangeChange={setDateRange}
                  onPlanTypeChange={setPlanType}
                  onReset={resetFilters}
                  activeFilterCount={activeFilterCount}
                />

                <OrderSearchBar
                  value={filters.searchQuery}
                  onChange={setSearchQuery}
                  onClear={() => setSearchQuery('')}
                  isSearching={isSearching}
                />

                <BulkActionsBar
                  selectedCount={selectionCount}
                  onExportCSV={handleExportCSV}
                  onClearSelection={handleClearSelection}
                  isExporting={isExporting}
                />

                <OrdersTable
                  orders={orders}
                  isLoading={isLoading}
                  selectedIds={selectedIds}
                  onSelectAll={handleSelectAll}
                  onSelectOrder={handleSelectOrder}
                  onOrderClick={handleOrderClick}
                  isAllSelected={isAllSelected(orders)}
                  searchQuery={filters.searchQuery}
                />

                <OrdersPagination
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={total}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  isLoading={isLoading}
                  onPrefetchNextPage={prefetchNextPage}
                />
              </div>
            )}
          </div>
        </div>

        <OrderDetailPanel
          order={selectedOrder}
          isOpen={isDetailPanelOpen}
          onClose={handleCloseDetailPanel}
        />
      </AdminLayout>
    </>
  );
}
