import { Link, useNavigate } from "react-router-dom";
import { BRAND_NAME, BRAND_SHORT_NAME } from "@/config/brand";
import { isCatalogMediaUnderReview, isCatalogPublicMvpEnabled } from "@/config/catalog-public-mvp";
import {
  ArrowRight,
  Crosshair,
  Shield,
  Zap,
  Eye,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Page } from "@/components/layouts/Page";
import {
  ArcadeCard,
  ArcadeSectionTitle,
  ArcadeCTA,
} from "@/components/arcade/ArcadeLayout";
import { FloatingParticles } from "@/components/arcade/ArcadeEffects";
import { CanonicalCatalogImage } from "@/components/catalog/CanonicalCatalogImage";
import { PUBLIC_ROUTES, catalogModelDetailsPath } from "@/config/routes";
import { CANONICAL_CATALOG_API_BASE } from "@/config/canonical-catalog-endpoint";
import { createPublicCatalogGateway } from "@/services/catalog/public-catalog-gateway";

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
      <div className="w-14 h-14 mx-auto mb-2.5 border border-[hsl(var(--gold-accent)/0.35)] bg-[hsl(var(--gold-accent)/0.03)] flex items-center justify-center group-hover:border-[hsl(var(--gold-accent))] group-hover:bg-[hsl(var(--gold-accent)/0.08)] group-hover:shadow-[0_0_20px_hsl(var(--gold-accent)/0.15)] transition-all duration-500">
        <Icon className="h-6 w-6 text-[hsl(var(--gold-accent))]" />
      </div>
      <p
        className="text-[clamp(1.125rem,5vw,1.5rem)] sm:text-2xl md:text-3xl tracking-[0.04em] sm:tracking-[0.08em] leading-tight text-[hsl(0,0%,95%)] font-black"
        style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
      >
        {value}
      </p>
      <p
        className="text-[8px] min-[360px]:text-[9px] sm:text-[10px] text-[hsl(0,0%,40%)] mt-1 uppercase tracking-[0.08em] sm:tracking-[0.12em]"
        style={{ fontFamily: "'Press Start 2P', monospace" }}
      >
        {label}
      </p>
    </div>
  );
}

// Preserve the commercial copy outside the public read-only catalog.
export function landingCopyForMode(publicReadOnly: boolean) {
  return publicReadOnly
    ? {
        description: "Explore modelos, personagens e referências de esculturas da TONART Studio. Catálogo para consulta, sem compras ou cadastro.",
        ctaTitle: "CONHEÇA O ACERVO",
        ctaDescription: "Explore modelos e referências. Para conversar sobre uma peça, entre em contato com o estúdio por e-mail.",
      }
    : {
        description: "Plataforma de colecionáveis artesanais premium. Escolha, acompanhe e colecione peças exclusivas feitas à mão.",
        ctaTitle: "READY PLAYER?",
        ctaDescription: "Entre para o esquadrão de colecionadores. Peças exclusivas, produção artesanal e acompanhamento total.",
      };
}

// ─── MAIN LANDING PAGE ───────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();
  const publicReadOnly = import.meta.env.VITE_PREVIEW_READ_ONLY === "true" && isCatalogPublicMvpEnabled();
  const landingCopy = landingCopyForMode(publicReadOnly);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Use the existing indexed recent-publications endpoint, not an
  // alphabetical catalog page or a client-side full-acervo scan.
  const gateway = useMemo(() => {
    if (!CANONICAL_CATALOG_API_BASE) return null;
    try {
      return createPublicCatalogGateway(CANONICAL_CATALOG_API_BASE, fetch);
    } catch {
      return null;
    }
  }, []);
  // Fetch one bounded indexed window so quarantined recent covers do not
  // leave the six-card Home showcase empty while eligible models follow.
  // No full-catalog read, cursor walk or fallback catalog is involved.
  const modelsQuery = useQuery({
    queryKey: ["tonecos-landing-recent-models", 24],
    queryFn: ({ signal }) => gateway!.listRecent(24, signal),
    enabled: gateway !== null,
    retry: false,
    staleTime: 60 * 1000,
  });
  const models = modelsQuery.data?.slice(0, 6) ?? [];
  const isCatalogLoading = gateway !== null && modelsQuery.isPending;
  const hasCatalogError = gateway === null || modelsQuery.isError;
  const hasCatalogData = models.length > 0;
  const catalogStatus = isCatalogLoading
    ? "Carregando referências"
    : hasCatalogError
      ? "Acervo temporariamente indisponível"
      : hasCatalogData
        ? "Referências publicadas"
        : "Novidades em preparação";
  // These six featured results are not an estimate of all published models.
  const featuredCount = modelsQuery.isSuccess ? String(models.length) : "—";

  return (
    <Page
      title={BRAND_NAME}
      description={landingCopy.description}
      keywords={[
        "colecionáveis",
        "premium",
        "artesanal",
        "figuras",
        "estátuas",
        "tonart",
      ]}
    >
      {/* ═══ HERO ═══ */}
      <section className="relative min-h-[88svh] flex flex-col items-center justify-center overflow-hidden">
        <ParallaxGrid scrollY={scrollY} />
        <FloatingParticles />

        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.06] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--gold-accent)), transparent 70%)",
          }}
        />

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 border border-[hsl(var(--gold-accent)/0.3)] bg-[hsl(var(--gold-accent)/0.05)] px-4 py-2 mb-6 animate-fade-in"
            role="status"
            aria-live="polite"
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isCatalogLoading
                  ? "bg-[hsl(var(--gold-accent))] animate-pulse"
                  : hasCatalogError
                    ? "bg-amber-500"
                    : "bg-[hsl(var(--gold-accent))]"
              }`}
            />
            <span
              className="text-[9px] text-[hsl(var(--gold-accent))] tracking-[0.3em] uppercase"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              {catalogStatus}
            </span>
          </div>

          {/* Title */}
          <h1 className="mb-5">
            <span
              className="block text-[clamp(3.5rem,14vw,9rem)] lg:text-[9rem] font-black tracking-[clamp(0.08em,2vw,0.15em)] leading-none"
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                textShadow: "none",
              }}
            >
              <span>{BRAND_SHORT_NAME}</span>
            </span>
            <span
              className="block text-[10px] sm:text-xs text-[hsl(var(--gold-accent))] tracking-[0.5em] mt-4 uppercase"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              Universo de Personagens
            </span>
          </h1>

          {/* Typewriter */}
          <div className="min-h-8 mb-8">
            <p
              className="text-[9px] sm:text-[10px] text-[hsl(0,0%,45%)] tracking-wider"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              <TypewriterText
                text=">> PERSONAGENS, MODELOS E VARIAÇÕES SOB ENCOMENDA."
                delay={800}
              />
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <button
              onClick={() => navigate(PUBLIC_ROUTES.catalogModels)}
              className="group inline-flex w-full max-w-[20rem] items-center justify-center gap-2 bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,5%)] hover:brightness-110 font-mono uppercase tracking-[0.08em] text-xs h-14 px-3 shadow-[0_0_30px_hsl(var(--gold-accent)/0.2)] hover:shadow-[0_0_50px_hsl(var(--gold-accent)/0.4)] transition-all sm:w-auto sm:max-w-none sm:gap-3 sm:px-10 sm:text-sm sm:tracking-[0.15em]"
            >
              <Crosshair
                className="w-5 h-5 group-hover:animate-spin"
                style={{ animationDuration: "3s" }}
              />
              EXPLORAR MODELOS
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => navigate(PUBLIC_ROUTES.catalogModels)}
              className="inline-flex w-full max-w-[20rem] items-center justify-center gap-2 border border-[hsl(var(--gold-accent)/0.3)] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.1)] hover:border-[hsl(var(--gold-accent)/0.6)] font-mono uppercase tracking-[0.08em] text-xs h-14 px-3 transition-all sm:w-auto sm:max-w-none sm:gap-3 sm:px-10 sm:text-sm sm:tracking-[0.15em]"
            >
              <Eye className="w-5 h-5" />
              VER CATÁLOGO
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 sm:gap-6 max-w-3xl mx-auto">
            <StatCounter
              value={hasCatalogData ? "ATIVO" : "—"}
              label="Acervo"
              icon={Trophy}
            />
            <StatCounter
              value={featuredCount}
              label="Destaques"
              icon={Shield}
            />
            <StatCounter value="100%" label="Artesanal" icon={Zap} />
            <StatCounter value="Sob Encomenda" label="Atendimento" icon={Eye} />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[hsl(var(--gold-accent)/0.3)] to-transparent" />
      </section>

      {/* ═══ MODELOS CANÔNICOS EM DESTAQUE ═══ */}
      <section className="relative border-t border-[hsl(var(--gold-accent)/0.08)] px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <ArcadeSectionTitle>MODELOS RECENTES</ArcadeSectionTitle>
           {isCatalogMediaUnderReview() ? (
             <p className="mt-4 text-sm text-[hsl(0,0%,70%)]">
               Fotos em revisão para publicação. Os modelos permanecem disponíveis para consulta.
             </p>
           ) : null}
          {hasCatalogError ? (
            <div role="alert" className="mt-5 border border-[hsl(0,0%,18%)] p-6 text-sm text-[hsl(0,0%,70%)]">
              Não foi possível carregar as referências publicadas.
              {gateway && (
                <button type="button" className="ml-3 border border-[hsl(var(--gold-accent))] px-3 py-2 text-[hsl(var(--gold-accent))]" onClick={() => void modelsQuery.refetch()}>
                  Tentar novamente
                </button>
              )}
            </div>
          ) : isCatalogLoading ? (
            <p className="mt-5 p-6 text-sm" role="status">Carregando modelos publicados…</p>
          ) : models.length === 0 ? (
            <p className="mt-5 p-6 text-sm" role="status">Novas referências serão publicadas em breve.</p>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {models.map((model) => {
                const imageUrl = gateway?.mediaUrl(model.coverStorageKey) ?? null;
                return (
                  <Link key={model.id} to={catalogModelDetailsPath(model.slug)} className="group block" aria-label={"Ver detalhes de " + model.name}>
                    <ArcadeCard>
                      <div className="aspect-[2/3] overflow-hidden bg-[hsl(0,0%,8%)]">
                        <CanonicalCatalogImage
                          src={imageUrl}
                          alt={"Referência visual de " + model.name}
                          imageClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                        />
                      </div>
                      <div className="p-2.5">
                        <p className="line-clamp-2 font-mono text-[9px] uppercase tracking-wider text-[hsl(0,0%,80%)]">{model.name}</p>
                        <p className="mt-1 line-clamp-1 font-mono text-[8px] uppercase text-[hsl(var(--gold-accent)/0.75)]">{model.variantName || model.franchise}</p>
                      </div>
                    </ArcadeCard>
                  </Link>
                );
              })}
            </div>
          )}
          <div className="mt-6 text-center">
            <Link to={PUBLIC_ROUTES.catalogModels} className="inline-flex h-11 items-center gap-2 border border-[hsl(var(--gold-accent)/0.4)] px-8 font-mono text-[10px] uppercase tracking-[0.15em] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.05)]">
              EXPLORAR TODOS OS MODELOS <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <ArcadeCTA
        badge="ACERVO TONART"
        title={landingCopy.ctaTitle}
        description={landingCopy.ctaDescription}
        primaryAction={{
          label: "VER MODELOS",
          href: PUBLIC_ROUTES.catalogModels,
          icon: <Zap className="w-5 h-5" />,
        }}
        secondaryAction={{ label: "FALE CONOSCO", href: PUBLIC_ROUTES.contact }}
      />

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-[hsl(0,0%,10%)] py-8 px-6 bg-[hsl(0,0%,3%)]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="text-2xl tracking-[0.2em] text-white"
              style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
            >
              {BRAND_SHORT_NAME}
            </span>
          </div>

          <nav className="flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:w-auto sm:flex-nowrap sm:justify-start sm:gap-6">
            {[
              { label: "Sobre", href: PUBLIC_ROUTES.about },
              { label: "Contato", href: PUBLIC_ROUTES.contact },
              { label: "Termos", href: PUBLIC_ROUTES.terms },
              { label: "Privacidade", href: PUBLIC_ROUTES.privacy },
            ].map((link) => (
              <button
                key={link.href}
                onClick={() => navigate(link.href)}
                className="inline-flex min-h-11 items-center text-[8px] text-[hsl(0,0%,35%)] hover:text-[hsl(var(--gold-accent))] tracking-wider transition-colors uppercase"
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
            © {new Date().getFullYear()} {BRAND_NAME}
          </p>
        </div>
      </footer>
    </Page>
  );
}
