// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { fetchProductionMetrics } from "@/services/admin/production-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, Users, Calendar } from "lucide-react";
import { StageDistributionChart } from "./StageDistributionChart";
import { PriorityDistributionChart } from "./PriorityDistributionChart";

export function ProductionAnalytics() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["production-metrics"],
    queryFn: fetchProductionMetrics,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Gráficos Principais */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Distribuição por Estágio */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Estágio</CardTitle>
            <CardDescription>Itens em cada fase da produção</CardDescription>
          </CardHeader>
          <CardContent>
            <StageDistributionChart data={metrics.stages} />
          </CardContent>
        </Card>

        {/* Distribuição por Prioridade */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Prioridade</CardTitle>
            <CardDescription>Classificação de urgência</CardDescription>
          </CardHeader>
          <CardContent>
            <PriorityDistributionChart data={metrics.priorities} />
          </CardContent>
        </Card>
      </div>

      {/* Métricas Detalhadas */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Tempo Médio por Estágio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Tempo Médio por Estágio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(metrics.avgStageDurations).length > 0 ? (
              Object.entries(metrics.avgStageDurations).map(([stage, hours]) => (
                <div key={stage} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{stage.replace(/_/g, " ")}</span>
                  <Badge variant="secondary">{hours.toFixed(1)}h</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados suficientes</p>
            )}
          </CardContent>
        </Card>

        {/* Itens Agendados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Itens Agendados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Hoje</span>
              <Badge variant="default">{metrics.scheduled.today}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Esta Semana</span>
              <Badge variant="secondary">{metrics.scheduled.thisWeek}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Este Mês</span>
              <Badge variant="outline">{metrics.scheduled.thisMonth}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Métricas de Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Tempo Médio Total</span>
              <Badge variant="secondary">
                {metrics.overall.avgProductionTimeHours.toFixed(1)}h
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Taxa de Conclusão</span>
              <Badge variant="default" className="bg-green-600">
                {(metrics.overall.completionRate * 100).toFixed(0)}%
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Score de Prioridade</span>
              <Badge variant="outline">
                {metrics.overall.avgPriorityScore.toFixed(1)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Escolhas de Personagens */}
      {metrics.choices && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Escolhas de Personagens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {metrics.choices.pending}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Pendentes</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {metrics.choices.approved}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Aprovadas</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {metrics.choices.rejected}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Rejeitadas</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {metrics.choices.total}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
