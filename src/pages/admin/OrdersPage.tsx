// @ts-nocheck
/**
 * Página Consolidada de Pedidos
 * 
 * Esta página unifica a visualização de entregas de assinatura e compras avulsas
 * em uma única interface administrativa.
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
import { AlertCircle, Package } from 'lucide-react';
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

// Limite máximo de pedidos para exportação
const MAX_EXPORT_LIMIT = 10000;
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

export default function OrdersPage() {
  // Estado do painel de detalhes
  const [selectedOrder, setSelectedOrder] = useState<UnifiedOrder | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);

  // Estado para atualização em massa
  const [isStatusSelectOpen, setIsStatusSelectOpen] = useState(false);
  const [selectedNewStatus, setSelectedNewStatus] = useState<OrderStatus | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
  // Estado para progresso e resultado
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState({ current: 0, total: 0 });
  const [bulkActionResult, setBulkActionResult] = useState<BulkActionResult | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  // Estado para geração de etiquetas em massa
  const [isLabelConfirmModalOpen, setIsLabelConfirmModalOpen] = useState(false);
  const [isGeneratingLabels, setIsGeneratingLabels] = useState(false);
  const [labelGenerationResult, setLabelGenerationResult] = useState<BulkLabelGenerationResult | null>(null);
  const [isLabelResultModalOpen, setIsLabelResultModalOpen] = useState(false);

  // Estado para exportação CSV
  const [isExportWarningOpen, setIsExportWarningOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { toast } = useToast();

  // Gerenciamento de filtros
  const filterControls = useOrderFilters();
  const { 
    filters, 
    setType,
    toggleStatus,
    setDateRange,
    setSearchQuery,
    resetFilters, 
    hasActiveFilters,
    activeFilterCount
  } = filterControls;

  // Gerenciamento de paginação
  const paginationControls = useOrderPagination();
  const {
    pagination,
    page,
    pageSize,
    setPage,
    setPageSize
  } = paginationControls;

  // Debounce da busca para evitar chamadas excessivas
  const [debouncedSearchQuery, isSearching] = useDebouncedValue(filters.searchQuery, 300);

  // Query de pedidos (usa searchQuery debounced)
  const ordersQuery = useOrdersQuery({
    filters: {
      ...filters,
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

  // Prefetch baseado em scroll - quando usuário está na metade da página
  // Requisito 11.4: Prefetch quando usuário está na metade da página
  useScrollPrefetch({
    onPrefetch: prefetchNextPage,
    threshold: 0.5, // Prefetch quando chegar na metade da página
    enabled: !isLastPage && !isLoading && !isError
  });

  // Seleção de pedidos
  const selection = useOrderSelection(orders);
  const {
    selectedIds,
    isAllSelected,
    selectAll,
    deselectAll,
    toggleSelection,
    selectionCount
  } = selection;

  // Mutations
  const { bulkUpdateStatus } = useOrderMutations();

  // Obter pedidos selecionados
  const getSelectedOrders = (): UnifiedOrder[] => {
    return orders.filter(order => selectedIds.has(order.id));
  };

  // Handler para seleção de todos os pedidos
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      selectAll(orders);
    } else {
      deselectAll();
    }
  };

  // Handler para seleção individual
  const handleSelectOrder = (_orderId: string, _checked: boolean) => {
    toggleSelection(_orderId);
  };

  // Handler para click em pedido (abrir detalhes)
  const handleOrderClick = (order: UnifiedOrder) => {
    setSelectedOrder(order);
    setIsDetailPanelOpen(true);
  };

  // Handler para fechar painel de detalhes
  const handleCloseDetailPanel = () => {
    setIsDetailPanelOpen(false);
    // Aguardar animação antes de limpar o pedido selecionado
    setTimeout(() => setSelectedOrder(null), 300);
  };

  // Handlers para ações em massa
  const handleUpdateStatus = () => {
    // Abrir modal de seleção de status
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

    // Fechar modal de seleção e abrir modal de confirmação
    setIsStatusSelectOpen(false);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmBulkUpdate = async () => {
    if (!selectedNewStatus) return;

    const selectedOrders = getSelectedOrders();

    // Iniciar processamento
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

      // Aguardar um momento para mostrar 100%
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fechar modal de progresso
      setIsProcessing(false);
      setSelectedNewStatus(null);

      // Limpar seleção
      deselectAll();

      // Mostrar resultado detalhado
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
    // Fechar modal de resultado
    setIsResultModalOpen(false);
    setBulkActionResult(null);

    // Selecionar apenas os pedidos que falharam
    deselectAll();
    failedIds.forEach(id => toggleSelection(id));

    // Abrir modal de seleção de status novamente
    setIsStatusSelectOpen(true);
  };

  const handleCloseResultModal = () => {
    setIsResultModalOpen(false);
    setBulkActionResult(null);
    setSelectedNewStatus(null);
  };

  const handleGenerateLabels = () => {
    // Abrir modal de confirmação para geração de etiquetas
    setIsLabelConfirmModalOpen(true);
  };

  const handleConfirmLabelGeneration = async () => {
    const selectedOrders = getSelectedOrders();

    // Fechar modal de confirmação
    setIsLabelConfirmModalOpen(false);

    // Iniciar processamento
    setIsGeneratingLabels(true);
    setProcessProgress({ current: 0, total: selectedOrders.length });

    try {
      // Gerar etiquetas em massa
      const result = await generateBulkLabels(selectedOrders);

      // Aguardar um momento para mostrar 100%
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fechar modal de progresso
      setIsGeneratingLabels(false);

      // Limpar seleção
      deselectAll();

      // Mostrar resultado detalhado
      setLabelGenerationResult(result);
      setIsLabelResultModalOpen(true);

      // Mostrar toast de resumo
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

  // Handler para tentar novamente pedidos com erro temporário
  // Requisitos: 15.2
  const handleRetryFailedLabels = async (orderIds: string[]) => {
    // Buscar os pedidos que falharam
    const ordersToRetry = orders?.filter((order: UnifiedOrder) => orderIds.includes(order.id)) || [];
    
    if (ordersToRetry.length === 0) {
      return;
    }

    // Fechar modal de resultado
    setIsLabelResultModalOpen(false);

    // Iniciar processamento
    setIsGeneratingLabels(true);
    setProcessProgress({ current: 0, total: ordersToRetry.length });

    try {
      // Gerar etiquetas em massa
      const result = await generateBulkLabels(ordersToRetry);

      // Aguardar um momento para mostrar 100%
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fechar modal de progresso
      setIsGeneratingLabels(false);

      // Mostrar resultado detalhado
      setLabelGenerationResult(result);
      setIsLabelResultModalOpen(true);

      // Mostrar toast de resumo
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

  // Handler para editar endereço de um pedido
  // Requisitos: 8.4
  const handleEditAddress = (_orderId: string) => {
    // TODO: Implementar modal de edição de endereço
    // Por enquanto, apenas mostrar mensagem informativa
    toast({
      title: 'Edição de endereço',
      description: 'Funcionalidade em desenvolvimento. Por favor, edite o endereço no cadastro do cliente.',
    });
  };

  const handleExportCSV = () => {
    // Verificar se há pedidos selecionados ou filtrados
    const ordersToExport = selectionCount > 0 ? getSelectedOrders() : orders;
    const totalToExport = selectionCount > 0 ? selectionCount : total;

    // Verificar limite de exportação (Requisito 9.4)
    if (totalToExport > MAX_EXPORT_LIMIT) {
      setIsExportWarningOpen(true);
      return;
    }

    // Executar exportação
    performExport(ordersToExport);
  };

  const performExport = async (ordersToExport: UnifiedOrder[]) => {
    setIsExporting(true);

    try {
      // Gerar CSV (Requisitos 9.3, 9.5)
      const { blob, filename, rowCount } = await exportOrdersToCSV(ordersToExport);

      // Trigger download (Requisito 9.5)
      triggerDownload(blob, filename);

      // Mostrar toast de sucesso
      toast({
        title: 'Exportação concluída',
        description: `${rowCount} ${rowCount === 1 ? 'pedido exportado' : 'pedidos exportados'} para ${filename}`,
      });

      // Limpar seleção se estava exportando selecionados
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
        title="Admin - Pedidos"
        description="Gerenciamento de entregas de assinatura e compras avulsas"
        noindex={true}
      />

      <AdminLayout>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>
              <p className="text-muted-foreground mt-2">
                Gerencie entregas de assinatura e compras avulsas
              </p>
            </div>

            {/* Contador de pedidos */}
            {!isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>
                  {total} {total === 1 ? 'pedido' : 'pedidos'}
                  {hasActiveFilters && ' (filtrado)'}
                </span>
              </div>
            )}
          </div>
        </div>

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
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
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
              <button
                onClick={resetFilters}
                className="text-sm text-primary hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {/* Conteúdo principal */}
        {!isLoading && !isError && (
          <div className="space-y-6">
            {/* Filtros */}
            <OrderFilters
              filters={filters}
              onTypeChange={setType}
              onStatusToggle={toggleStatus}
              onDateRangeChange={setDateRange}
              onReset={resetFilters}
              activeFilterCount={activeFilterCount}
            />
            
            {/* Busca */}
            <OrderSearchBar
              value={filters.searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
              isSearching={isSearching}
            />
            
            {/* Barra de Ações em Massa */}
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

            {/* Paginação */}
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

        {/* Painel de Detalhes */}
        <OrderDetailPanel
          order={selectedOrder}
          isOpen={isDetailPanelOpen}
          onClose={handleCloseDetailPanel}
        />

        {/* Modal de Seleção de Status */}
        <Dialog open={isStatusSelectOpen} onOpenChange={setIsStatusSelectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Selecionar Novo Status</DialogTitle>
              <DialogDescription>
                Escolha o novo status para os {selectionCount} {selectionCount === 1 ? 'pedido selecionado' : 'pedidos selecionados'}
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
                    <SelectItem value="awaiting_deposit">Aguardando Depósito</SelectItem>
                    <SelectItem value="deposit_paid">Depósito Pago</SelectItem>
                    <SelectItem value="awaiting_balance">Aguardando Saldo</SelectItem>
                    <SelectItem value="balance_paid">Saldo Pago</SelectItem>
                    <SelectItem value="completed">Completa</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsStatusSelectOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleStatusSelected}>
                Continuar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmação */}
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

        {/* Modal de Progresso */}
        <BulkActionProgress
          open={isProcessing}
          current={processProgress.current}
          total={processProgress.total}
          actionDescription={`Atualizando status para "${selectedNewStatus}"`}
        />

        {/* Modal de Resultado */}
        <BulkActionResultModal
          open={isResultModalOpen}
          onOpenChange={setIsResultModalOpen}
          result={bulkActionResult}
          actionDescription={`Atualização de status para "${selectedNewStatus}" concluída`}
          onRetry={handleRetryFailedOrders}
          onClose={handleCloseResultModal}
        />

        {/* Modal de Confirmação de Geração de Etiquetas */}
        <BulkActionConfirmationModal
          open={isLabelConfirmModalOpen}
          onOpenChange={setIsLabelConfirmModalOpen}
          actionType="generate_labels"
          orders={getSelectedOrders()}
          onConfirm={handleConfirmLabelGeneration}
          onCancel={handleCancelLabelGeneration}
          isLoading={isGeneratingLabels}
        />

        {/* Modal de Progresso de Geração de Etiquetas */}
        <BulkActionProgress
          open={isGeneratingLabels}
          current={processProgress.current}
          total={processProgress.total}
          actionDescription="Gerando etiquetas de envio"
        />

        {/* Modal de Resultado de Geração de Etiquetas */}
        <BulkLabelGenerationModal
          open={isLabelResultModalOpen}
          onOpenChange={setIsLabelResultModalOpen}
          result={labelGenerationResult}
          onClose={handleCloseLabelResultModal}
          onRetry={handleRetryFailedLabels}
          onEditAddress={handleEditAddress}
        />

        {/* Modal de Aviso de Limite de Exportação */}
        <Dialog open={isExportWarningOpen} onOpenChange={setIsExportWarningOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Limite de Exportação Excedido</DialogTitle>
              <DialogDescription>
                O número de pedidos a exportar ({selectionCount > 0 ? selectionCount : total}) excede o limite máximo de {MAX_EXPORT_LIMIT.toLocaleString('pt-BR')} pedidos por exportação.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Para reduzir o número de pedidos, você pode:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>Aplicar filtros de tipo, status ou data</li>
                <li>Usar a busca para encontrar pedidos específicos</li>
                <li>Selecionar manualmente os pedidos desejados</li>
                <li>Exportar em múltiplas etapas com diferentes filtros</li>
              </ul>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsExportWarningOpen(false)}
              >
                Entendi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </>
  );
}
