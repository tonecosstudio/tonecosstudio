/**
 * Character Details Page - Metal Slug Style
 * 
 * Página de detalhes do personagem com estética arcade
 * Route: /colecoes/:slug/:characterId
 */

import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArcadePage,
  ArcadeCard,
  FloatingParticles,
  GlitchText,
} from "@/components/arcade/ArcadeLayout";
import SEOHead from "@/components/SEOHead";
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
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────
type CharacterData = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  status: string;
  is_catalog: boolean;
  collection_id: string;
  price_category_id: string | null;
  price_categories: {
    display_name: string;
    price_coins: number;
    price_standalone: number;
  } | null;
  collections: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export default function CharacterDetails() {
  const { slug, characterId } = useParams<{ slug: string; characterId: string }>();
  const navigate = useNavigate();

  const { data: character, isLoading } = useQuery({
    queryKey: ["character-details", characterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_characters")
        .select(`
          id, name, description, image_url, status, is_catalog, collection_id, price_category_id,
          price_categories (display_name, price_coins, price_standalone),
          collections (id, name, slug)
        `)
        .eq("id", characterId)
        .maybeSingle();

      if (error) throw error;
      return data as CharacterData | null;
    },
    enabled: !!characterId,
  });

  const collectionSlug = character?.collections?.slug || slug || "";
  const collectionName = character?.collections?.name || "";
  const priceCategory = character?.price_categories;

  if (isLoading) {
    return (
      <ArcadePage>
        <SEOHead title="Carregando..." />
        <div className="container max-w-6xl mx-auto px-4 py-12">
          <Skeleton className="h-12 w-48 mb-8" />
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </ArcadePage>
    );
  }

  if (!character) {
    return (
      <ArcadePage>
        <SEOHead title="Personagem não encontrado" />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <GlitchText className="text-2xl font-bold mb-4 font-mono">
              PERSONAGEM NÃO ENCONTRADO
            </GlitchText>
            <Button
              onClick={() => navigate(slug ? `/colecoes/${slug}` : "/colecoes")}
              className="bg-[hsl(var(--gold-accent))] text-[hsl(var(--foreground))] font-mono uppercase tracking-wider"
            >
              Voltar para Coleção
            </Button>
          </div>
        </div>
      </ArcadePage>
    );
  }

  return (
    <ArcadePage>
      <SEOHead
        title={character.name}
        description={character.description || `Detalhes do personagem ${character.name}`}
      />

      <FloatingParticles count={15} />

      <div className="container max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(`/colecoes/${collectionSlug}`)}
          className="mb-6 font-mono uppercase tracking-wider text-xs hover:text-[hsl(var(--gold-accent))] border border-[hsl(var(--border))] hover:border-[hsl(var(--gold-accent)/0.5)]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para {collectionName || "Coleção"}
        </Button>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Image Section */}
          <div className="relative">
            <div
              className="relative aspect-square rounded-sm overflow-hidden border-2 border-[hsl(var(--gold-accent))] shadow-[0_0_30px_hsl(var(--gold-accent)/0.3)]"
              style={{
                clipPath: "polygon(0 0, 100% 0, 100% 90%, 85% 100%, 0 100%)",
              }}
            >
              {character.image_url ? (
                <img
                  src={character.image_url}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[hsl(var(--muted))] flex items-center justify-center">
                  <Package className="w-24 h-24 text-[hsl(var(--muted-foreground))]" />
                </div>
              )}

              {/* Corner Accents */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[hsl(var(--gold-accent))]" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[hsl(var(--gold-accent))]" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[hsl(var(--gold-accent))]" />
            </div>

            {/* Category Badge */}
            {character.is_catalog && priceCategory?.display_name && (
              <div className="absolute -top-3 -right-3 z-10">
                <Badge className="bg-[hsl(var(--gold-accent))] text-[hsl(var(--background))] font-mono uppercase tracking-wider px-4 py-2 text-sm border-2 border-[hsl(var(--foreground))]">
                  <Star className="w-4 h-4 mr-1" />
                  {priceCategory.display_name}
                </Badge>
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="space-y-6">
            {/* Title */}
            <div>
              <GlitchText className="text-4xl md:text-5xl font-bold uppercase tracking-tight mb-2 font-mono">
                {character.name}
              </GlitchText>
              {collectionName && (
                <Link
                  to={`/colecoes/${collectionSlug}`}
                  className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold-accent))] transition-colors font-mono uppercase tracking-wider"
                >
                  {collectionName}
                </Link>
              )}
            </div>

            {/* Description */}
            {character.description && (
              <ArcadeCard>
                <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                  {character.description}
                </p>
              </ArcadeCard>
            )}

            {/* Pricing Card */}
            <div className="bg-[hsl(var(--card))] border-2 border-[hsl(var(--gold-accent)/0.3)] rounded-sm p-6 space-y-4 relative overflow-hidden">
              {/* Scanline effect inside card */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.02]">
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--foreground)) 2px, hsl(var(--foreground)) 4px)",
                  }}
                />
              </div>

              <h3 className="text-lg font-bold uppercase tracking-wider font-mono text-[hsl(var(--gold-accent))] relative z-10">
                ⚡ Preços
              </h3>

              {/* Coins Price */}
              {priceCategory?.price_coins ? (
                <div className="flex items-center justify-between p-3 bg-[hsl(var(--background))] rounded-sm border border-[hsl(var(--gold-accent)/0.2)] relative z-10">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-[hsl(var(--gold-accent))]" />
                    <span className="font-mono text-sm uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Com Coins
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-[hsl(var(--gold-accent))] font-mono">
                    {priceCategory.price_coins}
                  </span>
                </div>
              ) : null}

              {/* Standalone Price */}
              {priceCategory?.price_standalone ? (
                <div className="flex items-center justify-between p-3 bg-[hsl(var(--background))] rounded-sm border border-[hsl(var(--border))] relative z-10">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                    <span className="font-mono text-sm uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Avulso
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-[hsl(var(--foreground))] font-mono">
                    R$ {(priceCategory.price_standalone / 100).toFixed(0)}
                  </span>
                </div>
              ) : null}

              {!priceCategory && (
                <p className="text-sm text-[hsl(var(--muted-foreground))] font-mono relative z-10">
                  Preço disponível em breve
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full bg-[hsl(var(--gold-accent))] text-[hsl(var(--background))] hover:bg-[hsl(var(--gold-accent)/0.9)] font-mono uppercase tracking-wider text-sm h-12 shadow-[0_0_15px_hsl(var(--gold-accent)/0.3)]"
              >
                <Coins className="w-5 h-5 mr-2" />
                Comprar com Coins
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="w-full border-[hsl(var(--gold-accent)/0.5)] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.1)] font-mono uppercase tracking-wider text-sm h-12"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Comprar Avulso
              </Button>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-3">
              <ArcadeCard className="text-center p-4">
                <Shield className="w-6 h-6 mx-auto mb-2 text-[hsl(var(--gold-accent))]" />
                <p className="text-xs font-mono uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Qualidade Premium
                </p>
              </ArcadeCard>
              <ArcadeCard className="text-center p-4">
                <Zap className="w-6 h-6 mx-auto mb-2 text-[hsl(var(--gold-accent))]" />
                <p className="text-xs font-mono uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Entrega Rápida
                </p>
              </ArcadeCard>
            </div>
          </div>
        </div>
      </div>
    </ArcadePage>
  );
}
