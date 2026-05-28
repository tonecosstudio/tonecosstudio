import { useProductionMetrics } from "@/hooks/admin/useProductionMetrics";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Package,
  CheckCircle,
  AlertCircle,
  Wrench,
  Truck,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { getProductionStageLabel } from "@/config/production-stages";

/**
 * ProductionMetricsBar Component
 * 
 * Displays real-time production metrics at the top of the production dashboard:
 * - Count of items in each production stage
 * - Average time per production stage
 * - Count of items scheduled for today
 * - Count of items scheduled for this week
 * 
 * Features:
 * - Real-time updates via Supabase Realtime
 * - Visual icons for each metric
 * - Responsive grid layout
 */
export function ProductionMetricsBar() {
  const { data: metrics, isLoading, error } = useProductionMetrics({
    refetchInterval: 30000,
    enableRealtime: true,
  });

  if (isLoading) {
    return (
      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="p-6">
          <div className="text-sm text-muted-foreground">Carregando métricas...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="p-6">
          <div className="text-sm text-destructive">
            Erro ao carregar métricas: {error instanceof Error ? error.message : "Erro desconhecido"}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  // Stage icons mapping
  const stageIcons: Record<string, React.ReactNode> = {
    awaiting_choice: <AlertCircle className="h-4 w-4" />,
    design: <Wrench className="h-4 w-4" />,
    production: <Package className="h-4 w-4" />,
    quality_check: <CheckCircle className="h-4 w-4" />,
    packaging: <Package className="h-4 w-4" />,
    shipped: <Truck className="h-4 w-4" />,
  };

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Stage Counts Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Package className="h-4 w-4" />
              <span>Itens por Estágio</span>
            </div>
            <div className="space-y-2">
              {Object.entries(metrics.stages).map(([stage, count]) => (
                <div key={stage} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {stageIcons[stage] || <Package className="h-4 w-4" />}
                    <span>{getProductionStageLabel(stage)}</span>
                  </div>
                  <Badge variant="secondary" className="border border-border">
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Average Stage Durations Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock className="h-4 w-4" />
              <span>Tempo Médio por Estágio</span>
            </div>
            <div className="space-y-2">
              {Object.entries(metrics.avgStageDurations).length > 0 ? (
                Object.entries(metrics.avgStageDurations).map(([stage, hours]) => (
                  <div key={stage} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {stageIcons[stage] || <Package className="h-4 w-4" />}
                      <span>{getProductionStageLabel(stage)}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {hours.toFixed(1)}h
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  Sem dados suficientes
                </div>
              )}
            </div>
          </div>

          {/* Scheduled Items Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Calendar className="h-4 w-4" />
              <span>Itens Agendados</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Hoje</span>
                <Badge variant="secondary" className="border border-border">
                  {metrics.scheduled.today}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Esta Semana</span>
                <Badge variant="secondary" className="border border-border">
                  {metrics.scheduled.thisWeek}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Este Mês</span>
                <Badge variant="secondary" className="border border-border">
                  {metrics.scheduled.thisMonth}
                </Badge>
              </div>
            </div>
          </div>

          {/* Overall Metrics Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Métricas Gerais</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total de Itens</span>
                <Badge variant="secondary" className="border border-border">
                  {metrics.overall.totalItems}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tempo Médio</span>
                <span className="text-sm font-medium text-foreground">
                  {metrics.overall.avgProductionTimeHours.toFixed(1)}h
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Taxa de Conclusão</span>
                <span className="text-sm font-medium text-foreground">
                  {(metrics.overall.completionRate * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
