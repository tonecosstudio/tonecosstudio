/**
 * Catálogo Arcade — mesma estética gaming da página de coleções.
 * Preserva toda a lógica de busca, filtros e likes do catálogo original.
 */

import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useIsAdmin } from "@/lib/roles";
import { useToast } from "@/hooks/use-toast";
import { likeModel, unlikeModel } from "@/lib/model-likes";
import {
  Search,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Heart,
  ArrowRight,
  Crosshair,
  Coins,
  Eye,
  EyeOff,
  Tags,
} from "lucide-react";

import type { ModelRow } from "@/pages/catalog/catalogTypes";
import { useCatalogModels, type CatalogSort } from "@/hooks/catalog/useCatalogModels";
import { useLikedModelIdsQuery } from "@/pages/catalog/hooks/useLikedModelIdsQuery";
import { useProfileQuery } from "@/pages/catalog/hooks/useProfileQuery";
import { useForYouModels } from "@/hooks/catalog/useForYouModels";
import { Page } from "@/components/layouts/Page";
import {
  ArcadeHero,
  ArcadeSectionTitle,
  ArcadeCard,
  ArcadeCTA,
} from "@/components/arcade/ArcadeLayout";
import { FloatingParticles, GlitchText } from "@/components/arcade/ArcadeEffects";
import { PUBLIC_ROUTES, catalogModelDetailsPath } from "@/config/routes";
import { formatCurrency } from "@/lib/utils";
import {
  getCatalogCharacterName,
  getCatalogPublicTags,
  getCatalogSourceName,
  getCatalogVersionName,
} from "@/pages/catalog/catalogUtils";

const SOURCE_TYPE_LABELS: Record<string, string> = {
  anime: "Anime",
  manga: "Manga",
  movie: "Filme",
  series: "Serie",
  game: "Game",
  comic: "HQ",
  tokusatsu: "Tokusatsu",
  original: "Original",
  other: "Outro",
};

const VARIANT_TYPE_LABELS: Record<string, string> = {
  default: "Padrao",
  form: "Forma",
  costume: "Roupa",
  pose: "Pose",
  scale: "Escala",
  edition: "Edicao",
  variant: "Versao",
  other: "Outro",
};

// ─── MAIN ────────────────────────────────────────────────────────────

export default function CatalogArcade() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdminQuery = useIsAdmin(user?.id);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [page, setPage] = useState(0);
  const [character, setCharacter] = useState(searchParams.get("character") ?? "");
  const [franchise, setFranchise] = useState(searchParams.get("franchise") ?? "");
  const [category, setCategory] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [variantType, setVariantType] = useState("");
  const [tagsCSV, setTagsCSV] = useState(searchParams.get("tag") ?? "");
  const [sort, setSort] = useState<CatalogSort>("recent");
  const [showFilters, setShowFilters] = useState(
    Boolean(searchParams.get("tag") || searchParams.get("franchise") || searchParams.get("character")),
  );

  const needle = useMemo(() => q.trim(), [q]);
  const wantsStagingPreview = searchParams.get("preview") === "staging";
  const canPreviewStaging = Boolean(isAdminQuery.data);
  const catalogMode = wantsStagingPreview && canPreviewStaging ? "staging" : "public";

  useEffect(() => { setPage(0); }, [needle, character, franchise, category, sourceType, variantType, tagsCSV, sort, catalogMode]);

  useEffect(() => {
    const urlTag = searchParams.get("tag") ?? "";
    const urlFranchise = searchParams.get("franchise") ?? "";
    const urlCharacter = searchParams.get("character") ?? "";
    const urlQuery = searchParams.get("q") ?? "";

    setTagsCSV(urlTag);
    setFranchise(urlFranchise);
    setCharacter(urlCharacter);
    setQ(urlQuery);
    if (urlTag || urlFranchise || urlCharacter || urlQuery) setShowFilters(true);
  }, [searchParams]);

  const modelsQuery = useCatalogModels(needle, page, {
    character,
    franchise,
    category,
    sourceType,
    variantType,
    tagsCSV,
    catalogMode,
    sort,
  });
  const queryRows = modelsQuery.data?.rows;
  const rows = useMemo(() => queryRows ?? [], [queryRows]);
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
  const forYouRows = useMemo(() => {
    const visibleIds = new Set(rows.map((row) => row.id));
    return (forYouQuery.data ?? []).filter((model) => !visibleIds.has(model.id));
  }, [forYouQuery.data, rows]);

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

  const handleTagFilter = (tag: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tag", tag);
    next.delete("franchise");
    next.delete("character");
    next.delete("q");
    setSearchParams(next);
    setTagsCSV(tag);
    setFranchise("");
    setCharacter("");
    setQ("");
    setShowFilters(true);
  };

  const clearCatalogFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("tag");
    next.delete("franchise");
    next.delete("character");
    next.delete("q");
    setSearchParams(next);
    setCharacter("");
    setFranchise("");
    setCategory("");
    setSourceType("");
    setVariantType("");
    setTagsCSV("");
    setQ("");
  };

  const toggleStagingPreview = () => {
    navigate(catalogMode === "staging" ? PUBLIC_ROUTES.catalog : `${PUBLIC_ROUTES.catalog}?preview=staging`);
  };

  const categories = ["animes", "filmes", "series", "jogos", "quadrinhos", "outros"];
  const sourceTypes = Object.entries(SOURCE_TYPE_LABELS);
  const variantTypes = Object.entries(VARIANT_TYPE_LABELS);
  const activeFilterCount = [character, franchise, category, sourceType, variantType, tagsCSV].filter(Boolean).length;
  const showPersonalizedSuggestions =
    user && catalogMode === "public" && !needle && activeFilterCount === 0;

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
              placeholder="Buscar personagem, versao ou franquia..."
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
            aria-label={showFilters ? "Fechar filtros" : "Abrir filtros"}
            aria-pressed={showFilters}
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 p-4 border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)] animate-fade-in">
            <div>
              <label className="block font-mono text-[9px] text-[hsl(var(--gold-accent)/0.6)] tracking-widest uppercase mb-2">Personagem</label>
              <input
                value={character}
                onChange={(e) => setCharacter(e.target.value)}
                placeholder="Ex: Goku"
                className="w-full h-10 px-3 bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono text-xs focus:border-[hsl(var(--gold-accent)/0.5)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[9px] text-[hsl(var(--gold-accent)/0.6)] tracking-widest uppercase mb-2">Obra</label>
              <input
                value={franchise}
                onChange={(e) => setFranchise(e.target.value)}
                placeholder="Ex: Dragon Ball"
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
              <label className="block font-mono text-[9px] text-[hsl(var(--gold-accent)/0.6)] tracking-widest uppercase mb-2">Midia</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full h-10 px-3 bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono text-xs focus:border-[hsl(var(--gold-accent)/0.5)] focus:outline-none"
              >
                <option value="">Todas</option>
                {sourceTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-[9px] text-[hsl(var(--gold-accent)/0.6)] tracking-widest uppercase mb-2">Tipo</label>
              <select
                value={variantType}
                onChange={(e) => setVariantType(e.target.value)}
                className="w-full h-10 px-3 bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono text-xs focus:border-[hsl(var(--gold-accent)/0.5)] focus:outline-none"
              >
                <option value="">Todos</option>
                {variantTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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

            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  clearCatalogFilters();
                }}
                className="col-span-2 md:col-span-3 lg:col-span-6 text-[hsl(var(--gold-accent)/0.6)] hover:text-[hsl(var(--gold-accent))] font-mono text-[10px] tracking-widest uppercase transition-colors"
              >
                ✕ Limpar Filtros
              </button>
            )}
          </div>
        )}

        {/* Status bar */}
        <div className="mb-6 flex flex-col gap-3 font-mono text-[10px] text-[hsl(0,0%,40%)] tracking-wider sm:flex-row sm:items-center sm:justify-between">
          <span>
            {catalogMode === "staging" ? "Conferencia staging" : needle ? `Resultados: "${needle}"` : "Catalogo geral"} • Pagina {page + 1}
            {activeFilterCount ? ` • ${activeFilterCount} filtros` : ""}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            {canPreviewStaging && (
              <button
                type="button"
                onClick={toggleStagingPreview}
                className={`inline-flex items-center gap-1.5 uppercase transition-colors ${
                  catalogMode === "staging"
                    ? "text-red-400 hover:text-red-300"
                    : "text-[hsl(var(--gold-accent)/0.65)] hover:text-[hsl(var(--gold-accent))]"
                }`}
              >
                {catalogMode === "staging" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {catalogMode === "staging" ? "Sair da conferencia" : "Conferir staging"}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(PUBLIC_ROUTES.collections)}
              className="hidden text-[hsl(var(--gold-accent)/0.65)] hover:text-[hsl(var(--gold-accent))] uppercase sm:inline"
            >
              Colecoes ativas
            </button>
          </div>
        </div>

        {wantsStagingPreview && !canPreviewStaging && !isAdminQuery.isLoading && (
          <div className="mb-6 border border-red-500/30 bg-red-500/10 px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-red-300">
            O modo de conferencia exige login administrativo.
          </div>
        )}

        {catalogMode === "staging" && (
          <div className="mb-6 border border-[hsl(var(--gold-accent)/0.25)] bg-[hsl(var(--gold-accent)/0.08)] px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--gold-accent))]">
            Modo conferencia: estes modelos estao inativos no catalogo publico e servem para revisar nome, imagem, tags e categoria antes de publicar.
          </div>
        )}
      </section>

      {/* ═══ FOR YOU SECTION ═══ */}
      {showPersonalizedSuggestions && forYouRows.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-6 mb-12">
          <ArcadeSectionTitle>Para Você</ArcadeSectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {forYouRows.slice(0, 6).map((m) => (
              <ModelArcadeCard
                key={m.id}
                model={m}
                isLiked={getIsLiked(m.id)}
                onToggleLike={() => handleToggleLike(m, getIsLiked(m.id))}
                onTagClick={handleTagFilter}
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
                onTagClick={handleTagFilter}
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
        primaryAction={{ label: "VER COLEÇÕES", href: PUBLIC_ROUTES.collections, icon: <ArrowRight className="w-4 h-4" /> }}
        secondaryAction={{ label: "VER PLANOS", href: PUBLIC_ROUTES.plans }}
      />
    </Page>
  );
}

// ─── MODEL CARD ──────────────────────────────────────────────────────

function ModelArcadeCard({ model, isLiked, onToggleLike, onTagClick }: {
  model: ModelRow;
  isLiked: boolean;
  onToggleLike: () => void;
  onTagClick?: (tag: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const imageUrl = model.thumbnailUrl ?? model.imageUrl;
  const displayTags = getCatalogPublicTags(model, 3);
  const isStaging = !model.is_active || (model.tags ?? []).includes("catalog-staging");
  const characterName = getCatalogCharacterName(model);
  const sourceName = getCatalogSourceName(model);
  const versionName = getCatalogVersionName(model);
  const mediaLabel = model.source_type ? SOURCE_TYPE_LABELS[model.source_type] || model.source_type : null;
  const variantLabel = model.variant_type ? VARIANT_TYPE_LABELS[model.variant_type] || model.variant_type : null;
  const fixedCashPrice =
    model.price_mode === "fixed" &&
    typeof model.price_standalone_override === "number" &&
    model.price_standalone_override > 0
      ? model.price_standalone_override
      : null;
  const hasFixedCoinPrice =
    model.price_mode === "fixed" &&
    typeof model.price_coins_override === "number" &&
    model.price_coins_override > 0;

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
              alt={characterName}
              className={`h-full w-full opacity-80 transition-all duration-700 group-hover:opacity-100 ${
                isStaging ? "object-contain p-2 group-hover:scale-105" : "object-cover group-hover:scale-110"
              }`}
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
          {(mediaLabel || model.category) && (
            <div className="absolute top-2 left-2 z-10 font-mono text-[8px] text-[hsl(var(--gold-accent))] bg-[hsl(0,0%,5%)]/90 px-2 py-0.5 tracking-widest uppercase border border-[hsl(var(--gold-accent)/0.3)]">
              {mediaLabel || model.category}
            </div>
          )}

          {isStaging && (
            <div className="absolute bottom-2 left-2 z-10 border border-red-500/40 bg-red-500/15 px-2 py-0.5 font-mono text-[8px] uppercase tracking-widest text-red-300">
              Conferencia
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
            {characterName}
          </h3>
          {(versionName || sourceName) && (
            <div className="mb-2 flex min-h-4 flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-[9px] tracking-wider">
              {versionName && (
                <span className="max-w-full truncate text-[hsl(0,0%,40%)]">
                  {versionName}
                </span>
              )}
              {versionName && sourceName && (
                <span className="text-[hsl(0,0%,28%)]">|</span>
              )}
              {sourceName && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onTagClick?.(sourceName);
                  }}
                  className="max-w-full truncate uppercase text-[hsl(var(--gold-accent)/0.7)] underline-offset-2 transition-colors hover:text-[hsl(var(--gold-accent))] hover:underline"
                  aria-label={`Filtrar por ${sourceName}`}
                >
                  {sourceName}
                </button>
              )}
            </div>
          )}

          {variantLabel && variantLabel !== "Padrao" && (
            <div className="mb-2 w-fit border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,5%)] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-[hsl(0,0%,55%)]">
              {variantLabel}
            </div>
          )}

          <div className="mb-3 flex min-h-6 flex-wrap items-center gap-1.5">
            {hasFixedCoinPrice && (
              <span className="inline-flex items-center gap-1 border border-[hsl(var(--gold-accent)/0.3)] bg-[hsl(var(--gold-accent)/0.08)] px-1.5 py-0.5 font-mono text-[8px] font-bold text-[hsl(var(--gold-accent))]">
                <Coins className="h-3 w-3" />
                {model.price_coins_override}
              </span>
            )}
            {fixedCashPrice !== null ? (
              <span className="border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,5%)] px-1.5 py-0.5 font-mono text-[8px] font-bold text-[hsl(0,0%,85%)]">
                {formatCurrency(fixedCashPrice / 100)}
              </span>
            ) : (
              <span className="border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,5%)] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-[hsl(0,0%,48%)]">
                Sob consulta
              </span>
            )}
          </div>

          {displayTags.length > 0 && (
            <div className="mb-3 flex min-h-6 flex-wrap items-center gap-1.5">
              {displayTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onTagClick?.(tag)}
                  className="inline-flex items-center gap-1 border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,5%)] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-[hsl(0,0%,50%)] transition-colors hover:border-[hsl(var(--gold-accent)/0.4)] hover:text-[hsl(var(--gold-accent))]"
                  aria-label={`Filtrar tag ${tag}`}
                >
                  <Tags className="h-2.5 w-2.5" />
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={() => navigate(catalogModelDetailsPath(model.id))}
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
