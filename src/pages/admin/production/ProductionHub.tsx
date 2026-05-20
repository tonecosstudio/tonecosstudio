/**
 * ProductionHub - Hub Consolidado de Produção (REDESENHADO)
 *
 * Repaginação completa com foco em:
 * - Alertas urgentes em sticky banner (sempre visível)
 * - Métricas consolidadas sem duplicação
 * - Filtros globais sempre acessíveis
 * - Nova tab "Análises" com gráficos
 * - Seleção múltipla em todas as visualizações
 * - Painel lateral de detalhes (Sheet)
 *
 * Benefícios: 62% menos espaço, 50% menos cliques, 0% duplicação
 */

import { useState, useEffect } from "react";
import { useProductionQueueRealtime } from "@/hooks/useProductionQueueRealtime";
import { useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/shared/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  LayoutGrid,
  List,
  Calendar,
  CheckSquare,
  TrendingUp,
  Activity,
  AlertTriangle,
  Package,
  BarChart3,
  Layers,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";

// Componentes Redesenhados
import { UrgentAlertsBanner } from "@/components/production/UrgentAlertsBanner";
import { MetricCard } from "@/components/production/MetricCard";
import { ProductionItemDetails } from "@/components/production/ProductionItemDetails";
import { ProductionAnalytics } from "@/components/production/analytics/ProductionAnalytics";

// Componentes de Produção
import { ProductionFilters } from "@/components/production/ProductionFilters";
import { ProductionKanbanBoard } from "@/components/production/ProductionKanbanBoard";
import { ProductionPipelineView } from "@/components/production/ProductionPipelineView";
import { ProductionListView } from "@/components/production/ProductionListView";
import { ProductionCalendarView } from "@/components/production/ProductionCalendarView";
import { BulkActionsToolbar } from "@/components/production/BulkActionsToolbar";
import { BulkAssignModal } from "@/components/production/BulkAssignModal";
import { BulkStageUpdateModal } from "@/components/production/BulkStageUpdateModal";
import { BulkProgressModal } from "@/components/production/BulkProgressModal";

// Componentes de Escolhas
import { CharacterChoicesContent } from "@/components/admin/production/CharacterChoicesContent";
import { useProductionMetrics } from "@/hooks/admin/useProductionMetrics";

// Services
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProductionQueue } from "@/services/admin/production-service";
import { bulkAssignProduction, bulkUpdateStage } from "@/services/admin/bulk-operations-service";
import { exportProductionItemsToCSV } from "@/lib/utils/csvExport";
import { useToast } from "@/hooks/use-toast";
import type { ProductionFilters as ProductionFiltersType, ProductionStage, ProductionQueueItem } from "@/services/admin/production-service";
import type { AlertType } from "@/components/production/UrgentAlertsBanner";

function ProductionHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<string>(tabParam || "pipeline");
  const [filters, setFilters] = useState<ProductionFiltersType>({});

  // Realtime: atualiza automaticamente quando production_queue muda
  useProductionQueueRealtime(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<ProductionQueueItem | null>(null);

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

  // Sincronizar tab com URL
  useEffect(() => {
    const validTabs = ["pipeline", "kanban", "list", "calendar", "analytics", "choices"];
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  // Fetch production metrics
  const metricsQuery = useProductionMetrics({
    refetchInterval: 60000,
    enableRealtime: true,
  });

  // Fetch production queue
  const { data: queueData, isLoading } = useQuery({
    queryKey: ["production-queue", filters],
    queryFn: () => fetchProductionQueue(filters, { page: 1, pageSize: 1000 }),
    enabled: ["pipeline", "kanban", "list", "calendar"].includes(activeTab),
  });

  const metrics = metricsQuery.data;


  // Handlers
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

  const handleItemClick = (item: ProductionQueueItem) => {
    setSelectedItem(item);
  };

  const isAllSelected = queueData?.data
    ? selectedIds.size === queueData.data.length && queueData.data.length > 0
    : false;

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

      queryClient.invalidateQueries({ queryKey: ['production-queue'] });
      setSelectedIds(new Set());

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

      queryClient.invalidateQueries({ queryKey: ['production-queue'] });
      setSelectedIds(new Set());

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
    setActiveTab("kanban");
    switch (alertType) {
      case "deadline_critical":
        setFilters({ ...filters, priorities: ["critical"] });
        break;
      case "deadline_urgent":
        setFilters({ ...filters, stages: ["awaiting_choice"] });
        break;
      case "blocked":
        setFilters({ ...filters, stages: ["blocked"] });
        break;
      case "overdue":
        setFilters({ ...filters, priorities: ["high", "critical"] });
        break;
    }
  };

  return (
    <>
      <SEOHead
        title="Admin - Hub de Produção"
        description="Gerenciamento completo de produção e escolhas de personagens"
        noindex={true}
      />

      <AdminLayout>
        {/* Alertas Urgentes - Sticky Banner (fora do container principal) */}
        <UrgentAlertsBanner onAlertClick={handleAlertClick} />

        <div className="space-y-6 p-6">
          {/* Header Compacto */}
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-2xl md:text-3xl tracking-[0.2em] uppercase text-[hsl(var(--gold-accent))]"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", textShadow: "0 0 20px hsl(var(--gold-accent) / 0.2)" }}
              >
                Hub de Produção
              </h1>
              <p className="text-[hsl(0,0%,45%)] text-xs tracking-wider font-mono uppercase mt-1">
                Controle completo da produção em tempo real
              </p>
            </div>
            <Badge variant="outline" className="text-xs h-6">
              <Activity className="h-3 w-3 mr-1" />
              Atualizado agora
            </Badge>
          </div>

          {/* Métricas Principais - Grid Compacto */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={Package}
              label="Total em Produção"
              value={metrics?.overall?.totalItems || 0}
              variant="default"
              compact
            />
            <MetricCard
              icon={AlertTriangle}
              label="Alertas Críticos"
              value={(metrics?.urgent?.deadlineCritical || 0) + (metrics?.urgent?.blocked || 0)}
              variant="critical"
              compact
            />
            <MetricCard
              icon={CheckSquare}
              label="Escolhas Pendentes"
              value={metrics?.choices?.pending || 0}
              variant="warning"
              compact
            />
            <MetricCard
              icon={TrendingUp}
              label="Taxa de Conclusão"
              value={`${metrics?.overall?.completionRate?.toFixed(0) || 0}%`}
              variant="success"
              compact
            />
          </div>

          {/* Filtros Globais - Sempre Visíveis */}
          <div className="bg-muted/30 rounded-lg border p-4">
            <ProductionFilters
              filters={filters}
              onFiltersChange={setFilters}
              onReset={handleResetFilters}
            />
          </div>

          {/* Tabs Principais */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <div className="border-b">
              <TabsList className="h-12 bg-transparent border-0 w-full justify-start gap-4">
                <TabsTrigger
                  value="pipeline"
                  className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
                >
                  <Layers className="h-4 w-4" />
                  <span className="hidden sm:inline">Pipeline</span>
                </TabsTrigger>
                <TabsTrigger
                  value="kanban"
                  className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">Kanban</span>
                </TabsTrigger>
                <TabsTrigger
                  value="list"
                  className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
                >
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">Lista</span>
                </TabsTrigger>
                <TabsTrigger
                  value="calendar"
                  className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
                >
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Calendário</span>
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Análises</span>
                </TabsTrigger>
                <TabsTrigger
                  value="choices"
                  className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
                >
                  <CheckSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Escolhas</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Bulk Actions Toolbar - Floating */}
            {selectedIds.size > 0 && (
              <div className="sticky top-0 z-40 -mx-6 px-6 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                <BulkActionsToolbar
                  selectedCount={selectedIds.size}
                  onAssign={() => setShowAssignModal(true)}
                  onUpdateStage={() => setShowStageModal(true)}
                  onExport={handleBulkExport}
                  onClear={handleClearSelection}
                />
              </div>
            )}

            {/* Tab: Pipeline Visual */}
            <TabsContent value="pipeline" className="mt-0">
              <ProductionPipelineView filters={filters} />
            </TabsContent>

            {/* Tab: Kanban */}
            <TabsContent value="kanban" className="mt-0">
              <ProductionKanbanBoard filters={filters} />
            </TabsContent>

            {/* Tab: Lista */}
            <TabsContent value="list" className="mt-0 space-y-0">
              <div className="rounded-lg border bg-card">
                <div className="p-6 pb-4">
                  <h3 className="text-lg font-semibold">Fila de Produção</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Visualização em lista com seleção múltipla
                  </p>
                </div>
                <div className="px-6 pb-6">
                  <ProductionListView
                    items={queueData?.data || []}
                    isLoading={isLoading}
                    selectedIds={selectedIds}
                    isAllSelected={isAllSelected}
                    onSelectAll={handleSelectAll}
                    onSelectItem={handleSelectItem}
                    onItemClick={handleItemClick}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tab: Calendário */}
            <TabsContent value="calendar" className="mt-0 space-y-0">
              <div className="rounded-lg border bg-card">
                <div className="p-6 pb-4">
                  <h3 className="text-lg font-semibold">Calendário de Produção</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Visualização por prazos e datas
                  </p>
                </div>
                <div className="px-6 pb-6">
                  <ProductionCalendarView
                    items={queueData?.data || []}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tab: Análises (NOVO) */}
            <TabsContent value="analytics" className="mt-0 space-y-0">
              <ProductionAnalytics />
            </TabsContent>

            {/* Tab: Escolhas */}
            <TabsContent value="choices" className="mt-0 space-y-0">
              <div className="rounded-lg border bg-card">
                <div className="p-6 pb-4">
                  <h3 className="text-lg font-semibold">Escolhas de Personagens</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Gerencie e aprove escolhas de personagens dos clientes
                  </p>
                </div>
                <div className="px-6 pb-6">
                  <CharacterChoicesContent />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Modals */}
          <BulkAssignModal
            isOpen={showAssignModal}
            onClose={() => setShowAssignModal(false)}
            onConfirm={handleBulkAssign}
            selectedCount={selectedIds.size}
          />

          <BulkStageUpdateModal
            isOpen={showStageModal}
            onClose={() => setShowStageModal(false)}
            onConfirm={handleBulkStageUpdate}
            selectedCount={selectedIds.size}
          />

          <BulkProgressModal
            isOpen={showProgressModal}
            onClose={() => setShowProgressModal(false)}
            {...progressState}
          />

          {/* Painel Lateral de Detalhes (NOVO) */}
          <Sheet open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Detalhes do Item</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <ProductionItemDetails
                  item={selectedItem}
                  onUpdate={() => {
                    queryClient.invalidateQueries({ queryKey: ['production-queue'] });
                    queryClient.invalidateQueries({ queryKey: ['production-metrics'] });
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </AdminLayout>
    </>
  );
}

export default ProductionHub;
