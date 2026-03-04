// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLayout } from "@/components/admin/AdminLayout";
import SEOHead from "@/components/SEOHead";
import {
  Users,
  CreditCard,
  Package,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { subscriptionCreditAdminAPI } from "@/services/subscription-credit-admin-api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminSubscriptionCreditDashboard() {
  const metricsQuery = useQuery({
    queryKey: ["admin-subscription-credit-metrics"],
    queryFn: () => subscriptionCreditAdminAPI.getDashboardMetrics(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const metrics = metricsQuery.data;

  return (
    <>
      <SEOHead
        title="Admin - Dashboard de Assinaturas e Créditos"
        description="Dashboard administrativo do sistema de assinaturas com créditos"
        noindex={true}
      />

      <AdminLayout>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Assinaturas</h1>
          <p className="text-muted-foreground mt-2">
            Visão geral do sistema de assinaturas com créditos
          </p>
        </div>

        {/* Loading State */}
        {metricsQuery.isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando métricas...</p>
          </div>
        )}

        {/* Error State */}
        {metricsQuery.isError && (
          <div className="text-center py-12">
            <p className="text-destructive">
              Erro ao carregar métricas: {(metricsQuery.error as Error).message}
            </p>
          </div>
        )}

        {/* Metrics */}
        {metrics && (
          <div className="space-y-8">
            {/* Subscription Metrics */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Assinaturas</h2>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.subscriptions.total}</div>
                    <p className="text-xs text-muted-foreground">Todas as assinaturas</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ativas</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {metrics.subscriptions.active}
                    </div>
                    <p className="text-xs text-muted-foreground">Em andamento</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Expiradas</CardTitle>
                    <Clock className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {metrics.subscriptions.expired}
                    </div>
                    <p className="text-xs text-muted-foreground">Vencidas</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
                    <XCircle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {metrics.subscriptions.cancelled}
                    </div>
                    <p className="text-xs text-muted-foreground">Cancelamentos</p>
                  </CardContent>
                </Card>
              </div>

              {/* By Plan */}
              <div className="grid gap-4 md:grid-cols-2 mt-4">
                {metrics.subscriptions.byPlan.map((plan) => (
                  <Card key={plan.planType}>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">
                        Plano {plan.planType === "trimestral" ? "Trimestral" : "Semestral"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{plan.count}</div>
                      <p className="text-xs text-muted-foreground">Assinaturas ativas</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Credits Metrics */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Créditos</h2>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Alocado</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {metrics.credits.totalAllocated.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Créditos distribuídos</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Usados</CardTitle>
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {metrics.credits.totalUsed.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Créditos utilizados</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Disponíveis</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {metrics.credits.totalAvailable.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Em circulação</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Expirados</CardTitle>
                    <XCircle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {metrics.credits.totalExpired.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Créditos perdidos</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Production Cycles */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Ciclos de Produção</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Abertos</CardTitle>
                    <Package className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {metrics.productionCycles.open}
                    </div>
                    <p className="text-xs text-muted-foreground">Ciclos ativos</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Fechados</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.productionCycles.closed}</div>
                    <p className="text-xs text-muted-foreground">Ciclos finalizados</p>
                  </CardContent>
                </Card>

                {metrics.productionCycles.current && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Ciclo Atual</CardTitle>
                      <Clock className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold">
                        {metrics.productionCycles.current.name}
                      </div>
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Capacidade:</span>
                          <span className="font-medium">
                            {metrics.productionCycles.current.capacityUsed} /{" "}
                            {metrics.productionCycles.current.capacityLimit}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Uso:</span>
                          <span className="font-medium">
                            {metrics.productionCycles.current.capacityPercentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Fecha em:</span>
                          <span className="font-medium">
                            {format(
                              new Date(metrics.productionCycles.current.closeDate),
                              "dd/MM/yyyy",
                              { locale: ptBR }
                            )}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Revenue */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Receita</h2>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">MRR Estimado</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    R$ {metrics.revenue.estimatedMonthly.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Receita mensal recorrente (baseada em assinaturas ativas)
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Characters & Orders */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h2 className="text-xl font-semibold mb-4">Personagens</h2>
                <div className="grid gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total:</span>
                          <span className="font-bold">{metrics.characters.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Ativos:</span>
                          <span className="font-bold text-green-600">
                            {metrics.characters.active}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Exclusivos:</span>
                          <span className="font-bold text-purple-600">
                            {metrics.characters.exclusive}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-4">Pedidos</h2>
                <div className="grid gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total:</span>
                          <span className="font-bold">{metrics.orders.total}</span>
                        </div>
                        {metrics.orders.byType.map((type) => (
                          <div key={type.type} className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              {type.type === "individual" ? "Individuais:" : "Automáticos:"}
                            </span>
                            <span className="font-bold">{type.count}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}
