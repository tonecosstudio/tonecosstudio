import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
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
} from "recharts";

export default function AdminHome() {
  const navigate = useNavigate();

  // Buscar estatísticas gerais
  const statsQuery = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      // Modelos
      const { count: modelsCount } = await supabase
        .from("models")
        .select("*", { count: "exact", head: true });

      // Usuários
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Orçamentos
      const { data: quotes } = await supabase
        .from("quotes")
        .select("status, created_at, total_amount");

      // Pré-vendas
      const { data: preorders } = await supabase
        .from("quotes")
        .select("payment_status, deposit_amount, remaining_amount")
        .eq("is_preorder", true);

      // Assinaturas
      const { count: subscriptionsCount } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

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

      // Calcular estatísticas
      const quotesStats = {
        total: quotes?.length || 0,
        pending: quotes?.filter((q) => q.status === "pending").length || 0,
        approved: quotes?.filter((q) => q.status === "approved").length || 0,
        completed: quotes?.filter((q) => q.status === "completed").length || 0,
      };

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
        const count = quotes?.filter((q) => q.created_at?.startsWith(date)).length || 0;
        return {
          date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
          orçamentos: count,
        };
      });

      return {
        models: modelsCount || 0,
        users: usersCount || 0,
        quotes: quotesStats,
        preorders: preordersStats,
        subscriptions: subscriptionsCount || 0,
        queue: queueCount || 0,
        support: supportCount || 0,
        collections: collectionsCount || 0,
        quotesPerDay,
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
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do sistema Ordax</p>
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
              <div className="text-2xl font-bold">{stats?.users || 0}</div>
              <p className="text-xs text-muted-foreground">Cadastrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orçamentos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.quotes.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.quotes.pending || 0} pendentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.subscriptions || 0}</div>
              <p className="text-xs text-muted-foreground">Recorrentes</p>
            </CardContent>
          </Card>
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
          {/* Gráfico de Linha - Orçamentos por Dia */}
          <Card>
            <CardHeader>
              <CardTitle>Orçamentos (Últimos 7 dias)</CardTitle>
              <CardDescription>Novos orçamentos solicitados</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats?.quotesPerDay || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="orçamentos"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Pizza - Status dos Orçamentos */}
          <Card>
            <CardHeader>
              <CardTitle>Status dos Orçamentos</CardTitle>
              <CardDescription>Distribuição por status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
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
                  <Tooltip />
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
              {stats?.queue && stats.queue > 0 && (
                <div
                  className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate("/admin/esteira")}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <Upload className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-medium">Fila de Upload</p>
                      <p className="text-sm text-muted-foreground">
                        {stats.queue} imagens aguardando
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              )}

              {stats?.quotes.pending && stats.quotes.pending > 0 && (
                <div
                  className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate("/admin/orcamentos")}
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
                onClick={() => navigate("/admin/upload")}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Massivo
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate("/admin/esteira")}
              >
                <Workflow className="h-4 w-4 mr-2" />
                Modo Esteira
              </Button>
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
                    {stats?.subscriptions || 0} ativas
                  </p>
                </div>
                <Badge variant="default" className="bg-green-500">
                  Ativo
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
