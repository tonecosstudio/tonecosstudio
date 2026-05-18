import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/shared/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Package } from "lucide-react";
import { PeriodFilter, DateRange } from "@/components/admin/operations/PeriodFilter";
import AdminCollectionFinancials from "../collections/AdminCollectionFinancials";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminFinancialOverview } from "@/hooks/admin/useAdminFinancialOverview";

export default function AdminFinancialHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>(tabParam || "overview");

  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  useEffect(() => {
    if (tabParam && ["overview", "collections"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  const financialQuery = useAdminFinancialOverview(dateRange);
  const stats = financialQuery.data;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1
              className="text-2xl md:text-3xl tracking-[0.2em] uppercase text-[hsl(var(--gold-accent))]"
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                textShadow: "0 0 20px hsl(var(--gold-accent) / 0.2)",
              }}
            >
              Relatorios Financeiros
            </h1>
            <p className="text-[hsl(0,0%,45%)] text-xs tracking-wider font-mono uppercase mt-1">
              Acompanhe vendas, receita e desempenho financeiro
            </p>
          </div>

          <PeriodFilter value={dateRange} onChange={setDateRange} />
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overview">
              <DollarSign className="h-4 w-4 mr-2" />
              Visao Geral
            </TabsTrigger>
            <TabsTrigger value="collections">
              <Package className="h-4 w-4 mr-2" />
              Por Colecao
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">Visao Geral Financeira</h2>
              <p className="text-muted-foreground">
                Dashboard com metricas principais de receita e vendas no periodo selecionado
              </p>
            </div>

            {financialQuery.isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando dados financeiros...</div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                          stats?.totalRevenue || 0
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">No periodo selecionado</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.activeSubscriptions || 0}</div>
                      <p className="text-xs text-muted-foreground">Criadas no periodo</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Vendas Avulsas</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.standaloneSales || 0}</div>
                      <p className="text-xs text-muted-foreground">No periodo selecionado</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Ticket Medio</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                          stats?.averageTicket || 0
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Media por pedido</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Resumo Financeiro</CardTitle>
                    <CardDescription>Analise do periodo selecionado</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Total de Pedidos</span>
                        <span className="text-2xl font-bold">{stats?.totalOrders || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Receita Media por Dia</span>
                        <span className="text-2xl font-bold">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                            (stats?.totalRevenue || 0) / (stats?.daysDiff || 1)
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Dias no Periodo</span>
                        <span className="text-2xl font-bold">{stats?.daysDiff || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="collections" className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">Receita por Colecao</h2>
              <p className="text-muted-foreground">Analise financeira detalhada de cada colecao</p>
            </div>
            <AdminCollectionFinancials />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
