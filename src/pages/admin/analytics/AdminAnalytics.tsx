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
import { useAdminAnalyticsData } from "@/hooks/admin/useAdminAnalyticsData";

export default function AdminAnalytics() {
  const {
    statsQuery,
    recentUsersQuery,
    recentOrdersQuery,
    topCollectorsQuery,
    collectionsStatsQuery,
  } = useAdminAnalyticsData();

  const stats = statsQuery.data;
  const recentUsers = recentUsersQuery.data || [];
  const recentOrders = recentOrdersQuery.data || [];
  const topCollectors = topCollectorsQuery.data || [];
  const collectionsStats = collectionsStatsQuery.data;
  const isLoading = statsQuery.isLoading;

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="h-px w-20 bg-foreground mb-6" />
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="text-5xl font-bold tracking-tight">Análises</h1>
          <Badge variant="secondary" className="border border-border px-4 py-2 text-base">
            <Activity className="h-4 w-4 mr-2" />
            Tempo real
          </Badge>
        </div>
        <p className="text-lg text-muted-foreground">
          Métricas e estatísticas operacionais do sistema Ordax.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de usuários</CardTitle>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalOrders}</div>
                <p className="text-xs text-muted-foreground mt-1">Entregas, compras, pagamentos e orçamentos</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de modelos</CardTitle>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas ativas</CardTitle>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  R$ {(stats?.totalRevenue || 0).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Acumulado</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completude média</CardTitle>
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

      {collectionsStats ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Estatísticas de coleções</CardTitle>
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
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuários recentes
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
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border">
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Pedidos recentes
            </CardTitle>
            <CardDescription>Últimos 5 registros operacionais</CardDescription>
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
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border">
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

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top colecionadores
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
                {topCollectors.map((collector, index: number) => (
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
                          Nível {collector.collector_level || 1} • {collector.pieces_owned || 0} peças
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
