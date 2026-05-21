/**
 * Sobre Arcade — estética gaming consistente.
 */

import {
  Shield,
  Sparkles,
  Heart,
  Clock,
  Zap,
  Palette,
  ArrowRight,
  Eye,
  Package,
  Crosshair,
} from "lucide-react";
import {
  ArcadeHero,
  ArcadeSectionTitle,
  ArcadeCard,
  ArcadeCTA,
  FloatingParticles,
} from "@/components/arcade/ArcadeLayout";
import { Page } from "@/components/layouts/Page";
import { useState } from "react";

const VALUES = [
  { icon: Shield, title: "QUALIDADE", desc: "Inspeção rigorosa antes do envio. Padrões elevados em todas as etapas." },
  { icon: Sparkles, title: "TRANSPARÊNCIA", desc: "Acompanhe cada etapa com fotos e atualizações em tempo real." },
  { icon: Heart, title: "PERSONALIZAÇÃO", desc: "Sua peça, suas especificações. Customização completa disponível." },
  { icon: Clock, title: "CONFIABILIDADE", desc: "Prazos claros, comunicação direta, compromisso cumprido." },
];

const PROCESS = [
  { step: 1, title: "MODELAGEM 3D", desc: "Design digital preciso com atenção aos detalhes.", icon: Crosshair },
  { step: 2, title: "IMPRESSÃO 3D", desc: "Resina de alta qualidade, definição e durabilidade.", icon: Zap },
  { step: 3, title: "ACABAMENTO", desc: "Lixamento, tratamento e preparação profissional.", icon: Eye },
  { step: 4, title: "PINTURA", desc: "Pintura à mão com técnicas profissionais.", icon: Palette },
  { step: 5, title: "INSPEÇÃO", desc: "Verificação rigorosa de acabamento e detalhes.", icon: Shield },
  { step: 6, title: "ENVIO", desc: "Embalagem premium com proteção adequada.", icon: Package },
];

const FAQS = [
  { q: "Qual o prazo de produção?", a: "Depende da complexidade. Após montar o orçamento, retornamos com previsão clara." },
  { q: "Como funciona tamanho/escala?", a: "No orçamento você informa a escala desejada e validamos a melhor solução." },
  { q: "Vocês fazem pintura artística?", a: "Sim! Pintura à mão que pode seguir referências específicas enviadas no pedido." },
  { q: "Como é a entrega?", a: "Envio com embalagem e proteção adequada. Detalhes confirmados no retorno do orçamento." },
];

export default function AboutArcade() {
  return (
    <Page
      title="Sobre | ORDAX Intel"
      description="Ordax é a plataforma brasileira de colecionáveis premium sob encomenda."
      keywords={["sobre", "ordax", "colecionáveis", "impressão 3d"]}
    >
      <ArcadeHero
        badge="Arquivo Classificado"
        title="SOBRE"
        subtitle=">> CONHEÇA A OPERAÇÃO ORDAX."
      />

      {/* ═══ MISSION ═══ */}
      <section className="max-w-5xl mx-auto px-4 md:px-6 pb-16 relative z-10">
        <ArcadeSectionTitle>Missão</ArcadeSectionTitle>

        <ArcadeCard>
          <div className="p-8 md:p-12 text-center relative overflow-hidden">
            <FloatingParticles />
            <div className="relative z-10">
              <p className="font-mono text-sm md:text-base text-[hsl(0,0%,60%)] leading-relaxed tracking-wider max-w-3xl mx-auto">
                Tornar colecionáveis premium acessíveis através de uma plataforma organizada,
                transparente e confiável. Cada peça é produzida sob encomenda com atenção aos detalhes
                e acompanhamento completo.
              </p>
            </div>
          </div>
        </ArcadeCard>
      </section>

      {/* ═══ HOW WE WORK ═══ */}
      <section className="max-w-5xl mx-auto px-4 md:px-6 pb-16 relative z-10">
        <ArcadeSectionTitle>Como Operamos</ArcadeSectionTitle>

        <div className="grid md:grid-cols-2 gap-5">
          <ArcadeCard>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 flex items-center justify-center border border-[hsl(var(--gold-accent)/0.4)] bg-[hsl(var(--gold-accent)/0.1)]">
                  <Zap className="w-5 h-5 text-[hsl(var(--gold-accent))]" />
                </div>
                <h3 className="text-xl font-black tracking-[0.1em]" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                  PLATAFORMA ORDAX
                </h3>
              </div>
              <ul className="space-y-3">
                {["Catálogo digital organizado", "Sistema de pedidos personalizado", "Timeline com fotos em tempo real", "Comunicação direta e transparente", "Garantia de qualidade e suporte"].map((item) => (
                  <li key={item} className="flex items-start gap-2 font-mono text-xs text-[hsl(0,0%,50%)] tracking-wider">
                    <div className="mt-1.5 w-1.5 h-1.5 bg-[hsl(var(--gold-accent))] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </ArcadeCard>

          <ArcadeCard>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 flex items-center justify-center border border-[hsl(280,80%,55%)/0.4] bg-[hsl(280,80%,55%)/0.1]">
                  <Palette className="w-5 h-5 text-[hsl(280,80%,65%)]" />
                </div>
                <h3 className="text-xl font-black tracking-[0.1em]" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                  PRODUÇÃO PROFISSIONAL
                </h3>
              </div>
              <ul className="space-y-3">
                {["Estúdio criativo especializado", "Impressão 3D em resina premium", "Acabamento profissional detalhado", "Pintura por especialistas", "Inspeção rigorosa pré-envio"].map((item) => (
                  <li key={item} className="flex items-start gap-2 font-mono text-xs text-[hsl(0,0%,50%)] tracking-wider">
                    <div className="mt-1.5 w-1.5 h-1.5 bg-[hsl(280,80%,65%)] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-4 border-t border-[hsl(0,0%,12%)]">
                <p className="font-mono text-[10px] text-[hsl(0,0%,35%)] tracking-wider">
                  Produção principal: <span className="text-[hsl(var(--gold-accent))]">Tonecos Studios</span>
                </p>
              </div>
            </div>
          </ArcadeCard>
        </div>
      </section>

      {/* ═══ VALUES ═══ */}
      <section className="max-w-5xl mx-auto px-4 md:px-6 pb-16 relative z-10">
        <ArcadeSectionTitle>Nossos Stats</ArcadeSectionTitle>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {VALUES.map(({ icon: Icon, title, desc }) => (
            <ArcadeCard key={title}>
              <div className="p-5 text-center">
                <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center border border-[hsl(var(--gold-accent)/0.3)] bg-[hsl(var(--gold-accent)/0.05)]">
                  <Icon className="w-5 h-5 text-[hsl(var(--gold-accent))]" />
                </div>
                <h3
                  className="text-lg font-black tracking-[0.1em] mb-2"
                  style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
                >
                  {title}
                </h3>
                <p className="font-mono text-[10px] text-[hsl(0,0%,45%)] tracking-wider leading-relaxed">
                  {desc}
                </p>
              </div>
            </ArcadeCard>
          ))}
        </div>
      </section>

      {/* ═══ PRODUCTION PROCESS ═══ */}
      <section className="max-w-5xl mx-auto px-4 md:px-6 pb-16 relative z-10">
        <ArcadeSectionTitle>Processo de Produção</ArcadeSectionTitle>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROCESS.map(({ step, title, desc, icon: Icon }) => (
            <ArcadeCard key={step}>
              <div className="p-5 flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="text-3xl font-black text-[hsl(var(--gold-accent))]"
                    style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
                  >
                    {String(step).padStart(2, "0")}
                  </span>
                  <Icon className="w-4 h-4 text-[hsl(0,0%,30%)]" />
                </div>
                <h3
                  className="text-lg font-black tracking-[0.1em] mb-2"
                  style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
                >
                  {title}
                </h3>
                <p className="font-mono text-[10px] text-[hsl(0,0%,45%)] tracking-wider leading-relaxed">
                  {desc}
                </p>
              </div>
            </ArcadeCard>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="font-mono text-[10px] text-[hsl(0,0%,35%)] tracking-wider">
            Tempo médio: <span className="text-[hsl(var(--gold-accent))]">30 dias</span> • Envio a partir do dia 15 do mês seguinte
          </p>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="max-w-4xl mx-auto px-4 md:px-6 pb-16 relative z-10">
        <ArcadeSectionTitle>Intel FAQ</ArcadeSectionTitle>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <FAQItem key={i} question={faq.q} answer={faq.a} index={i} />
          ))}
        </div>
      </section>

      <ArcadeCTA
        badge="Pronto para começar?"
        title="MISSÃO DISPONÍVEL"
        description="Explore nosso catálogo e solicite um orçamento personalizado."
        primaryAction={{ label: "VER CATÁLOGO", href: "/catalogo", icon: <ArrowRight className="w-4 h-4" /> }}
        secondaryAction={{ label: "FAZER ORÇAMENTO", href: "/orcamento/carrinho" }}
      />
    </Page>
  );
}

function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <ArcadeCard hover={false}>
      <button onClick={() => setOpen(!open)} className="w-full text-left p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-[hsl(var(--gold-accent))] tracking-widest">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="font-mono text-xs text-[hsl(0,0%,80%)] tracking-wider">{question}</span>
        </div>
        <span className={`text-[hsl(var(--gold-accent))] transition-transform duration-300 ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pl-12 animate-fade-in">
          <p className="font-mono text-[11px] text-[hsl(0,0%,45%)] leading-relaxed tracking-wide">{answer}</p>
        </div>
      )}
    </ArcadeCard>
  );
}
