import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CreditCard, DollarSign, Package } from "lucide-react";
import { PeriodFilter, type DateRange } from "@/components/admin/operations/PeriodFilter";
import { AdminLayout } from "@/components/admin/shared/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminFinancialOverview } from "@/hooks/admin/useAdminFinancialOverview";
import AdminCollectionFinancials from "../collections/AdminCollectionFinancials";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

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
              className="text-2xl uppercase tracking-[0.2em] text-[hsl(var(--gold-accent))] md:text-3xl"
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                textShadow: "0 0 20px hsl(var(--gold-accent) / 0.2)",
              }}
            >
              Relatorios financeiros
            </h1>
            <p className="mt-1 font-mono text-xs uppercase tracking-wider text-[hsl(0,0%,45%)]">
              Receita, pedidos e base recorrente sob a mesma leitura operacional
            </p>
          </div>

          <PeriodFilter value={dateRange} onChange={setDateRange} />
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overview">
              <DollarSign className="mr-2 h-4 w-4" />
              Visao geral
            </TabsTrigger>
            <TabsTrigger value="collections">
              <Package className="mr-2 h-4 w-4" />
              Por colecao
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div>
              <h2 className="mb-2 text-2xl font-bold tracking-tight">Visao geral financeira</h2>
              <p className="text-muted-foreground">
                Receita e volume operacional do periodo, com a base ativa de assinaturas separada da janela filtrada.
              </p>
            </div>

            {financialQuery.isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Carregando dados financeiros...</div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Receita total</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</div>
                      <p className="text-xs text-muted-foreground">No periodo selecionado</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Assinaturas ativas</CardTitle>
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.activeSubscriptions || 0}</div>
                      <p className="text-xs text-muted-foreground">Base ativa atual</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Vendas avulsas</CardTitle>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.standaloneSales || 0}</div>
                      <p className="text-xs text-muted-foreground">No periodo selecionado</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Ticket medio</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(stats?.averageTicket || 0)}</div>
                      <p className="text-xs text-muted-foreground">Media por pedido</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Resumo financeiro</CardTitle>
                    <CardDescription>Leitura consolidada do periodo selecionado</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Total de pedidos</span>
                        <span className="text-2xl font-bold">{stats?.totalOrders || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Receita media por dia</span>
                        <span className="text-2xl font-bold">
                          {formatCurrency((stats?.totalRevenue || 0) / (stats?.daysDiff || 1))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Dias no periodo</span>
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
              <h2 className="mb-2 text-2xl font-bold tracking-tight">Receita por colecao</h2>
              <p className="text-muted-foreground">Analise financeira detalhada de cada colecao.</p>
            </div>
            <AdminCollectionFinancials />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
