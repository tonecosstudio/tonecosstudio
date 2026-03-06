// @ts-nocheck
/**
 * ProductionHub - Hub Consolidado de Produção
 * 
 * Hub profissional e robusto que consolida:
 * - Dashboard de Produção (Kanban, Lista, Calendário)
 * - Gerenciamento de Escolhas de Personagens
 * - Métricas em tempo real e alertas críticos
 * - Ações em massa e automações
 * - Análises e relatórios
 * 
 * Design: Layout moderno com cards, métricas destacadas e navegação intuitiva
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutGrid, 
  List, 
  Calendar,
  CheckSquare,
  TrendingUp,
  Activity,
  AlertTriangle,
  Clock,
  Package,
  Users,
  BarChart3,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";

// Componentes de Produção
import { ProductionMetricsBar } from "@/components/production/ProductionMetricsBar";
import { UrgentAlertsBar } from "@/components/production/UrgentAlertsBar";
import { ProductionFilters } from "@/components/production/ProductionFilters";
import { ProductionKanbanBoard } from "@/components/production/ProductionKanbanBoard";
import { ProductionListView } from "@/components/production/ProductionListView";
import { ProductionCalendarView } from "@/components/production/ProductionCalendarView";
import { BulkActionsToolbar } from "@/components/production/BulkActionsToolbar";
import { BulkAssignModal } from "@/components/production/BulkAssignModal";
import { BulkStageUpdateModal } from "@/components/production/BulkStageUpdateModal";
import { BulkProgressModal } from "@/components/production/BulkProgressModal";

// Componentes de Escolhas
import { CharacterChoicesContent } from "@/components/admin/production/CharacterChoicesContent";

// Services
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProductionQueue, fetchProductionMetrics } from "@/services/admin/production-service";
import { bulkAssignProduction, bulkUpdateStage } from "@/services/admin/bulk-operations-service";
import { exportProductionItemsToCSV } from "@/lib/utils/csvExport";
import { useToast } from "@/hooks/use-toast";
import type { ProductionFilters as ProductionFiltersType, ProductionStage } from "@/services/admin/production-service";
import type { AlertType } from "@/components/production/UrgentAlertsBar";

type ViewMode = "kanban" | "list" | "calendar";

export default function ProductionHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const viewParam = searchParams.get("view");
  
  const [activeTab, setActiveTab] = useState<string>(tabParam || "overview");
  const [viewMode, setViewMode] = useState<ViewMode>((viewParam as ViewMode) || "kanban");
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

  // Sincronizar tab e view com URL
  useEffect(() => {
    if (tabParam && ["overview", "production", "choices"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    if (viewParam && ["kanban", "list", "calendar"].includes(viewParam)) {
      setViewMode(viewParam as ViewMode);
    }
  }, [tabParam, viewParam]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params: any = { tab: value };
    if (value === "production") {
      params.view = viewMode;
    }
    setSearchParams(params);
  };

  const handleViewChange = (value: ViewMode) => {
    setViewMode(value);
    setSearchParams({ tab: activeTab, view: value });
  };

  // Fetch production metrics
  const metricsQuery = useQuery({
    queryKey: ["production-metrics"],
    queryFn: fetchProductionMetrics,
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch production queue
  const { data: queueData, isLoading } = useQuery({
    queryKey: ["production-queue", filters],
    queryFn: () => fetchProductionQueue(filters, { page: 1, pageSize: 1000 }),
    enabled: activeTab === "production" && (viewMode === "list" || viewMode === "calendar"),
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

  const handleItemClick = (item: any) => {
    console.log("Item clicked:", item);
    // TODO: Open detail panel
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
    setActiveTab("production");
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
      case "pending_choices":
        setActiveTab("choices");
        setSearchParams({ tab: "choices" });
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
        <div className="space-y-8">
          {/* Header Section */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold tracking-tight">Hub de Produção</h1>
              <p className="text-lg text-muted-foreground">
                Controle completo da produção, escolhas e métricas em tempo real
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              <Activity className="h-3 w-3 mr-1" />
              Atualizado há {metricsQuery.dataUpdatedAt ? 'poucos segundos' : '...'}
            </Badge>
          </div>

          {/* Quick Stats Bar - Always Visible */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total em Produção</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics?.overall?.totalItems || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Itens na fila de produção
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alertas Críticos</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {(metrics?.urgent?.deadlineCritical || 0) + (metrics?.urgent?.blocked || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Requerem atenção imediata
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Escolhas Pendentes</CardTitle>
                <CheckSquare className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">
                  {metrics?.choices?.pending || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Aguardando aprovação
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {metrics?.overall?.completionRate?.toFixed(0) || 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Eficiência geral
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Urgent Alerts Section */}
          {metrics && (metrics.urgent.deadlineCritical > 0 || metrics.urgent.blocked > 0 || metrics.urgent.deadlineUrgent > 0) && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  Alertas Urgentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <UrgentAlertsBar onAlertClick={handleAlertClick} />
              </CardContent>
            </Card>
          )}

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-2xl">
              <TabsTrigger value="overview" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="production" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Produção
              </TabsTrigger>
              <TabsTrigger value="choices" className="gap-2">
                <CheckSquare className="h-4 w-4" />
                Escolhas
              </TabsTrigger>
            </TabsList>

            {/* Tab: Overview */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Stages Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição por Estágio</CardTitle>
                    <CardDescription>Itens em cada fase da produção</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {metrics?.stages && Object.entries(metrics.stages).map(([stage, count]) => (
                      <div key={stage} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                          <span className="text-sm capitalize">{stage.replace(/_/g, ' ')}</span>
                        </div>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Priority Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição por Prioridade</CardTitle>
                    <CardDescription>Classificação de urgência</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {metrics?.priorities && Object.entries(metrics.priorities).map(([priority, count]) => {
                      const colors = {
                        critical: 'bg-red-500',
                        high: 'bg-orange-500',
                        medium: 'bg-yellow-500',
                        low: 'bg-green-500',
                      };
                      return (
                        <div key={priority} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${colors[priority as keyof typeof colors] || 'bg-gray-500'}`} />
                            <span className="text-sm capitalize">{priority}</span>
                          </div>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Scheduled Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Itens Agendados
                    </CardTitle>
                    <CardDescription>Prazos próximos</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Hoje</span>
                      <Badge variant="default">{metrics?.scheduled?.today || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Esta Semana</span>
                      <Badge variant="secondary">{metrics?.scheduled?.thisWeek || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Este Mês</span>
                      <Badge variant="outline">{metrics?.scheduled?.thisMonth || 0}</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Métricas de Performance
                    </CardTitle>
                    <CardDescription>Indicadores de eficiência</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Tempo Médio de Produção</span>
                      <Badge variant="secondary">
                        {metrics?.overall?.avgProductionTimeHours?.toFixed(1) || 0}h
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Taxa de Conclusão</span>
                      <Badge variant="default" className="bg-green-600">
                        {metrics?.overall?.completionRate?.toFixed(0) || 0}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Score Médio de Prioridade</span>
                      <Badge variant="outline">
                        {metrics?.overall?.avgPriorityScore?.toFixed(1) || 0}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab: Produção */}
            <TabsContent value="production" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Fila de Produção</CardTitle>
                      <CardDescription>Gerencie itens em produção com diferentes visualizações</CardDescription>
                    </div>
                    <Tabs value={viewMode} onValueChange={handleViewChange}>
                      <TabsList>
                        <TabsTrigger value="kanban">
                          <LayoutGrid className="h-4 w-4 mr-2" />
                          Kanban
                        </TabsTrigger>
                        <TabsTrigger value="list">
                          <List className="h-4 w-4 mr-2" />
                          Lista
                        </TabsTrigger>
                        <TabsTrigger value="calendar">
                          <Calendar className="h-4 w-4 mr-2" />
                          Calendário
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filtros */}
                  <ProductionFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    onReset={handleResetFilters}
                  />

                  {/* Bulk Actions Toolbar */}
                  {selectedIds.size > 0 && (
                    <BulkActionsToolbar
                      selectedCount={selectedIds.size}
                      onAssign={() => setShowAssignModal(true)}
                      onUpdateStage={() => setShowStageModal(true)}
                      onExport={handleBulkExport}
                      onClear={handleClearSelection}
                    />
                  )}

                  {/* Views */}
                  <div className="min-h-[500px]">
                    {viewMode === "kanban" && (
                      <ProductionKanbanBoard filters={filters} />
                    )}

                    {viewMode === "list" && (
                      <ProductionListView
                        data={queueData?.data || []}
                        isLoading={isLoading}
                        selectedIds={selectedIds}
                        isAllSelected={isAllSelected}
                        onSelectAll={handleSelectAll}
                        onSelectItem={handleSelectItem}
                        onItemClick={handleItemClick}
                      />
                    )}

                    {viewMode === "calendar" && (
                      <ProductionCalendarView
                        data={queueData?.data || []}
                        isLoading={isLoading}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Escolhas de Personagens */}
            <TabsContent value="choices" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Escolhas de Personagens</CardTitle>
                  <CardDescription>
                    Gerencie e aprove escolhas de personagens dos clientes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CharacterChoicesContent />
                </CardContent>
              </Card>
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
        </div>
      </AdminLayout>
    </>
  );
}
