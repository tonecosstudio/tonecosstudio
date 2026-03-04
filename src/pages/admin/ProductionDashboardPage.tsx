/**
 * Production Dashboard Page
 *
 * Dashboard principal para gestão de produção com múltiplas visualizações
 * (Kanban, Lista, Calendário) e filtros avançados.
 */

import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List, Calendar } from "lucide-react";
import { ProductionMetricsBar } from "@/components/production/ProductionMetricsBar";
import { UrgentAlertsBar, type AlertType } from "@/components/production/UrgentAlertsBar";
import { ProductionFilters } from "@/components/production/ProductionFilters";
import { ProductionKanbanBoard } from "@/components/production/ProductionKanbanBoard";
import { ProductionListView } from "@/components/production/ProductionListView";
import { ProductionCalendarView } from "@/components/production/ProductionCalendarView";
import { BulkActionsToolbar } from "@/components/production/BulkActionsToolbar";
import { BulkAssignModal } from "@/components/production/BulkAssignModal";
import { BulkStageUpdateModal } from "@/components/production/BulkStageUpdateModal";
import { BulkProgressModal } from "@/components/production/BulkProgressModal";
import type { ProductionFilters as ProductionFiltersType, ProductionStage } from "@/services/admin/production-service";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProductionQueue } from "@/services/admin/production-service";
import { bulkAssignProduction, bulkUpdateStage } from "@/services/admin/bulk-operations-service";
import { exportProductionItemsToCSV } from "@/lib/utils/csvExport";
import { useToast } from "@/hooks/use-toast";

// Tipos
type ViewMode = "kanban" | "list" | "calendar";

export default function ProductionDashboardPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [filters, setFilters] = useState<ProductionFiltersType>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Bulk action modals state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressState, setProgressState] = useState({
    title: '',
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    isComplete: false,
    errors: [] as string[],
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch production queue for list view
  const { data: queueData, isLoading } = useQuery({
    queryKey: ["production-queue", filters],
    queryFn: () => fetchProductionQueue(filters, { page: 1, pageSize: 1000 }),
    enabled: viewMode === "list" || viewMode === "calendar",
  });

  const handleResetFilters = () => {
    setFilters({});
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && queueData?.data) {
      setSelectedIds(new Set(queueData.data.map(item => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedIds);
    if (checked) {
      newSelectedIds.add(itemId);
    } else {
      newSelectedIds.delete(itemId);
    }
    setSelectedIds(newSelectedIds);
  };

  const handleItemClick = (item: any) => {
    console.log("Item clicked:", item);
    // TODO: Open detail panel
  };

  const isAllSelected = queueData?.data ? selectedIds.size === queueData.data.length && queueData.data.length > 0 : false;

  // Bulk action handlers
  const handleBulkAssign = async (userId: string) => {
    const itemIds = Array.from(selectedIds);
    
    setProgressState({
      title: 'Atribuindo Itens',
      total: itemIds.length,
      processed: 0,
      successful: 0,
      failed: 0,
      isComplete: false,
      errors: [],
    });
    setShowProgressModal(true);

    try {
      const result = await bulkAssignProduction(itemIds, userId);
      
      setProgressState({
        title: 'Atribuindo Itens',
        total: itemIds.length,
        processed: itemIds.length,
        successful: result.successful,
        failed: result.failed,
        isComplete: true,
        errors: result.errors,
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['production-queue'] });
      
      // Clear selection
      setSelectedIds(new Set());

      // Show toast
      if (result.failed === 0) {
        toast({
          title: 'Sucesso',
          description: `${result.successful} ${result.successful === 1 ? 'item atribuído' : 'itens atribuídos'} com sucesso.`,
        });
      } else {
        toast({
          title: 'Concluído com erros',
          description: `${result.successful} sucesso, ${result.failed} falhas.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erro na atribuição em massa:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao atribuir os itens.',
        variant: 'destructive',
      });
    }
  };

  const handleBulkStageUpdate = async (newStage: ProductionStage) => {
    const itemIds = Array.from(selectedIds);
    
    setProgressState({
      title: 'Atualizando Estágios',
      total: itemIds.length,
      processed: 0,
      successful: 0,
      failed: 0,
      isComplete: false,
      errors: [],
    });
    setShowProgressModal(true);

    try {
      const result = await bulkUpdateStage(itemIds, newStage);
      
      setProgressState({
        title: 'Atualizando Estágios',
        total: itemIds.length,
        processed: itemIds.length,
        successful: result.successful,
        failed: result.failed,
        isComplete: true,
        errors: result.errors,
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['production-queue'] });
      
      // Clear selection
      setSelectedIds(new Set());

      // Show toast
      if (result.failed === 0) {
        toast({
          title: 'Sucesso',
          description: `${result.successful} ${result.successful === 1 ? 'item atualizado' : 'itens atualizados'} com sucesso.`,
        });
      } else {
        toast({
          title: 'Concluído com erros',
          description: `${result.successful} sucesso, ${result.failed} falhas.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erro na atualização em massa:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao atualizar os estágios.',
        variant: 'destructive',
      });
    }
  };

  const handleBulkExport = () => {
    if (!queueData?.data) return;

    try {
      const selectedItems = queueData.data.filter(item => selectedIds.has(item.id));
      const filename = `producao_${new Date().toISOString().split('T')[0]}.csv`;
      
      exportProductionItemsToCSV(selectedItems, filename);
      
      toast({
        title: 'Exportado com sucesso',
        description: `${selectedItems.length} ${selectedItems.length === 1 ? 'item exportado' : 'itens exportados'} para CSV.`,
      });
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao exportar os dados.',
        variant: 'destructive',
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleAlertClick = (alertType: AlertType) => {
    // Apply filters based on alert type
    switch (alertType) {
      case "deadline_critical":
        // Filter items with deadline < 24h
        setFilters({
          ...filters,
          priorities: ["critical"],
        });
        break;
      case "deadline_urgent":
        // Filter items with pending choices approaching deadline
        setFilters({
          ...filters,
          stages: ["awaiting_choice"],
        });
        break;
      case "blocked":
        // Filter blocked items
        setFilters({
          ...filters,
          statuses: ["on_hold"],
        });
        break;
      case "overdue":
        // Filter items exceeding average stage time
        // This would require additional filtering logic in the backend
        // For now, we'll just show all in_production items
        setFilters({
          ...filters,
          statuses: ["in_production"],
        });
        break;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Dashboard de Produção</h1>
          <p className="text-muted-foreground">
            Gerencie a fila de produção e acompanhe o progresso dos pedidos
          </p>
        </div>

        {/* View Switcher */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="kanban" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendário
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Urgent Alerts Bar */}
        <UrgentAlertsBar onAlertClick={handleAlertClick} />

        {/* Metrics Bar */}
        <ProductionMetricsBar />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <ProductionFilters
              filters={filters}
              onFiltersChange={setFilters}
              onReset={handleResetFilters}
            />
          </aside>

          {/* Content Area */}
          <main className="lg:col-span-3">
          {viewMode === "kanban" && (
            <ProductionKanbanBoard filters={filters} />
          )}

          {viewMode === "list" && (
            <>
              <BulkActionsToolbar
                selectedCount={selectedIds.size}
                onAssign={() => setShowAssignModal(true)}
                onUpdateStage={() => setShowStageModal(true)}
                onExportCSV={handleBulkExport}
                onClearSelection={handleClearSelection}
              />
              <ProductionListView
                items={queueData?.data || []}
                isLoading={isLoading}
                selectedIds={selectedIds}
                onSelectAll={handleSelectAll}
                onSelectItem={handleSelectItem}
                onItemClick={handleItemClick}
                isAllSelected={isAllSelected}
              />
            </>
          )}

          {viewMode === "calendar" && (
            <ProductionCalendarView
              items={queueData?.data || []}
              isLoading={isLoading}
              onItemClick={handleItemClick}
            />
            )}
          </main>
        </div>

        {/* Bulk Action Modals */}
        <BulkAssignModal
          open={showAssignModal}
          onOpenChange={setShowAssignModal}
          selectedCount={selectedIds.size}
          onConfirm={handleBulkAssign}
        />

        <BulkStageUpdateModal
          open={showStageModal}
          onOpenChange={setShowStageModal}
          selectedCount={selectedIds.size}
          onConfirm={handleBulkStageUpdate}
        />

        <BulkProgressModal
          open={showProgressModal}
          onOpenChange={setShowProgressModal}
          title={progressState.title}
          total={progressState.total}
          processed={progressState.processed}
          successful={progressState.successful}
          failed={progressState.failed}
          isComplete={progressState.isComplete}
          errors={progressState.errors}
        />
      </div>
    </AdminLayout>
  );
}
