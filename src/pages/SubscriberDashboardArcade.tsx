import { Page } from "@/components/layouts/Page";
import { ArcadeHero, ArcadeCard, ArcadeSectionTitle, GlitchText } from "@/components/arcade/ArcadeLayout";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Package, Clock, Truck, CheckCircle2, AlertCircle, Eye,
  Calendar, ExternalLink, RefreshCw, Gift, Pause, XCircle
} from "lucide-react";
import { CutoffCountdown, useIsBeforeCutoff } from "@/components/CutoffCountdown";
import { CharacterChoiceStatus } from "@/components/customer/CharacterChoiceStatus";

export default function SubscriberDashboardArcade() {
  const { user } = useAuth();
  const isBeforeCutoff = useIsBeforeCutoff();

  const subscriptionsQuery = useQuery({
    queryKey: ["my-subscriptions", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, collections (id, name, slug, description)")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const deliveriesQuery = useQuery({
    queryKey: ["my-deliveries", user?.id],
    enabled: Boolean(user?.id) && (subscriptionsQuery.data?.length ?? 0) > 0,
    queryFn: async () => {
      const ids = subscriptionsQuery.data?.map((s: any) => s.id) || [];
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from("subscription_deliveries")
        .select("*, collection_characters (name, description), collections (id, name)")
        .in("subscription_id", ids)
        .order("delivery_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const sub = subscriptionsQuery.data?.[0];
  const deliveries = deliveriesQuery.data || [];
  const completed = deliveries.filter((d: any) => d.status === "delivered");
  const upcoming = deliveries.filter((d: any) => d.status !== "delivered");
  const next = upcoming[0];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "scheduled": case "pending_choice": return { icon: Clock, color: "text-blue-400", label: "AGENDADA" };
      case "confirmed": return { icon: CheckCircle2, color: "text-green-400", label: "CONFIRMADA" };
      case "in_production": return { icon: Package, color: "text-orange-400", label: "EM PRODUÇÃO" };
      case "shipped": return { icon: Truck, color: "text-purple-400", label: "ENVIADA" };
      case "delivered": return { icon: CheckCircle2, color: "text-green-400", label: "ENTREGUE" };
      default: return { icon: AlertCircle, color: "text-[hsl(0,0%,40%)]", label: status.toUpperCase() };
    }
  };

  const progress = sub ? Math.round((sub.deliveries_completed / (sub.deliveries_total || 1)) * 100) : 0;

  return (
    <Page title="Painel do Assinante | ORDAX" description="Gerencie sua assinatura e acompanhe entregas">
      <ArcadeHero
        badge="SUBSCRIBER PANEL"
        title="MEU PAINEL"
        subtitle="GERENCIE SUA ASSINATURA E ENTREGAS"
        stats={sub ? [
          { value: `${sub.deliveries_completed}/${sub.deliveries_total}`, label: "Entregas" },
          { value: `${progress}%`, label: "Progresso" },
          { value: `R$ ${(sub.total_paid || 0).toFixed(0)}`, label: "Total Pago" },
        ] : []}
      />

      <section className="max-w-6xl mx-auto px-6 pb-16">
        {!sub ? (
          <ArcadeCard className="p-12 text-center">
            <Package className="w-16 h-16 text-[hsl(0,0%,20%)] mx-auto mb-4" />
            <h3 className="text-xl font-bold tracking-wider mb-2" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
              NENHUMA ASSINATURA ATIVA
            </h3>
            <p className="font-mono text-xs text-[hsl(0,0%,45%)] tracking-wider mb-6">
              Assine uma coleção e receba personagens exclusivos todo mês
            </p>
            <Link
              to="/colecoes"
              className="inline-flex items-center gap-2 bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,7%)] font-mono uppercase tracking-[0.15em] text-xs h-10 px-8 hover:brightness-110 transition-all"
            >
              EXPLORAR COLEÇÕES
            </Link>
          </ArcadeCard>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Active Sub */}
              <ArcadeCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold tracking-wider" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                    ASSINATURA ATIVA
                  </h2>
                  <span className="font-mono text-[9px] px-3 py-1 bg-green-500/20 text-green-400 tracking-[0.2em] uppercase border border-green-500/30">
                    ATIVA
                  </span>
                </div>
                <p className="font-mono text-sm text-[hsl(var(--gold-accent))] mb-1">{sub.collections?.name}</p>
                <p className="font-mono text-[10px] text-[hsl(0,0%,45%)] tracking-wider mb-4">
                  Plano {sub.plan_type} • {sub.deliveries_completed}/{sub.deliveries_total} entregas
                </p>
                {/* Progress bar */}
                <div className="h-2 bg-[hsl(0,0%,12%)] mb-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[hsl(var(--gold-accent))] to-[hsl(var(--gold-accent)/0.6)] transition-all duration-1000" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between font-mono text-[9px] text-[hsl(0,0%,40%)] tracking-widest">
                  <span>PROGRESSO</span>
                  <span>{progress}%</span>
                </div>
              </ArcadeCard>

              {/* Next Delivery */}
              {next && (
                <ArcadeCard className="p-6 border-[hsl(var(--gold-accent)/0.3)]">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold tracking-wider" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                      PRÓXIMA ENTREGA
                    </h2>
                    {(() => {
                      const s = getStatusStyle(next.status);
                      return (
                        <span className={`font-mono text-[9px] px-3 py-1 tracking-[0.2em] uppercase border border-current/30 ${s.color}`}>
                          {s.label}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="font-mono text-sm text-[hsl(0,0%,80%)] mb-1">
                    {next.collections?.name || next.collection_characters?.name || "Personagem não revelado"}
                  </p>
                  <p className="font-mono text-[10px] text-[hsl(0,0%,45%)] tracking-wider">
                    Entrega #{next.delivery_number || next.delivery_order}
                  </p>
                  {next.tracking_code && (
                    <div className="mt-3 flex items-center gap-2">
                      <Truck className="w-3 h-3 text-[hsl(var(--gold-accent))]" />
                      <span className="font-mono text-xs text-[hsl(0,0%,60%)]">{next.tracking_code}</span>
                      <a
                        href={`https://www2.correios.com.br/sistemas/rastreamento/resultado.cfm?objeto=${next.tracking_code}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-[hsl(var(--gold-accent))] text-xs flex items-center gap-1 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> Rastrear
                      </a>
                    </div>
                  )}
                  {isBeforeCutoff && (
                    <div className="mt-4 pt-4 border-t border-[hsl(0,0%,12%)]">
                      <CutoffCountdown variant="alert" />
                    </div>
                  )}
                </ArcadeCard>
              )}

              {/* Past Deliveries */}
              {completed.length > 0 && (
                <ArcadeCard hover={false} className="p-6">
                  <ArcadeSectionTitle>ENTREGAS ANTERIORES</ArcadeSectionTitle>
                  <div className="space-y-2">
                    {completed.map((d: any) => {
                      const s = getStatusStyle(d.status);
                      const Icon = s.icon;
                      return (
                        <div key={d.id} className="flex items-center gap-3 p-3 border border-[hsl(0,0%,12%)] hover:border-[hsl(var(--gold-accent)/0.3)] transition-colors">
                          <Icon className={`w-4 h-4 ${s.color}`} />
                          <span className="font-mono text-xs text-[hsl(0,0%,70%)] flex-1">
                            {d.collections?.name || d.collection_characters?.name || "—"}
                          </span>
                          <span className="font-mono text-[10px] text-[hsl(0,0%,40%)]">{s.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </ArcadeCard>
              )}
            </div>

            {/* Sidebar - Quick Actions */}
            <div className="space-y-6">
              <ArcadeCard className="p-6">
                <h3 className="font-mono text-[10px] text-[hsl(var(--gold-accent))] tracking-[0.3em] uppercase mb-4">AÇÕES RÁPIDAS</h3>
                <div className="space-y-2">
                  <Link to="/colecoes" className="block w-full text-left font-mono text-xs text-[hsl(0,0%,60%)] hover:text-[hsl(var(--gold-accent))] py-2 px-3 border border-[hsl(0,0%,12%)] hover:border-[hsl(var(--gold-accent)/0.3)] transition-colors tracking-wider">
                    → EXPLORAR COLEÇÕES
                  </Link>
                  <Link to="/pagamentos" className="block w-full text-left font-mono text-xs text-[hsl(0,0%,60%)] hover:text-[hsl(var(--gold-accent))] py-2 px-3 border border-[hsl(0,0%,12%)] hover:border-[hsl(var(--gold-accent)/0.3)] transition-colors tracking-wider">
                    → MEUS PAGAMENTOS
                  </Link>
                  <Link to="/perfil" className="block w-full text-left font-mono text-xs text-[hsl(0,0%,60%)] hover:text-[hsl(var(--gold-accent))] py-2 px-3 border border-[hsl(0,0%,12%)] hover:border-[hsl(var(--gold-accent)/0.3)] transition-colors tracking-wider">
                    → MINHA CONTA
                  </Link>
                </div>
              </ArcadeCard>

              {sub.plan_type === "semestral" && (
                <ArcadeCard className="p-6 border-purple-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-4 h-4 text-purple-400" />
                    <span className="font-mono text-[10px] text-purple-400 tracking-[0.2em] uppercase">BÔNUS</span>
                  </div>
                  <p className="font-mono text-xs text-[hsl(0,0%,60%)] leading-relaxed">
                    Peça bônus exclusiva na sua 6ª entrega!
                  </p>
                </ArcadeCard>
              )}
            </div>
          </div>
        )}
      </section>
    </Page>
  );
}
