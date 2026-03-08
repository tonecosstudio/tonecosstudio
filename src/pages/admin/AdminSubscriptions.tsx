// @ts-nocheck
/**
 * Página de Gerenciamento de Assinaturas
 * 
 * Página dedicada para visualização e gerenciamento de assinaturas ativas,
 * suas entregas e ciclos de pagamento.
 */

import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import SEOHead from '@/components/SEOHead';
import { useOrderFilters } from '@/hooks/admin/useOrderFilters';
import { useOrderPagination } from '@/hooks/admin/useOrderPagination';
import { useOrdersQuery } from '@/hooks/admin/useOrdersQuery';
import { useOrderSelection } from '@/hooks/admin/useOrderSelection';
import { useOrderMutations } from '@/hooks/admin/useOrderMutations';
import { useDebouncedValue } from '@/hooks/useDebounce';
import { useScrollPrefetch } from '@/hooks/useScrollPrefetch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { OrdersTable } from '@/components/admin/orders/OrdersTable';
import { OrderFilters } from '@/components/admin/orders/OrderFilters';
import { OrderSearchBar } from '@/components/admin/orders/OrderSearchBar';
import { OrderDetailPanel } from '@/components/admin/orders/OrderDetailPanel';
import { OrdersPagination } from '@/components/admin/orders/OrdersPagination';
import { BulkActionsBar } from '@/components/admin/orders/BulkActionsBar';
import { BulkActionConfirmationModal } from '@/components/admin/orders/BulkActionConfirmationModal';
import { BulkActionProgress } from '@/components/admin/orders/BulkActionProgress';
import { BulkActionResultModal } from '@/components/admin/orders/BulkActionResultModal';
import { BulkLabelGenerationModal } from '@/components/admin/orders/BulkLabelGenerationModal';
import { useToast } from '@/hooks/use-toast';
import type { UnifiedOrder, OrderStatus, BulkActionResult, BulkLabelGenerationResult } from '@/types/admin/orders';
import { generateBulkLabels } from '@/services/admin/label-service';
import { exportOrdersToCSV, triggerDownload } from '@/services/admin/orders-export';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MAX_EXPORT_LIMIT = 10000;

export default function AdminSubscriptions() {
  const [selectedOrder, setSelectedOrder] = useState<UnifiedOrder | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isStatusSelectOpen, setIsStatusSelectOpen] = useState(false);
  const [selectedNewStatus, setSelectedNewStatus] = useState<OrderStatus | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState({ current: 0, total: 0 });
  const [bulkActionResult, setBulkActionResult] = useState<BulkActionResult | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isLabelConfirmModalOpen, setIsLabelConfirmModalOpen] = useState(false);
  const [isGeneratingLabels, setIsGeneratingLabels] = useState(false);
  const [labelGenerationResult, setLabelGenerationResult] = useState<BulkLabelGenerationResult | null>(null);
  const [isLabelResultModalOpen, setIsLabelResultModalOpen] = useState(false);
  const [isExportWarningOpen, setIsExportWarningOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { toast } = useToast();

  // Gerenciamento de filtros - força tipo 'subscription'
  const filterControls = useOrderFilters();
  const { 
    filters, 
    toggleStatus,
    setDateRange,
    setSearchQuery,
    resetFilters, 
    hasActiveFilters,
    activeFilterCount
  } = filterControls;

  // Força o tipo para subscription
  const subscriptionFilters = {
    ...filters,
    type: 'subscription' as const
  };

  const paginationControls = useOrderPagination();
  const {
    pagination,
    page,
    pageSize,
    setPage,
    setPageSize
  } = paginationControls;

  const [debouncedSearchQuery, isSearching] = useDebouncedValue(filters.searchQuery, 300);

  const ordersQuery = useOrdersQuery({
    filters: {
      ...subscriptionFilters,
      searchQuery: debouncedSearchQuery
    },
    pagination
  });

  const {
    orders,
    total,
    totalPages,
    prefetchNextPage,
    isLastPage,
    isLoading,
    isError,
    error
  } = ordersQuery;

  useScrollPrefetch({
    onPrefetch: prefetchNextPage,
    threshold: 0.5,
    enabled: !isLastPage && !isLoading && !isError
  });

  const selection = useOrderSelection(orders);
  const {
    selectedIds,
    isAllSelected,
    selectAll,
    deselectAll,
    toggleSelection,
    selectionCount
  } = selection;

  const { bulkUpdateStatus } = useOrderMutations();

  const getSelectedOrders = (): UnifiedOrder[] => {
    return orders.filter(order => selectedIds.has(order.id));
  };

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

  const handleUpdateStatus = () => {
    setIsStatusSelectOpen(true);
  };

  const handleStatusSelected = () => {
    if (!selectedNewStatus) {
      toast({
        title: 'Erro',
        description: 'Selecione um status antes de continuar',
        variant: 'destructive'
      });
      return;
    }

    setIsStatusSelectOpen(false);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmBulkUpdate = async () => {
    if (!selectedNewStatus) return;

    const selectedOrders = getSelectedOrders();

    setIsConfirmModalOpen(false);
    setIsProcessing(true);
    setProcessProgress({ current: 0, total: selectedOrders.length });

    try {
      const result = await bulkUpdateStatus.mutateAsync({
        orders: selectedOrders.map(o => ({ id: o.id, type: o.type, status: o.status })),
        newStatus: selectedNewStatus,
        onProgress: (current, total) => {
          setProcessProgress({ current, total });
        }
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      setIsProcessing(false);
      setSelectedNewStatus(null);
      deselectAll();

      setBulkActionResult(result);
      setIsResultModalOpen(true);

    } catch (error) {
      console.error('Erro ao atualizar status em massa:', error);
      setIsProcessing(false);
      
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao atualizar pedidos',
        variant: 'destructive'
      });
    }
  };

  const handleCancelBulkUpdate = () => {
    setIsConfirmModalOpen(false);
    setSelectedNewStatus(null);
  };

  const handleRetryFailedOrders = (failedIds: string[]) => {
    setIsResultModalOpen(false);
    setBulkActionResult(null);

    deselectAll();
    failedIds.forEach(id => toggleSelection(id));

    setIsStatusSelectOpen(true);
  };

  const handleCloseResultModal = () => {
    setIsResultModalOpen(false);
    setBulkActionResult(null);
    setSelectedNewStatus(null);
  };

  const handleGenerateLabels = () => {
    setIsLabelConfirmModalOpen(true);
  };

  const handleConfirmLabelGeneration = async () => {
    const selectedOrders = getSelectedOrders();

    setIsLabelConfirmModalOpen(false);
    setIsGeneratingLabels(true);
    setProcessProgress({ current: 0, total: selectedOrders.length });

    try {
      const result = await generateBulkLabels(selectedOrders);

      await new Promise(resolve => setTimeout(resolve, 500));

      setIsGeneratingLabels(false);
      deselectAll();

      setLabelGenerationResult(result);
      setIsLabelResultModalOpen(true);

      if (result.successCount > 0 && result.failureCount === 0) {
        toast({
          title: 'Etiquetas geradas com sucesso',
          description: `${result.successCount} ${result.successCount === 1 ? 'etiqueta gerada' : 'etiquetas geradas'}`,
        });
      } else if (result.successCount > 0 && result.failureCount > 0) {
        toast({
          title: 'Geração concluída com avisos',
          description: `${result.successCount} sucesso(s), ${result.failureCount} falha(s)`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Falha na geração',
          description: `Nenhuma etiqueta pôde ser gerada. Verifique os endereços.`,
          variant: 'destructive',
        });
      }

    } catch (error) {
      console.error('Erro ao gerar etiquetas em massa:', error);
      setIsGeneratingLabels(false);
      
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao gerar etiquetas',
        variant: 'destructive'
      });
    }
  };

  const handleCancelLabelGeneration = () => {
    setIsLabelConfirmModalOpen(false);
  };

  const handleCloseLabelResultModal = () => {
    setIsLabelResultModalOpen(false);
    setLabelGenerationResult(null);
  };

  const handleRetryFailedLabels = async (orderIds: string[]) => {
    const ordersToRetry = orders?.filter((order: UnifiedOrder) => orderIds.includes(order.id)) || [];
    
    if (ordersToRetry.length === 0) {
      return;
    }

    setIsLabelResultModalOpen(false);
    setIsGeneratingLabels(true);
    setProcessProgress({ current: 0, total: ordersToRetry.length });

    try {
      const result = await generateBulkLabels(ordersToRetry);

      await new Promise(resolve => setTimeout(resolve, 500));

      setIsGeneratingLabels(false);

      setLabelGenerationResult(result);
      setIsLabelResultModalOpen(true);

      if (result.successCount > 0) {
        toast({
          title: 'Tentativa concluída',
          description: `${result.successCount} ${result.successCount === 1 ? 'etiqueta gerada' : 'etiquetas geradas'}`,
        });
      }
    } catch (error) {
      console.error('Erro ao tentar novamente:', error);
      setIsGeneratingLabels(false);
      
      toast({
        title: 'Erro',
        description: 'Erro ao tentar gerar etiquetas novamente',
        variant: 'destructive'
      });
    }
  };

  const handleEditAddress = (_orderId: string) => {
    toast({
      title: 'Edição de endereço',
      description: 'Funcionalidade em desenvolvimento. Por favor, edite o endereço no cadastro do cliente.',
    });
  };

  const handleExportCSV = () => {
    const ordersToExport = selectionCount > 0 ? getSelectedOrders() : orders;
    const totalToExport = selectionCount > 0 ? selectionCount : total;

    if (totalToExport > MAX_EXPORT_LIMIT) {
      setIsExportWarningOpen(true);
      return;
    }

    performExport(ordersToExport);
  };

  const performExport = async (ordersToExport: UnifiedOrder[]) => {
    setIsExporting(true);

    try {
      const { blob, filename, rowCount } = await exportOrdersToCSV(ordersToExport);

      triggerDownload(blob, filename);

      toast({
        title: 'Exportação concluída',
        description: `${rowCount} ${rowCount === 1 ? 'assinatura exportada' : 'assinaturas exportadas'} para ${filename}`,
      });

      if (selectionCount > 0) {
        deselectAll();
      }

    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast({
        title: 'Erro na exportação',
        description: error instanceof Error ? error.message : 'Erro ao gerar arquivo CSV',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
      setIsExportWarningOpen(false);
    }
  };

  const handleClearSelection = () => {
    deselectAll();
  };

  return (
    <>
      <SEOHead
        title="Admin - Assinaturas"
        description="Gerenciamento de assinaturas e entregas recorrentes"
        noindex={true}
      />

      <AdminLayout>
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Assinaturas</h1>
              <p className="text-muted-foreground mt-2">
                Gerencie assinaturas ativas e suas entregas recorrentes
              </p>
            </div>

            {!isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4" />
                <span>
                  {total} {total === 1 ? 'assinatura' : 'assinaturas'}
                  {hasActiveFilters && ' (filtrado)'}
                </span>
              </div>
            )}
          </div>
        </div>

        {isError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar assinaturas: {error instanceof Error ? error.message : 'Erro desconhecido'}
            </AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="text-muted-foreground mt-4">Carregando assinaturas...</p>
          </div>
        )}

        {!isLoading && !isError && orders.length === 0 && (
          <div className="text-center py-12">
            <RefreshCw className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma assinatura encontrada</h3>
            <p className="text-muted-foreground mb-4">
              {hasActiveFilters
                ? 'Tente ajustar os filtros para ver mais resultados'
                : 'Não há assinaturas cadastradas no sistema'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-sm text-primary hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {!isLoading && !isError && (
          <div className="space-y-6">
            <OrderFilters
              filters={subscriptionFilters}
              onTypeChange={() => {}} // Tipo fixo em subscription
              onStatusToggle={toggleStatus}
              onDateRangeChange={setDateRange}
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
              onUpdateStatus={handleUpdateStatus}
              onGenerateLabels={handleGenerateLabels}
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

            {orders.length > 0 && (
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
            )}
          </div>
        )}

        <OrderDetailPanel
          order={selectedOrder}
          isOpen={isDetailPanelOpen}
          onClose={handleCloseDetailPanel}
        />

        <Dialog open={isStatusSelectOpen} onOpenChange={setIsStatusSelectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Selecionar Novo Status</DialogTitle>
              <DialogDescription>
                Escolha o novo status para {selectionCount} {selectionCount === 1 ? 'assinatura selecionada' : 'assinaturas selecionadas'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="status">Novo Status</Label>
                <Select
                  value={selectedNewStatus || ''}
                  onValueChange={(value) => setSelectedNewStatus(value as OrderStatus)}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Selecione um status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Agendada</SelectItem>
                    <SelectItem value="pending_choice">Aguardando Escolha</SelectItem>
                    <SelectItem value="confirmed">Confirmada</SelectItem>
                    <SelectItem value="in_production">Em Produção</SelectItem>
                    <SelectItem value="shipped">Enviada</SelectItem>
                    <SelectItem value="delivered">Entregue</SelectItem>
                    <SelectItem value="revealed">Revelada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStatusSelectOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleStatusSelected}>
                Continuar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <BulkActionConfirmationModal
          open={isConfirmModalOpen}
          onOpenChange={setIsConfirmModalOpen}
          actionType="update_status"
          orders={getSelectedOrders()}
          onConfirm={handleConfirmBulkUpdate}
          onCancel={handleCancelBulkUpdate}
          isLoading={bulkUpdateStatus.isPending}
          additionalInfo={selectedNewStatus ? `Novo status: ${selectedNewStatus}` : undefined}
        />

        <BulkActionProgress
          open={isProcessing}
          current={processProgress.current}
          total={processProgress.total}
          actionDescription={`Atualizando status para "${selectedNewStatus}"`}
        />

        <BulkActionResultModal
          open={isResultModalOpen}
          onOpenChange={setIsResultModalOpen}
          result={bulkActionResult}
          actionDescription={`Atualização de status para "${selectedNewStatus}" concluída`}
          onRetry={handleRetryFailedOrders}
          onClose={handleCloseResultModal}
        />

        <BulkActionConfirmationModal
          open={isLabelConfirmModalOpen}
          onOpenChange={setIsLabelConfirmModalOpen}
          actionType="generate_labels"
          orders={getSelectedOrders()}
          onConfirm={handleConfirmLabelGeneration}
          onCancel={handleCancelLabelGeneration}
          isLoading={isGeneratingLabels}
        />

        <BulkActionProgress
          open={isGeneratingLabels}
          current={processProgress.current}
          total={processProgress.total}
          actionDescription="Gerando etiquetas de envio"
        />

        <BulkLabelGenerationModal
          open={isLabelResultModalOpen}
          onOpenChange={setIsLabelResultModalOpen}
          result={labelGenerationResult}
          onClose={handleCloseLabelResultModal}
          onRetry={handleRetryFailedLabels}
          onEditAddress={handleEditAddress}
        />

        <Dialog open={isExportWarningOpen} onOpenChange={setIsExportWarningOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Limite de Exportação Excedido</DialogTitle>
              <DialogDescription>
                O número de assinaturas a exportar ({selectionCount > 0 ? selectionCount : total}) excede o limite máximo de {MAX_EXPORT_LIMIT.toLocaleString('pt-BR')} por exportação.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Para reduzir o número de assinaturas, você pode:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>Aplicar filtros de status ou data</li>
                <li>Usar a busca para encontrar assinaturas específicas</li>
                <li>Selecionar manualmente as assinaturas desejadas</li>
                <li>Exportar em múltiplas etapas com diferentes filtros</li>
              </ul>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsExportWarningOpen(false)}>
                Entendi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </>
  );
}
