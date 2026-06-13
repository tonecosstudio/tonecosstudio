import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Eye,
  Package,
  Search,
  SlidersHorizontal,
  Tags,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useIsAdmin } from "@/lib/roles";
import { Page } from "@/components/layouts/Page";
import {
  ArcadeCard,
  ArcadeCTA,
  ArcadeHero,
  ArcadeSectionTitle,
} from "@/components/arcade/ArcadeLayout";
import {
  FloatingParticles,
  GlitchText,
} from "@/components/arcade/ArcadeEffects";
import { PUBLIC_ROUTES, catalogCharacterPath } from "@/config/routes";
import { useCatalogCharacters, type CatalogSort } from "@/hooks/catalog/useCatalogCharacters";
import type { CatalogCharacterRow } from "@/types/catalog";
import { getCatalogPublicTags } from "@/lib/catalog-utils";

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

function buildVisiblePageIndexes(currentPage: number, hasNext: boolean) {
  const knownLastPage = currentPage + (hasNext ? 1 : 0);
  const windowStart = Math.max(0, currentPage - 2);
  const windowEnd = Math.min(knownLastPage, currentPage + 1);
  const pages = new Set<number>([0]);

  for (let pageIndex = windowStart; pageIndex <= windowEnd; pageIndex += 1) {
    pages.add(pageIndex);
  }

  return Array.from(pages).sort((left, right) => left - right);
}

function parseCatalogPageParam(value: string | null) {
  const pageNumber = Number(value);
  if (!Number.isFinite(pageNumber) || pageNumber <= 1) return 0;
  return Math.floor(pageNumber) - 1;
}

export default function CatalogArcade() {
  const { user } = useAuth();
  const isAdminQuery = useIsAdmin(user?.id);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [page, setPage] = useState(() =>
    parseCatalogPageParam(searchParams.get("page")),
  );
  const [character, setCharacter] = useState(
    searchParams.get("character") ?? "",
  );
  const [franchise, setFranchise] = useState(
    searchParams.get("franchise") ?? "",
  );
  const [category, setCategory] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [variantType, setVariantType] = useState("");
  const [tagsCSV, setTagsCSV] = useState(searchParams.get("tag") ?? "");
  const [sort, setSort] = useState<CatalogSort>("recent");
  const [showFilters, setShowFilters] = useState(
    Boolean(
      searchParams.get("tag") ||
        searchParams.get("franchise") ||
        searchParams.get("character"),
    ),
  );

  const needle = useMemo(() => q.trim(), [q]);
  const wantsStagingPreview = searchParams.get("preview") === "staging";
  const canPreviewStaging = Boolean(isAdminQuery.data);
  const catalogMode =
    wantsStagingPreview && canPreviewStaging ? "staging" : "public";

  useEffect(() => {
    setPage(0);
  }, [
    needle,
    character,
    franchise,
    category,
    sourceType,
    variantType,
    tagsCSV,
    sort,
    catalogMode,
  ]);

  useEffect(() => {
    const urlTag = searchParams.get("tag") ?? "";
    const urlFranchise = searchParams.get("franchise") ?? "";
    const urlCharacter = searchParams.get("character") ?? "";
    const urlQuery = searchParams.get("q") ?? "";
    const urlPage = parseCatalogPageParam(searchParams.get("page"));

    setTagsCSV(urlTag);
    setFranchise(urlFranchise);
    setCharacter(urlCharacter);
    setQ(urlQuery);
    setPage(urlPage);
    if (urlTag || urlFranchise || urlCharacter || urlQuery) {
      setShowFilters(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (page > 0) next.set("page", String(page + 1));
    else next.delete("page");

    const currentQuery = searchParams.toString();
    const nextQuery = next.toString();
    if (nextQuery !== currentQuery) {
      setSearchParams(next, { replace: true });
    }
  }, [page, searchParams, setSearchParams]);

  const wantsNsfwContent =
    category === "nsfw" || /\b(?:nsfw|adulto|improprio)\b/i.test(tagsCSV);
  const effectiveCategory = category === "nsfw" ? "" : category;
  const effectiveTagsCSV =
    category !== "nsfw" &&
    wantsNsfwContent &&
    !/\b(?:nsfw|adulto|improprio)\b/i.test(tagsCSV)
      ? [tagsCSV, "nsfw"].filter(Boolean).join(",")
      : tagsCSV;

  const charactersQuery = useCatalogCharacters(needle, page, {
    character,
    franchise,
    category: effectiveCategory,
    sourceType,
    variantType,
    tagsCSV: effectiveTagsCSV,
    catalogMode,
    contentMode: wantsNsfwContent ? "nsfw" : "general",
    sort,
  });
  const rows = useMemo(() => charactersQuery.data?.rows ?? [], [charactersQuery.data?.rows]);
  const hasNext = charactersQuery.data?.hasNext ?? false;
  const visibleCatalogStats = useMemo(
    () => ({
      characters: rows.length,
      models: rows.reduce((total, row) => total + row.model_count, 0),
    }),
    [rows],
  );

  const handleTagFilter = (tag: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tag", tag);
    next.delete("franchise");
    next.delete("character");
    next.delete("q");
    next.delete("page");
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
    next.delete("page");
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
    navigate(
      catalogMode === "staging"
        ? PUBLIC_ROUTES.catalog
        : `${PUBLIC_ROUTES.catalog}?preview=staging`,
    );
  };

  const categories = [
    "animes",
    "desenhos",
    "filmes",
    "series",
    "jogos",
    "quadrinhos",
    "nsfw",
    "outros",
  ];
  const sourceTypes = Object.entries(SOURCE_TYPE_LABELS);
  const activeFilterCount = [
    character,
    franchise,
    category,
    sourceType,
    variantType,
    tagsCSV,
  ].filter(Boolean).length;
  const visiblePageIndexes = useMemo(
    () => buildVisiblePageIndexes(page, hasNext),
    [page, hasNext],
  );

  return (
    <Page
      title="Universo | ORDAX Arsenal"
      description="Explore o universo de personagens e navegue pelos modelos de cada um."
      keywords={["universo", "personagens", "estatuetas", "colecionáveis", "premium"]}
    >
      <ArcadeHero
        badge="Arsenal Completo"
        title="UNIVERSO"
        subtitle=">> PERSONAGENS. MODELOS. COLECOES."
        stats={[
          {
            value: visibleCatalogStats.characters,
            label:
              visibleCatalogStats.characters === 1
                ? "Personagem"
                : "Personagens",
          },
          {
            value: visibleCatalogStats.models,
            label: visibleCatalogStats.models === 1 ? "Modelo" : "Modelos",
          },
        ]}
      />

      <section className="relative z-10 mx-auto -mt-4 max-w-7xl px-4 md:px-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(0,0%,40%)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar personagem ou obra..."
              className="h-12 w-full border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] pl-11 pr-10 font-mono text-sm tracking-wider text-[hsl(0,0%,90%)] placeholder:text-[hsl(0,0%,30%)] transition-colors focus:border-[hsl(var(--gold-accent)/0.6)] focus:outline-none"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(0,0%,40%)] hover:text-[hsl(var(--gold-accent))]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            aria-label={showFilters ? "Fechar filtros" : "Abrir filtros"}
            aria-pressed={showFilters}
            className={`flex h-12 items-center gap-2 border px-4 font-mono text-xs uppercase tracking-wider transition-all ${
              showFilters
                ? "border-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent)/0.1)] text-[hsl(var(--gold-accent))]"
                : "border-[hsl(0,0%,15%)] text-[hsl(0,0%,50%)] hover:border-[hsl(var(--gold-accent)/0.4)]"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filtros</span>
          </button>
        </div>

        {showFilters && (
          <div className="mb-6 grid grid-cols-2 gap-3 border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)] p-4 animate-fade-in md:grid-cols-3 lg:grid-cols-5">
            <div>
              <label className="mb-2 block font-mono text-[9px] uppercase tracking-widest text-[hsl(var(--gold-accent)/0.6)]">
                Personagem
              </label>
              <input
                value={character}
                onChange={(e) => setCharacter(e.target.value)}
                placeholder="Ex: Freeza"
                className="h-10 w-full border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,8%)] px-3 font-mono text-xs text-[hsl(0,0%,90%)] focus:border-[hsl(var(--gold-accent)/0.5)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[9px] uppercase tracking-widest text-[hsl(var(--gold-accent)/0.6)]">
                Obra
              </label>
              <input
                value={franchise}
                onChange={(e) => setFranchise(e.target.value)}
                placeholder="Ex: Dragon Ball"
                className="h-10 w-full border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,8%)] px-3 font-mono text-xs text-[hsl(0,0%,90%)] focus:border-[hsl(var(--gold-accent)/0.5)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[9px] uppercase tracking-widest text-[hsl(var(--gold-accent)/0.6)]">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 w-full border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,8%)] px-3 font-mono text-xs text-[hsl(0,0%,90%)] focus:border-[hsl(var(--gold-accent)/0.5)] focus:outline-none"
              >
                <option value="">Todas</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block font-mono text-[9px] uppercase tracking-widest text-[hsl(var(--gold-accent)/0.6)]">
                Midia
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="h-10 w-full border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,8%)] px-3 font-mono text-xs text-[hsl(0,0%,90%)] focus:border-[hsl(var(--gold-accent)/0.5)] focus:outline-none"
              >
                <option value="">Todas</option>
                {sourceTypes.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block font-mono text-[9px] uppercase tracking-widest text-[hsl(var(--gold-accent)/0.6)]">
                Tags
              </label>
              <input
                value={tagsCSV}
                onChange={(e) => setTagsCSV(e.target.value)}
                placeholder="sayajin, freeza"
                className="h-10 w-full border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,8%)] px-3 font-mono text-xs text-[hsl(0,0%,90%)] focus:border-[hsl(var(--gold-accent)/0.5)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[9px] uppercase tracking-widest text-[hsl(var(--gold-accent)/0.6)]">
                Ordenar
              </label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as CatalogSort)}
                className="h-10 w-full border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,8%)] px-3 font-mono text-xs text-[hsl(0,0%,90%)] focus:border-[hsl(var(--gold-accent)/0.5)] focus:outline-none"
              >
                <option value="recent">Recentes</option>
                <option value="az">A-Z</option>
              </select>
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={clearCatalogFilters}
                className="col-span-2 text-[hsl(var(--gold-accent)/0.6)] transition-colors hover:text-[hsl(var(--gold-accent))] font-mono text-[10px] uppercase tracking-widest md:col-span-3 lg:col-span-5"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        )}

        <div className="mb-6 flex flex-col gap-3 font-mono text-[10px] tracking-wider text-[hsl(0,0%,40%)] sm:flex-row sm:items-center sm:justify-between">
          <span>
            {catalogMode === "staging"
              ? "Conferencia staging"
              : needle
                ? `Resultados: "${needle}"`
                : "Indice geral"}{" "}
            • Pagina {page + 1}
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
                <Eye className="h-3.5 w-3.5" />
                {catalogMode === "staging"
                  ? "Sair da conferencia"
                  : "Conferir staging"}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(PUBLIC_ROUTES.collections)}
              className="hidden text-[hsl(var(--gold-accent)/0.65)] uppercase hover:text-[hsl(var(--gold-accent))] sm:inline"
            >
              Colecoes ativas
            </button>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-12 md:px-6">
        <ArcadeSectionTitle>Personagens</ArcadeSectionTitle>

        {charactersQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <div
                key={index}
                className="aspect-[3/4] animate-pulse border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,8%)]"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="relative overflow-hidden border border-dashed border-[hsl(0,0%,15%)] py-24 text-center">
            <FloatingParticles />
            <div className="relative z-10">
              <Crosshair className="mx-auto mb-4 h-16 w-16 text-[hsl(var(--gold-accent)/0.3)]" />
              <h2
                className="mb-3 text-3xl font-black tracking-[0.2em]"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
              >
                <GlitchText text="NO CHARACTERS" />
              </h2>
              <p
                className="mb-6 font-mono text-[9px] tracking-[0.15em] text-[hsl(0,0%,40%)]"
                style={{ fontFamily: "'Press Start 2P', monospace" }}
              >
                {needle
                  ? `Nenhum resultado para "${needle}"`
                  : "Nenhum personagem encontrado."}
              </p>
              {needle && (
                <button
                  onClick={() => setQ("")}
                  className="border border-[hsl(var(--gold-accent)/0.3)] px-6 py-2 font-mono text-xs uppercase tracking-widest text-[hsl(var(--gold-accent))] transition-colors hover:bg-[hsl(var(--gold-accent)/0.1)]"
                >
                  Limpar Busca
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {rows.map((row) => (
              <CatalogCharacterCard
                key={row.id}
                characterRow={row}
                onTagClick={handleTagFilter}
              />
            ))}
          </div>
        )}

        {rows.length > 0 && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2 font-mono text-xs">
            <button
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              className="flex items-center gap-2 border border-[hsl(0,0%,15%)] px-4 py-2 uppercase tracking-widest text-[hsl(0,0%,50%)] transition-all hover:border-[hsl(var(--gold-accent)/0.5)] hover:text-[hsl(var(--gold-accent))] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" /> PREV
            </button>
            {visiblePageIndexes.map((pageIndex, index) => {
              const previousPageIndex = visiblePageIndexes[index - 1];
              const showGap =
                typeof previousPageIndex === "number" &&
                pageIndex - previousPageIndex > 1;

              return (
                <Fragment key={pageIndex}>
                  {showGap && (
                    <span className="px-2 text-[hsl(0,0%,38%)]">...</span>
                  )}
                  <button
                    onClick={() => setPage(pageIndex)}
                    disabled={pageIndex === page}
                    className={`min-w-10 border px-3 py-2 tracking-[0.3em] transition-all ${
                      pageIndex === page
                        ? "border-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent)/0.14)] text-[hsl(var(--gold-accent))]"
                        : "border-[hsl(0,0%,15%)] text-[hsl(0,0%,50%)] hover:border-[hsl(var(--gold-accent)/0.5)] hover:text-[hsl(var(--gold-accent))]"
                    }`}
                  >
                    {String(pageIndex + 1).padStart(2, "0")}
                  </button>
                </Fragment>
              );
            })}
            <button
              disabled={!hasNext || charactersQuery.isFetching}
              onClick={() => setPage((current) => current + 1)}
              className="flex items-center gap-2 border border-[hsl(0,0%,15%)] px-4 py-2 uppercase tracking-widest text-[hsl(0,0%,50%)] transition-all hover:border-[hsl(var(--gold-accent)/0.5)] hover:text-[hsl(var(--gold-accent))] disabled:cursor-not-allowed disabled:opacity-30"
            >
              NEXT <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>

      <ArcadeCTA
        badge="Navegacao Organizada"
        title="MODELOS POR PERSONAGEM"
        description="O universo principal agora agrupa os personagens. Dentro de cada pagina voce encontra todos os modelos publicados."
        primaryAction={{
          label: "VER COLECOES",
          href: PUBLIC_ROUTES.collections,
          icon: <ArrowRight className="h-4 w-4" />,
        }}
        secondaryAction={{ label: "VER PLANOS", href: PUBLIC_ROUTES.plans }}
      />
    </Page>
  );
}

function CatalogCharacterCard({
  characterRow,
  onTagClick,
}: {
  characterRow: CatalogCharacterRow;
  onTagClick?: (tag: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const detailPath = catalogCharacterPath(
    characterRow.character_name,
    characterRow.source_title,
  );
  const displayTags = getCatalogPublicTags(
    {
      id: characterRow.latest_model_id,
      name: characterRow.latest_model_name,
      franchise: characterRow.source_title,
      category: characterRow.category,
      subcategory: null,
      is_active: true,
      character_name: characterRow.character_name,
      variant_name: null,
      variant_type: null,
      source_title: characterRow.source_title,
      source_type: characterRow.source_type,
      catalog_visibility: "general",
      canonical_identity_key: null,
      duplicate_status: "unique",
      duplicate_of_model_id: null,
      tags: characterRow.tags,
      content_rating: null,
      image_bucket: null,
      image_path: null,
      thumbnail_url: null,
      price_mode: null,
      price_standalone_override: null,
      price_coins_override: null,
      imageUrl: characterRow.imageUrl,
      thumbnailUrl: characterRow.thumbnailUrl,
      created_at: characterRow.created_at,
    },
    3,
  );
  const sourceLabel = characterRow.source_type
    ? SOURCE_TYPE_LABELS[characterRow.source_type] || characterRow.source_type
    : null;

  return (
    <ArcadeCard>
      <div
        className="flex h-full flex-col"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-[hsl(0,0%,9%)]">
          <Link
            to={detailPath}
            className="block h-full w-full"
            aria-label={`Abrir pagina de ${characterRow.character_name}`}
          >
            {characterRow.thumbnailUrl || characterRow.imageUrl ? (
              <img
                src={characterRow.thumbnailUrl ?? characterRow.imageUrl ?? ""}
                alt={characterRow.character_name}
                className="h-full w-full object-cover opacity-80 transition-all duration-700 group-hover:scale-110 group-hover:opacity-100"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Package className="h-12 w-12 text-[hsl(0,0%,18%)]" />
              </div>
            )}
          </Link>
          {sourceLabel && (
            <div className="absolute left-2 top-2 z-10 border border-[hsl(var(--gold-accent)/0.3)] bg-[hsl(0,0%,5%)]/90 px-2 py-0.5 font-mono text-[8px] uppercase tracking-widest text-[hsl(var(--gold-accent))]">
              {sourceLabel}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[hsl(0,0%,7%)] to-transparent" />
        </div>

        <div className="flex flex-1 flex-col p-2.5">
          <Link
            to={detailPath}
            className="block text-left text-sm font-black leading-none tracking-wider transition-colors group-hover:text-[hsl(var(--gold-accent))]"
            style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
            title={characterRow.character_name}
          >
            <span className="line-clamp-1">{characterRow.character_name}</span>
          </Link>

          {(characterRow.source_title || characterRow.category) && (
            <div className="mb-1.5 mt-1 flex items-center gap-x-1 font-mono text-[8px] tracking-wider">
              {characterRow.source_title && (
                <span className="max-w-[60%] truncate uppercase text-[hsl(var(--gold-accent)/0.7)]">
                  {characterRow.source_title}
                </span>
              )}
              {characterRow.source_title && characterRow.category && (
                <span className="text-[hsl(0,0%,28%)]">|</span>
              )}
              {characterRow.category && (
                <span className="truncate text-[hsl(0,0%,40%)]">
                  {characterRow.category}
                </span>
              )}
            </div>
          )}

          <div className="mb-2 flex items-center gap-1">
            <span className="inline-flex items-center gap-1 border border-[hsl(var(--gold-accent)/0.3)] bg-[hsl(var(--gold-accent)/0.08)] px-1.5 py-0.5 font-mono text-[8px] font-bold text-[hsl(var(--gold-accent))]">
              <Users className="h-3 w-3" />
              {characterRow.model_count} {characterRow.model_count === 1 ? "modelo" : "modelos"}
            </span>
          </div>

          {displayTags.length > 0 && (
            <div className="mb-2 flex items-center gap-1 overflow-hidden whitespace-nowrap">
              {displayTags.slice(0, 3).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onTagClick?.(tag)}
                  className="inline-flex min-w-0 max-w-[31%] shrink items-center gap-1 border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,5%)] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-[hsl(0,0%,50%)] transition-colors hover:border-[hsl(var(--gold-accent)/0.4)] hover:text-[hsl(var(--gold-accent))]"
                  aria-label={`Filtrar tag ${tag}`}
                >
                  <Tags className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{tag}</span>
                </button>
              ))}
            </div>
          )}

          <Link
            to={detailPath}
            className="mt-auto flex w-full items-center justify-center gap-1.5 border border-[hsl(var(--gold-accent)/0.3)] py-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-[hsl(var(--gold-accent))] transition-all hover:bg-[hsl(var(--gold-accent)/0.1)]"
          >
            VER MODELOS <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="relative h-[2px] overflow-hidden">
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
