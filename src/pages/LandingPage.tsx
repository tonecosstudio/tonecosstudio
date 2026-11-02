import { Link, useNavigate } from "react-router-dom";
import { BRAND_NAME, BRAND_SHORT_NAME } from "@/config/brand";
import {
  ArrowRight,
  Crosshair,
  Shield,
  Zap,
  Eye,
  Trophy,
  Gamepad2,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Page } from "@/components/layouts/Page";
import {
  ArcadeCard,
  ArcadeSectionTitle,
  ArcadeCTA,
} from "@/components/arcade/ArcadeLayout";
import {
  FloatingParticles,
} from "@/components/arcade/ArcadeEffects";
import { useAuth } from "@/lib/auth";
import { useLandingCatalogModels } from "@/hooks/catalog/useLandingCatalogModels";
import { useLandingCatalogSummary } from "@/hooks/catalog/useLandingCatalogSummary";
import { useActiveCollectionPreviews } from "@/hooks/collections/usePublicCollections";
import {
  PUBLIC_COLLECTIONS_ENABLED,
  PUBLIC_ROUTES,
  catalogCharacterPath,
  collectionDetailsPath,
} from "@/config/routes";

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
        className="text-2xl sm:text-3xl tracking-[0.08em] text-[hsl(0,0%,95%)] font-black"
        style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
      >
        {value}
      </p>
      <p
        className="text-[7px] text-[hsl(0,0%,40%)] mt-1 uppercase tracking-[0.25em]"
        style={{ fontFamily: "'Press Start 2P', monospace" }}
      >
        {label}
      </p>
    </div>
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
      <div
        onClick={() => navigate(collectionDetailsPath(slug))}
        className="relative overflow-hidden"
      >
        {/* Image */}
        <div className="h-40 bg-[hsl(0,0%,8%)] overflow-hidden">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Gamepad2 className="w-12 h-12 text-[hsl(0,0%,15%)]" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(0,0%,5%)] via-transparent to-transparent" />
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <h3
              className="text-lg tracking-[0.08em] text-[hsl(0,0%,95%)] font-black line-clamp-1"
              style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
            >
              {name}
            </h3>
            <span className="font-mono text-[9px] text-[hsl(var(--gold-accent))] px-2 py-0.5 border border-[hsl(var(--gold-accent)/0.3)]">
              {totalCharacters} PCS
            </span>
          </div>
          {description && (
            <p className="text-[hsl(0,0%,40%)] font-mono text-[9px] line-clamp-2 tracking-wider">
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

  const collectionsQuery = useActiveCollectionPreviews(3);
  const modelsQuery = useLandingCatalogModels(6);
  const summaryQuery = useLandingCatalogSummary();

  const collections = collectionsQuery.data || [];
  const models = modelsQuery.data || [];
  const characterCount = summaryQuery.data?.characterCount ?? 0;
  const modelCount = summaryQuery.data?.modelCount ?? 0;
  const isCatalogLoading =
    collectionsQuery.isPending ||
    modelsQuery.isPending ||
    summaryQuery.isPending;
  const hasCatalogError =
    collectionsQuery.isError || modelsQuery.isError || summaryQuery.isError;
  const hasCatalogData =
    collections.length > 0 ||
    models.length > 0 ||
    characterCount > 0 ||
    modelCount > 0;

  const catalogStatus = isCatalogLoading
    ? "Carregando catálogo"
    : hasCatalogError
      ? hasCatalogData
        ? "Catálogo parcialmente disponível"
        : "Catálogo temporariamente indisponível"
      : hasCatalogData
        ? "Catálogo público ativo"
        : "Novidades em preparação";

  const characterCountLabel =
    summaryQuery.isPending || summaryQuery.isError
      ? "—"
      : String(characterCount);
  const modelCountLabel =
    summaryQuery.isPending || summaryQuery.isError ? "—" : String(modelCount);

  return (
    <Page
      title={BRAND_NAME}
      description="Plataforma de colecionáveis artesanais premium. Escolha, acompanhe e colecione peças exclusivas feitas à mão."
      keywords={[
        "colecionáveis",
        "premium",
        "artesanal",
        "figuras",
        "estátuas",
        "tonecos",
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
              className="block text-6xl sm:text-8xl md:text-9xl lg:text-[9rem] font-black tracking-[0.15em] leading-none"
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                textShadow: "0 0 60px hsl(var(--gold-accent) / 0.15)",
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
          <div className="h-8 mb-8">
            <p
              className="text-[9px] sm:text-[10px] text-[hsl(0,0%,45%)] tracking-wider"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              <TypewriterText
                text=">> PERSONAGENS, MODELOS E VARIACOES SOB ENCOMENDA."
                delay={800}
              />
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <button
              onClick={() => navigate(PUBLIC_ROUTES.catalog)}
              className="group inline-flex items-center gap-3 bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,5%)] hover:brightness-110 font-mono uppercase tracking-[0.15em] text-sm h-14 px-10 shadow-[0_0_30px_hsl(var(--gold-accent)/0.2)] hover:shadow-[0_0_50px_hsl(var(--gold-accent)/0.4)] transition-all"
            >
              <Crosshair
                className="w-5 h-5 group-hover:animate-spin"
                style={{ animationDuration: "3s" }}
              />
              EXPLORAR UNIVERSO
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => navigate(PUBLIC_ROUTES.catalog)}
              className="inline-flex items-center gap-3 border border-[hsl(var(--gold-accent)/0.3)] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.1)] hover:border-[hsl(var(--gold-accent)/0.6)] font-mono uppercase tracking-[0.15em] text-sm h-14 px-10 transition-all"
            >
              <Eye className="w-5 h-5" />
              VER UNIVERSO
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 sm:gap-6 max-w-3xl mx-auto">
            <StatCounter
              value={characterCountLabel}
              label="Personagens"
              icon={Trophy}
            />
            <StatCounter value={modelCountLabel} label="Modelos" icon={Shield} />
            <StatCounter value="100%" label="Artesanal" icon={Zap} />
            <StatCounter value="Sob Encomenda" label="Atendimento" icon={Eye} />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[hsl(var(--gold-accent)/0.3)] to-transparent" />
      </section>

      {/* ═══ FEATURED COLLECTIONS ═══ */}
      {PUBLIC_COLLECTIONS_ENABLED && collections.length > 0 && (
        <section className="relative py-14 px-6">
          <FloatingParticles />
          <div className="max-w-6xl mx-auto">
            <ArcadeSectionTitle>Coleções em Destaque</ArcadeSectionTitle>
            <div className="grid md:grid-cols-3 gap-5">
              {collections.map((c) => (
                <FeaturedCollectionCard
                  key={c.id}
                  name={c.name}
                  description={c.description}
                  totalCharacters={c.total_characters ?? 0}
                  coverUrl={c.cover_image_url ?? null}
                  slug={c.slug ?? c.id}
                />
              ))}
            </div>
            <div className="text-center mt-6">
              <button
                onClick={() => navigate(PUBLIC_ROUTES.catalog)}
                className="inline-flex items-center gap-2 border border-[hsl(var(--gold-accent)/0.3)] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.05)] font-mono uppercase tracking-[0.15em] text-[10px] h-10 px-8 transition-all"
              >
                VER TODAS AS COLEÇÕES
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ═══ RECENT CHARACTERS ═══ */}
      {models.length > 0 && (
        <section className="relative py-12 px-6 border-t border-[hsl(var(--gold-accent)/0.08)]">
          <div className="max-w-6xl mx-auto">
            <ArcadeSectionTitle>Personagens em Destaque</ArcadeSectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
              {models.map((m) => {
                const imgUrl = m.thumbnailUrl ?? m.imageUrl;
                const characterName = m.character_name;
                const sourceName = m.source_title;
                const detailPath = catalogCharacterPath(characterName, sourceName);
                return (
                  <Link
                    key={m.id}
                    to={detailPath}
                    className="group block"
                    aria-label={`Abrir pagina de ${characterName}`}
                  >
                    <ArcadeCard>
                      <div className="aspect-square bg-[hsl(0,0%,8%)] overflow-hidden">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={characterName}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Star className="w-6 h-6 text-[hsl(0,0%,15%)]" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="font-mono text-[9px] text-[hsl(0,0%,70%)] line-clamp-1 tracking-wider uppercase">
                          {characterName}
                        </p>
                        <p className="mt-0.5 font-mono text-[8px] text-[hsl(var(--gold-accent)/0.75)] uppercase tracking-widest">
                          {m.model_count} {m.model_count === 1 ? "modelo" : "modelos"}
                        </p>
                        {sourceName && (
                          <p className="font-mono text-[7px] text-[hsl(0,0%,30%)] mt-0.5 line-clamp-1">
                            {sourceName}
                          </p>
                        )}
                      </div>
                    </ArcadeCard>
                  </Link>
                );
              })}
            </div>
            <div className="text-center mt-6">
              <button
                onClick={() => navigate(PUBLIC_ROUTES.catalog)}
                className="inline-flex items-center gap-2 border border-[hsl(var(--gold-accent)/0.3)] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.05)] font-mono uppercase tracking-[0.15em] text-[10px] h-10 px-8 transition-all"
              >
                VER UNIVERSO COMPLETO
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </section>
      )}


      {/* ═══ CTA ═══ */}
      <ArcadeCTA
        badge="Vagas Limitadas"
        title="READY PLAYER?"
        description="Entre para o esquadrão de colecionadores. Peças exclusivas, produção artesanal e acompanhamento total."
        primaryAction={{
          label: "INSERT COIN",
          href: user ? PUBLIC_ROUTES.catalog : PUBLIC_ROUTES.login,
          icon: <Zap className="w-5 h-5" />,
        }}
        secondaryAction={{ label: "FALE CONOSCO", href: PUBLIC_ROUTES.contact }}
      />

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-[hsl(0,0%,10%)] py-8 px-6 bg-[hsl(0,0%,3%)]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="text-2xl tracking-[0.2em] text-[hsl(var(--gold-accent))]"
              style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
            >
              {BRAND_SHORT_NAME}
            </span>
          </div>

          <nav className="flex items-center gap-6">
            {[
              { label: "Sobre", href: PUBLIC_ROUTES.about },
              { label: "Contato", href: PUBLIC_ROUTES.contact },
              { label: "Termos", href: PUBLIC_ROUTES.terms },
              { label: "Privacidade", href: PUBLIC_ROUTES.privacy },
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
            © {new Date().getFullYear()} {BRAND_NAME}
          </p>
        </div>
      </footer>
    </Page>
  );
}
