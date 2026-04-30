// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/shared/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Users,
  Package,
  DollarSign,
  ShoppingCart,
  Star,
  Calendar,
  Activity,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAnalytics() {
  // Query para estatísticas gerais
  const statsQuery = useQuery({
    queryKey: ["admin-analytics-stats"],
    queryFn: async () => {
      // Total de usuários
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Total de pedidos
      const { count: totalOrders } = await supabase
        .from("quotes")
        .select("*", { count: "exact", head: true });

      // Total de modelos
      const { count: totalModels } = await supabase
        .from("models")
        .select("*", { count: "exact", head: true });

      // Total de assinaturas ativas
      const { count: activeSubscriptions } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Receita total (soma de total_spent)
      const { data: revenueData } = await supabase.from("profiles").select("total_spent");

      const totalRevenue = revenueData?.reduce((sum, p) => sum + (p.total_spent || 0), 0) || 0;

      // Média de completude de perfil
      const { data: profileData } = await supabase.from("profiles").select("profile_completion");

      const avgCompletion = profileData?.length
        ? profileData.reduce((sum, p) => sum + (p.profile_completion || 0), 0) / profileData.length
        : 0;

      return {
        totalUsers: totalUsers || 0,
        totalOrders: totalOrders || 0,
        totalModels: totalModels || 0,
        activeSubscriptions: activeSubscriptions || 0,
        totalRevenue,
        avgCompletion: Math.round(avgCompletion),
      };
    },
  });

  // Query para usuários recentes
  const recentUsersQuery = useQuery({
    queryKey: ["admin-analytics-recent-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");

      if (error) {
        console.error("Erro ao buscar usuários:", error);
        return [];
      }

      const users = data || [];
      return users
        .sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 5);
    },
  });

  // Query para pedidos recentes
  const recentOrdersQuery = useQuery({
    queryKey: ["admin-analytics-recent-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });

  // Query para top colecionadores
  const topCollectorsQuery = useQuery({
    queryKey: ["admin-analytics-top-collectors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, full_name, collector_level, pieces_owned, total_spent")
        .order("total_spent", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });

  // Query para estatísticas de coleções
  const collectionsStatsQuery = useQuery({
    queryKey: ["admin-analytics-collections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("collections").select("id, name, is_active");

      if (error) throw error;

      const active = data?.filter((c) => c.is_active).length || 0;
      const inactive = data?.filter((c) => !c.is_active).length || 0;

      return { total: data?.length || 0, active, inactive };
    },
  });

  const stats = statsQuery.data;
  const recentUsers = recentUsersQuery.data || [];
  const recentOrders = recentOrdersQuery.data || [];
  const topCollectors = topCollectorsQuery.data || [];
  const collectionsStats = collectionsStatsQuery.data;

  const isLoading = statsQuery.isLoading;

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="h-px w-20 bg-foreground mb-6" />
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="text-5xl font-bold tracking-tight">Analytics</h1>
          <Badge variant="secondary" className="border border-border px-4 py-2 text-base">
            <Activity className="h-4 w-4 mr-2" />
            Tempo Real
          </Badge>
        </div>
        <p className="text-lg text-muted-foreground">Métricas e estatísticas do sistema Ordax</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {/* Total de Usuários */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalUsers}</div>
                <p className="text-xs text-muted-foreground mt-1">Cadastrados na plataforma</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total de Pedidos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalOrders}</div>
                <p className="text-xs text-muted-foreground mt-1">Orçamentos solicitados</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total de Modelos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Modelos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalModels}</div>
                <p className="text-xs text-muted-foreground mt-1">No catálogo</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Assinaturas Ativas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.activeSubscriptions}</div>
                <p className="text-xs text-muted-foreground mt-1">Recorrentes</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Receita Total */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">R$ {(stats?.totalRevenue || 0).toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Acumulado</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Completude Média */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completude Média</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.avgCompletion}%</div>
                <p className="text-xs text-muted-foreground mt-1">Perfis completos</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coleções Stats */}
      {collectionsStats && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Estatísticas de Coleções</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{collectionsStats.total}</div>
                <div className="text-xs text-muted-foreground mt-1">Total</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="text-2xl font-bold text-green-600">{collectionsStats.active}</div>
                <div className="text-xs text-muted-foreground mt-1">Ativas</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{collectionsStats.inactive}</div>
                <div className="text-xs text-muted-foreground mt-1">Inativas</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Usuários Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuários Recentes
            </CardTitle>
            <CardDescription>Últimos 5 cadastros</CardDescription>
          </CardHeader>
          <CardContent>
            {recentUsersQuery.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum usuário cadastrado
              </p>
            ) : (
              <div className="space-y-3">
                {recentUsers.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <div className="font-medium text-sm">{user.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Novo
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pedidos Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Pedidos Recentes
            </CardTitle>
            <CardDescription>Últimos 5 orçamentos</CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrdersQuery.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum pedido realizado
              </p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <div className="font-medium text-sm">Pedido #{order.id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {order.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Colecionadores */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Colecionadores
            </CardTitle>
            <CardDescription>Maiores investidores</CardDescription>
          </CardHeader>
          <CardContent>
            {topCollectorsQuery.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : topCollectors.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum colecionador ainda
              </p>
            ) : (
              <div className="space-y-3">
                {topCollectors.map((collector: any, index: number) => (
                  <div
                    key={collector.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">
                          {collector.display_name || collector.full_name || "Usuário"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Nível {collector.collector_level || 1} • {collector.pieces_owned || 0}{" "}
                          peças
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">
                        R$ {(collector.total_spent || 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">Investido</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
