import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Search,
  Tags,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { Page } from "@/components/layouts/Page";
import {
  ArcadeCard,
  ArcadeHero,
  ArcadeSectionTitle,
} from "@/components/arcade/ArcadeLayout";
import { FloatingParticles } from "@/components/arcade/ArcadeEffects";
import {
  PUBLIC_ROUTES,
  catalogCharacterPath,
} from "@/config/routes";
import {
  useCatalogCharacters,
  type CatalogSort,
} from "@/hooks/catalog/useCatalogCharacters";
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

function parsePageParam(value: string | null) {
  const pageNumber = Number(value);
  if (!Number.isFinite(pageNumber) || pageNumber <= 1) return 0;
  return Math.floor(pageNumber) - 1;
}

function CharacterDirectoryCard({ row }: { row: CatalogCharacterRow }) {
  const imageUrl = row.thumbnailUrl ?? row.imageUrl;
  const path = catalogCharacterPath(row.character_name, row.source_title);
  const displayTags = row.tags.slice(0, 2);
  const sourceLabel = row.source_type
    ? SOURCE_TYPE_LABELS[row.source_type] || row.source_type
    : null;

  return (
    <ArcadeCard>
      <div className="flex h-full flex-col">
        <Link
          to={path}
          className="relative block aspect-[4/5] overflow-hidden bg-[hsl(0,0%,9%)]"
          aria-label={`Abrir pagina de ${row.character_name}`}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={row.character_name}
              className="h-full w-full object-cover opacity-85 transition-transform duration-500 hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Crosshair className="h-10 w-10 text-[hsl(0,0%,18%)]" />
            </div>
          )}

          <div className="absolute left-2 top-2 border border-[hsl(var(--gold-accent)/0.28)] bg-[hsl(0,0%,5%)]/92 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-[hsl(var(--gold-accent))]">
            {sourceLabel || row.category || "Personagem"}
          </div>

          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[hsl(0,0%,6%)] to-transparent" />
        </Link>

        <div className="flex flex-1 flex-col p-3">
          <Link
            to={path}
            className="text-lg font-black uppercase leading-none tracking-[0.06em] text-[hsl(0,0%,96%)] transition-colors hover:text-[hsl(var(--gold-accent))]"
            style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
          >
            {row.character_name}
          </Link>

          {row.source_title && (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[hsl(0,0%,48%)]">
              {row.source_title}
            </p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,6%)] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[hsl(0,0%,72%)]">
              {row.model_count} {row.model_count === 1 ? "modelo" : "modelos"}
            </span>
          </div>

          {displayTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {displayTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex min-w-0 items-center gap-1 border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,5%)] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[hsl(0,0%,52%)]"
                >
                  <Tags className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{tag}</span>
                </span>
              ))}
            </div>
          )}

          <Link
            to={path}
            className="mt-auto flex items-center gap-2 pt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--gold-accent))] transition-colors hover:text-[hsl(var(--gold-accent)/0.82)]"
          >
            Abrir personagem
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </ArcadeCard>
  );
}

export default function CharacterSelect() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [page, setPage] = useState(() => parsePageParam(searchParams.get("page")));
  const [franchise, setFranchise] = useState(searchParams.get("franchise") ?? "");
  const [sort, setSort] = useState<CatalogSort>(
    searchParams.get("sort") === "az" ? "az" : "recent",
  );

  const needle = useMemo(() => q.trim(), [q]);

  useEffect(() => {
    setPage(0);
  }, [needle, franchise, sort]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (page > 0) next.set("page", String(page + 1));
    else next.delete("page");

    const nextSort = sort === "recent" ? null : sort;
    if (nextSort) next.set("sort", nextSort);
    else next.delete("sort");

    if (needle) next.set("q", needle);
    else next.delete("q");

    if (franchise.trim()) next.set("franchise", franchise.trim());
    else next.delete("franchise");

    const currentQuery = searchParams.toString();
    const nextQuery = next.toString();
    if (nextQuery !== currentQuery) {
      setSearchParams(next, { replace: true });
    }
  }, [franchise, needle, page, searchParams, setSearchParams, sort]);

  const charactersQuery = useCatalogCharacters(needle, page, {
    character: "",
    franchise,
    category: "",
    sourceType: "",
    variantType: "",
    tagsCSV: "",
    catalogMode: "public",
    contentMode: "general",
    sort,
  });

  const rows = charactersQuery.data?.rows ?? [];
  const hasNext = charactersQuery.data?.hasNext ?? false;
  const visiblePageIndexes = useMemo(
    () => buildVisiblePageIndexes(page, hasNext),
    [page, hasNext],
  );

  const stats = useMemo(
    () => ({
      characters: rows.length,
      models: rows.reduce((total, row) => total + row.model_count, 0),
    }),
    [rows],
  );

  const clearFilters = () => {
    setQ("");
    setFranchise("");
    setSort("recent");
    setPage(0);
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  return (
    <Page
      title="Personagens | ORDAX"
      description="Diretorio publico de personagens com acesso rapido aos modelos de cada um."
      keywords={["personagens", "universo", "catalogo", "modelos", "ordax"]}
    >
      <ArcadeHero
        badge="Diretorio Publico"
        title="PERSONAGENS"
        subtitle=">> ENCONTRE O PERSONAGEM. ABRA A PAGINA. NAVEGUE PELOS MODELOS."
        stats={[
          { value: stats.characters, label: stats.characters === 1 ? "Personagem" : "Personagens" },
          { value: stats.models, label: stats.models === 1 ? "Modelo" : "Modelos" },
        ]}
      />

      <section className="relative z-10 mx-auto -mt-4 max-w-7xl px-4 md:px-6">
        <FloatingParticles />

        <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_180px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(0,0%,40%)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar personagem..."
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

          <input
            value={franchise}
            onChange={(e) => setFranchise(e.target.value)}
            placeholder="Filtrar obra"
            className="h-12 w-full border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] px-4 font-mono text-sm tracking-wider text-[hsl(0,0%,90%)] placeholder:text-[hsl(0,0%,30%)] transition-colors focus:border-[hsl(var(--gold-accent)/0.6)] focus:outline-none"
          />

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value === "az" ? "az" : "recent")}
            className="h-12 w-full border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] px-4 font-mono text-sm tracking-wider text-[hsl(0,0%,90%)] transition-colors focus:border-[hsl(var(--gold-accent)/0.6)] focus:outline-none"
          >
            <option value="recent">Mais recentes</option>
            <option value="az">A-Z</option>
          </select>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,6%)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(0,0%,60%)]">
            <Users className="h-3.5 w-3.5" />
            {stats.characters} personagens visiveis
          </span>
          <span className="inline-flex items-center gap-2 border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,6%)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(0,0%,60%)]">
            <Trophy className="h-3.5 w-3.5" />
            {stats.models} modelos nesta pagina
          </span>
          {(q || franchise || sort !== "recent") && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 border border-[hsl(var(--gold-accent)/0.28)] bg-[hsl(var(--gold-accent)/0.08)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--gold-accent))] transition-colors hover:bg-[hsl(var(--gold-accent)/0.14)]"
            >
              Limpar filtros
            </button>
          )}
        </div>

        <ArcadeSectionTitle>Diretorio de personagens</ArcadeSectionTitle>

        {charactersQuery.isLoading ? (
          <ArcadeCard hover={false} className="p-8 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 animate-pulse text-[hsl(0,0%,22%)]" />
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(0,0%,45%)]">
              Carregando personagens...
            </p>
          </ArcadeCard>
        ) : rows.length === 0 ? (
          <ArcadeCard hover={false} className="p-8 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-[hsl(0,0%,22%)]" />
            <h2
              className="text-3xl font-black uppercase tracking-[0.08em]"
              style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
            >
              Nenhum personagem encontrado
            </h2>
            <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
              Ajuste a busca ou remova os filtros ativos.
            </p>
          </ArcadeCard>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {rows.map((row) => (
                <CharacterDirectoryCard key={row.id} row={row} />
              ))}
            </div>

            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((current) => Math.max(current - 1, 0))}
                disabled={page === 0}
                className="flex h-10 w-10 items-center justify-center border border-[hsl(0,0%,15%)] text-[hsl(0,0%,55%)] transition-colors hover:border-[hsl(var(--gold-accent)/0.4)] hover:text-[hsl(var(--gold-accent))] disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Pagina anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {visiblePageIndexes.map((pageIndex, index) => {
                const previous = visiblePageIndexes[index - 1];
                const shouldInsertGap =
                  previous !== undefined && pageIndex - previous > 1;

                return (
                  <div key={pageIndex} className="flex items-center gap-2">
                    {shouldInsertGap && (
                      <span className="px-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(0,0%,35%)]">
                        ...
                      </span>
                    )}
                    <button
                      onClick={() => setPage(pageIndex)}
                      className={`min-w-[42px] border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                        page === pageIndex
                          ? "border-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent)/0.1)] text-[hsl(var(--gold-accent))]"
                          : "border-[hsl(0,0%,15%)] text-[hsl(0,0%,55%)] hover:border-[hsl(var(--gold-accent)/0.4)] hover:text-[hsl(var(--gold-accent))]"
                      }`}
                    >
                      {String(pageIndex + 1).padStart(2, "0")}
                    </button>
                  </div>
                );
              })}

              <button
                onClick={() => hasNext && setPage((current) => current + 1)}
                disabled={!hasNext}
                className="flex h-10 w-10 items-center justify-center border border-[hsl(0,0%,15%)] text-[hsl(0,0%,55%)] transition-colors hover:border-[hsl(var(--gold-accent)/0.4)] hover:text-[hsl(var(--gold-accent))] disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Proxima pagina"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-8 text-center">
              <Link
                to={PUBLIC_ROUTES.catalog}
                className="inline-flex items-center gap-2 border border-[hsl(var(--gold-accent)/0.3)] px-5 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--gold-accent))] transition-colors hover:bg-[hsl(var(--gold-accent)/0.08)]"
              >
                Abrir universo completo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        )}
      </section>
    </Page>
  );
}
