import { useNavigate } from "react-router-dom";
import { ArrowRight, Crosshair, Shield, Zap, Eye, Trophy, ChevronDown, Coins, Gamepad2, Flame, Star } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import {
  ArcadePage,
  ArcadeCard,
  ArcadeHero,
  ArcadeSectionTitle,
  FloatingParticles,
  GlitchText,
  CoinCounter,
  ArcadeCTA,
} from "@/components/arcade/ArcadeLayout";
import { useCoinsBalance } from "@/hooks/coins/useCoinsBalance";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── TYPEWRITER ──────────────────────────────────────────────────────

function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [started, text]);

  return (
    <span>
      {displayed}
      <span className="animate-[blink_1s_step-end_infinite] border-r-2 border-[hsl(var(--gold-accent))] ml-0.5">
        &nbsp;
      </span>
    </span>
  );
}

// ─── PARALLAX GRID ───────────────────────────────────────────────────

function ParallaxGrid({ scrollY }: { scrollY: number }) {
  return (
    <div
      className="absolute inset-0 opacity-[0.04] pointer-events-none"
      style={{
        backgroundImage: `
          linear-gradient(hsl(var(--gold-accent) / 0.4) 1px, transparent 1px),
          linear-gradient(90deg, hsl(var(--gold-accent) / 0.4) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
        transform: `translateY(${scrollY * 0.1}px)`,
      }}
    />
  );
}

// ─── STAT COUNTER ────────────────────────────────────────────────────

function StatCounter({
  value,
  label,
  icon: Icon,
}: {
  value: string;
  label: string;
  icon: React.ElementType;
}) {
  return (
    <div className="text-center group">
      <div className="w-16 h-16 mx-auto mb-3 border-2 border-[hsl(var(--gold-accent)/0.4)] bg-[hsl(var(--gold-accent)/0.03)] flex items-center justify-center group-hover:border-[hsl(var(--gold-accent))] group-hover:bg-[hsl(var(--gold-accent)/0.08)] group-hover:shadow-[0_0_20px_hsl(var(--gold-accent)/0.15)] transition-all duration-500">
        <Icon className="h-7 w-7 text-[hsl(var(--gold-accent))]" />
      </div>
      <p
        className="text-3xl tracking-wider text-[hsl(0,0%,95%)] font-black"
        style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
      >
        {value}
      </p>
      <p
        className="text-[8px] text-[hsl(0,0%,40%)] mt-1 uppercase tracking-[0.3em]"
        style={{ fontFamily: "'Press Start 2P', monospace" }}
      >
        {label}
      </p>
    </div>
  );
}

// ─── MISSION CARD ────────────────────────────────────────────────────

function MissionCard({
  title,
  description,
  number,
  icon: Icon,
}: {
  title: string;
  description: string;
  number: string;
  icon: React.ElementType;
}) {
  return (
    <ArcadeCard>
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center border border-[hsl(var(--gold-accent)/0.3)] bg-[hsl(var(--gold-accent)/0.05)]">
            <span
              className="text-[10px] text-[hsl(var(--gold-accent))] font-bold"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              {number}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <Icon className="h-5 w-5 text-[hsl(var(--gold-accent))]" />
              <h3
                className="text-2xl tracking-[0.1em] text-[hsl(0,0%,95%)]"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
              >
                {title}
              </h3>
            </div>
            <p className="text-sm text-[hsl(0,0%,50%)] leading-relaxed font-mono tracking-wide">
              {description}
            </p>
          </div>
        </div>
      </div>
    </ArcadeCard>
  );
}

// ─── FEATURED COLLECTION CARD ────────────────────────────────────────

function FeaturedCollectionCard({
  name,
  description,
  totalCharacters,
  coverUrl,
  slug,
}: {
  name: string;
  description: string | null;
  totalCharacters: number;
  coverUrl: string | null;
  slug: string;
}) {
  const navigate = useNavigate();

  return (
    <ArcadeCard className="cursor-pointer" hover>
      <div onClick={() => navigate(`/colecoes/${slug}`)} className="relative overflow-hidden">
        {/* Image */}
        <div className="h-48 bg-[hsl(0,0%,8%)] overflow-hidden">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Gamepad2 className="w-12 h-12 text-[hsl(0,0%,15%)]" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(0,0%,5%)] via-transparent to-transparent" />
        </div>

        {/* Info */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-2">
            <h3
              className="text-xl tracking-[0.1em] text-[hsl(0,0%,95%)] font-black"
              style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
            >
              {name}
            </h3>
            <span className="font-mono text-[9px] text-[hsl(var(--gold-accent))] px-2 py-0.5 border border-[hsl(var(--gold-accent)/0.3)]">
              {totalCharacters} PCS
            </span>
          </div>
          {description && (
            <p className="text-[hsl(0,0%,40%)] font-mono text-[10px] line-clamp-2 tracking-wider">
              {description}
            </p>
          )}
        </div>

        {/* Power bar on hover */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[hsl(0,0%,10%)]">
          <div className="h-full w-0 group-hover:w-full bg-[hsl(var(--gold-accent))] transition-all duration-700" />
        </div>
      </div>
    </ArcadeCard>
  );
}

// ─── MAIN LANDING PAGE ───────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch featured collections
  const collectionsQuery = useQuery({
    queryKey: ["landing-featured-collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("id, name, description, slug, cover_image_url, total_characters")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch recent models
  const modelsQuery = useQuery({
    queryKey: ["landing-recent-models"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("models")
        .select("id, name, franchise, image_bucket, image_path")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data || [];
    },
  });

  const collections = collectionsQuery.data || [];
  const models = modelsQuery.data || [];

  return (
    <ArcadePage
      title="ORDAX — Colecionáveis Premium de Elite"
      description="Plataforma de colecionáveis artesanais premium. Escolha, acompanhe e colecione peças exclusivas feitas à mão."
      keywords={["colecionáveis", "premium", "artesanal", "figuras", "estátuas", "ordax"]}
    >
      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        <ParallaxGrid scrollY={scrollY} />
        <FloatingParticles />

        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.06] pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--gold-accent)), transparent 70%)" }}
        />

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 border border-[hsl(var(--gold-accent)/0.3)] bg-[hsl(var(--gold-accent)/0.05)] px-4 py-2 mb-8 animate-fade-in">
            <div className="w-2 h-2 bg-[hsl(var(--gold-accent))] rounded-full animate-pulse" />
            <span
              className="text-[9px] text-[hsl(var(--gold-accent))] tracking-[0.3em] uppercase"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              Mission Active • Squad Online
            </span>
          </div>

          {/* Title */}
          <h1 className="mb-6">
            <span
              className="block text-7xl sm:text-8xl md:text-9xl lg:text-[10rem] font-black tracking-[0.15em] leading-none"
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                textShadow: "0 0 60px hsl(var(--gold-accent) / 0.15)",
              }}
            >
              <GlitchText text="ORDAX" />
            </span>
            <span
              className="block text-[10px] sm:text-xs text-[hsl(var(--gold-accent))] tracking-[0.5em] mt-4 uppercase"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              Collectibles Arsenal
            </span>
          </h1>

          {/* Typewriter */}
          <div className="h-8 mb-10">
            <p
              className="text-[9px] sm:text-[10px] text-[hsl(0,0%,45%)] tracking-wider"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              <TypewriterText text=">> PEÇAS PREMIUM ARTESANAIS. FEITAS À MÃO. SOB ENCOMENDA." delay={800} />
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={() => navigate("/colecoes")}
              className="group inline-flex items-center gap-3 bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,5%)] hover:brightness-110 font-mono uppercase tracking-[0.15em] text-sm h-14 px-10 shadow-[0_0_30px_hsl(var(--gold-accent)/0.2)] hover:shadow-[0_0_50px_hsl(var(--gold-accent)/0.4)] transition-all"
            >
              <Crosshair className="w-5 h-5 group-hover:animate-spin" style={{ animationDuration: "3s" }} />
              EXPLORAR COLEÇÕES
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => navigate("/catalogo")}
              className="inline-flex items-center gap-3 border border-[hsl(var(--gold-accent)/0.3)] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.1)] hover:border-[hsl(var(--gold-accent)/0.6)] font-mono uppercase tracking-[0.15em] text-sm h-14 px-10 transition-all"
            >
              <Eye className="w-5 h-5" />
              VER CATÁLOGO
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-3xl mx-auto">
            <StatCounter value="150+" label="Modelos" icon={Trophy} />
            <StatCounter value="100%" label="Artesanal" icon={Shield} />
            <StatCounter value="12" label="Estágios" icon={Zap} />
            <StatCounter value="∞" label="Detalhes" icon={Eye} />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-[bounce_2s_ease-in-out_infinite]">
          <span
            className="text-[7px] text-[hsl(0,0%,30%)] tracking-widest"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            SCROLL
          </span>
          <ChevronDown className="h-4 w-4 text-[hsl(0,0%,30%)]" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[hsl(var(--gold-accent)/0.3)] to-transparent" />
      </section>

      {/* ═══ FEATURED COLLECTIONS ═══ */}
      {collections.length > 0 && (
        <section className="relative py-20 px-6">
          <FloatingParticles />
          <div className="max-w-6xl mx-auto">
            <ArcadeSectionTitle>Coleções em Destaque</ArcadeSectionTitle>
            <div className="grid md:grid-cols-3 gap-6">
              {collections.map((c) => (
                <FeaturedCollectionCard
                  key={c.id}
                  name={c.name}
                  description={c.description}
                  totalCharacters={c.total_characters}
                  coverUrl={c.cover_image_url}
                  slug={c.slug}
                />
              ))}
            </div>
            <div className="text-center mt-8">
              <button
                onClick={() => navigate("/colecoes")}
                className="inline-flex items-center gap-2 border border-[hsl(var(--gold-accent)/0.3)] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.05)] font-mono uppercase tracking-[0.15em] text-[10px] h-10 px-8 transition-all"
              >
                VER TODAS AS COLEÇÕES
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ═══ RECENT MODELS ═══ */}
      {models.length > 0 && (
        <section className="relative py-16 px-6 border-t border-[hsl(var(--gold-accent)/0.08)]">
          <div className="max-w-6xl mx-auto">
            <ArcadeSectionTitle>Novos no Arsenal</ArcadeSectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {models.map((m) => {
                const imgUrl = m.image_bucket && m.image_path
                  ? supabase.storage.from(m.image_bucket).getPublicUrl(m.image_path).data.publicUrl
                  : null;
                return (
                  <div
                    key={m.id}
                    onClick={() => navigate(`/catalogo/${m.id}`)}
                    className="group cursor-pointer"
                  >
                    <ArcadeCard>
                      <div className="aspect-square bg-[hsl(0,0%,8%)] overflow-hidden">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={m.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Star className="w-6 h-6 text-[hsl(0,0%,15%)]" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-mono text-[10px] text-[hsl(0,0%,70%)] line-clamp-1 tracking-wider uppercase">
                          {m.name}
                        </p>
                        {m.franchise && (
                          <p className="font-mono text-[8px] text-[hsl(0,0%,30%)] mt-0.5">{m.franchise}</p>
                        )}
                      </div>
                    </ArcadeCard>
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-8">
              <button
                onClick={() => navigate("/catalogo")}
                className="inline-flex items-center gap-2 border border-[hsl(var(--gold-accent)/0.3)] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.05)] font-mono uppercase tracking-[0.15em] text-[10px] h-10 px-8 transition-all"
              >
                VER CATÁLOGO COMPLETO
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ═══ MISSION BRIEFING ═══ */}
      <section className="relative py-20 px-6 border-t border-[hsl(var(--gold-accent)/0.08)]">
        <div className="max-w-5xl mx-auto">
          <ArcadeSectionTitle>Mission Briefing</ArcadeSectionTitle>

          <div className="grid md:grid-cols-2 gap-6">
            <MissionCard
              number="01"
              title="ESCOLHA SUA PEÇA"
              description="Navegue pelo arsenal de personagens e coleções. Cada modelo é único, produzido com resina de alta qualidade e pintura artística profissional."
              icon={Crosshair}
            />
            <MissionCard
              number="02"
              title="ASSINE OU COMPRE"
              description="Monte sua squad! Assine uma coleção para receber peças mensais ou compre avulso o personagem que quiser. Você no controle."
              icon={Shield}
            />
            <MissionCard
              number="03"
              title="ACOMPANHE EM TEMPO REAL"
              description="12 estágios de produção com fotos de cada etapa. Da impressão 3D até a pintura final — total transparência no processo."
              icon={Eye}
            />
            <MissionCard
              number="04"
              title="RECEBA EM CASA"
              description="Embalagem premium com proteção reforçada. Sua peça chega em segurança, pronta para entrar na coleção. Mission Complete!"
              icon={Trophy}
            />
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <ArcadeCTA
        badge="Vagas Limitadas"
        title="READY PLAYER?"
        description="Entre para o esquadrão de colecionadores. Peças exclusivas, produção artesanal e acompanhamento total."
        primaryAction={{
          label: "INSERT COIN",
          href: user ? "/colecoes" : "/login",
          icon: <Zap className="w-5 h-5" />,
        }}
        secondaryAction={{ label: "VER PLANOS", href: "/planos" }}
      />

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-[hsl(0,0%,10%)] py-8 px-6 bg-[hsl(0,0%,3%)]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="text-2xl tracking-[0.2em] text-[hsl(var(--gold-accent))]"
              style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
            >
              ORDAX
            </span>
            <span
              className="text-[7px] text-[hsl(0,0%,25%)]"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              v2.0
            </span>
          </div>

          <nav className="flex items-center gap-6">
            {[
              { label: "Sobre", href: "/sobre" },
              { label: "Contato", href: "/contato" },
              { label: "Termos", href: "/termos" },
              { label: "Privacidade", href: "/privacidade" },
            ].map((link) => (
              <button
                key={link.href}
                onClick={() => navigate(link.href)}
                className="text-[8px] text-[hsl(0,0%,35%)] hover:text-[hsl(var(--gold-accent))] tracking-wider transition-colors uppercase"
                style={{ fontFamily: "'Press Start 2P', monospace" }}
              >
                {link.label}
              </button>
            ))}
          </nav>

          <p
            className="text-[7px] text-[hsl(0,0%,20%)] tracking-wider"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            © {new Date().getFullYear()} TONECOS STUDIOS
          </p>
        </div>
      </footer>
    </ArcadePage>
  );
}
