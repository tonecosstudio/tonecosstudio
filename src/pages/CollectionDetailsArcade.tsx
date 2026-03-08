/**
 * Collection Details Page - Metal Slug Style
 * 
 * Página interna da coleção com estética arcade
 */

import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import AppShell from "@/components/AppShell";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Users,
  Star,
  Package,
  Coins,
  ShoppingCart,
  Crown,
  Sparkles,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────
type Character = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  release_order: number;
  release_month: number | null;
  status: string;
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

// ─── Character Card Component ────────────────────────────────
function CharacterCard({ 
  character, 
  index, 
  isUpcoming = false 
}: { 
  character: Character; 
  index: number;
  isUpcoming?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      to={isUpcoming ? "#" : `/personagem/${character.id}`}
      onClick={(e) => isUpcoming && e.preventDefault()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group block ${isUpcoming ? 'cursor-not-allowed' : ''}`}
    >
      <div
        className={`
          relative overflow-hidden rounded-sm border-2 transition-all duration-500
          ${
            isUpcoming
              ? "border-[hsl(var(--border))] opacity-60"
              : isHovered
              ? "border-[hsl(var(--gold-accent))] shadow-[0_0_20px_hsl(var(--gold-accent)/0.3)] scale-105"
              : "border-[hsl(var(--border))]"
          }
        `}
        style={{
          clipPath: "polygon(0 0, 100% 0, 100% 85%, 90% 100%, 0 100%)",
        }}
      >
        {/* Image Container */}
        <div className="relative aspect-[3/4] bg-[hsl(var(--muted))] overflow-hidden">
          {character.image_url ? (
            <img
              src={character.image_url}
              alt={character.name}
              className={`w-full h-full object-cover transition-all duration-500 ${
                isUpcoming 
                  ? "grayscale blur-sm" 
                  : isHovered 
                  ? "grayscale-0 scale-110" 
                  : "grayscale scale-100"
              }`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-16 h-16 text-[hsl(var(--muted-foreground))]" />
            </div>
          )}

          {/* Upcoming Overlay */}
          {isUpcoming && (
            <div className="absolute inset-0 bg-[hsl(var(--background)/0.8)] flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center">
                  <svg className="w-6 h-6 text-[hsl(var(--muted-foreground))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="text-xs font-mono uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Em Breve
                </p>
              </div>
            </div>
          )}

          {/* Scanlines */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--foreground)) 2px, hsl(var(--foreground)) 4px)",
            }}
          />

          {/* Corner Accents */}
          {!isUpcoming && (
            <>
              <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[hsl(var(--gold-accent))] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[hsl(var(--gold-accent))] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </>
          )}
        </div>

        {/* Info Panel */}
        <div className="relative p-3 bg-[hsl(var(--card))]">
          <h4
            className={`text-sm font-bold uppercase tracking-tight transition-colors duration-300 line-clamp-1 ${
              isUpcoming
                ? "text-[hsl(var(--muted-foreground))]"
                : isHovered 
                ? "text-[hsl(var(--gold-accent))]" 
                : "text-[hsl(var(--foreground))]"
            }`}
          >
            {isUpcoming ? "???" : character.name}
          </h4>
          {character.release_month && (
            <p className="text-xs font-mono uppercase tracking-wider text-[hsl(var(--muted-foreground))] mt-1 flex items-center gap-1">
              📅 {MONTHS[character.release_month - 1]}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function CollectionDetailsArcade() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // Buscar dados da coleção
  const { data: collection, isLoading } = useQuery({
    queryKey: ["collection-details-arcade", slug],
    queryFn: async () => {
      // Buscar coleção
      const { data: collectionData, error: collectionError } = await supabase
        .from("collections")
        .select("id, name, slug, description, cover_image_url, is_active")
        .eq("slug", slug)
        .maybeSingle();

      if (collectionError) throw collectionError;
      if (!collectionData) return null;

      // Buscar personagens da coleção
      const { data: charactersData, error: charactersError } = await supabase
        .from("collection_characters")
        .select("id, name, description, image_url, release_order, release_month, status")
        .eq("collection_id", collectionData.id)
        .order("release_month", { ascending: true, nullsFirst: false });

      if (charactersError) throw charactersError;

      return {
        ...collectionData,
        collection_characters: charactersData || []
      } as Collection;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <AppShell>
        <SEOHead title="Carregando..." />
        <div className="min-h-screen bg-[hsl(var(--background))] py-12">
          <div className="container max-w-7xl mx-auto px-4">
            <Skeleton className="h-12 w-48 mb-8" />
            <Skeleton className="h-64 w-full mb-8 rounded-lg" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!collection) {
    return (
      <AppShell>
        <SEOHead title="Coleção não encontrada" />
        <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Coleção não encontrada</h1>
            <Button onClick={() => navigate("/colecoes-arcade")}>
              Voltar para Coleções
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const characterCount = collection.collection_characters?.length || 0;

  return (
    <AppShell>
      <SEOHead
        title={collection.name}
        description={collection.description || `Coleção ${collection.name}`}
      />

      {/* Scanlines Effect */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--foreground)) 2px, hsl(var(--foreground)) 4px)",
          }}
        />
      </div>

      <div className="min-h-screen bg-[hsl(var(--background))] py-8 md:py-12">
        <div className="container max-w-7xl mx-auto px-4">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate("/colecoes-arcade")}
            className="mb-6 font-mono uppercase tracking-wider text-xs hover:text-[hsl(var(--gold-accent))]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Coleções
          </Button>

          {/* Hero Section */}
          <div className="relative mb-12">
            <div
              className="relative h-64 md:h-80 rounded-sm overflow-hidden border-2 border-[hsl(var(--gold-accent))] shadow-[0_0_40px_hsl(var(--gold-accent)/0.3)]"
              style={{
                clipPath: "polygon(0 0, 100% 0, 100% 90%, 95% 100%, 0 100%)",
              }}
            >
              {/* Background Image */}
              {collection.cover_image_url ? (
                <img
                  src={collection.cover_image_url}
                  alt={collection.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[hsl(var(--gold-accent)/0.2)] to-[hsl(var(--background))]" />
              )}

              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--background))] via-[hsl(var(--background)/0.5)] to-transparent" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
                <div className="flex items-center gap-3 mb-3">
                  <Badge className="bg-[hsl(var(--gold-accent))] text-[hsl(var(--foreground))] font-mono uppercase tracking-wider px-3 py-1 text-xs border-2 border-[hsl(var(--foreground))]">
                    <Crown className="w-3 h-3 mr-1" />
                    Coleção Exclusiva
                  </Badge>
                  <Badge variant="outline" className="font-mono uppercase tracking-wider px-3 py-1 text-xs border-[hsl(var(--gold-accent))]">
                    <Users className="w-3 h-3 mr-1" />
                    {characterCount} Personagens
                  </Badge>
                </div>

                <h1 className="text-4xl md:text-6xl font-bold uppercase tracking-tight text-[hsl(var(--gold-accent))] mb-2 font-mono drop-shadow-[0_0_10px_hsl(var(--gold-accent))]">
                  {collection.name}
                </h1>

                {collection.description && (
                  <p className="text-[hsl(var(--muted-foreground))] max-w-2xl text-sm md:text-base">
                    {collection.description}
                  </p>
                )}
              </div>

              {/* Corner Accents */}
              <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-[hsl(var(--gold-accent))]" />
              <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-[hsl(var(--gold-accent))]" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-[hsl(var(--gold-accent))]" />
            </div>
          </div>

          {/* Pricing Info Card */}
          <div className="mb-12 bg-[hsl(var(--card))] border-2 border-[hsl(var(--gold-accent)/0.3)] rounded-sm p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex-1">
                <h3 className="text-lg font-bold uppercase tracking-wider font-mono text-[hsl(var(--gold-accent))] mb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Sistema de Preços Contextuais
                </h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                  Os preços variam de acordo com sua assinatura e coleção ativa
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-[hsl(var(--background))] rounded-sm border border-[hsl(var(--border))]">
                    <div className="w-10 h-10 rounded-full bg-[hsl(var(--gold-accent)/0.2)] flex items-center justify-center">
                      <Coins className="w-5 h-5 text-[hsl(var(--gold-accent))]" />
                    </div>
                    <div>
                      <p className="text-xs font-mono uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        Coleção Ativa
                      </p>
                      <p className="text-lg font-bold text-[hsl(var(--gold-accent))] font-mono">
                        200 coins
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-[hsl(var(--background))] rounded-sm border border-[hsl(var(--border))]">
                    <div className="w-10 h-10 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center">
                      <Coins className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                    </div>
                    <div>
                      <p className="text-xs font-mono uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        Outra Coleção
                      </p>
                      <p className="text-lg font-bold text-[hsl(var(--foreground))] font-mono">
                        300 coins
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  className="bg-[hsl(var(--gold-accent))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--gold-accent)/0.9)] font-mono uppercase tracking-wider text-sm"
                >
                  <Crown className="w-5 h-5 mr-2" />
                  Assinar Coleção
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-[hsl(var(--gold-accent)/0.5)] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.1)] font-mono uppercase tracking-wider text-sm"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Ver Planos
                </Button>
              </div>
            </div>
          </div>

          {/* Characters Sections */}
          {collection.collection_characters && collection.collection_characters.length > 0 && (() => {
            const currentMonth = new Date().getMonth() + 1; // 1-12

            // Personagem destaque = o do mês atual (release_month === currentMonth)
            const allCharacters = collection.collection_characters;
            const featuredCharacter = allCharacters.find(c => c.release_month === currentMonth && c.status === 'released')
              || allCharacters.find(c => c.release_month === currentMonth);

            // Já lançados (exceto o destaque)
            const releasedCharacters = allCharacters.filter(c => c.status === 'released' && c.id !== featuredCharacter?.id);
            const sortedReleased = [...releasedCharacters].sort((a, b) => (a.release_month || 0) - (b.release_month || 0));

            // Próximos lançamentos
            const upcomingCharacters = allCharacters.filter(c => (c.status === 'upcoming' || c.status === 'revealed') && c.id !== featuredCharacter?.id);
            const sortedUpcoming = [...upcomingCharacters].sort((a, b) => (a.release_month || 0) - (b.release_month || 0));

            return (
              <>
                {/* Featured Character of the Month */}
                {featuredCharacter && (
                  <div className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                      <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight font-mono text-[hsl(var(--gold-accent))]">
                        Lançamento do Mês
                      </h2>
                      <Badge className="bg-[hsl(var(--gold-accent))] text-[hsl(var(--foreground))] font-mono uppercase tracking-wider px-3 py-1 text-xs border-2 border-[hsl(var(--foreground))] animate-pulse">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Disponível Agora
                      </Badge>
                    </div>

                    <Link to={`/personagem/${featuredCharacter.id}`}>
                      <div className="relative group">
                        <div
                          className="relative h-96 md:h-[500px] rounded-sm overflow-hidden border-4 border-[hsl(var(--gold-accent))] shadow-[0_0_50px_hsl(var(--gold-accent)/0.5)] transition-all duration-500 hover:shadow-[0_0_80px_hsl(var(--gold-accent)/0.7)] hover:scale-[1.02]"
                          style={{
                            clipPath: "polygon(0 0, 100% 0, 100% 92%, 90% 100%, 0 100%)",
                          }}
                        >
                          {/* Background Image */}
                          {featuredCharacter.image_url ? (
                            <img
                              src={featuredCharacter.image_url}
                              alt={featuredCharacter.name}
                              className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[hsl(var(--gold-accent)/0.2)] to-[hsl(var(--background))] flex items-center justify-center">
                              <Package className="w-32 h-32 text-[hsl(var(--gold-accent))]" />
                            </div>
                          )}

                          {/* Overlay Gradient */}
                          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--background))] via-[hsl(var(--background)/0.3)] to-transparent" />

                          {/* Scanlines */}
                          <div
                            className="absolute inset-0 pointer-events-none opacity-[0.05]"
                            style={{
                              backgroundImage:
                                "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--foreground)) 2px, hsl(var(--foreground)) 4px)",
                            }}
                          />

                          {/* Content */}
                          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-3">
                              <Badge className="bg-[hsl(var(--gold-accent))] text-[hsl(var(--foreground))] font-mono uppercase tracking-wider px-4 py-2 text-sm border-2 border-[hsl(var(--foreground))]">
                                <Star className="w-4 h-4 mr-1" />
                                Destaque
                              </Badge>
                              {featuredCharacter.release_month && (
                                <Badge variant="outline" className="font-mono uppercase tracking-wider px-3 py-1 text-xs border-[hsl(var(--gold-accent))] text-[hsl(var(--gold-accent))]">
                                  📅 {MONTHS[featuredCharacter.release_month - 1]}
                                </Badge>
                              )}
                            </div>

                            <h3 className="text-4xl md:text-6xl font-bold uppercase tracking-tight text-[hsl(var(--gold-accent))] mb-3 font-mono drop-shadow-[0_0_20px_hsl(var(--gold-accent))]">
                              {featuredCharacter.name}
                            </h3>

                            {featuredCharacter.description && (
                              <p className="text-[hsl(var(--muted-foreground))] max-w-3xl text-sm md:text-base mb-4">
                                {featuredCharacter.description}
                              </p>
                            )}

                            <Button
                              size="lg"
                              className="w-fit bg-[hsl(var(--gold-accent))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--gold-accent)/0.9)] font-mono uppercase tracking-wider text-sm"
                            >
                              Ver Detalhes
                            </Button>
                          </div>

                          {/* Corner Accents */}
                          <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-[hsl(var(--gold-accent))]" />
                          <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-[hsl(var(--gold-accent))]" />
                          <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-[hsl(var(--gold-accent))]" />

                          {/* Glow Effect */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[hsl(var(--gold-accent)/0.1)]" />
                        </div>
                      </div>
                    </Link>
                  </div>
                )}

                {/* Already Released Characters */}
                {sortedReleased.length > 0 && (
                  <div className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight font-mono text-[hsl(var(--foreground))]">
                          Já Lançados
                        </h2>
                        <Badge className="bg-green-500/20 text-green-500 font-mono uppercase tracking-wider px-3 py-1 border border-green-500/50">
                          {sortedReleased.length} Disponíveis
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                      {sortedReleased.map((character, index) => (
                        <CharacterCard key={character.id} character={character} index={index} isUpcoming={false} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming Characters */}
                {sortedUpcoming.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight font-mono text-[hsl(var(--muted-foreground))]">
                          Próximos Lançamentos
                        </h2>
                        <Badge className="bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] font-mono uppercase tracking-wider px-3 py-1 border border-[hsl(var(--border))]">
                          {sortedUpcoming.length} Em Breve
                        </Badge>
                      </div>
                    </div>

                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-sm p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-[hsl(var(--muted-foreground))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-mono uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
                            Lançamentos Mensais
                          </p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            Novos personagens são lançados todo mês para assinantes. Assine para ter acesso prioritário!
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                      {sortedUpcoming.map((character, index) => (
                        <CharacterCard key={character.id} character={character} index={index} isUpcoming={true} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* Empty State */}
          {(!collection.collection_characters || collection.collection_characters.length === 0) && (
            <div className="text-center py-12 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-sm">
              <Package className="w-16 h-16 mx-auto mb-4 text-[hsl(var(--muted-foreground))]" />
              <p className="text-[hsl(var(--muted-foreground))] font-mono uppercase tracking-wider text-sm">
                Nenhum personagem disponível
              </p>
            </div>
          )}

          {/* Bottom CTA */}
          <div className="mt-12 bg-gradient-to-r from-[hsl(var(--gold-accent)/0.1)] to-transparent border-l-4 border-[hsl(var(--gold-accent))] rounded-sm p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold uppercase tracking-wider font-mono text-[hsl(var(--gold-accent))] mb-2">
                  Pronto para começar?
                </h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Assine agora e tenha acesso a todos os personagens desta coleção com preços especiais
                </p>
              </div>
              <Button
                size="lg"
                className="bg-[hsl(var(--gold-accent))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--gold-accent)/0.9)] font-mono uppercase tracking-wider text-sm whitespace-nowrap"
              >
                Ver Planos de Assinatura
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
