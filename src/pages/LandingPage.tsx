import { Link } from "react-router-dom";
import { BRAND_NAME, BRAND_SHORT_NAME } from "@/config/brand";
import { isCatalogMediaUnderReview, isCatalogPublicMvpEnabled } from "@/config/catalog-public-mvp";
import {
  ArrowRight,
  Crosshair,
  Shield,
  Eye,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Page } from "@/components/layouts/Page";
import {
  ArcadeCard,
  ArcadeSectionTitle,
} from "@/components/arcade/ArcadeLayout";
import { CollectorBenefits } from "@/components/arcade/CollectorBenefits";
import { FloatingParticles } from "@/components/arcade/ArcadeEffects";
import { CanonicalCatalogImage } from "@/components/catalog/CanonicalCatalogImage";
import { PUBLIC_ROUTES, catalogModelDetailsPath } from "@/config/routes";
import { CANONICAL_CATALOG_API_BASE } from "@/config/canonical-catalog-endpoint";
import { createPublicCatalogGateway } from "@/services/catalog/public-catalog-gateway";
import { approvedPublicRenders } from "@/services/catalog/approved-public-renders";
import { ApprovedHomeHighlights } from "./catalog/ApprovedModelShowcase";

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

// Preserve the commercial copy outside the public read-only catalog.
export function landingCopyForMode(publicReadOnly: boolean) {
  return publicReadOnly
    ? {
        description: "Explore personagens, esculturas e referências digitais para inspirar sua próxima peça colecionável.",
        ctaTitle: "CONHEÇA O ACERVO",
        ctaDescription: "Explore personagens e referências do acervo. Para conversar sobre uma ideia, fale diretamente com o estúdio.",
      }
    : {
        description: "Plataforma de colecionáveis artesanais premium. Escolha, acompanhe e colecione peças exclusivas feitas à mão.",
        ctaTitle: "READY PLAYER?",
        ctaDescription: "Entre para o esquadrão de colecionadores. Peças exclusivas, produção artesanal e acompanhamento total.",
      };
}

// ─── MAIN LANDING PAGE ───────────────────────────────────────────────

export default function LandingPage() {
  const publicReadOnly = import.meta.env.VITE_PREVIEW_READ_ONLY === "true" && isCatalogPublicMvpEnabled();
  const landingCopy = landingCopyForMode(publicReadOnly);
  const commercialMvpAvailable =
    import.meta.env.VITE_TONECOS_COMMERCIAL_MVP === "true" &&
    import.meta.env.VITE_PREVIEW_READ_ONLY === "false" &&
    !isCatalogPublicMvpEnabled();
  const coinsAvailable = commercialMvpAvailable;
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // The publication-review build has no approved photographs. Avoid a
  // pointless Worker/D1 recent query on every Home visit while preserving
  // direct catalog browsing and the eventual release after approval.
  const catalogMediaOnHold = isCatalogMediaUnderReview();
  const hasApprovedRenders = catalogMediaOnHold && approvedPublicRenders.length > 0;

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
    enabled: gateway !== null && !catalogMediaOnHold,
    retry: false,
    staleTime: 60 * 1000,
  });
  const models = modelsQuery.data?.slice(0, 6) ?? [];
  const isCatalogLoading = gateway !== null && !catalogMediaOnHold && modelsQuery.isPending;
  const hasCatalogError = !catalogMediaOnHold && (gateway === null || modelsQuery.isError);

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
      <section className="relative flex min-h-[52svh] flex-col items-center justify-center overflow-hidden py-12 sm:min-h-[58svh] sm:py-16">
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
          <div className="mx-auto mb-7 min-h-10 max-w-xl">
            <p
              className="text-[9px] leading-6 tracking-wider text-[hsl(0,0%,65%)] sm:text-[10px]"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              <TypewriterText
                text={publicReadOnly ? "PERSONAGENS, ESCULTURAS E REFERÊNCIAS PARA COLECIONADORES." : ">> PERSONAGENS, MODELOS E VARIAÇÕES SOB ENCOMENDA."}
                delay={800}
              />
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
            <Link
              to={PUBLIC_ROUTES.catalogModels}
              className="group inline-flex w-full max-w-[20rem] items-center justify-center gap-2 bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,5%)] hover:brightness-110 font-mono uppercase tracking-[0.08em] text-xs h-14 px-3 shadow-[0_0_30px_hsl(var(--gold-accent)/0.2)] hover:shadow-[0_0_50px_hsl(var(--gold-accent)/0.4)] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--gold-accent))] sm:w-auto sm:max-w-none sm:gap-3 sm:px-10 sm:text-sm sm:tracking-[0.15em]"
            >
              <Crosshair
                className="w-5 h-5 group-hover:animate-spin"
                style={{ animationDuration: "3s" }}
              />
              VER CATÁLOGO
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </Link>

            <Link
              to={PUBLIC_ROUTES.about}
              className="inline-flex min-h-11 items-center justify-center gap-2 px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[hsl(0,0%,70%)] underline-offset-4 hover:text-[hsl(var(--gold-accent))] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <Eye className="w-5 h-5" />
              CONHEÇA O ESTÚDIO
            </Link>
          </div>

        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[hsl(var(--gold-accent)/0.3)] to-transparent" />
      </section>

      {/* Do not render an empty "Recent models" showcase while no photographs are approved. */}
      {catalogMediaOnHold ? (hasApprovedRenders ? <ApprovedHomeHighlights gateway={gateway} /> : (
        <section aria-labelledby="catalog-curation-heading" className="relative border-y border-[hsl(var(--gold-accent)/0.12)] bg-[hsl(0,0%,5%)] px-6 py-14 sm:py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--gold-accent))]">O ACERVO TONART</p>
              <h2 id="catalog-curation-heading" className="mt-4 max-w-xl text-3xl font-semibold uppercase leading-tight tracking-[0.035em] text-white sm:text-4xl">
                Conheça novas possibilidades
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-[hsl(0,0%,70%)]">
                Explore inspirações do universo das esculturas e dos personagens colecionáveis.
              </p>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[hsl(0,0%,52%)]">
                Novas referências serão publicadas em breve.
              </p>
            </div>
            <div className="border-l-2 border-[hsl(var(--gold-accent)/0.65)] bg-[hsl(0,0%,7%)] px-6 py-7 sm:px-8 sm:py-9">
              <div className="flex items-center gap-3">
                <Shield size={20} className="shrink-0 text-[hsl(var(--gold-accent))]" aria-hidden="true" />
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[hsl(0,0%,92%)]">Sobre as imagens</h3>
              </div>
              <p className="mt-4 text-sm leading-7 text-[hsl(0,0%,70%)]">
                As imagens digitais mostram referências. A aparência de uma peça produzida pode variar conforme escala, materiais e acabamento.
              </p>
              <Link to={PUBLIC_ROUTES.contact} className="mt-6 inline-flex min-h-11 items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[hsl(var(--gold-accent))] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--gold-accent))]">
                Falar com o estúdio <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      )) : (
      <section className="relative px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <ArcadeSectionTitle>EM DESTAQUE</ArcadeSectionTitle>
            <Link to={PUBLIC_ROUTES.catalogModels} className="inline-flex min-h-11 items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--gold-accent))] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
              Catálogo completo <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
           {isCatalogMediaUnderReview() ? (
             <p className="mt-4 text-sm text-[hsl(0,0%,70%)]">
               Fotos em revisão para publicação. Apenas referências autorizadas são exibidas no catálogo.
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
            <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3">
              {models.map((model) => {
                const imageUrl = gateway?.mediaUrl(model.coverStorageKey) ?? null;
                return (
                  <Link key={model.id} to={catalogModelDetailsPath(model.slug)} className="group block" aria-label={"Ver detalhes de " + model.name}>
                    <ArcadeCard>
                      <div className="aspect-[4/5] overflow-hidden bg-[hsl(0,0%,8%)]">
                        <CanonicalCatalogImage
                          src={imageUrl}
                          alt={"Referência visual de " + model.name}
                          imageClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                        />
                      </div>
                      <div className="px-4 py-4">
                        <p className="line-clamp-2 font-mono text-xs uppercase tracking-wider text-[hsl(0,0%,80%)]">{model.name}</p>
                        <p className="mt-2 line-clamp-1 font-mono text-[10px] uppercase text-[hsl(var(--gold-accent)/0.75)]">{model.variantName || model.franchise}</p>
                      </div>
                    </ArcadeCard>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
      )}

      {commercialMvpAvailable && <CollectorBenefits coinsAvailable={coinsAvailable} />}

      <section className="px-5 pb-12 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5">
          <div><h2 className="text-lg font-medium text-[hsl(0,0%,90%)]">Uma peça com a sua personalidade.</h2><p className="mt-2 text-sm text-[hsl(0,0%,60%)]">Converse com o estúdio sobre tamanho, acabamento e detalhes.</p></div>
          <Link to={PUBLIC_ROUTES.contact} className="inline-flex min-h-11 items-center gap-4 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--gold-accent))] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Fale com a TONART <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>

    </Page>
  );
}
