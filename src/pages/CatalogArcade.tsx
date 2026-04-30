/**
 * Catálogo Arcade — mesma estética gaming da página de coleções.
 * Preserva toda a lógica de busca, filtros e likes do catálogo original.
 */

import { useMemo, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { likeModel, unlikeModel } from "@/lib/model-likes";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Heart,
  ArrowRight,
  Crosshair,
} from "lucide-react";

import type { ModelRow } from "@/pages/catalog/catalogTypes";
import { useCatalogModels, type CatalogSort } from "@/pages/catalog/hooks/useCatalogModels";
import { useLikedModelIdsQuery } from "@/pages/catalog/hooks/useLikedModelIdsQuery";
import { useProfileQuery } from "@/pages/catalog/hooks/useProfileQuery";
import { useForYouModels } from "@/pages/catalog/hooks/useForYouModels";
import { Page } from "@/components/layouts/Page";
import {
  ArcadeHero,
  ArcadeSectionTitle,
  ArcadeCard,
  ArcadeCTA,
} from "@/components/arcade/ArcadeLayout";
import { FloatingParticles, GlitchText } from "@/components/arcade/ArcadeEffects";

// ─── MAIN ────────────────────────────────────────────────────────────

export default function CatalogArcade() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [franchise, setFranchise] = useState("");
  const [category, setCategory] = useState("");
  const [tagsCSV, setTagsCSV] = useState("");
  const [sort, setSort] = useState<CatalogSort>("recent");
  const [showFilters, setShowFilters] = useState(false);

  const needle = useMemo(() => q.trim(), [q]);

  useEffect(() => { setPage(0); }, [needle, franchise, category, tagsCSV, sort]);

  const modelsQuery = useCatalogModels(needle, page, { franchise, category, tagsCSV, sort });
  const rows = modelsQuery.data?.rows ?? [];
  const hasNext = modelsQuery.data?.hasNext ?? false;

  const likesQuery = useLikedModelIdsQuery(user?.id);
  const likedIds = likesQuery.data ?? new Set<string>();

  const profileQuery = useProfileQuery(user?.id);
  const forYouQuery = useForYouModels({
    userId: user?.id,
    needle,
    likedIds,
    profilePreferenceTags: profileQuery.data?.preference_tags,
    profileLoading: profileQuery.isLoading,
  });

  const getIsLiked = (id: string) => Boolean(user?.id) && likedIds.has(id);

  const handleToggleLike = async (m: ModelRow, isLiked: boolean) => {
    if (!user?.id) {
      toast({ title: "Entre para favoritar", description: "Faça login para salvar seus modelos preferidos." });
      return;
    }
    try {
      if (isLiked) await unlikeModel(user.id, m.id);
      else await likeModel(user.id, m.id);
      await likesQuery.refetch();
    } catch {
      toast({ title: "Erro ao favoritar", variant: "destructive" });
    }
  };

  const categories = ["animes", "filmes", "series", "jogos", "quadrinhos", "outros"];

  return (
    <Page
      title="Catálogo | ORDAX Arsenal"
      description="Explore o catálogo completo de estatuetas artesanais. Produção sob encomenda com pintura artística."
      keywords={["catálogo", "estatuetas", "colecionáveis", "premium"]}
    >
      <ArcadeHero
        badge="Arsenal Completo"
        title="CATÁLOGO"
        subtitle=">> EXPLORE. ESCOLHA. COLECIONE."
      />

      {/* ═══ SEARCH & FILTERS ═══ */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 -mt-4 relative z-10">
        {/* Search bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(0,0%,40%)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar modelo..."
              className="w-full h-12 pl-11 pr-10 bg-[hsl(0,0%,7%)] border border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono text-sm tracking-wider placeholder:text-[hsl(0,0%,30%)] focus:border-[hsl(var(--gold-accent)/0.6)] focus:outline-none transition-colors"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(0,0%,40%)] hover:text-[hsl(var(--gold-accent))]">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`h-12 px-4 border font-mono text-xs tracking-wider uppercase transition-all flex items-center gap-2 ${
              showFilters
                ? "border-[hsl(var(--gold-accent))] text-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent)/0.1)]"
                : "border-[hsl(0,0%,15%)] text-[hsl(0,0%,50%)] hover:border-[hsl(var(--gold-accent)/0.4)]"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filtros</span>
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)] animate-fade-in">
            <div>
              <label className="block font-mono text-[9px] text-[hsl(var(--gold-accent)/0.6)] tracking-widest uppercase mb-2">Franquia</label>
              <input
                value={franchise}
                onChange={(e) => setFranchise(e.target.value)}
                placeholder="Ex: Naruto"
                className="w-full h-10 px-3 bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono text-xs focus:border-[hsl(var(--gold-accent)/0.5)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[9px] text-[hsl(var(--gold-accent)/0.6)] tracking-widest uppercase mb-2">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono text-xs focus:border-[hsl(var(--gold-accent)/0.5)] focus:outline-none"
              >
                <option value="">Todas</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-[9px] text-[hsl(var(--gold-accent)/0.6)] tracking-widest uppercase mb-2">Tags</label>
              <input
                value={tagsCSV}
                onChange={(e) => setTagsCSV(e.target.value)}
                placeholder="chibi, dark"
                className="w-full h-10 px-3 bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono text-xs focus:border-[hsl(var(--gold-accent)/0.5)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[9px] text-[hsl(var(--gold-accent)/0.6)] tracking-widest uppercase mb-2">Ordenar</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as CatalogSort)}
                className="w-full h-10 px-3 bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono text-xs focus:border-[hsl(var(--gold-accent)/0.5)] focus:outline-none"
              >
                <option value="recent">Recentes</option>
                <option value="az">A–Z</option>
              </select>
            </div>

            {(franchise || category || tagsCSV) && (
              <button
                onClick={() => { setFranchise(""); setCategory(""); setTagsCSV(""); }}
                className="col-span-2 md:col-span-4 text-[hsl(var(--gold-accent)/0.6)] hover:text-[hsl(var(--gold-accent))] font-mono text-[10px] tracking-widest uppercase transition-colors"
              >
                ✕ Limpar Filtros
              </button>
            )}
          </div>
        )}

        {/* Status bar */}
        <div className="flex items-center justify-between mb-6 font-mono text-[10px] text-[hsl(0,0%,40%)] tracking-wider">
          <span>{needle ? `Resultados: "${needle}"` : "Todos os modelos"} • Página {page + 1}</span>
        </div>
      </section>

      {/* ═══ FOR YOU SECTION ═══ */}
      {user && !needle && forYouQuery.data && forYouQuery.data.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-6 mb-12">
          <ArcadeSectionTitle>Para Você</ArcadeSectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {forYouQuery.data.slice(0, 6).map((m: any) => (
              <ModelArcadeCard
                key={m.id}
                model={m}
                isLiked={getIsLiked(m.id)}
                onToggleLike={() => handleToggleLike(m, getIsLiked(m.id))}
              />
            ))}
          </div>
        </section>
      )}

      {/* ═══ MAIN GRID ═══ */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pb-12 relative z-10">
        <ArcadeSectionTitle>Arsenal</ArcadeSectionTitle>

        {modelsQuery.isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,12%)] animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-[hsl(0,0%,15%)] relative overflow-hidden">
            <FloatingParticles />
            <div className="relative z-10">
              <Crosshair className="w-16 h-16 mx-auto mb-4 text-[hsl(var(--gold-accent)/0.3)]" />
              <h2
                className="text-3xl font-black tracking-[0.2em] mb-3"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
              >
                <GlitchText text="NO TARGETS" />
              </h2>
              <p className="text-[hsl(0,0%,40%)] font-mono text-[9px] tracking-[0.15em] mb-6" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                {needle ? `Nenhum resultado para "${needle}"` : "Nenhum modelo encontrado."}
              </p>
              {needle && (
                <button
                  onClick={() => setQ("")}
                  className="font-mono text-xs text-[hsl(var(--gold-accent))] border border-[hsl(var(--gold-accent)/0.3)] px-6 py-2 hover:bg-[hsl(var(--gold-accent)/0.1)] transition-colors tracking-widest uppercase"
                >
                  Limpar Busca
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {rows.map((m) => (
              <ModelArcadeCard
                key={m.id}
                model={m}
                isLiked={getIsLiked(m.id)}
                onToggleLike={() => handleToggleLike(m, getIsLiked(m.id))}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {rows.length > 0 && (
          <div className="flex items-center justify-center gap-4 mt-10 font-mono text-xs">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="flex items-center gap-2 px-4 py-2 border border-[hsl(0,0%,15%)] text-[hsl(0,0%,50%)] hover:border-[hsl(var(--gold-accent)/0.5)] hover:text-[hsl(var(--gold-accent))] disabled:opacity-30 disabled:cursor-not-allowed transition-all tracking-widest uppercase"
            >
              <ChevronLeft className="w-4 h-4" /> PREV
            </button>
            <span className="text-[hsl(var(--gold-accent))] tracking-[0.3em]">
              {String(page + 1).padStart(2, "0")}
            </span>
            <button
              disabled={!hasNext || modelsQuery.isFetching}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-2 px-4 py-2 border border-[hsl(0,0%,15%)] text-[hsl(0,0%,50%)] hover:border-[hsl(var(--gold-accent)/0.5)] hover:text-[hsl(var(--gold-accent))] disabled:opacity-30 disabled:cursor-not-allowed transition-all tracking-widest uppercase"
            >
              NEXT <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>

      <ArcadeCTA
        badge="Colecionáveis Sob Encomenda"
        title="EXPLORE AS COLEÇÕES"
        description="Veja as coleções disponíveis e escolha seus personagens favoritos."
        primaryAction={{ label: "VER COLEÇÕES", href: "/colecoes", icon: <ArrowRight className="w-4 h-4" /> }}
        secondaryAction={{ label: "VER PLANOS", href: "/planos" }}
      />
    </Page>
  );
}

// ─── MODEL CARD ──────────────────────────────────────────────────────

function ModelArcadeCard({ model, isLiked, onToggleLike }: {
  model: ModelRow;
  isLiked: boolean;
  onToggleLike: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const imageUrl = model.image_bucket && model.image_path
    ? supabase.storage.from(model.image_bucket).getPublicUrl(model.image_path).data.publicUrl
    : null;

  return (
    <ArcadeCard>
      <div
        className="flex flex-col h-full"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Image */}
        <div className="relative aspect-[3/4] bg-[hsl(0,0%,9%)] overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={model.name}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Crosshair className="w-10 h-10 text-[hsl(0,0%,15%)]" />
            </div>
          )}

          {/* Like button */}
          <button
            onClick={(e) => { e.preventDefault(); onToggleLike(); }}
            className={`absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center border transition-all ${
              isLiked
                ? "bg-[hsl(0,70%,50%)/0.2] border-[hsl(0,70%,50%)/0.5] text-[hsl(0,70%,60%)]"
                : "bg-[hsl(0,0%,5%)]/70 border-[hsl(0,0%,20%)] text-[hsl(0,0%,40%)] hover:text-[hsl(0,70%,60%)]"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-current" : ""}`} />
          </button>

          {/* Category badge */}
          {model.category && (
            <div className="absolute top-2 left-2 z-10 font-mono text-[8px] text-[hsl(var(--gold-accent))] bg-[hsl(0,0%,5%)]/90 px-2 py-0.5 tracking-widest uppercase border border-[hsl(var(--gold-accent)/0.3)]">
              {model.category}
            </div>
          )}

          {/* Bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[hsl(0,0%,7%)] to-transparent" />
        </div>

        {/* Info */}
        <div className="p-3 flex-1 flex flex-col">
          <h3
            className="text-sm font-black tracking-wider mb-0.5 line-clamp-1 group-hover:text-[hsl(var(--gold-accent))] transition-colors"
            style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
          >
            {model.name}
          </h3>
          {model.franchise && (
            <p className="font-mono text-[9px] text-[hsl(0,0%,40%)] tracking-wider line-clamp-1 mb-2">
              {model.franchise}
            </p>
          )}

          {/* CTA */}
          <button
            onClick={() => navigate(`/catalogo/${encodeURIComponent(model.id)}`)}
            className="mt-auto flex items-center justify-center gap-1.5 w-full py-2 border border-[hsl(var(--gold-accent)/0.3)] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.1)] font-mono text-[9px] tracking-[0.15em] uppercase transition-all"
          >
            VER DETALHES <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Power bar */}
        <div className="h-[2px] relative overflow-hidden">
          <div className="absolute inset-0 bg-[hsl(0,0%,10%)]" />
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[hsl(var(--gold-accent))] to-[hsl(var(--gold-accent)/0.5)] transition-all duration-700 ease-out"
            style={{ width: hovered ? "100%" : "0%" }}
          />
        </div>
      </div>
    </ArcadeCard>
  );
}
