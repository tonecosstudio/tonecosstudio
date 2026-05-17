/**
 * AdminFinancialHub - Hub de Relatórios Financeiros
 *
 * Consolida todos os relatórios de vendas e receita:
 * - Visão Geral (dashboard financeiro)
 * - Por Coleção (receita por coleção)
 *
 * Foco: RECEITA e VENDAS (não criação de produtos)
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAdminPaymentsGateway } from "@/hooks/admin/useAdminPaymentsGateway";
import { AdminLayout } from "@/components/admin/shared/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Package } from "lucide-react";
import { PeriodFilter, DateRange } from "@/components/admin/operations/PeriodFilter";
import AdminCollectionFinancials from "../collections/AdminCollectionFinancials";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchUnifiedOrders } from "@/services/admin/orders-service";

export default function AdminFinancialHub() {
  const supabase = useAdminPaymentsGateway();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>(tabParam || "overview");

  // Filtro de período (padrão: mês atual)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Primeiro dia do mês
    to: new Date(), // Hoje
  });

  // Sincronizar tab com URL
  useEffect(() => {
    if (tabParam && ["overview", "collections"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  // Buscar dados financeiros
  const financialQuery = useQuery({
    queryKey: ["financial-overview", dateRange],
    queryFn: async () => {
      const fromDate = dateRange.from;
      const toDate = dateRange.to;

      // Buscar pedidos unificados
      const ordersResult = await fetchUnifiedOrders(
        {
          type: 'all',
          status: [],
          dateFrom: fromDate.toISOString(),
          dateTo: toDate.toISOString(),
          searchQuery: ''
        },
        {
          page: 1,
          pageSize: 10000
        }
      );

      // Calcular receita total
      const totalRevenue = ordersResult.data.reduce((acc, order) => {
        if (order.type === 'quote' && order.totalAmount) {
          return acc + order.totalAmount;
        }
        if (order.type === 'standalone_purchase' && order.totalAmount) {
          return acc + order.totalAmount;
        }
        if (order.type === 'manual_payment' && order.amount) {
          return acc + order.amount;
        }
        return acc;
      }, 0);

      // Contar assinaturas ativas criadas no período
      const { count: activeSubscriptions } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .gte("created_at", fromDate.toISOString())
        .lte("created_at", toDate.toISOString());

      // Contar vendas avulsas
      const standaloneSales = ordersResult.data.filter(o => o.type === 'standalone_purchase').length;

      // Calcular ticket médio
      const ordersWithValue = ordersResult.data.filter(o =>
        (o.type === 'quote' && o.totalAmount) ||
        (o.type === 'standalone_purchase' && o.totalAmount) ||
        (o.type === 'manual_payment' && o.amount)
      );

      const averageTicket = ordersWithValue.length > 0
        ? totalRevenue / ordersWithValue.length
        : 0;

      // Calcular dias no período
      const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        totalRevenue,
        activeSubscriptions: activeSubscriptions || 0,
        standaloneSales,
        averageTicket,
        totalOrders: ordersResult.total,
        daysDiff: daysDiff > 0 ? daysDiff : 1,
      };
    },
  });

  const stats = financialQuery.data;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header com Filtro de Período */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1
              className="text-2xl md:text-3xl tracking-[0.2em] uppercase text-[hsl(var(--gold-accent))]"
              style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", textShadow: "0 0 20px hsl(var(--gold-accent) / 0.2)" }}
            >
              Relatórios Financeiros
            </h1>
            <p className="text-[hsl(0,0%,45%)] text-xs tracking-wider font-mono uppercase mt-1">
              Acompanhe vendas, receita e desempenho financeiro
            </p>
          </div>

          <PeriodFilter value={dateRange} onChange={setDateRange} />
        </div>

        {/* Tabs Unificadas */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overview">
              <DollarSign className="h-4 w-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="collections">
              <Package className="h-4 w-4 mr-2" />
              Por Coleção
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Visão Geral */}
          <TabsContent value="overview" className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                Visão Geral Financeira
              </h2>
              <p className="text-muted-foreground">
                Dashboard com métricas principais de receita e vendas no período selecionado
              </p>
            </div>

            {financialQuery.isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando dados financeiros...
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Receita Total
                      </CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(stats?.totalRevenue || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        No período selecionado
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Assinaturas Ativas
                      </CardTitle>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {stats?.activeSubscriptions || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Criadas no período
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Vendas Avulsas
                      </CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {stats?.standaloneSales || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        No período selecionado
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Ticket Médio
                      </CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(stats?.averageTicket || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Média por pedido
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Resumo Financeiro</CardTitle>
                    <CardDescription>
                      Análise do período selecionado
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Total de Pedidos</span>
                        <span className="text-2xl font-bold">{stats?.totalOrders || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Receita Média por Dia</span>
                        <span className="text-2xl font-bold">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format((stats?.totalRevenue || 0) / (stats?.daysDiff || 1))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Dias no Período</span>
                        <span className="text-2xl font-bold">{stats?.daysDiff || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Tab 2: Por Coleção */}
          <TabsContent value="collections" className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                Receita por Coleção
              </h2>
              <p className="text-muted-foreground">
                Análise financeira detalhada de cada coleção
              </p>
            </div>
            <AdminCollectionFinancials />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
