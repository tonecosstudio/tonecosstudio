import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  HeadphonesIcon,
  Layers,
  Package,
  Percent,
  ShoppingCart,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ADMIN_ROUTES } from "@/config/routes";
import { ConversionFunnel } from "@/components/admin/analytics/ConversionFunnel";
import { MetricComparison } from "@/components/admin/analytics/MetricComparison";
import { RevenueChart } from "@/components/admin/analytics/RevenueChart";
import { SubscriptionMetrics } from "@/components/admin/analytics/SubscriptionMetrics";
import { RealtimeIndicator } from "@/components/admin/notifications/RealtimeIndicator";
import { ExportButton } from "@/components/admin/operations/ExportButton";
import { PeriodFilter, type DateRange } from "@/components/admin/operations/PeriodFilter";
import { AdminLayout } from "@/components/admin/shared/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardStats } from "@/hooks/admin/useDashboardStats";
import { useContentSettings } from "@/hooks/useContentSettings";
import { usePricingSettings } from "@/hooks/usePricingSettings";

function getPeriodSpanDays(dateRange: DateRange): number {
  return Math.max(
    1,
    Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
}

function getTimelineGranularityLabel(periodSpanDays: number): "dia" | "semana" | "mes" {
  if (periodSpanDays <= 14) {
    return "dia";
  }

  if (periodSpanDays <= 90) {
    return "semana";
  }

  return "mes";
}

function getRevenueGranularityLabel(periodSpanDays: number): "dia" | "semana" | "mes" {
  if (periodSpanDays <= 45) {
    return "dia";
  }

  if (periodSpanDays <= 180) {
    return "semana";
  }

  return "mes";
}

export default function AdminHome() {
  const navigate = useNavigate();
  const { data: pricingSettings } = usePricingSettings();
  const { data: contentSettings } = useContentSettings();

  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  const { data: stats, lastUpdate } = useDashboardStats(dateRange);
  const periodSpanDays = getPeriodSpanDays(dateRange);
  const timelineGranularityLabel = getTimelineGranularityLabel(periodSpanDays);
  const revenueGranularityLabel = getRevenueGranularityLabel(periodSpanDays);

  const quotesStatusData = [
    { name: "Pendentes", value: stats?.quotes.pending || 0, color: "#f59e0b" },
    { name: "Aprovados", value: stats?.quotes.approved || 0, color: "#3b82f6" },
    { name: "Concluidos", value: stats?.quotes.completed || 0, color: "#10b981" },
  ];

  const exportData = stats
    ? [
        {
          models: stats.models,
          users_total: stats.users.total,
          orders_total: stats.orders.total,
          orders_revenue: stats.orders.revenue,
          quotes_total: stats.quotes.total,
          quotes_revenue: stats.quotes.totalRevenue,
          subscriptions_total: stats.subscriptions.total,
          queue_total: stats.queue,
          support_total: stats.support,
          collections_total: stats.collections,
        },
      ]
    : [];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h1
                className="text-2xl uppercase tracking-[0.2em] text-[hsl(var(--gold-accent))] md:text-3xl"
                style={{
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  textShadow: "0 0 20px hsl(var(--gold-accent) / 0.2)",
                }}
              >
                Painel operacional
              </h1>
              <RealtimeIndicator isConnected lastUpdate={lastUpdate} />
            </div>
            <p className="text-xs uppercase tracking-wider text-[hsl(0,0%,45%)]">
              Visao geral operacional do sistema
            </p>
          </div>

          <div className="flex items-center gap-2">
            <PeriodFilter value={dateRange} onChange={setDateRange} />
            <ExportButton
              data={exportData}
              filename={`painel-operacional-${new Date().toISOString().split("T")[0]}`}
              allowColumnSelection={true}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de modelos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.models || 0}</div>
              <p className="text-xs text-muted-foreground">No catalogo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.users.total || 0}</div>
              <p className="text-xs text-muted-foreground">Cadastros totais</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de pedidos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.orders.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.orders.current || 0} no periodo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assinaturas ativas</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.subscriptions.total || 0}</div>
              <p className="text-xs text-muted-foreground">Base recorrente ativa</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entregas de assinatura</CardTitle>
              <CreditCard className="h-4 w-4 text-[hsl(var(--gold-accent)/0.7)]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[hsl(var(--gold-accent))]">
                {stats?.orders.byType.subscriptionDeliveries || 0}
              </div>
              <p className="text-xs text-muted-foreground">No periodo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compras avulsas</CardTitle>
              <ShoppingCart className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                {stats?.orders.byType.standalonePurchases || 0}
              </div>
              <p className="text-xs text-muted-foreground">No periodo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagamentos manuais</CardTitle>
              <DollarSign className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">
                {stats?.orders.byType.manualPayments || 0}
              </div>
              <p className="text-xs text-muted-foreground">No periodo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orcamentos</CardTitle>
              <FileText className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-violet-500">
                {stats?.orders.byType.quotes || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.quotes.pending || 0} pendentes
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-[hsl(var(--gold-accent)/0.3)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Capacidade de producao</CardTitle>
              <Badge
                variant="outline"
                className="border-[hsl(var(--gold-accent)/0.3)] text-xs text-[hsl(var(--gold-accent)/0.7)]"
              >
                SSOT
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pricingSettings?.currentMonthSold || 0} /{" "}
                {pricingSettings?.monthlyProductionLimit || 0}
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                {pricingSettings?.currentMonthAvailable || 0} vagas disponiveis
              </p>
              <div className="space-y-1">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-[hsl(var(--gold-accent))] transition-all"
                    style={{ width: `${pricingSettings?.currentMonthPercentage || 0}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {pricingSettings?.currentMonthPercentage?.toFixed(1) || 0}% do limite
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[hsl(var(--gold-accent)/0.3)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Precos configurados</CardTitle>
              <Badge
                variant="outline"
                className="border-[hsl(var(--gold-accent)/0.3)] text-xs text-[hsl(var(--gold-accent)/0.7)]"
              >
                SSOT
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Preco padrao</span>
                  <span className="font-bold">
                    R$ {pricingSettings?.defaultPriceFull?.toFixed(2) || "0.00"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    PIX ({pricingSettings?.pixDiscountPercentage}% off)
                  </span>
                  <span className="font-bold text-emerald-500">
                    R$ {pricingSettings?.defaultPricePix?.toFixed(2) || "0.00"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Entrada</span>
                  <span className="font-bold">
                    R$ {pricingSettings?.defaultDepositAmount?.toFixed(2) || "0.00"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[hsl(var(--gold-accent)/0.3)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cronograma atual</CardTitle>
              <Badge
                variant="outline"
                className="border-[hsl(var(--gold-accent)/0.3)] text-xs text-[hsl(var(--gold-accent)/0.7)]"
              >
                SSOT
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Lote atual</p>
                  <p className="text-lg font-bold">{contentSettings?.currentBatchName || "N/A"}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Producao</p>
                    <p className="font-medium">
                      {contentSettings?.productionDaysMin}-{contentSettings?.productionDaysMax} dias
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Envio</p>
                    <p className="font-medium">{contentSettings?.currentBatchShippingMonth}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricComparison
            title="Receita total"
            currentValue={stats?.orders.revenue || 0}
            previousValue={stats?.orders.previousRevenue || 0}
            format="currency"
            icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
          />
          <MetricComparison
            title="Ticket medio"
            currentValue={stats?.orders.averageTicket || 0}
            previousValue={stats?.orders.previousAverageTicket || 0}
            format="currency"
            icon={<ShoppingCart className="h-4 w-4 text-[hsl(var(--gold-accent))]" />}
          />
          <MetricComparison
            title="Pedidos no periodo"
            currentValue={stats?.orders.current || 0}
            previousValue={stats?.orders.previous || 0}
            format="number"
            icon={<Package className="h-4 w-4 text-violet-500" />}
          />
          <MetricComparison
            title="Conversao de orcamentos"
            currentValue={stats?.quotes.conversionRate || 0}
            previousValue={stats?.previousQuotes.conversionRate || 0}
            format="percentage"
            icon={<Percent className="h-4 w-4 text-amber-500" />}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <MetricComparison
            title="Novos usuarios"
            currentValue={stats?.users.current || 0}
            previousValue={stats?.users.previous || 0}
            format="number"
            icon={<Users className="h-4 w-4 text-[hsl(var(--gold-accent))]" />}
          />
          <MetricComparison
            title="Novas assinaturas"
            currentValue={stats?.subscriptions.current || 0}
            previousValue={stats?.subscriptions.previous || 0}
            format="number"
            icon={<CreditCard className="h-4 w-4 text-emerald-500" />}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pre-vendas</CardTitle>
              <Clock className="h-4 w-4 text-[hsl(var(--gold-accent)/0.7)]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[hsl(var(--gold-accent))]">
                {stats?.preorders.total || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.preorders.in_production || 0} em producao
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sinais recebidos</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                R$ {(stats?.preorders.total_deposits || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Pagamentos iniciais</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo a receber</CardTitle>
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">
                R$ {(stats?.preorders.total_remaining || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Pagamentos finais</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Orcamentos e receita por {timelineGranularityLabel}
              </CardTitle>
              <CardDescription className="text-xs">
                Periodo selecionado: {periodSpanDays} dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={stats?.quotesPerDay || []}>
                  <defs>
                    <linearGradient id="colorOrcamentos" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--gold-accent))"
                        stopOpacity={0.8}
                      />
                      <stop offset="95%" stopColor="hsl(var(--gold-accent))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      fontSize: "12px",
                      background: "hsl(0,0%,10%)",
                      border: "1px solid hsl(var(--gold-accent)/0.3)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} iconSize={10} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="orcamentos"
                    stroke="hsl(var(--gold-accent))"
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status dos orcamentos</CardTitle>
              <CardDescription className="text-xs">
                Distribuicao por status no periodo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={quotesStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {quotesStatusData.map((entry, index) => (
                      <Cell key={`quotes-status-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontSize: "12px",
                      background: "hsl(0,0%,10%)",
                      border: "1px solid hsl(var(--gold-accent)/0.3)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Atencao necessaria
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats?.quotes.pending && stats.quotes.pending > 0 && (
                <div
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-[hsl(var(--gold-accent)/0.15)] p-3 transition-colors hover:bg-[hsl(var(--gold-accent)/0.05)]"
                  onClick={() => navigate(ADMIN_ROUTES.orders)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--gold-accent)/0.1)]">
                      <FileText className="h-5 w-5 text-[hsl(var(--gold-accent))]" />
                    </div>
                    <div>
                      <p className="font-medium">Orcamentos pendentes</p>
                      <p className="text-sm text-muted-foreground">
                        {stats.quotes.pending} aguardando analise
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              )}

              {stats?.support && stats.support > 0 && (
                <div
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-red-500/20 p-3 transition-colors hover:bg-red-500/5"
                  onClick={() => navigate(ADMIN_ROUTES.communication)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                      <HeadphonesIcon className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-medium">Tickets abertos</p>
                      <p className="text-sm text-muted-foreground">
                        {stats.support} aguardando atendimento
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              )}

              {(!stats?.queue || stats.queue === 0) &&
                (!stats?.quotes.pending || stats.quotes.pending === 0) &&
                (!stats?.support || stats.support === 0) && (
                  <div className="py-8 text-center text-muted-foreground">
                    <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
                    <p className="font-medium">Tudo em dia</p>
                    <p className="text-sm">Nenhuma acao urgente no momento</p>
                  </div>
                )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-[hsl(var(--gold-accent))]" />
                Acoes rapidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate(ADMIN_ROUTES.orders)}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Pedidos
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate(ADMIN_ROUTES.catalog)}
              >
                <Layers className="mr-2 h-4 w-4" />
                Catalogo
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate(ADMIN_ROUTES.production)}
              >
                <Package className="mr-2 h-4 w-4" />
                Producao
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate(ADMIN_ROUTES.credits)}
              >
                <Ticket className="mr-2 h-4 w-4" />
                Creditos
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate(ADMIN_ROUTES.analytics)}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Analises
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate(ADMIN_ROUTES.paymentCalculator)}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Calculadora de pagamento
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Status do sistema</CardTitle>
            <CardDescription>Visao geral dos modulos principais</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--gold-accent)/0.15)] p-3">
                <div>
                  <p className="font-medium">Catalogo</p>
                  <p className="text-sm text-muted-foreground">{stats?.models || 0} modelos</p>
                </div>
                <Badge className="border-emerald-500/30 bg-emerald-500/20 text-emerald-400">
                  Ativo
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--gold-accent)/0.15)] p-3">
                <div>
                  <p className="font-medium">Colecoes</p>
                  <p className="text-sm text-muted-foreground">
                    {stats?.collections || 0} ativas
                  </p>
                </div>
                <Badge className="border-emerald-500/30 bg-emerald-500/20 text-emerald-400">
                  Ativo
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--gold-accent)/0.15)] p-3">
                <div>
                  <p className="font-medium">Assinaturas</p>
                  <p className="text-sm text-muted-foreground">
                    {stats?.subscriptions.total || 0} ativas
                  </p>
                </div>
                <Badge className="border-emerald-500/30 bg-emerald-500/20 text-emerald-400">
                  Ativo
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-[hsl(var(--gold-accent))]" />
            <h2
              className="text-xl uppercase tracking-[0.15em] text-[hsl(var(--gold-accent))]"
              style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
            >
              Analises avancadas
            </h2>
          </div>

          {stats?.revenueData && stats.revenueData.length > 0 && (
            <RevenueChart
              data={stats.revenueData}
              title="Receita e orcamentos"
              description={`Evolucao por ${revenueGranularityLabel} no periodo selecionado`}
            />
          )}

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
