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
import { useSubscribeCollectionCheckout } from "@/hooks/subscription/useSubscribeCollectionCheckout";
import { PUBLIC_ROUTES, subscribeCollectionPath } from "@/config/routes";

export default function PlansArcade() {
  const navigate = useNavigate();
  const faqFirstDelivery = useContentVariable("faqFirstDelivery", "Carregando...");
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  const {
    plans = [],
    collections = [],
    plansLoading,
    collectionsLoading,
    loadError,
    retryLoad,
  } = useSubscribeCollectionCheckout();
  const [selectedCollections, setSelectedCollections] = useState<Record<string, string>>({});

  if (plansLoading || collectionsLoading) {
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

  if (loadError) {
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
            onClick={retryLoad}
            className="px-5 py-3 border border-[hsl(var(--gold-accent)/0.5)] text-[hsl(var(--gold-accent))] font-mono text-xs tracking-[0.15em] uppercase"
          >
            Tentar novamente
          </button>
        </div>
      </Page>
    );
  }

  const getPlanMeta = (planType: string) => {
    switch (planType) {
      case "trimestral":
        return {
          icon: Sparkles,
          rarity: "ÉPICO",
          color: "hsl(var(--gold-accent))",
        };
      case "semestral":
        return {
          icon: Crown,
          rarity: "LENDÁRIO",
          color: "hsl(280,80%,65%)",
        };
      case "avulso":
        return {
          icon: Shield,
          rarity: "AVULSO",
          color: "hsl(200,70%,60%)",
        };
      default:
        return {
          icon: Shield,
          rarity: "RARO",
          color: "hsl(200,70%,60%)",
        };
    }
  };

  const faqs = [
    {
      q: "Como funciona a assinatura?",
      a: "Escolha uma coleção preparada pela TONART e selecione exatamente as peças do plano. O valor compra as peças; o pagamento pode ser à vista ou parcelado conforme o meio de pagamento configurado. Não há cobrança mensal recorrente.",
    },
    {
      q: "Quais modelos posso escolher?",
      a: "Cada coleção tem uma curadoria própria. Você escolhe exatamente 1, 3 ou 6 modelos entre as identidades publicadas e elegíveis para o plano.",
    },
    { q: "Quando recebo a primeira peca?", a: faqFirstDelivery },
    {
      q: "Quando a assinatura fica ativa?",
      a: "Depois que a equipe confirmar o pagamento enviado. Você pode acompanhar o status pela sua conta.",
    },
    {
      q: "Como recebo Coins?",
      a: "Os planos trimestral e semestral podem conceder Coins apenas no PIX, conforme cada peça é enviada. O pagamento do plano compra as peças e não vira saldo de Coins.",
    },
    {
      q: "Há cobrança mensal?",
      a: "Não. O valor integral do plano é pago uma vez. As entregas acontecem em ciclos mensais e o frete é informado separadamente antes da contratação.",
    },
    {
      q: "Posso escolher qualquer modelo do catálogo?",
      a: "A escolha é feita dentro da curadoria da coleção. Assim, os modelos apresentados no checkout correspondem às opções preparadas para aquela assinatura.",
    },
  ];

  return (
    <Page
      title="Planos de assinatura | TONART Studio"
      description="Escolha uma coleção curada e selecione modelos do catálogo para sua assinatura TONART."
      keywords={["planos", "assinaturas", "coleções", "catálogo", "TONART"]}
    >
      <ArcadeHero
        badge="Escolha seu Tier"
        title="PLANOS"
        subtitle=">> EXPLORE. ACOMPANHE. EVOLUA."
        stats={[
          { value: plans.length, label: "Planos configurados" },
          { value: "1 / 3 / 6 / 12", label: "Peças por plano" },
        ]}
      />

      <section className="max-w-7xl mx-auto px-4 md:px-6 pb-16 relative z-10">
        <ArcadeSectionTitle>Planos e modelos</ArcadeSectionTitle>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const meta = getPlanMeta(plan.plan_type);
            const Icon = meta.icon;
            const priceFull = plan.price_full;
            const deliveries = plan.deliveries_total;
            const bonusTotal = Math.min(
              plan.coin_bonus_per_shipment * deliveries,
              plan.coin_bonus_cap,
            );
            const isHovered = hoveredPlan === plan.id;
            const eligibleCollections = collections.filter(
              (collection) => collection.catalog_model_slugs.length >= plan.model_selection_limit,
            );
            const selectedCollection =
              eligibleCollections.find((collection) => collection.id === selectedCollections[plan.id]) ??
              eligibleCollections[0] ??
              null;

            return (
              <ArcadeCard key={plan.id}>
                <div
                  className="p-6 flex flex-col h-full relative"
                  onMouseEnter={() => setHoveredPlan(plan.id)}
                  onMouseLeave={() => setHoveredPlan(null)}
                >
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
                      {priceFull.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                    <p className="font-mono text-[10px] text-[hsl(0,0%,40%)] tracking-wider mt-1">
                      valor integral, pago uma vez · frete à parte
                    </p>
                  </div>

                  {bonusTotal > 0 && plan.plan_type !== "anual" && (
                    <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded border border-[hsl(var(--gold-accent)/0.3)] bg-[hsl(var(--gold-accent)/0.05)]">
                      <Coins className="w-4 h-4 text-[hsl(var(--gold-accent))]" />
                      <span className="font-mono text-xs tracking-wider text-[hsl(var(--gold-accent))]">
                        Até {bonusTotal.toLocaleString("pt-BR")} Coins · PIX e peça enviada
                      </span>
                    </div>
                  )}

                  <ul className="space-y-3 mb-6 flex-1">
                    {[
                      `Escolha ${plan.model_selection_limit} modelos da coleção`,
                      `${deliveries} peça${deliveries > 1 ? "s" : ""} em envios mensais, começando no segundo mês`,
                      bonusTotal > 0 && plan.plan_type !== "anual"
                        ? `${plan.coin_bonus_per_shipment.toLocaleString("pt-BR")} Coins por envio confirmado à vista, até o limite do plano`
                        : "Compra das peças · sem cobrança mensal recorrente",
                      "Ativação após confirmação do pagamento",
                    ]
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

                  {eligibleCollections.length > 0 ? (
                    <div className="space-y-3">
                      <label
                        htmlFor={`subscription-collection-${plan.id}`}
                        className="block font-mono text-[10px] uppercase tracking-wider text-[hsl(0,0%,55%)]"
                      >
                        Coleção para sua assinatura
                      </label>
                      <select
                        id={`subscription-collection-${plan.id}`}
                        value={selectedCollection?.id ?? ""}
                        onChange={(event) =>
                          setSelectedCollections((current) => ({
                            ...current,
                            [plan.id]: event.target.value,
                          }))
                        }
                        className="h-11 w-full border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,7%)] px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold-accent))]"
                      >
                        {eligibleCollections.map((collection) => (
                          <option key={collection.id} value={collection.id}>
                            {collection.name} · {collection.catalog_model_slugs.length} modelos
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedCollection) {
                            navigate(
                              `${subscribeCollectionPath(selectedCollection.slug)}?plan=${encodeURIComponent(plan.id)}`,
                            );
                          }
                        }}
                        disabled={!selectedCollection}
                        className="w-full py-3 font-mono text-xs tracking-[0.15em] uppercase transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{
                          background: `${meta.color}`,
                          color: "hsl(0,0%,5%)",
                        }}
                      >
                        Escolher {plan.model_selection_limit} modelos
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="min-h-11 border border-dashed border-[hsl(0,0%,20%)] px-3 py-3 text-center font-mono text-[10px] uppercase tracking-wider text-[hsl(0,0%,45%)]">
                      Nenhuma coleção tem {plan.model_selection_limit} modelos curados no momento.
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
        description="Escolha uma coleção e selecione as peças incluídas no plano."
        primaryAction={{
          label: "EXPLORAR MODELOS",
          href: PUBLIC_ROUTES.catalogModels,
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
