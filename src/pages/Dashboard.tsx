// @ts-nocheck
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Heart, ShoppingCart, Trophy, TrendingUp, Clock, Star, Gift } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { user } = useAuth();

  // Stats do usuário
  const statsQuery = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const [quotesRes, likesRes, wishlistRes, collectorRes] = await Promise.all([
        supabase.from("quotes").select("id, status, created_at").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("model_likes").select("id").eq("user_id", user!.id),
        supabase.from("wishlist").select("id").eq("user_id", user!.id),
        supabase.from("profiles").select("collector_level, collector_xp, pieces_owned, total_spent").eq("id", user!.id).single(),
      ]);

      return {
        quotes: quotesRes.data || [],
        totalQuotes: quotesRes.data?.length || 0,
        totalLikes: likesRes.data?.length || 0,
        totalWishlist: wishlistRes.data?.length || 0,
        collector: collectorRes.data || null,
      };
    },
  });

  // Notificações não lidas
  const notificationsQuery = useQuery({
    queryKey: ["dashboard-notifications", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  // Modelos mais curtidos (recomendações)
  const recommendationsQuery = useQuery({
    queryKey: ["dashboard-recommendations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("models")
        .select("id, name, image_path, image_bucket, franchise")
        .limit(4);
      return data || [];
    },
  });

  const stats = statsQuery.data;
  const notifications = notificationsQuery.data || [];
  const recommendations = recommendationsQuery.data || [];

  if (statsQuery.isLoading) {
    return (
      <div className="container py-8">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Dashboard"
        description="Visão geral da sua conta Ordax"
        noindex={true}
      />

      <div className="container py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Bem-vindo de volta! Aqui está um resumo da sua conta.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalQuotes || 0}</div>
              <p className="text-xs text-muted-foreground">
                Total de orçamentos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Favoritos</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalLikes || 0}</div>
              <p className="text-xs text-muted-foreground">
                Modelos curtidos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wishlist</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalWishlist || 0}</div>
              <p className="text-xs text-muted-foreground">
                Na lista de desejos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nível</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.collector?.collector_level || 1}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.collector?.collector_xp || 0} XP
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Pedidos Recentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pedidos Recentes
              </CardTitle>
              <CardDescription>
                Seus últimos orçamentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.quotes && stats.quotes.length > 0 ? (
                <div className="space-y-3">
                  {stats.quotes.map((quote: any) => (
                    <div
                      key={quote.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          Pedido #{quote.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(quote.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <Badge variant="secondary">{quote.status}</Badge>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/profile?section=orders">Ver Todos</Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum pedido ainda</p>
                  <Button variant="link" asChild className="mt-2">
                    <Link to="/catalog">Explorar Catálogo</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notificações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Notificações
                {notifications.length > 0 && (
                  <Badge variant="destructive" className="ml-auto">
                    {notifications.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Atualizações importantes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.slice(0, 5).map((notif: any) => (
                    <div
                      key={notif.id}
                      className="p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <p className="font-medium text-sm">{notif.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notif.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(notif.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma notificação</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progresso do Colecionador */}
          {stats?.collector && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Progresso
                </CardTitle>
                <CardDescription>
                  Sua jornada como colecionador
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Nível {stats.collector.collector_level}</span>
                      <span className="text-sm text-muted-foreground">
                        {stats.collector.collector_xp} XP
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${Math.min((stats.collector.collector_xp % 100), 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {stats.collector.pieces_owned}
                      </div>
                      <div className="text-xs text-muted-foreground">Peças</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        R$ {(stats.collector.total_spent || 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">Investido</div>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/profile?section=collector">Ver Perfil</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recomendações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Recomendados
              </CardTitle>
              <CardDescription>
                Modelos que você pode gostar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recommendations.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {recommendations.map((model: any) => {
                    const imageUrl = `${supabase.supabaseUrl}/storage/v1/object/public/${model.image_bucket}/${model.image_path}`;
                    return (
                      <Link
                        key={model.id}
                        to={`/catalog/${model.id}`}
                        className="group"
                      >
                        <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                          <img
                            src={imageUrl}
                            alt={model.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                          {model.name}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Explore o catálogo</p>
                </div>
              )}
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link to="/catalog">Ver Catálogo</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
