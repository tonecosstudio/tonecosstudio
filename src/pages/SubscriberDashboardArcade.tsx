import { Link } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Gift,
  Package,
  Truck,
} from "lucide-react";
import { ArcadeCard, ArcadeHero, ArcadeSectionTitle } from "@/components/arcade/ArcadeLayout";
import { CutoffCountdown, useIsBeforeCutoff } from "@/components/CutoffCountdown";
import { Page } from "@/components/layouts/Page";
import { AUTH_ROUTES, PUBLIC_ROUTES } from "@/config/routes";
import { useSubscriberDashboardData, type SubscriberDelivery } from "@/hooks/subscription/useSubscriberDashboardData";
import { useAuth } from "@/lib/auth";
import { buildTrackingUrl } from "@/lib/tracking-links";

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function getStatusStyle(status: string) {
  switch (status) {
    case "scheduled":
    case "pending_choice":
      return { icon: Clock, color: "text-sky-400", label: "Agendada" };
    case "confirmed":
      return { icon: CheckCircle2, color: "text-emerald-400", label: "Confirmada" };
    case "in_production":
      return { icon: Package, color: "text-amber-300", label: "Em producao" };
    case "shipped":
      return { icon: Truck, color: "text-violet-400", label: "Enviada" };
    case "delivered":
      return { icon: CheckCircle2, color: "text-emerald-400", label: "Entregue" };
    default:
      return { icon: AlertCircle, color: "text-[hsl(0,0%,40%)]", label: status };
  }
}

export default function SubscriberDashboardArcade() {
  const { user } = useAuth();
  const isBeforeCutoff = useIsBeforeCutoff();
  const { subscription: sub, completed, nextDelivery: next, progress } = useSubscriberDashboardData(user?.id);
  const nextTrackingUrl = buildTrackingUrl(next?.tracking_code, next?.shipping_carrier);

  return (
    <Page title="Painel do Assinante | ORDAX" description="Acompanhe entregas, progresso e pagamentos da assinatura.">
      <ArcadeHero
        badge="SUBSCRIBER PANEL"
        title="MEU PAINEL"
        subtitle="ACOMPANHE ASSINATURA, ENTREGAS E STATUS OPERACIONAL"
        stats={
          sub
            ? [
                { value: `${sub.deliveries_completed}/${sub.deliveries_total}`, label: "Entregas" },
                { value: `${progress}%`, label: "Progresso" },
                { value: formatCurrency(sub.total_paid), label: "Total pago" },
              ]
            : []
        }
      />

      <section className="mx-auto max-w-6xl px-6 pb-16">
        {!sub ? (
          <ArcadeCard className="p-12 text-center">
            <Package className="mx-auto mb-4 h-16 w-16 text-[hsl(0,0%,20%)]" />
            <h3
              className="mb-2 text-xl font-bold tracking-wider"
              style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
            >
              NENHUMA ASSINATURA ATIVA
            </h3>
            <p className="mb-6 font-mono text-xs tracking-wider text-[hsl(0,0%,45%)]">
              Explore o universo publicado e acompanhe os modelos disponiveis.
            </p>
            <Link
              to={PUBLIC_ROUTES.catalog}
              className="inline-flex h-10 items-center gap-2 bg-[hsl(var(--gold-accent))] px-8 font-mono text-xs uppercase tracking-[0.15em] text-[hsl(0,0%,7%)] transition-all hover:brightness-110"
            >
              EXPLORAR UNIVERSO
            </Link>
          </ArcadeCard>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <ArcadeCard className="p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2
                    className="text-lg font-bold tracking-wider"
                    style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
                  >
                    ASSINATURA ATIVA
                  </h2>
                  <span className="border border-emerald-500/30 bg-emerald-500/20 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-300">
                    ATIVA
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-1 font-mono text-sm text-[hsl(var(--gold-accent))]">
                      {sub.collections?.name || "Colecao vinculada"}
                    </p>
                    <p className="font-mono text-[10px] tracking-wider text-[hsl(0,0%,45%)]">
                      Plano {sub.plan_type} • {sub.deliveries_completed}/{sub.deliveries_total} entregas
                    </p>
                  </div>
                  <div className="rounded-sm border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)] p-4">
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[hsl(var(--gold-accent)/0.72)]">
                      Total registrado
                    </p>
                    <p className="mt-2 text-2xl font-black uppercase tracking-[0.08em]">
                      {formatCurrency(sub.total_paid)}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between font-mono text-[9px] tracking-widest text-[hsl(0,0%,40%)]">
                    <span>PROGRESSO</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden bg-[hsl(0,0%,12%)]">
                    <div
                      className="h-full bg-gradient-to-r from-[hsl(var(--gold-accent))] to-[hsl(var(--gold-accent)/0.6)] transition-all duration-1000"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </ArcadeCard>

              {next ? (
                <ArcadeCard className="border-[hsl(var(--gold-accent)/0.3)] p-6">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2
                      className="text-lg font-bold tracking-wider"
                      style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
                    >
                      PROXIMA ENTREGA
                    </h2>
                    {(() => {
                      const status = getStatusStyle(next.status);
                      return (
                        <span
                          className={`border border-current/30 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.2em] ${status.color}`}
                        >
                          {status.label}
                        </span>
                      );
                    })()}
                  </div>

                  <p className="mb-1 font-mono text-sm text-[hsl(0,0%,80%)]">
                    {next.collections?.name || next.collection_characters?.name || "Personagem ainda nao revelado"}
                  </p>
                  <p className="font-mono text-[10px] tracking-wider text-[hsl(0,0%,45%)]">
                    Entrega #{next.delivery_number || next.delivery_order}
                  </p>

                  {next.tracking_code ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Truck className="h-3 w-3 text-[hsl(var(--gold-accent))]" />
                      <span className="font-mono text-xs text-[hsl(0,0%,60%)]">{next.tracking_code}</span>
                      {nextTrackingUrl ? (
                        <a
                          href={nextTrackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-[hsl(var(--gold-accent))] hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Rastrear
                        </a>
                      ) : null}
                    </div>
                  ) : null}

                  {isBeforeCutoff ? (
                    <div className="mt-4 border-t border-[hsl(0,0%,12%)] pt-4">
                      <CutoffCountdown variant="alert" />
                    </div>
                  ) : null}
                </ArcadeCard>
              ) : null}

              {completed.length > 0 ? (
                <ArcadeCard hover={false} className="p-6">
                  <ArcadeSectionTitle>ENTREGAS ANTERIORES</ArcadeSectionTitle>
                  <div className="space-y-2">
                    {completed.map((delivery: SubscriberDelivery) => {
                      const status = getStatusStyle(delivery.status);
                      const Icon = status.icon;
                      return (
                        <div
                          key={delivery.id}
                          className="flex items-center gap-3 border border-[hsl(0,0%,12%)] p-3 transition-colors hover:border-[hsl(var(--gold-accent)/0.3)]"
                        >
                          <Icon className={`h-4 w-4 ${status.color}`} />
                          <span className="flex-1 font-mono text-xs text-[hsl(0,0%,70%)]">
                            {delivery.collections?.name || delivery.collection_characters?.name || "Sem personagem vinculado"}
                          </span>
                          <span className="font-mono text-[10px] text-[hsl(0,0%,40%)]">{status.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </ArcadeCard>
              ) : null}
            </div>

            <div className="space-y-6">
              <ArcadeCard className="p-6">
                <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--gold-accent))]">
                  ACOES RAPIDAS
                </h3>
                <div className="space-y-2">
                  <Link
                    to={PUBLIC_ROUTES.catalog}
                    className="block w-full border border-[hsl(0,0%,12%)] px-3 py-2 text-left font-mono text-xs tracking-wider text-[hsl(0,0%,60%)] transition-colors hover:border-[hsl(var(--gold-accent)/0.3)] hover:text-[hsl(var(--gold-accent))]"
                  >
                    → EXPLORAR UNIVERSO
                  </Link>
                  <Link
                    to={AUTH_ROUTES.payments}
                    className="block w-full border border-[hsl(0,0%,12%)] px-3 py-2 text-left font-mono text-xs tracking-wider text-[hsl(0,0%,60%)] transition-colors hover:border-[hsl(var(--gold-accent)/0.3)] hover:text-[hsl(var(--gold-accent))]"
                  >
                    → MEUS PAGAMENTOS
                  </Link>
                  <Link
                    to={AUTH_ROUTES.profile}
                    className="block w-full border border-[hsl(0,0%,12%)] px-3 py-2 text-left font-mono text-xs tracking-wider text-[hsl(0,0%,60%)] transition-colors hover:border-[hsl(var(--gold-accent)/0.3)] hover:text-[hsl(var(--gold-accent))]"
                  >
                    → MINHA CONTA
                  </Link>
                </div>
              </ArcadeCard>

              {sub.plan_type === "semestral" ? (
                <ArcadeCard className="border-purple-500/30 p-6">
                  <div className="mb-2 flex items-center gap-2">
                    <Gift className="h-4 w-4 text-purple-400" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-purple-400">
                      BONUS
                    </span>
                  </div>
                  <p className="font-mono text-xs leading-relaxed text-[hsl(0,0%,60%)]">
                    Peca bonus exclusiva prevista para a sexta entrega do plano.
                  </p>
                </ArcadeCard>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </Page>
  );
}
