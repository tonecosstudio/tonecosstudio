import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Package,
  Search,
  X,
} from "lucide-react";
import { Page } from "@/components/layouts/Page";
import {
  ArcadeCard,
  ArcadeHero,
  ArcadeSectionTitle,
} from "@/components/arcade/ArcadeLayout";
import { PUBLIC_ROUTES } from "@/config/routes";
import { useCatalogModels, type CatalogSort } from "@/hooks/catalog/useCatalogModels";
import { UniverseModelCard } from "@/components/catalog/UniverseModelCard";

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

export default function CatalogModelsArcade() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [page, setPage] = useState(() => parsePageParam(searchParams.get("page")));
  const [sort, setSort] = useState<CatalogSort>(
    searchParams.get("sort") === "az" ? "az" : "recent",
  );

  const needle = useMemo(() => q.trim(), [q]);

  useEffect(() => {
    setPage(0);
  }, [needle, sort]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (needle) next.set("q", needle);
    else next.delete("q");

    if (page > 0) next.set("page", String(page + 1));
    else next.delete("page");

    if (sort === "az") next.set("sort", "az");
    else next.delete("sort");

    const currentQuery = searchParams.toString();
    const nextQuery = next.toString();
    if (currentQuery !== nextQuery) {
      setSearchParams(next, { replace: true });
    }
  }, [needle, page, searchParams, setSearchParams, sort]);

  const modelsQuery = useCatalogModels(needle, page, {
    character: "",
    franchise: "",
    category: "",
    sourceType: "",
    variantType: "",
    tagsCSV: "",
    catalogMode: "public",
    contentMode: "general",
    sort,
  });

  const rows = modelsQuery.data?.rows ?? [];
  const hasNext = modelsQuery.data?.hasNext ?? false;
  const visiblePageIndexes = useMemo(
    () => buildVisiblePageIndexes(page, hasNext),
    [page, hasNext],
  );

  return (
    <Page
      title="Modelos"
      description="Feed plano de modelos unitarios, sem arvore tematica."
      keywords={["modelos", "esculturas", "catalogo", "tonecos"]}
    >
      <ArcadeHero
        badge="Feed Unitario"
        title="MODELOS"
        subtitle=">> POSTS UNITARIOS. ORDENACAO DIRETA."
        stats={[
          { value: rows.length, label: rows.length === 1 ? "Post" : "Posts" },
          { value: page + 1, label: "Pagina" },
        ]}
      />

      <section className="relative z-10 mx-auto -mt-4 max-w-7xl px-4 md:px-6">
        <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(0,0%,40%)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar modelo..."
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

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value === "az" ? "az" : "recent")}
            className="h-12 w-full border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] px-4 font-mono text-sm tracking-wider text-[hsl(0,0%,90%)] transition-colors focus:border-[hsl(var(--gold-accent)/0.6)] focus:outline-none"
          >
            <option value="recent">Mais recentes</option>
            <option value="az">A-Z</option>
          </select>
        </div>

        <div className="mb-5 flex items-center justify-between gap-3">
          <ArcadeSectionTitle>Posts unitarios</ArcadeSectionTitle>
          <Link
            to={PUBLIC_ROUTES.catalog}
            className="inline-flex items-center gap-2 border border-[hsl(var(--gold-accent)/0.28)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--gold-accent))] transition-colors hover:bg-[hsl(var(--gold-accent)/0.08)]"
          >
            Ver universo
          </Link>
        </div>

        {modelsQuery.isLoading ? (
          <ArcadeCard hover={false} className="p-8 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 animate-pulse text-[hsl(0,0%,22%)]" />
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(0,0%,45%)]">
              Carregando posts...
            </p>
          </ArcadeCard>
        ) : rows.length === 0 ? (
          <ArcadeCard hover={false} className="p-8 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-[hsl(0,0%,22%)]" />
            <h2 className="text-3xl font-black uppercase tracking-[0.08em]">
              Nenhum modelo encontrado
            </h2>
          </ArcadeCard>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {rows.map((model) => (
                <UniverseModelCard
                  key={model.id}
                  model={model}
                  isLiked={false}
                  onToggleLike={() => undefined}
                />
              ))}
            </div>

            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((current) => Math.max(current - 1, 0))}
                disabled={page === 0}
                className="flex h-10 w-10 items-center justify-center border border-[hsl(0,0%,15%)] text-[hsl(0,0%,55%)] transition-colors hover:border-[hsl(var(--gold-accent)/0.4)] hover:text-[hsl(var(--gold-accent))] disabled:cursor-not-allowed disabled:opacity-35"
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
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </section>
    </Page>
  );
}
