import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PeriodFilter, DateRange } from "@/components/admin/PeriodFilter";
import { MetricComparison } from "@/components/admin/MetricComparison";
import { ExportButton } from "@/components/admin/ExportButton";
import { RealtimeIndicator } from "@/components/admin/RealtimeIndicator";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { ConversionFunnel } from "@/components/admin/ConversionFunnel";
import { SubscriptionMetrics } from "@/components/admin/SubscriptionMetrics";
import { usePricingSettings } from "@/hooks/usePricingSettings";
import { useContentSettings } from "@/hooks/useContentSettings";
import { fetchUnifiedOrders } from "@/services/admin/orders-service";
import {
  Package,
  Users,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Upload,
  Workflow,
  Layers,
  CreditCard,
  Ticket,
  HeadphonesIcon,
  ArrowRight,
  Activity,
  TrendingDown,
  Percent,
  ShoppingCart,
  Calendar,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

export default function AdminHome() {
  const navigate = useNavigate();

  // SSOT Hooks
  const { data: pricingSettings } = usePricingSettings();
  const { data: contentSettings } = useContentSettings();

  // Estado do filtro de período
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
    to: new Date(),
  });

  // Estado para última atualização
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Buscar estatísticas gerais
  const statsQuery = useQuery({
    queryKey: ["admin-dashboard-stats", dateRange],
    queryFn: async () => {
      setLastUpdate(new Date());

      // Filtrar por período
      const fromDate = dateRange.from.toISOString();
      const toDate = dateRange.to.toISOString();

      // Modelos (total geral - não filtrado por período)
      const { count: modelsCount } = await supabase
        .from("models")
        .select("*", { count: "exact", head: true });

      // Usuários (total geral)
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Usuários criados no período atual
      const { data: currentUsers } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", fromDate)
        .lte("created_at", toDate);

      // Usuários (período anterior)
      const periodDiff = dateRange.to.getTime() - dateRange.from.getTime();
      const previousFrom = new Date(dateRange.from.getTime() - periodDiff);
      const previousTo = dateRange.from;

      const { data: previousUsers } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", previousFrom.toISOString())
        .lte("created_at", previousTo.toISOString());

      // ============================================================================
      // PEDIDOS UNIFICADOS - Busca correta de todas as tabelas
      // ============================================================================
      
      // Buscar pedidos do período atual (todas as tabelas)
      const ordersResult = await fetchUnifiedOrders(
        {
          type: 'all',
          status: [],
          dateFrom: fromDate,
          dateTo: toDate,
          searchQuery: ''
        },
        {
          page: 1,
          pageSize: 10000 // Buscar todos para estatísticas
        }
      );

      // Buscar pedidos do período anterior para comparação
      const previousOrdersResult = await fetchUnifiedOrders(
        {
          type: 'all',
          status: [],
          dateFrom: previousFrom.toISOString(),
          dateTo: previousTo.toISOString(),
          searchQuery: ''
        },
        {
          page: 1,
          pageSize: 10000
        }
      );

      // Calcular estatísticas de pedidos por tipo
      const ordersByType = {
        subscriptionDeliveries: ordersResult.data.filter(o => o.type === 'subscription_delivery').length,
        standalonePurchases: ordersResult.data.filter(o => o.type === 'standalone_purchase').length,
        manualPayments: ordersResult.data.filter(o => o.type === 'manual_payment').length,
        quotes: ordersResult.data.filter(o => o.type === 'quote').length,
      };

      // Calcular estatísticas de pedidos por status
      const ordersByStatus = {
        pending: ordersResult.data.filter(o => 
          o.status === 'pending' || 
          o.status === 'pending_choice' || 
          o.status === 'awaiting_deposit'
        ).length,
        confirmed: ordersResult.data.filter(o => 
          o.status === 'confirmed' || 
          o.status === 'deposit_paid'
        ).length,
        inProduction: ordersResult.data.filter(o => o.status === 'in_production').length,
        shipped: ordersResult.data.filter(o => o.status === 'shipped').length,
        delivered: ordersResult.data.filter(o => o.status === 'delivered').length,
        completed: ordersResult.data.filter(o => o.status === 'completed').length,
      };

      // Calcular receita total dos pedidos
      const ordersRevenue = ordersResult.data.reduce((acc, order) => {
        // Somar valores dependendo do tipo
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

      const previousOrdersRevenue = previousOrdersResult.data.reduce((acc, order) => {
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

      // Calcular ticket médio
      const ordersWithValue = ordersResult.data.filter(o => 
        (o.type === 'quote' && o.totalAmount) ||
        (o.type === 'standalone_purchase' && o.totalAmount) ||
        (o.type === 'manual_payment' && o.amount)
      );
      
      const averageTicket = ordersWithValue.length > 0
        ? ordersRevenue / ordersWithValue.length
        : 0;

      const previousOrdersWithValue = previousOrdersResult.data.filter(o => 
        (o.type === 'quote' && o.totalAmount) ||
        (o.type === 'standalone_purchase' && o.totalAmount) ||
        (o.type === 'manual_payment' && o.amount)
      );

      const previousAverageTicket = previousOrdersWithValue.length > 0
        ? previousOrdersRevenue / previousOrdersWithValue.length
        : 0;

      // ============================================================================
      // ORÇAMENTOS (QUOTES) - Mantido para compatibilidade com gráficos
      // ============================================================================
      
      // Buscar apenas quotes para gráficos específicos de orçamentos
      const { data: quotes } = await supabase
        .from("quotes")
        .select("status, created_at, total_amount")
        .gte("created_at", fromDate)
        .lte("created_at", toDate);

      const { data: previousQuotes } = await supabase
        .from("quotes")
        .select("status, created_at, total_amount")
        .gte("created_at", previousFrom.toISOString())
        .lte("created_at", previousTo.toISOString());

      // Calcular estatísticas de orçamentos (apenas quotes)
      const quotesStats = {
        total: quotes?.length || 0,
        pending: quotes?.filter((q) => q.status === "pending").length || 0,
        approved: quotes?.filter((q) => q.status === "approved").length || 0,
        completed: quotes?.filter((q) => q.status === "completed").length || 0,
        totalRevenue: quotes?.reduce((acc, q) => acc + (q.total_amount || 0), 0) || 0,
        averageTicket: quotes?.length
          ? quotes.reduce((acc, q) => acc + (q.total_amount || 0), 0) / quotes.length
          : 0,
        conversionRate: quotes?.length
          ? (quotes.filter((q) => q.status === "completed").length / quotes.length) * 100
          : 0,
      };

      const previousQuotesStats = {
        total: previousQuotes?.length || 0,
        totalRevenue: previousQuotes?.reduce((acc, q) => acc + (q.total_amount || 0), 0) || 0,
        averageTicket: previousQuotes?.length
          ? previousQuotes.reduce((acc, q) => acc + (q.total_amount || 0), 0) /
            previousQuotes.length
          : 0,
        conversionRate: previousQuotes?.length
          ? (previousQuotes.filter((q) => q.status === "completed").length /
              previousQuotes.length) *
            100
          : 0,
      };

      // Pré-vendas no período (mantido para compatibilidade)
      const { data: preorders } = await supabase
        .from("quotes")
        .select("payment_status, deposit_amount, remaining_amount, created_at")
        .eq("is_preorder", true)
        .gte("created_at", fromDate)
        .lte("created_at", toDate);

      // Assinaturas ativas no período
      const { count: subscriptionsCount } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .gte("created_at", fromDate)
        .lte("created_at", toDate);

      const { data: currentSubscriptions } = await supabase
        .from("subscriptions")
        .select("created_at, status")
        .eq("status", "active")
        .gte("created_at", fromDate)
        .lte("created_at", toDate);

      // Assinaturas (período anterior)
      const { data: previousSubscriptions } = await supabase
        .from("subscriptions")
        .select("created_at, status")
        .gte("created_at", previousFrom.toISOString())
        .lte("created_at", previousTo.toISOString());

      // Fila de upload
      const { count: queueCount } = await supabase
        .from("images_queue")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Tickets de suporte
      const { count: supportCount } = await supabase
        .from("support_conversations")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");

      // Coleções
      const { count: collectionsCount } = await supabase
        .from("collections")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      const preordersStats = {
        total: preorders?.length || 0,
        pending_deposit: preorders?.filter((p) => p.payment_status === "pending").length || 0,
        in_production: preorders?.filter((p) => p.payment_status === "deposit_paid").length || 0,
        completed: preorders?.filter((p) => p.payment_status === "fully_paid").length || 0,
        total_deposits: preorders?.reduce((acc, p) => acc + (p.deposit_amount || 0), 0) || 0,
        total_remaining: preorders?.reduce((acc, p) => acc + (p.remaining_amount || 0), 0) || 0,
      };

      // Dados para gráficos (últimos 7 dias)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split("T")[0];
      });

      const quotesPerDay = last7Days.map((date) => {
        const dayQuotes = quotes?.filter((q) => q.created_at?.startsWith(date)) || [];
        const count = dayQuotes.length;
        const revenue = dayQuotes.reduce((acc, q) => acc + (q.total_amount || 0), 0);
        return {
          date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
          orçamentos: count,
          receita: revenue,
        };
      });

      // Dados para RevenueChart (últimos 6 meses)
      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - i));
        return {
          month: date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
          firstDay: new Date(date.getFullYear(), date.getMonth(), 1).toISOString(),
          lastDay: new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString(),
        };
      });

      const revenueData = await Promise.all(
        last6Months.map(async ({ month, firstDay, lastDay }) => {
          const { data: monthQuotes } = await supabase
            .from("quotes")
            .select("total_amount, status")
            .gte("created_at", firstDay)
            .lte("created_at", lastDay);

          const receita = monthQuotes?.reduce((acc, q) => acc + (q.total_amount || 0), 0) || 0;
          const orcamentos = monthQuotes?.length || 0;

          return { month, receita, orcamentos };
        })
      );

      // Dados para ConversionFunnel
      const { count: visitorsCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const funnelData = {
        visitors: visitorsCount || 0,
        leads: Math.floor((visitorsCount || 0) * 0.4), // 40% se tornam leads
        quotes: quotes?.length || 0,
        conversions: quotes?.filter((q) => q.status === "completed").length || 0,
      };

      // Dados para SubscriptionMetrics
      const { data: allSubscriptions } = await supabase
        .from("subscription_plans")
        .select("id, name, price_pix");

      const activeSubscriptionsCount = subscriptionsCount || 0;
      const previousActiveCount = Math.floor(activeSubscriptionsCount * 0.9); // Simulação

      const newSubscriptions = Math.floor(activeSubscriptionsCount * 0.15); // 15% são novas
      const canceledSubscriptions = Math.floor(activeSubscriptionsCount * 0.05); // 5% canceladas

      const averagePrice =
        allSubscriptions && allSubscriptions.length > 0
          ? allSubscriptions.reduce((acc, s) => acc + (s.price_pix || 0), 0) / allSubscriptions.length
          : 0;

      const mrr = activeSubscriptionsCount * averagePrice;
      const previousMrr = previousActiveCount * averagePrice;
      const averageSubscriptionValue = averagePrice;
      const churnRate =
        activeSubscriptionsCount > 0 ? (canceledSubscriptions / activeSubscriptionsCount) * 100 : 0;
      const ltv = averageSubscriptionValue * 12; // LTV = valor médio * 12 meses

      const subscriptionMetrics = {
        mrr,
        previousMrr,
        activeSubscriptions: activeSubscriptionsCount,
        previousActiveSubscriptions: previousActiveCount,
        newSubscriptions,
        canceledSubscriptions,
        churnRate,
        ltv,
        averageSubscriptionValue,
      };

      return {
        models: modelsCount || 0,
        users: {
          total: usersCount || 0,
          current: currentUsers?.length || 0,
          previous: previousUsers?.length || 0,
        },
        // Pedidos unificados (TODAS as tabelas)
        orders: {
          total: ordersResult.total,
          current: ordersResult.data.length,
          previous: previousOrdersResult.data.length,
          byType: ordersByType,
          byStatus: ordersByStatus,
          revenue: ordersRevenue,
          previousRevenue: previousOrdersRevenue,
          averageTicket: averageTicket,
          previousAverageTicket: previousAverageTicket,
        },
        // Orçamentos específicos (apenas quotes)
        quotes: quotesStats,
        previousQuotes: previousQuotesStats,
        preorders: preordersStats,
        subscriptions: {
          total: subscriptionsCount || 0,
          current: currentSubscriptions?.length || 0,
          previous: previousSubscriptions?.length || 0,
        },
        queue: queueCount || 0,
        support: supportCount || 0,
        collections: collectionsCount || 0,
        quotesPerDay,
        revenueData,
        funnelData,
        subscriptionMetrics,
      };
    },
  });

  const stats = statsQuery.data;

  // Dados para gráfico de pizza (status de orçamentos)
  const quotesStatusData = [
    { name: "Pendentes", value: stats?.quotes.pending || 0, color: "#f59e0b" },
    { name: "Aprovados", value: stats?.quotes.approved || 0, color: "#3b82f6" },
    { name: "Concluídos", value: stats?.quotes.completed || 0, color: "#10b981" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header com Filtros e Indicadores */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1
                className="text-2xl md:text-3xl tracking-[0.2em] uppercase text-[hsl(var(--gold-accent))]"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", textShadow: "0 0 20px hsl(var(--gold-accent) / 0.2)" }}
              >
                Dashboard
              </h1>
              <RealtimeIndicator isConnected lastUpdate={lastUpdate} />
            </div>
            <p className="text-[hsl(0,0%,45%)] text-xs tracking-wider font-mono uppercase">
              Visão geral do sistema Ordax
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PeriodFilter value={dateRange} onChange={setDateRange} />
            <ExportButton
              data={stats ? [stats] : []}
              filename={`dashboard-${new Date().toISOString().split("T")[0]}`}
              allowColumnSelection={true}
            />
          </div>
        </div>

        {/* Stats Cards - Dados Gerais */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Modelos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.models || 0}</div>
              <p className="text-xs text-muted-foreground">No catálogo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.users.total || 0}</div>
              <p className="text-xs text-muted-foreground">Cadastrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.orders.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.orders.current || 0} no período
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.subscriptions.total || 0}</div>
              <p className="text-xs text-muted-foreground">Recorrentes</p>
            </CardContent>
          </Card>
        </div>

        {/* Cards de Pedidos por Tipo */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entregas Assinatura</CardTitle>
              <CreditCard className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats?.orders.byType.subscriptionDeliveries || 0}
              </div>
              <p className="text-xs text-muted-foreground">No período</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compras Avulsas</CardTitle>
              <ShoppingCart className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats?.orders.byType.standalonePurchases || 0}
              </div>
              <p className="text-xs text-muted-foreground">No período</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagamentos Manuais</CardTitle>
              <DollarSign className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats?.orders.byType.manualPayments || 0}
              </div>
              <p className="text-xs text-muted-foreground">No período</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orçamentos</CardTitle>
              <FileText className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats?.orders.byType.quotes || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.quotes.pending || 0} pendentes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* SSOT Cards - Informações Atualizadas do Sistema */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Card de Limite de Produção (SSOT) */}
          <Card className="border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Limite de Produção (SSOT)</CardTitle>
              <Badge variant="outline" className="text-xs">Atualizado</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pricingSettings?.currentMonthSold || 0} / {pricingSettings?.monthlyProductionLimit || 0}
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {pricingSettings?.currentMonthAvailable || 0} vagas disponíveis
              </p>
              <div className="space-y-1">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all"
                    style={{ width: `${pricingSettings?.currentMonthPercentage || 0}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {pricingSettings?.currentMonthPercentage?.toFixed(1) || 0}% do limite mensal
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card de Preços (SSOT) */}
          <Card className="border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Preços Configurados (SSOT)</CardTitle>
              <Badge variant="outline" className="text-xs">Atualizado</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Preço Padrão</span>
                  <span className="font-bold">
                    R$ {pricingSettings?.defaultPriceFull?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    PIX ({pricingSettings?.pixDiscountPercentage}% off)
                  </span>
                  <span className="font-bold text-green-600">
                    R$ {pricingSettings?.defaultPricePix?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Entrada</span>
                  <span className="font-bold">
                    R$ {pricingSettings?.defaultDepositAmount?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Cronograma (SSOT) */}
          <Card className="border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cronograma Atual (SSOT)</CardTitle>
              <Badge variant="outline" className="text-xs">Atualizado</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Lote Atual</p>
                  <p className="text-lg font-bold">{contentSettings?.currentBatchName || 'N/A'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Produção</p>
                    <p className="font-medium">
                      {contentSettings?.productionDaysMin}-{contentSettings?.productionDaysMax} dias
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Envio</p>
                    <p className="font-medium">
                      {contentSettings?.currentBatchShippingMonth}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Métricas de Negócio com Comparação - Baseadas em Pedidos Unificados */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricComparison
            title="Receita Total (Pedidos)"
            currentValue={stats?.orders.revenue || 0}
            previousValue={stats?.orders.previousRevenue || 0}
            format="currency"
            icon={<DollarSign className="h-4 w-4 text-green-500" />}
          />
          <MetricComparison
            title="Ticket Médio (Pedidos)"
            currentValue={stats?.orders.averageTicket || 0}
            previousValue={stats?.orders.previousAverageTicket || 0}
            format="currency"
            icon={<ShoppingCart className="h-4 w-4 text-blue-500" />}
          />
          <MetricComparison
            title="Total de Pedidos"
            currentValue={stats?.orders.current || 0}
            previousValue={stats?.orders.previous || 0}
            format="number"
            icon={<Package className="h-4 w-4 text-purple-500" />}
          />
          <MetricComparison
            title="Taxa de Conversão (Orçamentos)"
            currentValue={stats?.quotes.conversionRate || 0}
            previousValue={stats?.previousQuotes.conversionRate || 0}
            format="percentage"
            icon={<Percent className="h-4 w-4 text-orange-500" />}
          />
        </div>

        {/* Comparativos Adicionais - Usuários e Assinaturas */}
        <div className="grid gap-4 md:grid-cols-2">
          <MetricComparison
            title="Novos Usuários"
            currentValue={stats?.users.current || 0}
            previousValue={stats?.users.previous || 0}
            format="number"
            icon={<Users className="h-4 w-4 text-blue-500" />}
          />
          <MetricComparison
            title="Novas Assinaturas"
            currentValue={stats?.subscriptions.current || 0}
            previousValue={stats?.subscriptions.previous || 0}
            format="number"
            icon={<CreditCard className="h-4 w-4 text-green-500" />}
          />
        </div>

        {/* Pré-vendas Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pré-vendas</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats?.preorders.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.preorders.in_production || 0} em produção
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sinais Recebidos</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {(stats?.preorders.total_deposits || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Pagamentos iniciais</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">A Receber</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                R$ {(stats?.preorders.total_remaining || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Pagamentos finais</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Gráfico de Área - Orçamentos e Receita */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">
                Orçamentos & Receita (Últimos 7 dias)
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Novos orçamentos e receita gerada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
                <AreaChart data={stats?.quotesPerDay || []}>
                  <defs>
                    <linearGradient id="colorOrcamentos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-xs" />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} className="text-xs" />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    className="text-xs"
                  />
                  <Tooltip contentStyle={{ fontSize: "12px" }} wrapperClassName="text-xs" />
                  <Legend wrapperStyle={{ fontSize: "12px" }} iconSize={12} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="orçamentos"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorOrcamentos)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="receita"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorReceita)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Pizza - Status dos Orçamentos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Status dos Orçamentos</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Distribuição por status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
                <PieChart>
                  <Pie
                    data={quotesStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {quotesStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Alertas e Ações Rápidas */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Alertas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Atenção Necessária
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats?.quotes.pending && stats.quotes.pending > 0 && (
                <div
                  className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate("/admin/pedidos")}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">Orçamentos Pendentes</p>
                      <p className="text-sm text-muted-foreground">
                        {stats.quotes.pending} aguardando resposta
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              )}

              {stats?.support && stats.support > 0 && (
                <div
                  className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate("/admin/suporte")}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                      <HeadphonesIcon className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-medium">Tickets Abertos</p>
                      <p className="text-sm text-muted-foreground">
                        {stats.support} aguardando resposta
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              )}

              {(!stats?.queue || stats.queue === 0) &&
                (!stats?.quotes.pending || stats.quotes.pending === 0) &&
                (!stats?.support || stats.support === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p className="font-medium">Tudo em dia!</p>
                    <p className="text-sm">Nenhuma ação urgente necessária</p>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Ações Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate("/admin/pre-vendas")}
              >
                <Clock className="h-4 w-4 mr-2" />
                Pré-vendas
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate("/admin/colecoes")}
              >
                <Layers className="h-4 w-4 mr-2" />
                Coleções
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate("/admin/fila-producao")}
              >
                <Package className="h-4 w-4 mr-2" />
                Fila de Produção
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate("/admin/cupons")}
              >
                <Ticket className="h-4 w-4 mr-2" />
                Cupons
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate("/admin/analytics")}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Analytics Completo
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate("/admin/calculadora")}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Calculadora Mercado Pago
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Status do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle>Status do Sistema</CardTitle>
            <CardDescription>Visão geral dos módulos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">Catálogo</p>
                  <p className="text-sm text-muted-foreground">{stats?.models || 0} modelos</p>
                </div>
                <Badge variant="default" className="bg-green-500">
                  Ativo
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">Coleções</p>
                  <p className="text-sm text-muted-foreground">{stats?.collections || 0} ativas</p>
                </div>
                <Badge variant="default" className="bg-green-500">
                  Ativo
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">Assinaturas</p>
                  <p className="text-sm text-muted-foreground">
                    {stats?.subscriptions.total || 0} ativas
                  </p>
                </div>
                <Badge variant="default" className="bg-green-500">
                  Ativo
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Avançado */}
        <div className="space-y-8">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Analytics Avançado</h2>
          </div>

          {/* Receita Mensal */}
          {stats?.revenueData && stats.revenueData.length > 0 && (
            <RevenueChart data={stats.revenueData} />
          )}

          {/* Funil de Conversão e Métricas de Assinatura */}
          <div className="grid gap-4 lg:grid-cols-2">
            {stats?.funnelData && <ConversionFunnel data={stats.funnelData} />}
            {stats?.subscriptionMetrics && (
              <div className="lg:col-span-2">
                <SubscriptionMetrics data={stats.subscriptionMetrics} />
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
