/**
 * Planos Arcade — estética gaming consistente com a página de coleções.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Check, Zap, Crown, Sparkles, Shield, ArrowRight } from "lucide-react";
import { useContentSettings } from "@/hooks/useContentSettings";
import { processContentVariables } from "@/lib/services/contentService";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import {
  ArcadePage,
  ArcadeHero,
  ArcadeSectionTitle,
  ArcadeCard,
  ArcadeCTA,
  FloatingParticles,
  GlitchText,
} from "@/components/arcade/ArcadeLayout";
import { useState } from "react";

export default function PlansArcade() {
  const navigate = useNavigate();
  const { data: content } = useContentSettings();
  const { data: settings } = useSystemSettings();
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  const plansQuery = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*, pricing_tiers(*)")
        .eq("is_active", true)
        .order("slug");
      if (error) throw error;
      return data;
    },
  });

  const plans = plansQuery.data || [];

  const getPlanMeta = (planType: string) => {
    switch (planType) {
      case "trimestral":
        return { icon: Sparkles, rarity: "ÉPICO", color: "hsl(var(--gold-accent))", badge: "Mais escolhido" };
      case "semestral":
        return { icon: Crown, rarity: "LENDÁRIO", color: "hsl(280,80%,65%)", badge: "Melhor valor" };
      default:
        return { icon: Shield, rarity: "RARO", color: "hsl(200,70%,60%)", badge: null };
    }
  };

  const faqs = [
    { q: "Como funciona a assinatura?", a: "Escolha um plano e selecione as coleções. Todo mês, receba uma peça surpresa." },
    { q: "Posso trocar de coleção?", a: "Sim! Troque quantas vezes quiser antes da produção do próximo lote." },
    { q: "Quando recebo a primeira peça?", a: content ? processContentVariables(content.faqFirstDelivery, content) : "Carregando..." },
    { q: "Posso cancelar a qualquer momento?", a: "Sim, cancele quando quiser. Peças já pagas serão entregues normalmente." },
    { q: "O que é revelação surpresa?", a: "Você escolhe a coleção e o personagem é revelado no envio — cada peça é única." },
  ];

  return (
    <ArcadePage
      title="Planos | ORDAX Command Center"
      description="Escolha seu plano de assinatura e colecione peças premium todo mês."
      keywords={["planos", "assinatura", "colecionáveis", "mensal"]}
    >
      <ArcadeHero
        badge="Escolha seu Tier"
        title="PLANOS"
        subtitle=">> ASSINE. COLECIONE. DOMINE."
        stats={[
          { value: plans.length + 1, label: "Opções" },
          { value: "∞", label: "Trocas" },
        ]}
      />

      {/* ═══ PLANS GRID ═══ */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pb-16 relative z-10">
        <ArcadeSectionTitle>Selecione seu Tier</ArcadeSectionTitle>

        {plansQuery.isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[3/4] bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,12%)] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Avulso card */}
            <ArcadeCard>
              <div
                className="p-6 flex flex-col h-full"
                onMouseEnter={() => setHoveredPlan("avulso")}
                onMouseLeave={() => setHoveredPlan(null)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 px-2 py-0.5 bg-[hsl(200,70%,50%)/0.1] border border-[hsl(200,70%,50%)/0.3]">
                    <Shield className="w-3 h-3 text-[hsl(200,70%,60%)]" />
                    <span className="font-mono text-[9px] tracking-widest uppercase text-[hsl(200,70%,60%)]">RARO</span>
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
                  <span className="text-4xl font-black text-[hsl(0,0%,98%)]" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                    R$ 500
                  </span>
                  <p className="font-mono text-[10px] text-[hsl(0,0%,40%)] tracking-wider mt-1">por personagem</p>
                </div>

                <ul className="space-y-3 mb-6 flex-1">
                  {["1 peça", "Pintada à mão", "Produção limitada", "Certificado", "Embalagem premium"].map((f) => (
                    <li key={f} className="flex items-center gap-2 font-mono text-xs text-[hsl(0,0%,60%)]">
                      <Check className="w-3.5 h-3.5 text-[hsl(200,70%,60%)] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => navigate("/colecoes")}
                  className="w-full py-3 border border-[hsl(0,0%,20%)] text-[hsl(0,0%,60%)] hover:border-[hsl(var(--gold-accent)/0.5)] hover:text-[hsl(var(--gold-accent))] font-mono text-xs tracking-[0.15em] uppercase transition-all flex items-center justify-center gap-2"
                >
                  Ver Coleções <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Power bar */}
              <div className="h-[3px] relative overflow-hidden">
                <div className="absolute inset-0 bg-[hsl(0,0%,10%)]" />
                <div className="absolute inset-y-0 left-0 bg-[hsl(200,70%,60%)] transition-all duration-700 ease-out" style={{ width: hoveredPlan === "avulso" ? "100%" : "0%" }} />
              </div>
            </ArcadeCard>

            {/* Dynamic plans */}
            {plans.map((plan) => {
              const meta = getPlanMeta(plan.plan_type);
              const Icon = meta.icon;
              const priceFull = plan.price_full || settings?.default_price_full || 500;
              const perUnit = (priceFull / plan.deliveries_total).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              const isHovered = hoveredPlan === plan.id;

              return (
                <ArcadeCard key={plan.id}>
                  <div
                    className="p-6 flex flex-col h-full relative"
                    onMouseEnter={() => setHoveredPlan(plan.id)}
                    onMouseLeave={() => setHoveredPlan(null)}
                  >
                    {/* Badge */}
                    {meta.badge && (
                      <div className="absolute -top-px left-1/2 -translate-x-1/2 px-4 py-1 bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,5%)] font-mono text-[9px] tracking-[0.2em] uppercase font-bold z-20">
                        {meta.badge}
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-4 mt-2">
                      <div className="flex items-center gap-2 px-2 py-0.5" style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}40` }}>
                        <Icon className="w-3 h-3" style={{ color: meta.color }} />
                        <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: meta.color }}>
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
                      <span className="text-4xl font-black" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: meta.color }}>
                        R$ {perUnit}
                      </span>
                      <p className="font-mono text-[10px] text-[hsl(0,0%,40%)] tracking-wider mt-1">
                        por personagem • Total: R$ {priceFull.toLocaleString("pt-BR")}
                      </p>
                    </div>

                    <ul className="space-y-3 mb-6 flex-1">
                      {[
                        `${plan.deliveries_total} peça${plan.deliveries_total > 1 ? "s" : ""}${plan.plan_type === "semestral" ? " (6 + 1 bônus)" : ""}`,
                        "Pintadas à mão",
                        "Produção limitada",
                        "Certificado",
                        "Embalagem premium",
                      ].map((f) => (
                        <li key={f} className="flex items-center gap-2 font-mono text-xs text-[hsl(0,0%,60%)]">
                          <Check className="w-3.5 h-3.5 shrink-0" style={{ color: meta.color }} />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => navigate("/colecoes")}
                      className="w-full py-3 font-mono text-xs tracking-[0.15em] uppercase transition-all flex items-center justify-center gap-2"
                      style={{
                        background: `${meta.color}`,
                        color: "hsl(0,0%,5%)",
                      }}
                    >
                      Escolher Coleções <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    {plan.plan_type === "semestral" && (
                      <p className="text-center font-mono text-[9px] text-[hsl(280,80%,65%)] tracking-wider mt-3">
                        ★ Inclui peça exclusiva para membros
                      </p>
                    )}
                  </div>
                  {/* Power bar */}
                  <div className="h-[3px] relative overflow-hidden">
                    <div className="absolute inset-0 bg-[hsl(0,0%,10%)]" />
                    <div className="absolute inset-y-0 left-0 transition-all duration-700 ease-out" style={{ width: isHovered ? "100%" : "0%", background: meta.color }} />
                  </div>
                </ArcadeCard>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══ FAQ ═══ */}
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
        description="Escolha suas coleções favoritas e inicie sua jornada de colecionador."
        primaryAction={{ label: "VER COLEÇÕES", href: "/colecoes", icon: <ArrowRight className="w-4 h-4" /> }}
      />
    </ArcadePage>
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
          <span className="font-mono text-xs text-[hsl(0,0%,80%)] tracking-wider">{question}</span>
        </div>
        <span className={`text-[hsl(var(--gold-accent))] transition-transform duration-300 ${open ? "rotate-45" : ""}`}>
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
