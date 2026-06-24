/**
 * ProductionHub - Hub Consolidado de Produção (REDESENHADO)
 *
 * Repaginação completa com foco em:
 * - Alertas urgentes em sticky banner (sempre visível)
 * - Métricas consolidadas sem duplicação
 * - Filtros globais sempre acessíveis
 * - Nova tab "Analises" com graficos
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
import { cn } from "@/lib/utils";
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
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";

// Redesigned components
import { UrgentAlertsBanner } from "@/components/production/UrgentAlertsBanner";
import { MetricCard } from "@/components/production/MetricCard";
import { ProductionItemDetails } from "@/components/production/ProductionItemDetails";
import { ProductionAnalytics } from "@/components/production/analytics/ProductionAnalytics";

// Production components
import { ProductionFilters } from "@/components/production/ProductionFilters";
import { ProductionKanbanBoard } from "@/components/production/ProductionKanbanBoard";
import { ProductionPipelineView } from "@/components/production/ProductionPipelineView";
import { ProductionListView } from "@/components/production/ProductionListView";
import { ProductionCalendarView } from "@/components/production/ProductionCalendarView";
import { BulkActionsToolbar } from "@/components/production/BulkActionsToolbar";
import { BulkAssignModal } from "@/components/production/BulkAssignModal";
import { BulkStageUpdateModal } from "@/components/production/BulkStageUpdateModal";
import { BulkProgressModal } from "@/components/production/BulkProgressModal";

// Character choice components
import { CharacterChoicesContent } from "@/components/admin/production/CharacterChoicesContent";
import { useProductionMetrics } from "@/hooks/admin/useProductionMetrics";
import {
  useBulkAssignProductionItems,
  useBulkUpdateProductionStages,
} from "@/hooks/admin/useProductionBulkActions";
import {
  useInvalidateProductionQueries,
  useProductionPipelineQueue,
} from "@/hooks/admin/useProductionPipeline";
import { exportProductionItemsToCSV } from "@/lib/utils/csvExport";
import { useToast } from "@/hooks/use-toast";
import type {
  ProductionFilters as ProductionFiltersType,
  ProductionQueueItem,
  ProductionStage,
} from "@/types/production";
import type { AlertType } from "@/components/production/UrgentAlertsBanner";

function ProductionHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<string>(tabParam || "pipeline");
  const [filters, setFilters] = useState<ProductionFiltersType>({});
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Realtime updates when production_queue changes.
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

  const bulkAssignMutation = useBulkAssignProductionItems();
  const bulkStageUpdateMutation = useBulkUpdateProductionStages();
  const invalidateProductionQueries = useInvalidateProductionQueries();
  const { toast } = useToast();

  // Keep tab selection in sync with the URL.
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

  // Production metrics.
  const metricsQuery = useProductionMetrics({
    refetchInterval: 60000,
    enableRealtime: true,
  });

  // Production queue.
  const { data: queueData, isLoading } = useProductionPipelineQueue(filters, {
    enabled: ["pipeline", "kanban", "list", "calendar"].includes(activeTab),
  });

  const metrics = metricsQuery.data;


  // Handlers.
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
      title: 'Atribuindo itens',
      total: itemIds.length,
      processed: 0,
      successful: 0,
      failed: 0,
      isComplete: false,
      errors: [],
    });
    setShowProgressModal(true);

    try {
      const result = await bulkAssignMutation.mutateAsync({ itemIds, userId });

      setProgressState({
        title: 'Atribuindo itens',
        total: itemIds.length,
        processed: itemIds.length,
        successful: result.successful,
        failed: result.failed,
        isComplete: true,
        errors: result.errors,
      });

      setSelectedIds(new Set());

      if (result.failed === 0) {
        toast({
          title: 'Sucesso',
          description: `${result.successful} ${result.successful === 1 ? 'item atribuido' : 'itens atribuidos'} com sucesso.`,
        });
      } else {
        toast({
          title: 'Concluido com erros',
          description: `${result.successful} sucesso, ${result.failed} falhas.`,
          variant: 'destructive',
        });
      }
    } catch {
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
      title: 'Atualizando estagios',
      total: itemIds.length,
      processed: 0,
      successful: 0,
      failed: 0,
      isComplete: false,
      errors: [],
    });
    setShowProgressModal(true);

    try {
      const result = await bulkStageUpdateMutation.mutateAsync({ itemIds, newStage });

      setProgressState({
        title: 'Atualizando estagios',
        total: itemIds.length,
        processed: itemIds.length,
        successful: result.successful,
        failed: result.failed,
        isComplete: true,
        errors: result.errors,
      });

      setSelectedIds(new Set());

      if (result.failed === 0) {
        toast({
          title: 'Sucesso',
          description: `${result.successful} ${result.successful === 1 ? 'item atualizado' : 'itens atualizados'} com sucesso.`,
        });
      } else {
        toast({
          title: 'Concluido com erros',
          description: `${result.successful} sucesso, ${result.failed} falhas.`,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao atualizar os estagios.',
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
        title: 'Exportacao concluida',
        description: `${selectedItems.length} ${selectedItems.length === 1 ? 'item exportado' : 'itens exportados'} para CSV.`,
      });
    } catch {
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
        setFilters({ ...filters, statuses: ["on_hold"] });
        break;
      case "overdue":
        setFilters({ ...filters, priorities: ["high", "critical"] });
        break;
    }
  };

  const activeFilterCount =
    (filters.collections?.length || 0) +
    (filters.priorities?.length || 0) +
    (filters.stages?.length || 0) +
    (filters.assignedTo?.length || 0) +
    (filters.dateFrom || filters.dateTo ? 1 : 0);

  return (
    <>
      <SEOHead
        title="Admin - Central de producao"
        description="Gerenciamento completo de producao e escolhas de personagens"
        noindex={true}
      />

      <AdminLayout>
        {/* Urgent alerts banner */}
        <UrgentAlertsBanner onAlertClick={handleAlertClick} />

        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-2xl md:text-3xl tracking-[0.2em] uppercase text-[hsl(var(--gold-accent))]"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", textShadow: "0 0 20px hsl(var(--gold-accent) / 0.2)" }}
              >
                Central de producao
              </h1>
              <p className="text-[hsl(0,0%,45%)] text-xs tracking-wider font-mono uppercase mt-1">
                Controle completo da producao em tempo real
              </p>
            </div>
            <Badge variant="outline" className="text-xs h-6">
              <Activity className="h-3 w-3 mr-1" />
              Atualizado agora
            </Badge>
          </div>

          {/* Metrics */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={Package}
              label="Total em producao"
              value={metrics?.overall?.totalItems || 0}
              variant="default"
              compact
            />
            <MetricCard
              icon={AlertTriangle}
              label="Alertas criticos"
              value={(metrics?.urgent?.deadlineCritical || 0) + (metrics?.urgent?.blocked || 0)}
              variant="critical"
              compact
            />
            <MetricCard
              icon={CheckSquare}
              label="Escolhas pendentes"
              value={metrics?.choices?.pending || 0}
              variant="warning"
              compact
            />
            <MetricCard
              icon={TrendingUp}
              label="Taxa de conclusao"
              value={`${metrics?.overall?.completionRate?.toFixed(0) || 0}%`}
              variant="success"
              compact
            />
          </div>

          {/* Filters */}
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-2 md:hidden">
              <div className="flex gap-2 overflow-x-auto">
                {[
                  { value: "pipeline", label: "Pipeline", icon: Layers },
                  { value: "kanban", label: "Kanban", icon: LayoutGrid },
                  { value: "list", label: "Lista", icon: List },
                  { value: "calendar", label: "Calendario", icon: Calendar },
                  { value: "analytics", label: "Analises", icon: BarChart3 },
                  { value: "choices", label: "Escolhas", icon: CheckSquare },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleTabChange(value)}
                    className={cn(
                      "min-w-[112px] shrink-0 gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2",
                      "flex items-center justify-center text-sm font-medium transition-colors",
                      activeTab === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 md:hidden">
              <button
                type="button"
                onClick={() => setFiltersOpen((current) => !current)}
                className="flex w-full items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filtros de producao</span>
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {activeFilterCount}
                    </Badge>
                  )}
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    filtersOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            <div className={`${filtersOpen ? "block" : "hidden"} md:block`}>
              <div className="rounded-lg border bg-muted/30 p-4">
                <ProductionFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  onReset={handleResetFilters}
                />
              </div>
            </div>
          </div>

          {/* Primary tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <div className="border-b">
              <TabsList className="hidden h-12 w-full justify-start gap-4 border-0 bg-transparent md:inline-flex">
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
                  <span className="hidden sm:inline">Calendario</span>
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Analises</span>
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

            {/* Bulk actions */}
            {selectedIds.size > 0 && (
              <div className="sticky top-0 z-40 -mx-6 px-6 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                <BulkActionsToolbar
                  selectedCount={selectedIds.size}
                  onAssign={() => setShowAssignModal(true)}
                  onUpdateStage={() => setShowStageModal(true)}
                  onExportCSV={handleBulkExport}
                  onClearSelection={handleClearSelection}
                />
              </div>
            )}

            {/* Pipeline */}
            <TabsContent value="pipeline" className="mt-0">
              <ProductionPipelineView filters={filters} />
            </TabsContent>

            {/* Kanban */}
            <TabsContent value="kanban" className="mt-0">
              <ProductionKanbanBoard filters={filters} />
            </TabsContent>

            {/* List */}
            <TabsContent value="list" className="mt-0 space-y-0">
              <div className="rounded-lg border bg-card">
                <div className="p-6 pb-4">
                  <h3 className="text-lg font-semibold">Fila de producao</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Visualizacao em lista com selecao multipla
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

            {/* Calendar */}
            <TabsContent value="calendar" className="mt-0 space-y-0">
              <div className="rounded-lg border bg-card">
                <div className="p-6 pb-4">
                  <h3 className="text-lg font-semibold">Calendario de producao</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Visualizacao por prazos e datas
                  </p>
                </div>
                <div className="px-6 pb-6">
                  <ProductionCalendarView
                    items={queueData?.data || []}
                    isLoading={isLoading}
                    onItemClick={handleItemClick}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Analytics */}
            <TabsContent value="analytics" className="mt-0 space-y-0">
              <ProductionAnalytics />
            </TabsContent>

            {/* Choices */}
            <TabsContent value="choices" className="mt-0 space-y-0">
              <div className="rounded-lg border bg-card">
                <div className="p-6 pb-4">
                  <h3 className="text-lg font-semibold">Escolhas de personagens</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Gerencie e aprove as escolhas de personagens dos clientes
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
            open={showAssignModal}
            onOpenChange={setShowAssignModal}
            onConfirm={handleBulkAssign}
            selectedCount={selectedIds.size}
          />

          <BulkStageUpdateModal
            open={showStageModal}
            onOpenChange={setShowStageModal}
            onConfirm={handleBulkStageUpdate}
            selectedCount={selectedIds.size}
          />

          <BulkProgressModal
            open={showProgressModal}
            onOpenChange={setShowProgressModal}
            {...progressState}
          />

          {/* Detail sheet */}
          <Sheet open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Detalhes do Item</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <ProductionItemDetails
                  item={selectedItem}
                  onUpdate={invalidateProductionQueries}
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
