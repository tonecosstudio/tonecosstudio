/**
 * Planos Arcade — estética gaming consistente com a página de coleções.
 */

import { useNavigate } from "react-router-dom";
import { Check, Crown, Sparkles, Shield, ArrowRight, Coins } from "lucide-react";
import { useContentVariable } from "@/hooks/useContentSettings";
import { Page } from "@/components/layouts/Page";
import {
  ArcadeHero,
  ArcadeSectionTitle,
  ArcadeCard,
  ArcadeCTA,
} from "@/components/arcade/ArcadeLayout";
import { useState } from "react";
import { useActiveSubscriptionPlans } from "@/hooks/subscription/useActiveSubscriptionPlans";
import { PUBLIC_ROUTES } from "@/config/routes";
import { usePricingSettings } from "@/hooks/usePricingSettings";

export default function PlansArcade() {
  const navigate = useNavigate();
  const faqFirstDelivery = useContentVariable("faqFirstDelivery", "Carregando...");
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  const plansQuery = useActiveSubscriptionPlans();
  const pricingQuery = usePricingSettings();

  if (plansQuery.isLoading || pricingQuery.isLoading) {
    return (
      <Page title="Carregando planos" description="Carregando preços e planos oficiais">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-20">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="aspect-[3/4] bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,12%)] animate-pulse"
              />
            ))}
          </div>
        </div>
      </Page>
    );
  }

  if (plansQuery.isError || pricingQuery.isError || !pricingQuery.data) {
    return (
      <Page
        title="Planos indisponíveis"
        description="Não foi possível validar os preços oficiais neste momento"
      >
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-24 text-center space-y-5">
          <h1 className="text-3xl font-black tracking-wide">Preços temporariamente indisponíveis</h1>
          <p className="text-muted-foreground">
            Não exibimos valores estimados quando a configuração comercial não pode ser validada.
          </p>
          <button
            type="button"
            onClick={() => {
              void plansQuery.refetch();
              void pricingQuery.refetch();
            }}
            className="px-5 py-3 border border-[hsl(var(--gold-accent)/0.5)] text-[hsl(var(--gold-accent))] font-mono text-xs tracking-[0.15em] uppercase"
          >
            Tentar novamente
          </button>
        </div>
      </Page>
    );
  }

  const plans = plansQuery.data ?? [];
  const standalonePrice = pricingQuery.data.defaultPriceFull;

  const getPlanMeta = (planType: string) => {
    switch (planType) {
      case "trimestral":
        return {
          icon: Sparkles,
          rarity: "ÉPICO",
          color: "hsl(var(--gold-accent))",
          badge: "Mais escolhido",
        };
      case "semestral":
        return {
          icon: Crown,
          rarity: "LENDÁRIO",
          color: "hsl(280,80%,65%)",
          badge: "Melhor valor",
        };
      default:
        return {
          icon: Shield,
          rarity: "RARO",
          color: "hsl(200,70%,60%)",
          badge: null,
        };
    }
  };

  const faqs = [
    {
      q: "Como funciona nesta fase?",
      a: "Nesta fase, o lancamento fica focado no universo publicado. Voce pode explorar os modelos disponiveis e acompanhar futuras liberacoes.",
    },
    {
      q: "Os planos ja estao ativos?",
      a: "Os planos seguem apresentados como referencia comercial, mas o acesso principal agora e pelo universo publicado.",
    },
    { q: "Quando recebo a primeira peca?", a: faqFirstDelivery },
    {
      q: "Posso cancelar a qualquer momento?",
      a: "Sim. Quando um plano estiver ativo para sua conta, o cancelamento continua disponivel conforme as regras da compra.",
    },
    {
      q: "Como acompanho novidades?",
      a: "Use o catalogo/universo como entrada principal e acompanhe as proximas liberacoes por la.",
    },
  ];

  return (
    <Page
      title="Planos | ORDAX Command Center"
      description="Consulte os formatos comerciais da ORDAX e explore o universo publicado."
      keywords={["planos", "universo", "catalogo", "ordax"]}
    >
      <ArcadeHero
        badge="Escolha seu Tier"
        title="PLANOS"
        subtitle=">> EXPLORE. ACOMPANHE. EVOLUA."
        stats={[
          { value: plans.length + 1, label: "Opções" },
          { value: "∞", label: "Trocas" },
        ]}
      />

      <section className="max-w-7xl mx-auto px-4 md:px-6 pb-16 relative z-10">
        <ArcadeSectionTitle>Selecione seu Tier</ArcadeSectionTitle>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          <ArcadeCard>
            <div
              className="p-6 flex flex-col h-full"
              onMouseEnter={() => setHoveredPlan("avulso")}
              onMouseLeave={() => setHoveredPlan(null)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 px-2 py-0.5 bg-[hsl(200,70%,50%)/0.1] border border-[hsl(200,70%,50%)/0.3]">
                  <Shield className="w-3 h-3 text-[hsl(200,70%,60%)]" />
                  <span className="font-mono text-[9px] tracking-widest uppercase text-[hsl(200,70%,60%)]">
                    RARO
                  </span>
                </div>
              </div>

              <h3
                className="text-3xl font-black tracking-[0.1em] mb-2"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
              >
                AVULSO
              </h3>
              <p className="text-[hsl(0,0%,40%)] font-mono text-[10px] tracking-wider mb-6">
                Compra única sem compromisso
              </p>

              <div className="text-center mb-6 py-4 border-y border-[hsl(0,0%,12%)]">
                <span
                  className="text-4xl font-black text-[hsl(0,0%,98%)]"
                  style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
                >
                  R${" "}
                  {standalonePrice.toLocaleString("pt-BR", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </span>
                <p className="font-mono text-[10px] text-[hsl(0,0%,40%)] tracking-wider mt-1">
                  por personagem
                </p>
              </div>

              <ul className="space-y-3 mb-6 flex-1">
                {["1 peça", "Pintada à mão", "Produção limitada", "Certificado", "Embalagem premium"].map(
                  (f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 font-mono text-xs text-[hsl(0,0%,60%)]"
                    >
                      <Check className="w-3.5 h-3.5 text-[hsl(200,70%,60%)] shrink-0" />
                      {f}
                    </li>
                  ),
                )}
              </ul>

              <button
                onClick={() => navigate(PUBLIC_ROUTES.catalog)}
                className="w-full py-3 border border-[hsl(0,0%,20%)] text-[hsl(0,0%,60%)] hover:border-[hsl(var(--gold-accent)/0.5)] hover:text-[hsl(var(--gold-accent))] font-mono text-xs tracking-[0.15em] uppercase transition-all flex items-center justify-center gap-2"
              >
                Ver Universo <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="h-[3px] relative overflow-hidden">
              <div className="absolute inset-0 bg-[hsl(0,0%,10%)]" />
              <div
                className="absolute inset-y-0 left-0 bg-[hsl(200,70%,60%)] transition-all duration-700 ease-out"
                style={{ width: hoveredPlan === "avulso" ? "100%" : "0%" }}
              />
            </div>
          </ArcadeCard>

          {plans.map((plan) => {
            const meta = getPlanMeta(plan.plan_type);
            const Icon = meta.icon;
            const priceFull = plan.price_full;
            const deliveries = plan.deliveries_total;
            const totalCredits = plan.total_credits ?? 0;
            const perUnit = (priceFull / deliveries).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            const isHovered = hoveredPlan === plan.id;
            const isSemestral = plan.plan_type === "semestral";

            return (
              <ArcadeCard key={plan.id}>
                <div
                  className="p-6 flex flex-col h-full relative"
                  onMouseEnter={() => setHoveredPlan(plan.id)}
                  onMouseLeave={() => setHoveredPlan(null)}
                >
                  {meta.badge && (
                    <div className="absolute -top-px left-1/2 -translate-x-1/2 px-4 py-1 bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,5%)] font-mono text-[9px] tracking-[0.2em] uppercase font-bold z-20">
                      {meta.badge}
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4 mt-2">
                    <div
                      className="flex items-center gap-2 px-2 py-0.5"
                      style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}40` }}
                    >
                      <Icon className="w-3 h-3" style={{ color: meta.color }} />
                      <span
                        className="font-mono text-[9px] tracking-widest uppercase"
                        style={{ color: meta.color }}
                      >
                        {meta.rarity}
                      </span>
                    </div>
                  </div>

                  <h3
                    className="text-3xl font-black tracking-[0.1em] mb-2"
                    style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
                  >
                    {plan.name.toUpperCase()}
                  </h3>
                  <p className="text-[hsl(0,0%,40%)] font-mono text-[10px] tracking-wider mb-6">
                    {plan.description}
                  </p>

                  <div className="text-center mb-6 py-4 border-y border-[hsl(0,0%,12%)]">
                    <span
                      className="text-4xl font-black"
                      style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: meta.color }}
                    >
                      R$ {perUnit}
                    </span>
                    <p className="font-mono text-[10px] text-[hsl(0,0%,40%)] tracking-wider mt-1">
                      por personagem • Total: R$ {priceFull.toLocaleString("pt-BR")}
                    </p>
                  </div>

                  {totalCredits > 0 && (
                    <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded border border-[hsl(var(--gold-accent)/0.3)] bg-[hsl(var(--gold-accent)/0.05)]">
                      <Coins className="w-4 h-4 text-[hsl(var(--gold-accent))]" />
                      <span className="font-mono text-xs tracking-wider text-[hsl(var(--gold-accent))]">
                        {totalCredits.toLocaleString("pt-BR")} coins inclusos
                      </span>
                    </div>
                  )}

                  <ul className="space-y-3 mb-6 flex-1">
                    {[
                      `${deliveries} peça${deliveries > 1 ? "s" : ""}${isSemestral ? " (6 + 1 bônus)" : ""}`,
                      totalCredits > 0
                        ? `${totalCredits.toLocaleString("pt-BR")} coins para o catálogo`
                        : "",
                      "Pintadas à mão",
                      "Produção limitada",
                      "Certificado",
                      "Embalagem premium",
                    ]
                      .filter(Boolean)
                      .map((f) => (
                        <li
                          key={f}
                          className="flex items-center gap-2 font-mono text-xs text-[hsl(0,0%,60%)]"
                        >
                          <Check className="w-3.5 h-3.5 shrink-0" style={{ color: meta.color }} />
                          {f}
                        </li>
                      ))}
                  </ul>

                  <button
                    onClick={() => navigate(PUBLIC_ROUTES.catalog)}
                    className="w-full py-3 font-mono text-xs tracking-[0.15em] uppercase transition-all flex items-center justify-center gap-2"
                    style={{
                      background: `${meta.color}`,
                      color: "hsl(0,0%,5%)",
                    }}
                  >
                    Explorar Universo <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {isSemestral && (
                    <p className="text-center font-mono text-[9px] text-[hsl(280,80%,65%)] tracking-wider mt-3">
                      ★ Inclui peça exclusiva para membros
                    </p>
                  )}
                </div>
                <div className="h-[3px] relative overflow-hidden">
                  <div className="absolute inset-0 bg-[hsl(0,0%,10%)]" />
                  <div
                    className="absolute inset-y-0 left-0 transition-all duration-700 ease-out"
                    style={{ width: isHovered ? "100%" : "0%", background: meta.color }}
                  />
                </div>
              </ArcadeCard>
            );
          })}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 md:px-6 pb-16 relative z-10">
        <ArcadeSectionTitle>Briefing FAQ</ArcadeSectionTitle>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <FAQItem key={i} question={faq.q} answer={faq.a} index={i} />
          ))}
        </div>
      </section>

      <ArcadeCTA
        badge="Pronto para a Missão?"
        title="COMECE AGORA"
        description="Explore o universo publicado e inicie sua jornada de colecionador."
        primaryAction={{
          label: "VER UNIVERSO",
          href: PUBLIC_ROUTES.catalog,
          icon: <ArrowRight className="w-4 h-4" />,
        }}
      />
    </Page>
  );
}

function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <ArcadeCard hover={false}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-4 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-[hsl(var(--gold-accent))] tracking-widest">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="font-mono text-xs text-[hsl(0,0%,80%)] tracking-wider">
            {question}
          </span>
        </div>
        <span
          className={`text-[hsl(var(--gold-accent))] transition-transform duration-300 ${open ? "rotate-45" : ""}`}
        >
          +
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 pl-12 animate-fade-in">
          <p className="font-mono text-[11px] text-[hsl(0,0%,45%)] leading-relaxed tracking-wide">
            {answer}
          </p>
        </div>
      )}
    </ArcadeCard>
  );
}
