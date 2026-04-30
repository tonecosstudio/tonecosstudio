import { Page } from "@/components/layouts/Page";
import { ArcadeCard, ArcadeSectionTitle, GlitchText } from "@/components/arcade/ArcadeLayout";
import { FloatingParticles } from "@/components/arcade/ArcadeEffects";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Check, Sparkles, Package, Shield, Clock, Zap } from "lucide-react";

const DEPOSIT_AMOUNT = 100.00;

export default function PreLaunchArcade() {
  const navigate = useNavigate();

  const { data: collections } = useQuery({
    queryKey: ["collections-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("collections").select("*").eq("is_active", true).limit(3);
      if (error) throw error;
      return data;
    },
  });

  const benefits = [
    { icon: Zap, title: "ACESSO PRIORITÁRIO", desc: "Seja o primeiro a escolher personagens" },
    { icon: Shield, title: "PREÇO GARANTIDO", desc: "Seu voucher mantém o valor original" },
    { icon: Package, title: "COLEÇÕES EXCLUSIVAS", desc: "Acesso a coleções limitadas" },
    { icon: Sparkles, title: "BÔNUS DE FUNDADOR", desc: "Badge exclusiva de fundador" },
  ];

  return (
    <Page
      title="Pré-Lançamento ORDAX - Voucher R$ 100"
      description="Garanta seu voucher e acesso prioritário às coleções exclusivas"
      keywords={["pré-lançamento", "voucher", "coleções", "ordax"]}
    >
      {/* Hero */}
      <section className="relative py-20 md:py-32 px-6 overflow-hidden">
        <FloatingParticles />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.08] pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--gold-accent)), transparent 70%)" }}
        />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 border border-red-500/40 bg-red-500/10 animate-pulse">
            <span className="font-mono text-[9px] text-red-400 tracking-[0.3em] uppercase" style={{ fontFamily: "'Press Start 2P', monospace" }}>
              🔴 OFERTA LIMITADA
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-[0.15em] mb-4" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", textShadow: "0 0 40px hsl(var(--gold-accent) / 0.15)" }}>
            <GlitchText text="PRÉ-LANÇAMENTO" />
          </h1>

          <p className="font-mono text-[10px] md:text-xs text-[hsl(0,0%,50%)] tracking-[0.15em] max-w-lg mx-auto mb-8" style={{ fontFamily: "'Press Start 2P', monospace" }}>
            GARANTA SEU VOUCHER DE R$ {DEPOSIT_AMOUNT.toFixed(0)}
          </p>

          <div className="inline-block mb-8">
            <div className="text-center">
              <p className="font-mono text-[10px] text-[hsl(0,0%,40%)] tracking-wider mb-1">VOUCHER</p>
              <p className="text-5xl md:text-6xl font-black text-[hsl(var(--gold-accent))]" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                R$ {DEPOSIT_AMOUNT.toFixed(0)}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-2 bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,7%)] hover:brightness-110 font-mono uppercase tracking-[0.15em] text-sm h-12 px-10 shadow-[0_0_20px_hsl(var(--gold-accent)/0.2)] hover:shadow-[0_0_30px_hsl(var(--gold-accent)/0.4)] transition-all"
            >
              GARANTIR MEU VOUCHER <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate("/planos")}
              className="inline-flex items-center gap-2 border border-[hsl(var(--gold-accent)/0.3)] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.1)] font-mono uppercase tracking-[0.15em] text-xs h-11 px-8 transition-all"
            >
              VER PLANOS
            </button>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <ArcadeSectionTitle>VANTAGENS DO PRÉ-LANÇAMENTO</ArcadeSectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {benefits.map((b, i) => (
            <ArcadeCard key={i} className="p-5">
              <b.icon className="w-6 h-6 text-[hsl(var(--gold-accent))] mb-3" />
              <h3 className="font-mono text-[10px] text-[hsl(var(--gold-accent))] tracking-[0.15em] mb-2">{b.title}</h3>
              <p className="font-mono text-[10px] text-[hsl(0,0%,45%)] leading-relaxed">{b.desc}</p>
            </ArcadeCard>
          ))}
        </div>

        {/* How it works */}
        <ArcadeSectionTitle>COMO FUNCIONA</ArcadeSectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {[
            { step: "01", title: "CADASTRE-SE", desc: "Crie sua conta e garanta seu lugar" },
            { step: "02", title: "PAGUE O VOUCHER", desc: `Deposite R$ ${DEPOSIT_AMOUNT.toFixed(0)} via PIX` },
            { step: "03", title: "RECEBA PRIMEIRO", desc: "Acesso prioritário quando lançarmos" },
          ].map((s, i) => (
            <ArcadeCard key={i} className="p-5">
              <span className="font-mono text-3xl font-black text-[hsl(var(--gold-accent)/0.2)]" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                {s.step}
              </span>
              <h3 className="font-mono text-[10px] text-[hsl(0,0%,80%)] tracking-[0.15em] mt-2 mb-1">{s.title}</h3>
              <p className="font-mono text-[10px] text-[hsl(0,0%,45%)] leading-relaxed">{s.desc}</p>
            </ArcadeCard>
          ))}
        </div>

        {/* Collections Preview */}
        {collections && collections.length > 0 && (
          <>
            <ArcadeSectionTitle>COLEÇÕES DISPONÍVEIS</ArcadeSectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {collections.map((c: any) => (
                <ArcadeCard key={c.id} className="overflow-hidden cursor-pointer" hover>
                  <div className="aspect-video bg-[hsl(0,0%,8%)]">
                    {c.cover_image_url ? (
                      <img src={c.cover_image_url} alt={c.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-[hsl(0,0%,15%)]" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold tracking-wider text-sm mb-1" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>{c.name}</h3>
                    {c.description && <p className="font-mono text-[10px] text-[hsl(0,0%,45%)] line-clamp-2">{c.description}</p>}
                  </div>
                </ArcadeCard>
              ))}
            </div>
          </>
        )}
      </section>
    </Page>
  );
}
