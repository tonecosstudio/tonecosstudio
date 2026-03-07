// @ts-nocheck
/**
 * Metal Slug-style Collections Gallery
 * 
 * Arcade aesthetic with military typography, CRT scanlines,
 * neon accents and pixel-art inspired UI elements.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  Star,
  Users,
  Sparkles,
  Crown,
  Zap,
  Shield,
  Coins,
  Lock,
  Gift,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────
type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  character_count?: number;
};

type CatalogCharacter = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_catalog: boolean;
  price_category_id: string | null;
  price_category_name?: string | null;
  price_category_display_name: string | null;
  price_coins: number | null;
  price_standalone: number | null;
  price_category_order?: number;
  status: string;
};

type CatalogGroup = {
  name: string;
  order: number;
  characters: CatalogCharacter[];
};

// ─── Collection Card Component ───────────────────────────────
function CollectionCard({ collection, index }: { collection: Collection; index: number }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      to={`/colecoes/${collection.slug}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group block"
    >
      <div
        className={`
          relative overflow-hidden rounded-sm border-2 transition-all duration-300
          ${
            isHovered
              ? "border-[hsl(var(--gold-accent))] shadow-[0_0_30px_hsl(var(--gold-accent)/0.4)] scale-105"
              : "border-[hsl(var(--border))] hover:border-[hsl(var(--gold-accent)/0.5)]"
          }
        `}
        style={{
          clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)",
        }}
      >
        {/* Image Container */}
        <div className="relative aspect-[4/3] bg-[hsl(var(--muted))] overflow-hidden">
          {collection.image_url ? (
            <img
              src={collection.image_url}
              alt={collection.name}
              className={`w-full h-full object-cover transition-all duration-500 ${
                isHovered 
                  ? "scale-110 grayscale-0" 
                  : "scale-100 grayscale"
              }`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[hsl(var(--muted))] to-[hsl(var(--muted)/0.5)]">
              <Package className="w-20 h-20 text-[hsl(var(--muted-foreground)/0.3)]" />
            </div>
          )}

          {/* Scanline overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              background:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(0 0% 0% / 0.3) 2px, hsl(0 0% 0% / 0.3) 4px)",
            }}
          />

          {/* Glow overlay on hover */}
          {isHovered && (
            <div className="absolute inset-0 bg-[hsl(var(--gold-accent)/0.15)] pointer-events-none" />
          )}

          {/* Number tag */}
          <div className="absolute top-3 left-3 bg-[hsl(var(--foreground)/0.85)] text-[hsl(var(--background))] px-3 py-1 text-xs font-mono font-bold tracking-wider">
            #{String(index + 1).padStart(2, "0")}
          </div>

          {/* Character count badge */}
          {collection.character_count !== undefined && (
            <div className="absolute top-3 right-3 bg-[hsl(var(--gold-accent))] text-[hsl(var(--foreground))] px-3 py-1 text-xs font-mono font-bold tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3" />
              {collection.character_count}
            </div>
          )}

          {/* Corner accents */}
          <div className="absolute bottom-0 right-5 w-4 h-4 border-r-2 border-b-2 border-[hsl(var(--gold-accent))] opacity-50" />
        </div>

        {/* Info Panel */}
        <div className="relative p-5 bg-[hsl(var(--card))]">
          {/* Corner accent */}
          <div className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 border-[hsl(var(--gold-accent)/0.5)]" />

          <div className="space-y-3">
            {/* Title */}
            <h3
              className={`text-xl font-bold uppercase tracking-tight transition-colors duration-300 ${
                isHovered ? "text-[hsl(var(--gold-accent))]" : "text-[hsl(var(--foreground))]"
              }`}
            >
              {collection.name}
            </h3>

            {/* Description */}
            {collection.description && (
              <p className="text-sm text-[hsl(var(--muted-foreground))] font-mono leading-relaxed line-clamp-2">
                {collection.description}
              </p>
            )}

            {/* Action Button */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-xs font-mono text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                <Star className="w-3 h-3 text-[hsl(var(--gold-accent))]" />
                <span>Disponível</span>
              </div>

              <Button
                size="sm"
                className={`
                  font-mono uppercase tracking-wider text-xs rounded-sm transition-all duration-300
                  ${
                    isHovered
                      ? "bg-[hsl(var(--gold-accent))] text-[hsl(var(--foreground))]"
                      : "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                  }
                `}
              >
                Explorar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Stats Panel Component ───────────────────────────────────
function StatsPanel({ collections }: { collections: Collection[] }) {
  const totalCharacters = collections.reduce((acc, c) => acc + (c.character_count || 0), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        {
          icon: Package,
          label: "Coleções",
          value: collections.length,
          color: "text-blue-500",
        },
        {
          icon: Users,
          label: "Personagens",
          value: totalCharacters,
          color: "text-[hsl(var(--gold-accent))]",
        },
        {
          icon: Crown,
          label: "Exclusivos",
          value: totalCharacters,
          color: "text-purple-500",
        },
      ].map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div
            key={i}
            className="relative border border-[hsl(var(--border))] bg-[hsl(var(--card))] rounded-sm p-4 overflow-hidden"
            style={{
              clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)",
            }}
          >
            {/* Corner accent */}
            <div className="absolute top-0 right-3 w-3 h-3 border-r-2 border-t-2 border-[hsl(var(--gold-accent)/0.5)]" />

            {/* Scanline */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.04]"
              style={{
                background:
                  "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(0 0% 50% / 0.4) 2px, hsl(0 0% 50% / 0.4) 4px)",
              }}
            />

            <div className="relative z-10 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-sm bg-[hsl(var(--muted))] flex items-center justify-center ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-3xl font-bold font-mono">{stat.value}</div>
                <div className="text-xs font-mono text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Catalog Character Card Component ────────────────────────
function CatalogCharacterCard({ character, index }: { character: CatalogCharacter; index: number }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      to={`/personagem/${character.id}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group block"
    >
      <div
        className={`
          relative overflow-hidden rounded-sm border-2 transition-all duration-300 cursor-pointer
          ${
            isHovered
              ? "border-[hsl(var(--gold-accent))] shadow-[0_0_20px_hsl(var(--gold-accent)/0.3)] scale-105"
              : "border-[hsl(var(--border))]"
          }
        `}
        style={{
          clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%)",
        }}
      >
        {/* Image Container */}
        <div className="relative aspect-[3/4] bg-[hsl(var(--muted))] overflow-hidden">
          {character.image_url ? (
            <img
              src={character.image_url}
              alt={character.name}
              className={`w-full h-full object-cover transition-all duration-500 ${
                isHovered 
                  ? "scale-110 grayscale-0" 
                  : "scale-100 grayscale"
              }`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[hsl(var(--muted))] to-[hsl(var(--muted)/0.5)]">
              <Gift className="w-16 h-16 text-[hsl(var(--muted-foreground)/0.3)]" />
            </div>
          )}

          {/* Scanline overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              background:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(0 0% 0% / 0.3) 2px, hsl(0 0% 0% / 0.3) 4px)",
            }}
          />

          {/* Glow overlay on hover */}
          {isHovered && (
            <div className="absolute inset-0 bg-[hsl(var(--gold-accent)/0.15)] pointer-events-none" />
          )}

          {/* Number tag */}
          <div className="absolute top-2 left-2 bg-[hsl(var(--foreground)/0.85)] text-[hsl(var(--background))] px-2 py-1 text-xs font-mono font-bold tracking-wider">
            #{String(index + 1).padStart(2, "0")}
          </div>

          {/* Category badge */}
          {character.price_category_display_name && (
            <div className="absolute top-2 right-2 bg-[hsl(var(--gold-accent))] text-[hsl(var(--foreground))] px-2 py-1 text-xs font-mono font-bold tracking-wider">
              {character.price_category_display_name}
            </div>
          )}

          {/* Price badges */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
            {/* Coins price */}
            {character.price_coins && (
              <div className="bg-[hsl(var(--gold-accent))] text-[hsl(var(--foreground))] px-2 py-1 text-xs font-mono font-bold flex items-center gap-1 rounded-sm">
                <Coins className="w-3 h-3" />
                {character.price_coins}
              </div>
            )}
            
            {/* Standalone price */}
            {character.price_standalone && (
              <div className="bg-[hsl(var(--foreground)/0.9)] text-[hsl(var(--background))] px-2 py-1 text-xs font-mono font-bold rounded-sm">
                R$ {(character.price_standalone / 100).toFixed(0)}
              </div>
            )}
          </div>
        </div>

        {/* Info Panel */}
        <div className="relative p-3 bg-[hsl(var(--card))]">
          <h4
            className={`text-sm font-bold uppercase tracking-tight transition-colors duration-300 line-clamp-1 ${
              isHovered ? "text-[hsl(var(--gold-accent))]" : "text-[hsl(var(--foreground))]"
            }`}
          >
            {character.name}
          </h4>
        </div>
      </div>
    </Link>
  );
}

// ─── Subscription CTA Component ──────────────────────────────
function SubscriptionCTA() {
  return (
    <section className="py-16 relative overflow-hidden">
      {/* Background effects */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="container max-w-5xl mx-auto px-4 relative z-10">
        <div
          className="relative border-2 border-[hsl(var(--gold-accent))] bg-[hsl(var(--card))] rounded-sm p-8 md:p-12 overflow-hidden"
          style={{
            clipPath: "polygon(0 0, calc(100% - 30px) 0, 100% 30px, 100% 100%, 30px 100%, 0 calc(100% - 30px))",
          }}
        >
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-[hsl(var(--gold-accent))]" />
          <div className="absolute top-0 right-7 w-6 h-6 border-r-2 border-t-2 border-[hsl(var(--gold-accent))]" />
          <div className="absolute bottom-0 left-7 w-6 h-6 border-l-2 border-b-2 border-[hsl(var(--gold-accent))]" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-[hsl(var(--gold-accent))]" />

          {/* Scanline */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              background:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(0 0% 50% / 0.4) 2px, hsl(0 0% 50% / 0.4) 4px)",
            }}
          />

          {/* Content */}
          <div className="relative z-10 text-center space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-sm bg-[hsl(var(--gold-accent))] flex items-center justify-center">
                <Crown className="w-8 h-8 text-[hsl(var(--foreground))]" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-tight">
                <span className="text-[hsl(var(--gold-accent))]">Assine</span>{" "}
                <span className="text-[hsl(var(--foreground))]">e Tenha Acesso</span>
              </h2>
              <p className="text-sm md:text-base text-[hsl(var(--muted-foreground))] font-mono max-w-2xl mx-auto">
                Desbloqueie todas as coleções e personagens exclusivos com preços especiais para assinantes
              </p>
            </div>

            {/* Benefits */}
            <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {[
                {
                  icon: Coins,
                  title: "Sistema de Coins",
                  desc: "Pague com coins e economize",
                },
                {
                  icon: Star,
                  title: "Preços Especiais",
                  desc: "200-300 coins por personagem",
                },
                {
                  icon: Gift,
                  title: "Acesso ao Catálogo",
                  desc: "Personagens exclusivos",
                },
              ].map((benefit, i) => {
                const Icon = benefit.icon;
                return (
                  <div
                    key={i}
                    className="relative border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.5)] rounded-sm p-4"
                  >
                    <Icon className="w-6 h-6 text-[hsl(var(--gold-accent))] mx-auto mb-2" />
                    <h3 className="text-sm font-bold uppercase mb-1">{benefit.title}</h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono">{benefit.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Button
                asChild
                size="lg"
                className="bg-[hsl(var(--gold-accent))] text-[hsl(var(--foreground))] hover:brightness-110 font-mono uppercase tracking-wider text-sm rounded-sm px-8"
              >
                <Link to="/planos">
                  <Crown className="w-4 h-4 mr-2" />
                  Ver Planos
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="font-mono uppercase tracking-wider text-sm rounded-sm border-[hsl(var(--gold-accent)/0.5)] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.1)] px-8"
              >
                <Link to="/personagens">
                  <Shield className="w-4 h-4 mr-2" />
                  Ver Personagens
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="container max-w-7xl mx-auto px-4 py-16 space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-sm" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-80 rounded-sm" />
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function CollectionsArcade() {
  const { data: collections, isLoading } = useQuery({
    queryKey: ["collections-arcade"],
    queryFn: async () => {
      // Fetch collections
      const { data: collectionsData, error: collectionsError } = await supabase
        .from("collections")
        .select("id, name, slug, description, image_url, is_active")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (collectionsError) throw collectionsError;

      // Fetch character counts for each collection
      const collectionsWithCounts = await Promise.all(
        (collectionsData || []).map(async (collection) => {
          const { count, error: countError } = await supabase
            .from("collection_characters")
            .select("*", { count: "exact", head: true })
            .eq("collection_id", collection.id)
            .eq("is_catalog", false); // Only collection characters, not catalog

          if (countError) {
            console.error("Error counting characters:", countError);
            return { ...collection, character_count: 0 };
          }

          return { ...collection, character_count: count || 0 };
        })
      );

      return collectionsWithCounts as Collection[];
    },
  });

  // Fetch catalog characters
  const { data: catalogCharacters, isLoading: isLoadingCatalog } = useQuery({
    queryKey: ["catalog-characters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_characters")
        .select(`
          id,
          name,
          description,
          image_url,
          is_catalog,
          price_category_id,
          status,
          price_categories (
            name,
            display_name,
            price_coins,
            price_standalone,
            display_order
          )
        `)
        .eq("is_catalog", true)
        .eq("status", "released")
        .order("name", { ascending: true });

      if (error) throw error;

      // Transform data
      const characters = (data || []).map((char: any) => ({
        ...char,
        price_category_name: char.price_categories?.name,
        price_category_display_name: char.price_categories?.display_name,
        price_coins: char.price_categories?.price_coins,
        price_standalone: char.price_categories?.price_standalone,
        price_category_order: char.price_categories?.display_order || 999,
        price_categories: undefined,
      })) as CatalogCharacter[];

      // Group by category
      const grouped = characters.reduce((acc: any, char) => {
        const category = char.price_category_display_name || "Outros";
        if (!acc[category]) {
          acc[category] = {
            name: category,
            order: char.price_category_order,
            characters: [],
          };
        }
        acc[category].characters.push(char);
        return acc;
      }, {});

      // Convert to array and sort by order
      return Object.values(grouped).sort((a: any, b: any) => a.order - b.order);
    },
  });

  return (
    <AppShell>
      <SEOHead
        title="Coleções - Arcade Gallery"
        description="Explore nossas coleções exclusivas de personagens artesanais no estilo arcade clássico."
        keywords={["coleções", "personagens", "arcade", "exclusivo"]}
      />

      <div className="min-h-screen bg-[hsl(var(--background))] relative overflow-hidden">
        {/* Global Scanlines */}
        <div
          className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(0 0% 50% / 0.5) 2px, hsl(0 0% 50% / 0.5) 4px)",
          }}
        />

        {/* Hero Header */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          {/* Background grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          <div className="container max-w-7xl mx-auto px-4 relative z-10">
            <div className="text-center space-y-4">
              {/* Top decoration */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="h-px w-12 bg-[hsl(var(--gold-accent))]" />
                <Sparkles className="w-5 h-5 text-[hsl(var(--gold-accent))] animate-pulse" />
                <div className="h-px w-12 bg-[hsl(var(--gold-accent))]" />
              </div>

              <h1
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold uppercase tracking-tight"
                style={{
                  textShadow: "0 0 40px hsl(var(--gold-accent) / 0.2)",
                }}
              >
                <span className="text-[hsl(var(--gold-accent))]">Arcade</span>{" "}
                <span className="text-[hsl(var(--foreground))]">Collections</span>
              </h1>

              <p className="font-mono text-sm sm:text-base text-[hsl(var(--muted-foreground))] uppercase tracking-[0.2em] max-w-2xl mx-auto">
                Explore coleções exclusivas de personagens artesanais
              </p>

              {/* Quick Actions */}
              <div className="flex items-center justify-center gap-3 pt-6">
                <Button
                  asChild
                  size="sm"
                  className="bg-[hsl(var(--gold-accent))] text-[hsl(var(--foreground))] hover:brightness-110 font-mono uppercase tracking-wider text-xs rounded-sm"
                >
                  <Link to="/personagens">
                    <Shield className="w-4 h-4 mr-2" />
                    Ver Personagens
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="font-mono uppercase tracking-wider text-xs rounded-sm border-[hsl(var(--gold-accent)/0.5)] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.1)]"
                >
                  <Link to="/planos">
                    <Coins className="w-4 h-4 mr-2" />
                    Ver Planos
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        {!isLoading && collections && collections.length > 0 && (
          <section className="py-8">
            <div className="container max-w-7xl mx-auto px-4">
              <StatsPanel collections={collections} />
            </div>
          </section>
        )}

        {/* Collections Grid */}
        <section className="py-12">
          <div className="container max-w-7xl mx-auto px-4">
            {/* Section Header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-6 h-6 border-l-2 border-t-2 border-[hsl(var(--gold-accent))]" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight">
                  Todas as Coleções
                </h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))] font-mono mt-1">
                  {collections?.length || 0} coleções disponíveis
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 ml-auto">
                <div className="w-6 h-6 border-r-2 border-t-2 border-[hsl(var(--gold-accent))]" />
              </div>
            </div>

            {/* Grid */}
            {isLoading ? (
              <LoadingSkeleton />
            ) : collections && collections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map((collection, index) => (
                  <CollectionCard key={collection.id} collection={collection} index={index} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <Package className="w-16 h-16 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
                <h3 className="text-2xl font-bold uppercase mb-2">Nenhuma coleção disponível</h3>
                <p className="text-[hsl(var(--muted-foreground))] font-mono text-sm">
                  Novas coleções em breve. Fique ligado!
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Subscription CTA */}
        <SubscriptionCTA />

        {/* Catalog Section */}
        {catalogCharacters && catalogCharacters.length > 0 && (
          <section className="py-12 pb-24">
            <div className="container max-w-7xl mx-auto px-4">
              {/* Section Header */}
              <div className="flex items-center gap-4 mb-8">
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-6 h-6 border-l-2 border-t-2 border-[hsl(var(--gold-accent))]" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight">
                    Catálogo Exclusivo
                  </h2>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] font-mono mt-1">
                    Personagens avulsos organizados por categoria
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-2 ml-auto">
                  <div className="w-6 h-6 border-r-2 border-t-2 border-[hsl(var(--gold-accent))]" />
                </div>
              </div>

              {/* Catalog by Tier */}
              <div className="space-y-12">
                {catalogCharacters.map((group: CatalogGroup, groupIndex: number) => (
                  <div key={groupIndex}>
                    {/* Tier Header */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-l-2 border-b-2 border-[hsl(var(--gold-accent)/0.5)]" />
                      </div>
                      <h3 className="text-xl font-bold uppercase tracking-tight text-[hsl(var(--gold-accent))]">
                        {group.name}
                      </h3>
                      <div className="flex-1 h-px bg-[hsl(var(--border))]" />
                      <Badge
                        variant="outline"
                        className="font-mono text-xs border-[hsl(var(--gold-accent)/0.5)] text-[hsl(var(--gold-accent))]"
                      >
                        {group.characters.length} personagens
                      </Badge>
                    </div>

                    {/* Characters Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {group.characters.map((character: CatalogCharacter, charIndex: number) => (
                        <CatalogCharacterCard
                          key={character.id}
                          character={character}
                          index={charIndex}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Bottom HUD bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[hsl(var(--card)/0.95)] backdrop-blur-sm border-t border-[hsl(var(--border))]">
          <div className="container max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs font-mono text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Online
              </span>
              <span className="hidden sm:inline">{collections?.length || 0} coleções ativas</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="font-mono text-xs uppercase tracking-wider rounded-sm"
              >
                <Link to="/personagens">
                  <Zap className="w-3 h-3 mr-2" />
                  Personagens
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
