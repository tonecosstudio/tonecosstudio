import { useState } from "react";
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
import { useDashboardStats } from "@/hooks/admin/useDashboardStats";
import {
  Package,
  Users,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Layers,
  CreditCard,
  Ticket,
  HeadphonesIcon,
  ArrowRight,
  Activity,
  Percent,
  ShoppingCart,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

export default function AdminHome() {
  const navigate = useNavigate();
  const { data: pricingSettings } = usePricingSettings();
  const { data: contentSettings } = useContentSettings();

  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  const { data: stats, lastUpdate } = useDashboardStats(dateRange);

  const quotesStatusData = [
    { name: "Pendentes", value: stats?.quotes.pending || 0, color: "#f59e0b" },
    { name: "Aprovados", value: stats?.quotes.approved || 0, color: "#3b82f6" },
    { name: "Concluídos", value: stats?.quotes.completed || 0, color: "#10b981" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header Arcade */}
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
              Visão geral do sistema
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

        {/* Stats Cards */}
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
              <CreditCard className="h-4 w-4 text-[hsl(var(--gold-accent)/0.7)]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[hsl(var(--gold-accent))]">
                {stats?.orders.byType.subscriptionDeliveries || 0}
              </div>
              <p className="text-xs text-muted-foreground">No período</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compras Avulsas</CardTitle>
              <ShoppingCart className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                {stats?.orders.byType.standalonePurchases || 0}
              </div>
              <p className="text-xs text-muted-foreground">No período</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagamentos Manuais</CardTitle>
              <DollarSign className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">
                {stats?.orders.byType.manualPayments || 0}
              </div>
              <p className="text-xs text-muted-foreground">No período</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orçamentos</CardTitle>
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

        {/* SSOT Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-[hsl(var(--gold-accent)/0.3)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Limite de Produção</CardTitle>
              <Badge variant="outline" className="text-xs border-[hsl(var(--gold-accent)/0.3)] text-[hsl(var(--gold-accent)/0.7)]">SSOT</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pricingSettings?.currentMonthSold || 0} / {pricingSettings?.monthlyProductionLimit || 0}
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {pricingSettings?.currentMonthAvailable || 0} vagas disponíveis
              </p>
              <div className="space-y-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
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
              <CardTitle className="text-sm font-medium">Preços Configurados</CardTitle>
              <Badge variant="outline" className="text-xs border-[hsl(var(--gold-accent)/0.3)] text-[hsl(var(--gold-accent)/0.7)]">SSOT</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Preço Padrão</span>
                  <span className="font-bold">R$ {pricingSettings?.defaultPriceFull?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">PIX ({pricingSettings?.pixDiscountPercentage}% off)</span>
                  <span className="font-bold text-emerald-500">R$ {pricingSettings?.defaultPricePix?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Entrada</span>
                  <span className="font-bold">R$ {pricingSettings?.defaultDepositAmount?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[hsl(var(--gold-accent)/0.3)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cronograma Atual</CardTitle>
              <Badge variant="outline" className="text-xs border-[hsl(var(--gold-accent)/0.3)] text-[hsl(var(--gold-accent)/0.7)]">SSOT</Badge>
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
                    <p className="font-medium">{contentSettings?.productionDaysMin}-{contentSettings?.productionDaysMax} dias</p>
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

        {/* Métricas com Comparação */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricComparison title="Receita Total" currentValue={stats?.orders.revenue || 0} previousValue={stats?.orders.previousRevenue || 0} format="currency" icon={<DollarSign className="h-4 w-4 text-emerald-500" />} />
          <MetricComparison title="Ticket Médio" currentValue={stats?.orders.averageTicket || 0} previousValue={stats?.orders.previousAverageTicket || 0} format="currency" icon={<ShoppingCart className="h-4 w-4 text-[hsl(var(--gold-accent))]" />} />
          <MetricComparison title="Total de Pedidos" currentValue={stats?.orders.current || 0} previousValue={stats?.orders.previous || 0} format="number" icon={<Package className="h-4 w-4 text-violet-500" />} />
          <MetricComparison title="Taxa de Conversão" currentValue={stats?.quotes.conversionRate || 0} previousValue={stats?.previousQuotes.conversionRate || 0} format="percentage" icon={<Percent className="h-4 w-4 text-amber-500" />} />
        </div>

        {/* Comparativos */}
        <div className="grid gap-4 md:grid-cols-2">
          <MetricComparison title="Novos Usuários" currentValue={stats?.users.current || 0} previousValue={stats?.users.previous || 0} format="number" icon={<Users className="h-4 w-4 text-[hsl(var(--gold-accent))]" />} />
          <MetricComparison title="Novas Assinaturas" currentValue={stats?.subscriptions.current || 0} previousValue={stats?.subscriptions.previous || 0} format="number" icon={<CreditCard className="h-4 w-4 text-emerald-500" />} />
        </div>

        {/* Pré-vendas */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pré-vendas</CardTitle>
              <Clock className="h-4 w-4 text-[hsl(var(--gold-accent)/0.7)]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[hsl(var(--gold-accent))]">{stats?.preorders.total || 0}</div>
              <p className="text-xs text-muted-foreground">{stats?.preorders.in_production || 0} em produção</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sinais Recebidos</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">R$ {(stats?.preorders.total_deposits || 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Pagamentos iniciais</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">A Receber</CardTitle>
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">R$ {(stats?.preorders.total_remaining || 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Pagamentos finais</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Orçamentos & Receita (7 dias)</CardTitle>
              <CardDescription className="text-xs">Novos orçamentos e receita</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={stats?.quotesPerDay || []}>
                  <defs>
                    <linearGradient id="colorOrcamentos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--gold-accent))" stopOpacity={0.8} />
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
                  <Tooltip contentStyle={{ fontSize: "12px", background: "hsl(0,0%,10%)", border: "1px solid hsl(var(--gold-accent)/0.3)" }} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} iconSize={10} />
                  <Area yAxisId="left" type="monotone" dataKey="orçamentos" stroke="hsl(var(--gold-accent))" fillOpacity={1} fill="url(#colorOrcamentos)" />
                  <Area yAxisId="right" type="monotone" dataKey="receita" stroke="#10b981" fillOpacity={1} fill="url(#colorReceita)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status dos Orçamentos</CardTitle>
              <CardDescription className="text-xs">Distribuição por status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={quotesStatusData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                    {quotesStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: "12px", background: "hsl(0,0%,10%)", border: "1px solid hsl(var(--gold-accent)/0.3)" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Alertas e Ações Rápidas */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Atenção Necessária
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats?.quotes.pending && stats.quotes.pending > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg border border-[hsl(var(--gold-accent)/0.15)] cursor-pointer hover:bg-[hsl(var(--gold-accent)/0.05)] transition-colors" onClick={() => navigate("/admin/pedidos")}>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[hsl(var(--gold-accent)/0.1)] flex items-center justify-center">
                      <FileText className="h-5 w-5 text-[hsl(var(--gold-accent))]" />
                    </div>
                    <div>
                      <p className="font-medium">Orçamentos Pendentes</p>
                      <p className="text-sm text-muted-foreground">{stats.quotes.pending} aguardando</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              )}

              {stats?.support && stats.support > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg border border-red-500/20 cursor-pointer hover:bg-red-500/5 transition-colors" onClick={() => navigate("/admin/comunicacao?tab=support")}>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                      <HeadphonesIcon className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-medium">Tickets Abertos</p>
                      <p className="text-sm text-muted-foreground">{stats.support} aguardando</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              )}

              {(!stats?.queue || stats.queue === 0) && (!stats?.quotes.pending || stats.quotes.pending === 0) && (!stats?.support || stats.support === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
                  <p className="font-medium">Tudo em dia!</p>
                  <p className="text-sm">Nenhuma ação urgente</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-[hsl(var(--gold-accent))]" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/admin/pedidos")}><ShoppingCart className="h-4 w-4 mr-2" />Pedidos</Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/admin/catalogo")}><Layers className="h-4 w-4 mr-2" />Catálogo</Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/admin/producao")}><Package className="h-4 w-4 mr-2" />Produção</Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/admin/creditos")}><Ticket className="h-4 w-4 mr-2" />Créditos</Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/admin/analytics")}><TrendingUp className="h-4 w-4 mr-2" />Analytics</Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/admin/pagamentos?tab=calculator")}><DollarSign className="h-4 w-4 mr-2" />Calculadora MP</Button>
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
              <div className="flex items-center justify-between p-3 rounded-lg border border-[hsl(var(--gold-accent)/0.15)]">
                <div>
                  <p className="font-medium">Catálogo</p>
                  <p className="text-sm text-muted-foreground">{stats?.models || 0} modelos</p>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Ativo</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-[hsl(var(--gold-accent)/0.15)]">
                <div>
                  <p className="font-medium">Coleções</p>
                  <p className="text-sm text-muted-foreground">{stats?.collections || 0} ativas</p>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Ativo</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-[hsl(var(--gold-accent)/0.15)]">
                <div>
                  <p className="font-medium">Assinaturas</p>
                  <p className="text-sm text-muted-foreground">{stats?.subscriptions.total || 0} ativas</p>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Ativo</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Avançado */}
        <div className="space-y-8">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-[hsl(var(--gold-accent))]" />
            <h2
              className="text-xl tracking-[0.15em] uppercase text-[hsl(var(--gold-accent))]"
              style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
            >
              Analytics Avançado
            </h2>
          </div>

          {stats?.revenueData && stats.revenueData.length > 0 && <RevenueChart data={stats.revenueData} />}

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
