import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCoinsBalance } from "@/hooks/coins/useCoinsBalance";
import { Link } from "react-router-dom";
import {
  ArcadePage,
  ArcadeHero,
  ArcadeCard,
  ArcadeSectionTitle,
  CoinCounter,
  FloatingParticles,
} from "@/components/arcade/ArcadeLayout";
import {
  Package,
  Heart,
  Star,
  Trophy,
  Clock,
  Gift,
  TrendingUp,
  Crosshair,
  Swords,
} from "lucide-react";

export default function DashboardArcade() {
  const { user } = useAuth();
  const { data: balanceData, isLoading: balanceLoading } = useCoinsBalance();

  const statsQuery = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const [quotesRes, likesRes, wishlistRes, collectorRes] = await Promise.all([
        supabase
          .from("quotes")
          .select("id, status, created_at")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("model_likes").select("id").eq("user_id", user!.id),
        supabase.from("wishlist").select("id").eq("user_id", user!.id),
        supabase
          .from("profiles")
          .select("collector_level, collector_xp, pieces_owned, total_spent")
          .eq("id", user!.id)
          .maybeSingle(),
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

  const stats = statsQuery.data;
  const notifications = notificationsQuery.data || [];
  const collector = stats?.collector;
  const xpPercent = collector ? Math.min((collector.collector_xp % 100), 100) : 0;

  const hudStats = [
    { value: stats?.totalQuotes || 0, label: "Pedidos", icon: <Package className="w-5 h-5" /> },
    { value: stats?.totalLikes || 0, label: "Favoritos", icon: <Heart className="w-5 h-5" /> },
    { value: stats?.totalWishlist || 0, label: "Wishlist", icon: <Star className="w-5 h-5" /> },
    { value: collector?.collector_level || 1, label: "Nível", icon: <Trophy className="w-5 h-5" /> },
  ];

  return (
    <ArcadePage title="Dashboard" description="Painel do colecionador">
      <ArcadeHero
        badge="Painel de Comando"
        title="DASHBOARD"
        subtitle="Status da sua missão"
      />

      <section className="max-w-6xl mx-auto px-6 pb-16">
        {/* HUD Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {hudStats.map((s, i) => (
            <ArcadeCard key={i}>
              <div className="p-5 text-center">
                <div className="flex justify-center mb-3 text-[hsl(var(--gold-accent)/0.5)]">{s.icon}</div>
                <p className="text-3xl font-black text-[hsl(var(--gold-accent))] font-mono tabular-nums mb-1">{s.value}</p>
                <p className="text-[hsl(0,0%,40%)] font-mono text-[9px] tracking-[0.2em] uppercase">{s.label}</p>
              </div>
            </ArcadeCard>
          ))}
        </div>

        {/* XP Bar */}
        {collector && (
          <div className="mb-12">
            <ArcadeCard>
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Swords className="w-5 h-5 text-[hsl(var(--gold-accent))]" />
                    <span className="font-mono text-sm text-[hsl(0,0%,80%)] uppercase tracking-wider">
                      Nível {collector.collector_level}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-[hsl(var(--gold-accent))] tabular-nums">
                    {collector.collector_xp} XP
                  </span>
                </div>
                <div className="w-full h-3 bg-[hsl(0,0%,10%)] border border-[hsl(0,0%,15%)] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[hsl(var(--gold-accent))] to-[hsl(45,100%,60%)] transition-all duration-1000"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
                <div className="flex justify-between mt-3 font-mono text-[10px] text-[hsl(0,0%,35%)]">
                  <span>{collector.pieces_owned} peças coletadas</span>
                  <span>R$ {(collector.total_spent || 0).toFixed(2)} investido</span>
                </div>
              </div>
            </ArcadeCard>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Pedidos Recentes */}
          <div>
            <ArcadeSectionTitle>Missões Recentes</ArcadeSectionTitle>
            <ArcadeCard>
              <div className="p-6">
                {stats?.quotes && stats.quotes.length > 0 ? (
                  <div className="space-y-3">
                    {stats.quotes.map((q: any) => (
                      <div
                        key={q.id}
                        className="flex items-center justify-between p-3 border border-[hsl(0,0%,12%)] hover:border-[hsl(var(--gold-accent)/0.3)] transition-colors"
                      >
                        <div>
                          <p className="font-mono text-xs text-[hsl(0,0%,80%)]">#{q.id.slice(0, 8)}</p>
                          <p className="font-mono text-[10px] text-[hsl(0,0%,35%)]">
                            {new Date(q.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <span className="font-mono text-[9px] px-2 py-1 border border-[hsl(var(--gold-accent)/0.3)] text-[hsl(var(--gold-accent))] uppercase tracking-wider">
                          {q.status}
                        </span>
                      </div>
                    ))}
                    <Link
                      to="/perfil?section=orders"
                      className="block text-center py-2 border border-[hsl(var(--gold-accent)/0.2)] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.05)] font-mono text-[10px] uppercase tracking-wider transition-colors"
                    >
                      Ver Todos →
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Crosshair className="w-10 h-10 mx-auto mb-3 text-[hsl(0,0%,20%)]" />
                    <p className="text-[hsl(0,0%,30%)] font-mono text-[10px] tracking-wider">NENHUMA MISSÃO</p>
                    <Link
                      to="/catalogo"
                      className="inline-block mt-3 text-[hsl(var(--gold-accent))] font-mono text-[9px] underline tracking-wider"
                    >
                      INICIAR PRIMEIRA MISSÃO
                    </Link>
                  </div>
                )}
              </div>
            </ArcadeCard>
          </div>

          {/* Notificações */}
          <div>
            <ArcadeSectionTitle>Transmissões</ArcadeSectionTitle>
            <ArcadeCard>
              <div className="p-6 relative">
                {notifications.length > 0 && (
                  <div className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center bg-[hsl(0,70%,50%)] font-mono text-[9px] text-[hsl(0,0%,98%)] font-bold animate-pulse">
                    {notifications.length}
                  </div>
                )}
                {notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.slice(0, 5).map((n: any) => (
                      <div key={n.id} className="p-3 border border-[hsl(0,0%,12%)] hover:border-[hsl(var(--gold-accent)/0.3)] transition-colors">
                        <p className="font-mono text-xs text-[hsl(0,0%,80%)] mb-1">{n.title}</p>
                        <p className="font-mono text-[10px] text-[hsl(0,0%,40%)] line-clamp-2">{n.message}</p>
                        <p className="font-mono text-[9px] text-[hsl(0,0%,25%)] mt-2">{new Date(n.created_at).toLocaleString("pt-BR")}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Gift className="w-10 h-10 mx-auto mb-3 text-[hsl(0,0%,20%)]" />
                    <p className="text-[hsl(0,0%,30%)] font-mono text-[10px] tracking-wider">SEM TRANSMISSÕES</p>
                  </div>
                )}
              </div>
            </ArcadeCard>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12">
          <ArcadeSectionTitle>Ações Rápidas</ArcadeSectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Catálogo", href: "/catalogo", icon: <Crosshair className="w-5 h-5" /> },
              { label: "Wishlist", href: "/wishlist", icon: <Heart className="w-5 h-5" /> },
              { label: "Coleções", href: "/colecoes", icon: <Star className="w-5 h-5" /> },
              { label: "Perfil", href: "/perfil", icon: <Trophy className="w-5 h-5" /> },
            ].map((link) => (
              <Link key={link.href} to={link.href}>
                <ArcadeCard>
                  <div className="p-5 text-center hover:bg-[hsl(var(--gold-accent)/0.03)] transition-colors">
                    <div className="flex justify-center mb-2 text-[hsl(var(--gold-accent)/0.5)] group-hover:text-[hsl(var(--gold-accent))]">{link.icon}</div>
                    <p className="font-mono text-[10px] text-[hsl(0,0%,50%)] uppercase tracking-wider">{link.label}</p>
                  </div>
                </ArcadeCard>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </ArcadePage>
  );
}
