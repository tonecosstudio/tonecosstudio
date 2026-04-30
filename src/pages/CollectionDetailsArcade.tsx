/**
 * Collection Details Page - Metal Slug Arcade Style
 *
 * Uses Page shell for consistent aesthetic with Home, Collections, Plans.
 * Route: /colecoes/:slug
 */

import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Page } from "@/components/layouts/Page";
import {
  ArcadeHero,
  ArcadeCard,
  ArcadeSectionTitle,
  ArcadeCTA,
} from "@/components/arcade/ArcadeLayout";
import { FloatingParticles, GlitchText } from "@/components/arcade/ArcadeEffects";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Users,
  Star,
  Package,
  Coins,
  Crown,
  Sparkles,
  Calendar,
  Eye,
  Lock,
  Zap,
} from "lucide-react";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// ─── Types ───────────────────────────────────────────────────
type Character = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  release_order: number | null;
  release_month: number | null;
  is_catalog: boolean | null;
  status: string | null;
};

type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  is_active: boolean;
  collection_characters: Character[];
};

// ─── Character Card ──────────────────────────────────────────
function CharacterCard({
  character,
  index,
  isUpcoming = false,
  collectionSlug,
}: {
  character: Character;
  index: number;
  isUpcoming?: boolean;
  collectionSlug: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      to={isUpcoming ? "#" : `/colecoes/${collectionSlug}/${character.id}`}
      onClick={(e) => isUpcoming && e.preventDefault()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group block ${isUpcoming ? "cursor-not-allowed" : ""}`}
    >
      <ArcadeCard hover={!isUpcoming}>
        {/* Image */}
        <div className="relative aspect-[3/4] bg-[hsl(0,0%,8%)] overflow-hidden">
          {character.image_url ? (
            <img
              src={character.image_url}
              alt={character.name}
              className={`w-full h-full object-cover transition-all duration-700 ${
                isUpcoming
                  ? "grayscale blur-sm scale-100"
                  : isHovered
                  ? "grayscale-0 scale-110"
                  : "grayscale-[0.6] scale-100"
              }`}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-12 h-12 text-[hsl(0,0%,25%)]" />
            </div>
          )}

          {/* Scanline */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.06]"
            style={{
              background:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(0 0% 0%) 2px, hsl(0 0% 0%) 4px)",
            }}
          />

          {/* Hover glow */}
          {isHovered && !isUpcoming && (
            <div className="absolute inset-0 bg-[hsl(var(--gold-accent)/0.12)] pointer-events-none transition-opacity" />
          )}

          {/* Index tag */}
          <div className="absolute top-2 left-2 bg-[hsl(0,0%,95%)/0.9] text-[hsl(0,0%,5%)] px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider">
            #{String(index + 1).padStart(2, "0")}
          </div>

          {/* Month badge */}
          {character.release_month && !isUpcoming && (
            <div className="absolute top-2 right-2 bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,5%)] px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {MONTHS[character.release_month - 1]?.substring(0, 3)}
            </div>
          )}

          {/* Upcoming overlay */}
          {isUpcoming && (
            <div className="absolute inset-0 bg-[hsl(0,0%,5%)/0.85] flex items-center justify-center">
              <div className="text-center">
                <Lock className="w-8 h-8 text-[hsl(0,0%,30%)] mx-auto mb-2" />
                <p
                  className="text-[8px] tracking-[0.2em] uppercase text-[hsl(0,0%,40%)]"
                  style={{ fontFamily: "'Press Start 2P', monospace" }}
                >
                  Em Breve
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 border-t border-[hsl(0,0%,12%)]">
          <h4
            className={`text-sm font-bold uppercase tracking-tight transition-colors duration-300 line-clamp-1 ${
              isUpcoming
                ? "text-[hsl(0,0%,35%)]"
                : isHovered
                ? "text-[hsl(var(--gold-accent))]"
                : "text-[hsl(0,0%,85%)]"
            }`}
          >
            {isUpcoming ? "???" : character.name}
          </h4>
        </div>
      </ArcadeCard>
    </Link>
  );
}

// ─── Featured Character (Hero Style) ─────────────────────────
function FeaturedCharacterHero({
  character,
  collectionSlug,
}: {
  character: Character;
  collectionSlug: string;
}) {
  return (
    <Link to={`/colecoes/${collectionSlug}/${character.id}`} className="group block">
      <div className="relative h-80 md:h-[480px] overflow-hidden border-2 border-[hsl(var(--gold-accent)/0.6)] group-hover:border-[hsl(var(--gold-accent))] transition-all duration-500 group-hover:shadow-[0_0_60px_hsl(var(--gold-accent)/0.3)]">
        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[hsl(var(--gold-accent))] z-20" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[hsl(var(--gold-accent))] z-20" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[hsl(var(--gold-accent))] z-20" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[hsl(var(--gold-accent))] z-20" />

        {/* Image */}
        {character.image_url ? (
          <img
            src={character.image_url}
            alt={character.name}
            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[hsl(var(--gold-accent)/0.15)] to-[hsl(0,0%,5%)] flex items-center justify-center">
            <Package className="w-24 h-24 text-[hsl(var(--gold-accent)/0.3)]" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(0,0%,5%)] via-[hsl(0,0%,5%)/0.4] to-transparent" />

        {/* Scanline */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(0 0% 0%) 2px, hsl(0 0% 0%) 4px)",
          }}
        />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent)/0.15)]">
              <Star className="w-3 h-3 text-[hsl(var(--gold-accent))]" />
              <span
                className="text-[8px] text-[hsl(var(--gold-accent))] tracking-[0.2em] uppercase"
                style={{ fontFamily: "'Press Start 2P', monospace" }}
              >
                Destaque do Mês
              </span>
            </div>
            {character.release_month && (
              <span className="text-[10px] font-mono text-[hsl(0,0%,50%)] tracking-wider uppercase">
                📅 {MONTHS[character.release_month - 1]}
              </span>
            )}
          </div>

          <h3
            className="text-4xl md:text-6xl font-black tracking-[0.1em] mb-3 leading-none"
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              textShadow: "0 0 30px hsl(var(--gold-accent) / 0.3)",
            }}
          >
            <GlitchText text={character.name} />
          </h3>

          {character.description && (
            <p className="text-[hsl(0,0%,50%)] max-w-2xl text-sm mb-4 line-clamp-2">
              {character.description}
            </p>
          )}

          <div className="inline-flex items-center gap-2 text-[hsl(var(--gold-accent))] font-mono text-xs tracking-wider uppercase group-hover:gap-3 transition-all">
            <Eye className="w-4 h-4" />
            Ver Detalhes
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </div>
        </div>

        {/* Hover glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[hsl(var(--gold-accent)/0.06)] pointer-events-none" />
      </div>
    </Link>
  );
}

// ─── Section Header ──────────────────────────────────────────
function SectionHeader({
  title,
  count,
  variant = "default",
}: {
  title: string;
  count: number;
  variant?: "default" | "muted" | "accent";
}) {
  const colors = {
    default: {
      title: "text-[hsl(0,0%,90%)]",
      badge: "border-[hsl(var(--gold-accent)/0.4)] text-[hsl(var(--gold-accent))]",
    },
    muted: {
      title: "text-[hsl(0,0%,45%)]",
      badge: "border-[hsl(0,0%,20%)] text-[hsl(0,0%,45%)]",
    },
    accent: {
      title: "text-[hsl(var(--gold-accent))]",
      badge: "border-[hsl(var(--gold-accent)/0.5)] text-[hsl(var(--gold-accent))]",
    },
  };

  const c = colors[variant];

  return (
    <div className="flex items-center gap-4 mb-6">
      <h2
        className={`text-xl md:text-2xl font-black tracking-[0.1em] uppercase ${c.title}`}
        style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
      >
        {title}
      </h2>
      <span className={`text-[10px] font-mono tracking-wider px-2 py-0.5 border ${c.badge}`}>
        {count}
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-[hsl(var(--gold-accent)/0.2)] to-transparent" />
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function CollectionDetailsArcade() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: collection, isLoading } = useQuery({
    queryKey: ["collection-details-arcade", slug],
    queryFn: async () => {
      const { data: collectionData, error: collectionError } = await supabase
        .from("collections")
        .select("id, name, slug, description, cover_image_url, is_active")
        .eq("slug", slug)
        .maybeSingle();

      if (collectionError) throw collectionError;
      if (!collectionData) return null;

      const { data: charactersData, error: charactersError } = await supabase
        .from("collection_characters")
        .select("id, name, description, image_url, release_order, release_month, is_catalog, status")
        .eq("collection_id", collectionData.id)
        .order("release_month", { ascending: true, nullsFirst: false });

      if (charactersError) throw charactersError;

      return {
        ...collectionData,
        collection_characters: charactersData || [],
      } as Collection;
    },
    enabled: !!slug,
  });

  // Loading state
  if (isLoading) {
    return (
      <Page title="Carregando..." description="Carregando coleção">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-16">
          <Skeleton className="h-10 w-48 mb-8 bg-[hsl(0,0%,10%)]" />
          <Skeleton className="h-80 w-full mb-8 bg-[hsl(0,0%,10%)]" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] bg-[hsl(0,0%,10%)]" />
            ))}
          </div>
        </div>
      </Page>
    );
  }

  // Not found
  if (!collection) {
    return (
      <Page title="Coleção não encontrada" description="Coleção não encontrada">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <Package className="w-16 h-16 text-[hsl(0,0%,25%)] mx-auto mb-4" />
            <h1
              className="text-3xl font-black tracking-[0.1em] uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
            >
              Coleção não encontrada
            </h1>
            <button
              onClick={() => navigate("/colecoes")}
              className="font-mono text-xs tracking-[0.2em] uppercase text-[hsl(var(--gold-accent))] border border-[hsl(var(--gold-accent)/0.4)] px-6 py-2 hover:bg-[hsl(var(--gold-accent)/0.1)] transition-colors"
            >
              ← Voltar para Coleções
            </button>
          </div>
        </div>
      </Page>
    );
  }

  const safeCharacters = Array.isArray(collection.collection_characters)
    ? collection.collection_characters.filter(
        (c): c is Character => Boolean(c && c.id && c.name)
      )
    : [];

  const currentMonth = new Date().getMonth() + 1;
  const catalogCharacters = safeCharacters.filter((c) => c.is_catalog === true);
  const monthlyCharacters = safeCharacters.filter((c) => c.is_catalog !== true);

  const featuredCharacter =
    monthlyCharacters.find((c) => c.release_month === currentMonth && c.status === "released") ||
    monthlyCharacters.find((c) => c.release_month === currentMonth);

  const releasedCharacters = monthlyCharacters
    .filter((c) => c.status === "released" && c.id !== featuredCharacter?.id)
    .sort((a, b) => (a.release_month || 0) - (b.release_month || 0));

  const upcomingCharacters = monthlyCharacters
    .filter((c) => (c.status === "upcoming" || c.status === "revealed") && c.id !== featuredCharacter?.id)
    .sort((a, b) => (a.release_month || 0) - (b.release_month || 0));

  return (
    <Page
      title={`${collection.name} | Coleção`}
      description={collection.description || `Coleção ${collection.name} - Personagens exclusivos`}
    >
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 px-6 overflow-hidden">
        <FloatingParticles />

        {/* Cover image background */}
        {collection.cover_image_url && (
          <div className="absolute inset-0 z-0">
            <img
              src={collection.cover_image_url}
              alt=""
              className="w-full h-full object-cover opacity-[0.08] blur-sm"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[hsl(0,0%,5%)/0.6] via-[hsl(0,0%,5%)/0.8] to-[hsl(0,0%,5%)]" />
          </div>
        )}

        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04] pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--gold-accent)), transparent 70%)" }}
        />

        <div className="relative max-w-5xl mx-auto z-10">
          {/* Back button */}
          <button
            onClick={() => navigate("/colecoes")}
            className="flex items-center gap-2 mb-8 font-mono text-[10px] tracking-[0.2em] uppercase text-[hsl(0,0%,45%)] hover:text-[hsl(var(--gold-accent))] transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Coleções
          </button>

          {/* Title */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 border border-[hsl(var(--gold-accent)/0.4)] bg-[hsl(var(--gold-accent)/0.05)]">
              <Crown className="w-3 h-3 text-[hsl(var(--gold-accent))]" />
              <span
                className="text-[9px] text-[hsl(var(--gold-accent))] tracking-[0.3em] uppercase"
                style={{ fontFamily: "'Press Start 2P', monospace" }}
              >
                Coleção Exclusiva
              </span>
            </div>

            <h1
              className="text-5xl md:text-7xl lg:text-8xl font-black tracking-[0.15em] mb-4 leading-none"
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                textShadow: "0 0 40px hsl(var(--gold-accent) / 0.15)",
              }}
            >
              <GlitchText text={collection.name} />
            </h1>

            {collection.description && (
              <p
                className="text-[hsl(0,0%,50%)] text-[10px] md:text-xs max-w-lg mx-auto tracking-[0.15em] mb-8"
                style={{ fontFamily: "'Press Start 2P', monospace" }}
              >
                {collection.description}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center justify-center gap-6 md:gap-10 font-mono text-xs">
              {[
                { value: safeCharacters.length, label: "Personagens" },
                { value: releasedCharacters.length + (featuredCharacter ? 1 : 0), label: "Disponíveis" },
                { value: upcomingCharacters.length, label: "Em Breve" },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-6 md:gap-10">
                  {i > 0 && <div className="w-px h-10 bg-[hsl(0,0%,20%)]" />}
                  <div className="text-center">
                    <p className="text-2xl md:text-3xl font-bold text-[hsl(var(--gold-accent))] tabular-nums">
                      {stat.value}
                    </p>
                    <p className="text-[hsl(0,0%,40%)] text-[10px] tracking-widest uppercase mt-1">
                      {stat.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-16 space-y-16">
        {/* Featured Character */}
        {featuredCharacter && (
          <section>
            <ArcadeSectionTitle>Lançamento do Mês</ArcadeSectionTitle>
            <FeaturedCharacterHero character={featuredCharacter} collectionSlug={collection.slug} />
          </section>
        )}

        {/* Released Characters */}
        {releasedCharacters.length > 0 && (
          <section>
            <SectionHeader title="Já Lançados" count={releasedCharacters.length} variant="default" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
              {releasedCharacters.map((character, index) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  index={index}
                  isUpcoming={false}
                  collectionSlug={collection.slug}
                />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Characters */}
        {upcomingCharacters.length > 0 && (
          <section>
            <SectionHeader title="Próximos Lançamentos" count={upcomingCharacters.length} variant="muted" />

            {/* Info banner */}
            <ArcadeCard hover={false} className="mb-6 p-4">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-[hsl(var(--gold-accent)/0.6)] flex-shrink-0" />
                <p className="text-[10px] font-mono text-[hsl(0,0%,45%)] tracking-wider">
                  Novos personagens são lançados todo mês. Assine para ter acesso prioritário!
                </p>
              </div>
            </ArcadeCard>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
              {upcomingCharacters.map((character, index) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  index={index}
                  isUpcoming={true}
                  collectionSlug={collection.slug}
                />
              ))}
            </div>
          </section>
        )}

        {/* Catalog Characters */}
        {catalogCharacters.length > 0 && (
          <section>
            <SectionHeader title="Catálogo Permanente" count={catalogCharacters.length} variant="accent" />

            <ArcadeCard hover={false} className="mb-6 p-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[hsl(var(--gold-accent)/0.6)] flex-shrink-0" />
                <p className="text-[10px] font-mono text-[hsl(0,0%,45%)] tracking-wider">
                  Personagens do catálogo estão sempre disponíveis, independente do mês.
                </p>
              </div>
            </ArcadeCard>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
              {catalogCharacters.map((character, index) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  index={index}
                  isUpcoming={false}
                  collectionSlug={collection.slug}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {safeCharacters.length === 0 && (
          <ArcadeCard hover={false} className="p-12">
            <div className="text-center">
              <Package className="w-16 h-16 text-[hsl(0,0%,20%)] mx-auto mb-4" />
              <p
                className="text-[10px] tracking-[0.2em] uppercase text-[hsl(0,0%,40%)]"
                style={{ fontFamily: "'Press Start 2P', monospace" }}
              >
                Nenhum personagem disponível
              </p>
            </div>
          </ArcadeCard>
        )}
      </div>

      {/* Bottom CTA */}
      <ArcadeCTA
        badge="Assine Agora"
        title="JUNTE-SE AO CLUBE"
        description="Assine e tenha acesso exclusivo a todos os personagens desta coleção com preços especiais."
        primaryAction={{
          label: "Ver Planos",
          href: "/planos",
          icon: <Crown className="w-4 h-4" />,
        }}
        secondaryAction={{
          label: "Ver Coleções",
          href: "/colecoes",
        }}
      />
    </Page>
  );
}
