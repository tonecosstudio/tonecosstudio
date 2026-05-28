/**
 * Character Details Page - Metal Slug Arcade Style (v2)
 *
 * Página completa de detalhes do personagem com estética arcade
 */

import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import {
  type RelatedCharacter,
  useCharacterDetails,
  useRelatedCharacters,
} from "@/hooks/collections/usePublicCollections";
import { Page } from "@/components/layouts/Page";
import {
  ArcadeCard,
  ArcadeSectionTitle,
} from "@/components/arcade/ArcadeLayout";
import { FloatingParticles, GlitchText } from "@/components/arcade/ArcadeEffects";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Coins,
  ShoppingCart,
  Star,
  Shield,
  Zap,
  Package,
  Eye,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Crown,
  Swords,
  Heart,
} from "lucide-react";
import {
  PUBLIC_ROUTES,
  collectionCharacterDetailsPath,
  collectionDetailsPath,
} from "@/config/routes";

// ─── Types ───────────────────────────────────────────────────
// ─── Stat Bar Component ──────────────────────────────────────
function StatBar({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider">
        <span className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]">
          <Icon className="w-3 h-3 text-[hsl(var(--gold-accent))]" />
          {label}
        </span>
        <span className="text-[hsl(var(--gold-accent))]">{value}%</span>
      </div>
      <div className="h-2 bg-[hsl(0,0%,10%)] border border-[hsl(0,0%,15%)] overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[hsl(var(--gold-accent))] to-[hsl(var(--gold-accent)/0.6)] transition-all duration-1000 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ─── Image Gallery ───────────────────────────────────────────
function ImageGallery({ images, name }: { images: string[]; name: string }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="relative aspect-square bg-[hsl(0,0%,6%)] flex items-center justify-center border-2 border-[hsl(0,0%,12%)]">
        <Package className="w-24 h-24 text-[hsl(0,0%,20%)]" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main Image */}
      <div className="relative aspect-square overflow-hidden border-2 border-[hsl(var(--gold-accent)/0.5)] shadow-[0_0_40px_hsl(var(--gold-accent)/0.15)] group">
        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[hsl(var(--gold-accent))] z-20" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[hsl(var(--gold-accent))] z-20" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[hsl(var(--gold-accent))] z-20" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[hsl(var(--gold-accent))] z-20" />

        <img
          src={images[activeIndex]}
          alt={`${name} - ${activeIndex + 1}`}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="eager"
          fetchPriority="high"
        />

        {/* Scanline */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(0 0% 0%) 2px, hsl(0 0% 0%) 4px)",
          }}
        />

        {/* Gradient overlay bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[hsl(0,0%,5%)] to-transparent" />

        {/* Image counter */}
        <div className="absolute bottom-3 left-3 z-10 bg-[hsl(0,0%,5%)/0.8] border border-[hsl(var(--gold-accent)/0.3)] px-3 py-1 font-mono text-[10px] tracking-widest text-[hsl(var(--gold-accent))]">
          <Eye className="w-3 h-3 inline mr-1.5" />
          {activeIndex + 1} / {images.length}
        </div>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setActiveIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-[hsl(0,0%,5%)/0.8] border border-[hsl(var(--gold-accent)/0.3)] flex items-center justify-center hover:bg-[hsl(var(--gold-accent)/0.2)] hover:border-[hsl(var(--gold-accent))] transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-[hsl(var(--gold-accent))]" />
            </button>
            <button
              onClick={() => setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-[hsl(0,0%,5%)/0.8] border border-[hsl(var(--gold-accent)/0.3)] flex items-center justify-center hover:bg-[hsl(var(--gold-accent)/0.2)] hover:border-[hsl(var(--gold-accent))] transition-all"
            >
              <ChevronRight className="w-5 h-5 text-[hsl(var(--gold-accent))]" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`flex-shrink-0 w-16 h-16 border-2 overflow-hidden transition-all duration-300 ${
                i === activeIndex
                  ? "border-[hsl(var(--gold-accent))] shadow-[0_0_12px_hsl(var(--gold-accent)/0.4)]"
                  : "border-[hsl(0,0%,15%)] opacity-50 hover:opacity-80"
              }`}
            >
              <img src={img} alt={`${name} thumb ${i + 1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Related Character Card ──────────────────────────────────
function RelatedCharacterCard({ char, collectionSlug }: { char: RelatedCharacter; collectionSlug: string }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={collectionCharacterDetailsPath(collectionSlug, char.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group block"
    >
      <ArcadeCard hover>
        <div className="relative aspect-[3/4] bg-[hsl(0,0%,8%)] overflow-hidden">
          {char.image_url ? (
            <img
              src={char.image_url}
              alt={char.name}
              className={`w-full h-full object-cover transition-all duration-500 ${
                hovered ? "scale-110 grayscale-0" : "grayscale-[0.5]"
              }`}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-10 h-10 text-[hsl(0,0%,20%)]" />
            </div>
          )}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.05]"
            style={{
              background: "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(0 0% 0%) 2px, hsl(0 0% 0%) 4px)",
            }}
          />
        </div>
        <div className="p-2.5 border-t border-[hsl(0,0%,12%)]">
          <p className={`text-xs font-bold uppercase tracking-tight line-clamp-1 transition-colors ${
            hovered ? "text-[hsl(var(--gold-accent))]" : "text-[hsl(0,0%,80%)]"
          }`}>
            {char.name}
          </p>
        </div>
      </ArcadeCard>
    </Link>
  );
}

// ─── Main Component ──────────────────────────────────────────
export default function CharacterDetailsArcade() {
  const { slug, characterId } = useParams<{ slug: string; characterId: string }>();
  const navigate = useNavigate();

  const { data: character, isLoading } = useCharacterDetails(characterId);
  const { data: relatedChars } = useRelatedCharacters(character?.collection_id, characterId);

  const collectionSlug = character?.collections?.slug || slug || "";
  const collectionName = character?.collections?.name || "";
  const priceCategory = character?.price_categories;

  // Build image list
  const allImages: string[] = [];
  if (character?.image_urls?.length) {
    allImages.push(...character.image_urls);
  } else if (character?.image_url) {
    allImages.push(character.image_url);
  }

  // Generate pseudo-random stat values based on character name for visual flair
  const nameHash = (character?.name || "").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const stats = {
    detail: 70 + (nameHash % 30),
    rarity: 50 + ((nameHash * 3) % 50),
    power: 60 + ((nameHash * 7) % 40),
  };

  // ─── Loading ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Page title="Carregando..." description="Carregando detalhes do personagem">
        <div className="container max-w-6xl mx-auto px-4 py-12">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid md:grid-cols-2 gap-10">
            <Skeleton className="aspect-square" />
            <div className="space-y-4">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </Page>
    );
  }

  // ─── Not Found ───────────────────────────────────────────────
  if (!character) {
    return (
      <Page title="Personagem não encontrado" description="O personagem solicitado não foi encontrado">
        <div className="flex items-center justify-center py-32">
          <div className="text-center space-y-6">
            <div className="text-6xl mb-4">💀</div>
            <GlitchText
              text="PERSONAGEM NÃO ENCONTRADO"
              className="text-xl md:text-2xl font-bold tracking-wider"
            />
            <p className="text-sm text-[hsl(var(--muted-foreground))] font-mono">
              Este personagem pode ter sido removido ou o link está incorreto.
            </p>
            <Button
              onClick={() => navigate(slug ? collectionDetailsPath(slug) : PUBLIC_ROUTES.collections)}
              className="bg-[hsl(var(--gold-accent))] text-[hsl(var(--background))] font-mono uppercase tracking-wider hover:bg-[hsl(var(--gold-accent)/0.9)]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Coleção
            </Button>
          </div>
        </div>
      </Page>
    );
  }

  // ─── Main Render ─────────────────────────────────────────────
  return (
    <Page
      title={`${character.name} | ${collectionName}`}
      description={character.description || `Detalhes do personagem ${character.name} da coleção ${collectionName}`}
    >
      <FloatingParticles />

      {/* Hero Banner */}
      <div className="relative overflow-hidden border-b border-[hsl(var(--gold-accent)/0.2)]">
        {/* Background blur image */}
        {allImages[0] && (
          <div
            className="absolute inset-0 bg-cover bg-center blur-3xl opacity-[0.08] scale-125"
            style={{ backgroundImage: `url(${allImages[0]})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(0,0%,5%)/0.5] via-transparent to-[hsl(0,0%,5%)]" />

        <div className="container max-w-6xl mx-auto px-4 pt-6 pb-4 relative z-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-4">
            <Link to={PUBLIC_ROUTES.collections} className="hover:text-[hsl(var(--gold-accent))] transition-colors">
              Coleções
            </Link>
            <span className="text-[hsl(0,0%,25%)]">/</span>
            <Link to={collectionDetailsPath(collectionSlug)} className="hover:text-[hsl(var(--gold-accent))] transition-colors">
              {collectionName}
            </Link>
            <span className="text-[hsl(0,0%,25%)]">/</span>
            <span className="text-[hsl(var(--gold-accent))]">{character.name}</span>
          </nav>

          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(collectionDetailsPath(collectionSlug))}
            className="font-mono uppercase tracking-wider text-[10px] hover:text-[hsl(var(--gold-accent))] border border-[hsl(0,0%,15%)] hover:border-[hsl(var(--gold-accent)/0.5)] h-8 px-3"
          >
            <ArrowLeft className="w-3 h-3 mr-1.5" />
            Voltar
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-6xl mx-auto px-4 py-8 md:py-12">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Left: Image Gallery */}
          <ImageGallery images={allImages} name={character.name} />

          {/* Right: Info */}
          <div className="space-y-6">
            {/* Title Block */}
            <div>
              {character.franchise && (
                <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[hsl(var(--gold-accent)/0.7)] mb-1 block">
                  {character.franchise}
                </span>
              )}
              <h1
                className="text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-tight text-[hsl(0,0%,95%)] leading-none"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
              >
                {character.name}
              </h1>
              <Link
                to={collectionDetailsPath(collectionSlug)}
                className="inline-flex items-center gap-1.5 mt-2 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold-accent))] transition-colors font-mono uppercase tracking-wider"
              >
                <Crown className="w-3 h-3" />
                {collectionName}
              </Link>
            </div>

            {/* Status + Category Badges */}
            <div className="flex flex-wrap gap-2">
              {character.status === "released" && (
                <Badge className="bg-green-900/30 text-green-400 border border-green-800/50 font-mono uppercase tracking-wider text-[10px] px-3">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Disponível
                </Badge>
              )}
              {character.is_catalog && priceCategory?.display_name && (
                <Badge className="bg-[hsl(var(--gold-accent)/0.15)] text-[hsl(var(--gold-accent))] border border-[hsl(var(--gold-accent)/0.3)] font-mono uppercase tracking-wider text-[10px] px-3">
                  <Star className="w-3 h-3 mr-1" />
                  {priceCategory.display_name}
                </Badge>
              )}
            </div>

            {/* Description */}
            {character.description && (
              <div className="bg-[hsl(0,0%,6%)] border border-[hsl(0,0%,12%)] p-5 relative overflow-hidden">
                <div
                  className="absolute inset-0 pointer-events-none opacity-[0.02]"
                  style={{
                    background: "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(0 0% 100%) 2px, hsl(0 0% 100%) 4px)",
                  }}
                />
                <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed relative z-10">
                  {character.description}
                </p>
              </div>
            )}

            {/* Stats (Visual Flair) */}
            <div className="bg-[hsl(0,0%,6%)] border border-[hsl(0,0%,12%)] p-5 space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-[hsl(var(--gold-accent))] mb-3 flex items-center gap-2">
                <Swords className="w-3.5 h-3.5" />
                Atributos
              </h3>
              <StatBar label="Detalhamento" value={stats.detail} icon={Eye} />
              <StatBar label="Raridade" value={stats.rarity} icon={Star} />
              <StatBar label="Poder" value={stats.power} icon={Zap} />
            </div>

            {/* Pricing Card */}
            <div className="bg-[hsl(0,0%,6%)] border-2 border-[hsl(var(--gold-accent)/0.3)] p-6 space-y-4 relative overflow-hidden">
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.02]"
                style={{
                  background: "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--gold-accent)) 2px, hsl(var(--gold-accent)) 4px)",
                }}
              />

              <h3 className="text-sm font-bold uppercase tracking-[0.2em] font-mono text-[hsl(var(--gold-accent))] relative z-10 flex items-center gap-2">
                <Coins className="w-4 h-4" />
                Preços
              </h3>

              {priceCategory?.price_coins ? (
                <div className="flex items-center justify-between p-3 bg-[hsl(0,0%,4%)] border border-[hsl(var(--gold-accent)/0.2)] relative z-10">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-[hsl(var(--gold-accent))]" />
                    <span className="font-mono text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Com Coins
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-[hsl(var(--gold-accent))] font-mono tabular-nums">
                    {priceCategory.price_coins}
                  </span>
                </div>
              ) : null}

              {priceCategory?.price_standalone ? (
                <div className="flex items-center justify-between p-3 bg-[hsl(0,0%,4%)] border border-[hsl(0,0%,12%)] relative z-10">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                    <span className="font-mono text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Avulso
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-[hsl(0,0%,90%)] font-mono tabular-nums">
                    R$ {(priceCategory.price_standalone / 100).toFixed(0)}
                  </span>
                </div>
              ) : null}

              {!priceCategory && (
                <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono relative z-10">
                  Preço disponível em breve
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full bg-[hsl(var(--gold-accent))] text-[hsl(var(--background))] hover:bg-[hsl(var(--gold-accent)/0.9)] font-mono uppercase tracking-wider text-xs h-12 shadow-[0_0_20px_hsl(var(--gold-accent)/0.3)] hover:shadow-[0_0_30px_hsl(var(--gold-accent)/0.5)] transition-all"
              >
                <Coins className="w-5 h-5 mr-2" />
                Comprar com Coins
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="w-full border-[hsl(var(--gold-accent)/0.4)] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.1)] hover:border-[hsl(var(--gold-accent))] font-mono uppercase tracking-wider text-xs h-12 transition-all"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Comprar Avulso
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Shield, label: "Qualidade Premium" },
                { icon: Zap, label: "Produção Rápida" },
                { icon: Heart, label: "Feito à Mão" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="text-center p-3 bg-[hsl(0,0%,6%)] border border-[hsl(0,0%,12%)] hover:border-[hsl(var(--gold-accent)/0.3)] transition-colors"
                >
                  <Icon className="w-5 h-5 mx-auto mb-1.5 text-[hsl(var(--gold-accent))]" />
                  <p className="text-[9px] font-mono uppercase tracking-wider text-[hsl(var(--muted-foreground))] leading-tight">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Related Characters */}
        {relatedChars && relatedChars.length > 0 && (
          <section className="mt-16 md:mt-24">
            <ArcadeSectionTitle>Outros Personagens</ArcadeSectionTitle>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-8">
              {relatedChars.map((char) => (
                <RelatedCharacterCard
                  key={char.id}
                  char={char}
                  collectionSlug={collectionSlug}
                />
              ))}
            </div>

            <div className="text-center mt-8">
              <Link
                to={collectionDetailsPath(collectionSlug)}
                className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[hsl(var(--gold-accent))] hover:text-[hsl(var(--gold-accent)/0.8)] transition-colors border border-[hsl(var(--gold-accent)/0.3)] hover:border-[hsl(var(--gold-accent))] px-6 py-3"
              >
                Ver toda a coleção
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </section>
        )}
      </div>
    </Page>
  );
}
