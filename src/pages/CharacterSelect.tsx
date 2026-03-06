// @ts-nocheck
/**
 * Metal Slug-style Character Select Screen
 * 
 * Arcade aesthetic with military typography, CRT scanlines,
 * neon accents and pixel-art inspired UI elements.
 */

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Swords,
  Shield,
  Crown,
  Sparkles,
  Users,
  ArrowRight,
  Zap,
  Star,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────
type Character = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  release_order: number;
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

// ─── Character Slot Component ────────────────────────────────
function CharacterSlot({
  character,
  isSelected,
  index,
  onClick,
}: {
  character: Character;
  isSelected: boolean;
  index: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative group flex flex-col items-center transition-all duration-300
        ${isSelected ? "scale-110 z-20" : "scale-95 opacity-70 hover:opacity-100 hover:scale-100"}
      `}
    >
      {/* Selection Arrow */}
      {isSelected && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce z-30">
          <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-[hsl(var(--gold-accent))]" />
        </div>
      )}

      {/* Character Frame */}
      <div
        className={`
          relative w-28 h-36 sm:w-36 sm:h-44 md:w-40 md:h-52 rounded-sm overflow-hidden
          border-2 transition-all duration-300
          ${
            isSelected
              ? "border-[hsl(var(--gold-accent))] shadow-[0_0_20px_hsl(var(--gold-accent)/0.5),inset_0_0_20px_hsl(var(--gold-accent)/0.1)]"
              : "border-[hsl(var(--border))] hover:border-[hsl(var(--gold-accent)/0.5)]"
          }
        `}
        style={{
          clipPath: "polygon(0 0, 100% 0, 100% 85%, 90% 100%, 0 100%)",
        }}
      >
        {/* Character Image */}
        {character.image_url ? (
          <img
            src={character.image_url}
            alt={character.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[hsl(var(--muted))] flex items-center justify-center">
            <Swords className="w-10 h-10 text-[hsl(var(--muted-foreground))]" />
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

        {/* Glow overlay on select */}
        {isSelected && (
          <div className="absolute inset-0 bg-[hsl(var(--gold-accent)/0.15)] pointer-events-none" />
        )}

        {/* Status indicator */}
        {character.status === "upcoming" && (
          <div className="absolute top-2 right-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
          </div>
        )}

        {/* Number tag */}
        <div className="absolute bottom-0 left-0 bg-[hsl(var(--foreground)/0.85)] text-[hsl(var(--background))] px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider">
          #{String(index + 1).padStart(2, "0")}
        </div>
      </div>

      {/* Character Name */}
      <div
        className={`
          mt-2 px-3 py-1 text-xs sm:text-sm font-bold uppercase tracking-widest text-center
          transition-all duration-300 font-mono
          ${
            isSelected
              ? "text-[hsl(var(--gold-accent))] drop-shadow-[0_0_6px_hsl(var(--gold-accent)/0.5)]"
              : "text-[hsl(var(--muted-foreground))]"
          }
        `}
      >
        {character.name}
      </div>
    </button>
  );
}

// ─── Collection Section ──────────────────────────────────────
function CollectionSection({ collection }: { collection: Collection }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const characters = [...(collection.collection_characters || [])].sort(
    (a, b) => a.release_order - b.release_order
  );
  const selected = characters[selectedIdx] || null;

  const navigate = (dir: -1 | 1) => {
    setSelectedIdx((prev) => {
      const next = prev + dir;
      if (next < 0) return characters.length - 1;
      if (next >= characters.length) return 0;
      return next;
    });
  };

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") navigate(-1);
      if (e.key === "ArrowRight") navigate(1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [characters.length]);

  if (characters.length === 0) return null;

  return (
    <section className="relative py-12 md:py-16">
      {/* Collection Header */}
      <div className="container max-w-7xl mx-auto px-4 mb-8">
        <div className="flex items-center gap-4">
          {/* Military-style corner bracket */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-6 h-6 border-l-2 border-t-2 border-[hsl(var(--gold-accent))]" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold uppercase tracking-tight">
                {collection.name}
              </h2>
              <Badge
                className="bg-[hsl(var(--gold-accent))] text-[hsl(var(--foreground))] font-mono text-[10px] tracking-wider uppercase"
              >
                <Star className="w-3 h-3 mr-1" />
                {characters.length} chars
              </Badge>
            </div>
            {collection.description && (
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 max-w-xl font-mono">
                {collection.description}
              </p>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-2 ml-auto">
            <div className="w-6 h-6 border-r-2 border-t-2 border-[hsl(var(--gold-accent))]" />
          </div>
        </div>
      </div>

      {/* Character Select Area */}
      <div className="container max-w-7xl mx-auto px-4">
        <div className="relative">
          {/* Navigation Arrows */}
          {characters.length > 1 && (
            <>
              <button
                onClick={() => navigate(-1)}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-[hsl(var(--foreground)/0.8)] text-[hsl(var(--background))] hover:bg-[hsl(var(--gold-accent))] transition-colors rounded-sm"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => navigate(1)}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-[hsl(var(--foreground)/0.8)] text-[hsl(var(--background))] hover:bg-[hsl(var(--gold-accent))] transition-colors rounded-sm"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Characters Row */}
          <div
            ref={scrollRef}
            className="flex items-end justify-center gap-3 sm:gap-5 md:gap-6 px-14 py-4 overflow-x-auto scrollbar-hide"
          >
            {characters.map((char, i) => (
              <CharacterSlot
                key={char.id}
                character={char}
                isSelected={i === selectedIdx}
                index={i}
                onClick={() => setSelectedIdx(i)}
              />
            ))}
          </div>
        </div>

        {/* Selected Character Info Panel */}
        {selected && (
          <div className="mt-8 max-w-2xl mx-auto">
            <div
              className="relative border border-[hsl(var(--border))] bg-[hsl(var(--card))] rounded-sm p-6 overflow-hidden"
              style={{
                clipPath:
                  "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))",
              }}
            >
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-[hsl(var(--gold-accent))]" />
              <div className="absolute top-0 right-5 w-4 h-4 border-r-2 border-t-2 border-[hsl(var(--gold-accent))]" />
              <div className="absolute bottom-0 left-5 w-4 h-4 border-l-2 border-b-2 border-[hsl(var(--gold-accent))]" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-[hsl(var(--gold-accent))]" />

              {/* Scanline */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.04]"
                style={{
                  background:
                    "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(0 0% 50% / 0.4) 2px, hsl(0 0% 50% / 0.4) 4px)",
                }}
              />

              <div className="relative z-10 flex flex-col sm:flex-row items-start gap-5">
                {/* Mini portrait */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-sm overflow-hidden border border-[hsl(var(--border))] flex-shrink-0 bg-[hsl(var(--muted))]">
                  {selected.image_url ? (
                    <img
                      src={selected.image_url}
                      alt={selected.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Shield className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl sm:text-2xl font-bold uppercase tracking-tight">
                      {selected.name}
                    </h3>
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] uppercase tracking-wider border-[hsl(var(--gold-accent)/0.5)] text-[hsl(var(--gold-accent))]"
                    >
                      {selected.status === "released"
                        ? "Disponível"
                        : selected.status === "revealed"
                          ? "Revelado"
                          : "Em breve"}
                    </Badge>
                  </div>

                  {selected.description && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4 font-mono leading-relaxed line-clamp-3">
                      {selected.description}
                    </p>
                  )}

                  {/* Stats bar */}
                  <div className="flex items-center gap-6 text-xs font-mono text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-[hsl(var(--gold-accent))]" />
                      #{String(selectedIdx + 1).padStart(2, "0")} / {String(characters.length).padStart(2, "0")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Crown className="w-3 h-3 text-[hsl(var(--gold-accent))]" />
                      {collection.name}
                    </span>
                  </div>
                </div>

                {/* Action */}
                <div className="flex-shrink-0 self-center">
                  <Button
                    asChild
                    size="sm"
                    className="bg-[hsl(var(--gold-accent))] text-[hsl(var(--foreground))] hover:brightness-110 font-mono uppercase tracking-wider text-xs rounded-sm"
                  >
                    <Link to={`/colecoes/${collection.slug}`}>
                      Ver Coleção
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="container max-w-7xl mx-auto px-4 py-16 space-y-16">
      {[1, 2].map((i) => (
        <div key={i} className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="flex justify-center gap-6">
            {[1, 2, 3, 4].map((j) => (
              <Skeleton key={j} className="w-40 h-52 rounded-sm" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function CharacterSelect() {
  const { data: collections, isLoading } = useQuery({
    queryKey: ["collections-with-characters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select(
          `
          id, name, slug, description, cover_image_url, is_active,
          collection_characters (id, name, description, image_url, release_order, status)
        `
        )
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return (data || []) as Collection[];
    },
  });

  return (
    <AppShell>
      <SEOHead
        title="Selecionar Personagem - Arcade Select"
        description="Escolha seu personagem favorito no estilo arcade clássico. Explore coleções exclusivas de personagens artesanais."
        keywords={["personagens", "coleção", "arcade", "seleção"]}
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
                <span className="text-[hsl(var(--gold-accent))]">Select</span>{" "}
                <span className="text-[hsl(var(--foreground))]">Your</span>{" "}
                <span className="text-[hsl(var(--gold-accent))]">Character</span>
              </h1>

              <p className="font-mono text-sm sm:text-base text-[hsl(var(--muted-foreground))] uppercase tracking-[0.2em]">
                <Users className="w-4 h-4 inline mr-2" />
                {collections?.reduce((acc, c) => acc + (c.collection_characters?.length || 0), 0) || 0}{" "}
                personagens disponíveis
              </p>

              {/* Keyboard hint */}
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-[hsl(var(--muted-foreground)/0.6)] mt-4">
                <kbd className="px-2 py-1 border border-[hsl(var(--border))] rounded-sm bg-[hsl(var(--muted))]">
                  ←
                </kbd>
                <kbd className="px-2 py-1 border border-[hsl(var(--border))] rounded-sm bg-[hsl(var(--muted))]">
                  →
                </kbd>
                <span className="ml-1">para navegar</span>
              </div>
            </div>
          </div>
        </section>

        {/* Collections */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : collections && collections.length > 0 ? (
          <div className="space-y-4 pb-20">
            {collections.map((collection) => (
              <CollectionSection key={collection.id} collection={collection} />
            ))}
          </div>
        ) : (
          <div className="container max-w-7xl mx-auto px-4 py-20 text-center">
            <Swords className="w-16 h-16 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
            <h2 className="text-2xl font-bold uppercase mb-2">Nenhuma coleção disponível</h2>
            <p className="text-[hsl(var(--muted-foreground))] font-mono text-sm">
              Novas coleções em breve. Fique ligado!
            </p>
          </div>
        )}

        {/* Bottom HUD bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[hsl(var(--card)/0.95)] backdrop-blur-sm border-t border-[hsl(var(--border))]">
          <div className="container max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs font-mono text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Online
              </span>
              <span>{collections?.length || 0} coleções</span>
            </div>

            <Button
              asChild
              size="sm"
              variant="outline"
              className="font-mono text-xs uppercase tracking-wider rounded-sm border-[hsl(var(--gold-accent)/0.5)] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.1)]"
            >
              <Link to="/colecoes">
                Ver Todas Coleções
                <ArrowRight className="w-3 h-3 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
