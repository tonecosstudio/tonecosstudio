import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, FolderOpen, ImageOff } from "lucide-react";
import { Page } from "@/components/layouts/Page";
import { CanonicalCatalogImage } from "@/components/catalog/CanonicalCatalogImage";
import {
  ArcadeCard,
  ArcadeHero,
  ArcadeSectionTitle,
} from "@/components/arcade/ArcadeLayout";
import { PUBLIC_ROUTES } from "@/config/routes";
import { formatModelCountLabel } from "@/lib/catalog-model-count";
import { CanonicalUniverseFolders } from "@/pages/catalog/CanonicalUniverseFolders";
import { CANONICAL_CATALOG_API_BASE } from "@/config/canonical-catalog-endpoint";
import { createPublicCatalogGateway } from "@/services/catalog/public-catalog-gateway";

const VALID_SLUG = /^[a-z0-9][a-z0-9-]{0,239}$/;

function modelsPath(category?: string, franchise?: string): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (franchise) params.set("franchise", franchise);
  const search = params.toString();
  return PUBLIC_ROUTES.catalogModels + (search ? "?" + search : "");
}

function readableSlugLabel(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function categoryDisplayLabel(id: string, label?: string): string {
  if (id === "animes-desenhos") return "Animes e Desenhos";
  return label ?? readableSlugLabel(id);
}

/**
 * Public Universe is only a navigation layer over the canonical D1/R2 catalog.
 * Do not build a second catalog from Supabase models or fetch every page to
 * synthesize missing character/folder aggregates.
 */
export default function CatalogArcade() {
  const { themeKey, franchiseKey, characterSlug } = useParams<{
    themeKey?: string;
    franchiseKey?: string;
    characterSlug?: string;
  }>();
  const invalidScope =
    (themeKey !== undefined && !VALID_SLUG.test(themeKey)) ||
    (franchiseKey !== undefined && !VALID_SLUG.test(franchiseKey));
  const [searchParams, setSearchParams] = useSearchParams();
  const franchiseSearch = searchParams.get("q")?.trim() ?? "";
  const franchiseLabelSearch = franchiseKey
    ? franchiseKey.replace(/-/g, " ")
    : franchiseSearch;
  const [franchiseDraft, setFranchiseDraft] = useState(franchiseSearch);
  const invalidFranchiseSearch =
    franchiseSearch.length > 0 &&
    (Array.from(franchiseSearch).length < 3 ||
      Array.from(franchiseSearch).length > 80);

  useEffect(() => {
    setFranchiseDraft(franchiseSearch);
  }, [franchiseSearch, themeKey]);

  function submitFranchiseSearch() {
    const needle = franchiseDraft.trim();
    if (needle && (Array.from(needle).length < 3 || Array.from(needle).length > 80)) {
      return;
    }
    const params = new URLSearchParams();
    if (needle) params.set("q", needle);
    setSearchParams(params);
  }

  const gateway = useMemo(() => {
    if (!CANONICAL_CATALOG_API_BASE) return null;
    try {
      return createPublicCatalogGateway(CANONICAL_CATALOG_API_BASE, fetch);
    } catch {
      return null;
    }
  }, []);

  const categoriesQuery = useQuery({
    queryKey: ["tonecos-universe-canonical-categories"],
    queryFn: ({ signal }) => gateway!.listCategories(signal),
    enabled: gateway !== null && !invalidScope,
    retry: false,
    staleTime: 15 * 60 * 1000,
  });

  const franchisesQuery = useQuery({
    queryKey: ["tonecos-universe-canonical-franchises", themeKey, franchiseLabelSearch],
    queryFn: ({ signal }) =>
      gateway!.listFranchises({
        category: themeKey,
        search: franchiseLabelSearch || undefined,
        limit: 24,
      }, signal),
    enabled:
      gateway !== null &&
      Boolean(themeKey) &&
      !invalidScope &&
      (franchiseKey
        ? Array.from(franchiseLabelSearch).length >= 3 &&
          Array.from(franchiseLabelSearch).length <= 80
        : !invalidFranchiseSearch),
    retry: false,
    staleTime: 15 * 60 * 1000,
  });

  // Existing deep links remain navigable. A character-only index is not
  // exposed by the canonical API, so never invent character-level results.
  if (characterSlug && franchiseKey && themeKey && !invalidScope) {
    return <Navigate to={modelsPath(themeKey, franchiseKey)} replace />;
  }

  const activeQuery = themeKey ? franchisesQuery : categoriesQuery;
  const categories = categoriesQuery.data ?? [];
  const visibleCategories = categories.filter((category) => {
    const id = category.id.trim().toLowerCase();
    const label = category.label.trim().toLowerCase();
    return id !== "all" && id !== "todos" && id !== "todos-os-modelos" &&
      label !== "todos" && label !== "todos os modelos";
  });
  const franchises = franchisesQuery.data?.items ?? [];
  const categoryLabel = themeKey
    ? categoryDisplayLabel(
        themeKey,
        categories.find((category) => category.id === themeKey)?.label,
      )
    : "";
  const franchiseLabel = franchiseKey
    ? franchises.find(
        (franchise) =>
          franchise.id === franchiseKey && franchise.category === themeKey,
      )?.label ?? readableSlugLabel(franchiseKey)
    : "";

  return (
    <Page
      title="Universo de modelos — TONART Studio"
      description="Explore categorias, franquias e modelos publicados no acervo canônico TONART Studio."
      keywords={["tonart", "universo", "modelos", "catálogo"]}
    >
      <main className="min-h-[80vh] bg-[hsl(0,0%,4%)] pb-20 text-[hsl(0,0%,94%)]">
        <ArcadeHero
          badge="ACERVO TONART"
          title="UNIVERSO"
          subtitle=">> CATEGORIAS E FRANQUIAS DO ACERVO PUBLICADO."
          stats={[]}
          compact
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pt-8 md:px-6">
          <nav aria-label="Navegação do acervo" className="mb-8 flex flex-wrap items-center gap-3 text-xs">
            <Link className="inline-flex min-h-11 items-center text-[hsl(var(--gold-accent))] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]" to={PUBLIC_ROUTES.catalog}>
              Universo
            </Link>
            {themeKey && (
              <Link className="inline-flex min-h-11 items-center text-[hsl(0,0%,56%)] hover:text-[hsl(var(--gold-accent))] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]" to={PUBLIC_ROUTES.catalog + "/" + encodeURIComponent(themeKey)}>
                / {categoryLabel}
              </Link>
            )}
            {franchiseKey && (
              <span className="text-[hsl(0,0%,56%)]">
                / {franchiseLabel}
              </span>
            )}
            <Link className="ml-auto inline-flex min-h-11 items-center justify-center border border-[hsl(var(--gold-accent)/0.4)] px-4 py-3 font-mono uppercase text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]" to={modelsPath()}>
              Ver todos os modelos
            </Link>
          </nav>
          <ArcadeSectionTitle>
            {franchiseKey ? "PASTAS E MODELOS" : themeKey ? "FRANQUIAS DA CATEGORIA" : "CATEGORIAS"}
          </ArcadeSectionTitle>

          {themeKey && !franchiseKey && !invalidScope && (
            <form
              role="search"
              aria-label="Buscar franquias desta categoria"
              onSubmit={(event) => {
                event.preventDefault();
                submitFranchiseSearch();
              }}
              className="mt-6 flex flex-wrap items-center gap-3"
            >
              <label className="min-w-56 flex-1">
                <span className="sr-only">Nome da franquia</span>
                <input
                  type="search"
                  value={franchiseDraft}
                  onChange={(event) => setFranchiseDraft(event.target.value)}
                  maxLength={80}
                  placeholder="Buscar franquia (3+ letras)"
                  className="h-12 w-full border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,7%)] px-4 text-sm text-[hsl(0,0%,94%)] focus-visible:outline-2 focus-visible:outline-[hsl(var(--gold-accent))]"
                />
              </label>
              <button
                type="submit"
                disabled={Boolean(franchiseDraft.trim()) && Array.from(franchiseDraft.trim()).length < 3}
                className="h-12 border border-[hsl(var(--gold-accent))] px-5 font-mono text-xs uppercase text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)] disabled:opacity-40"
              >
                Buscar franquias
              </button>
              {franchiseSearch && (
                <Link
                  to={PUBLIC_ROUTES.catalog + "/" + encodeURIComponent(themeKey)}
                  className="inline-flex min-h-12 items-center border border-[hsl(0,0%,18%)] px-4 text-xs text-[hsl(0,0%,75%)] hover:text-[hsl(var(--gold-accent))]"
                >
                  Limpar busca
                </Link>
              )}
            </form>
          )}

          {gateway === null ? (
            <div role="status" className="mt-6 border border-[hsl(0,0%,18%)] p-8 text-sm">
              Acervo em integração neste ambiente. Não exibimos modelos de outra fonte.
            </div>
          ) : invalidScope ? (
            <div role="status" className="mt-6 border border-[hsl(0,0%,18%)] p-8 text-sm">
              Categoria ou franquia inválida. Volte ao Universo para navegar pelas categorias publicadas.
            </div>
          ) : themeKey && !franchiseKey && invalidFranchiseSearch ? (
            <p role="status" className="mt-6 border border-[hsl(0,0%,18%)] p-8 text-sm">
              Pesquise franquias usando de 3 a 80 caracteres ou limpe a busca.
            </p>
          ) : franchiseKey && themeKey ? (
            <CanonicalUniverseFolders
              category={themeKey}
              franchise={franchiseKey}
              gateway={gateway}
            />
          ) : activeQuery.isPending ? (
            <p role="status" className="mt-6 p-8 text-sm">Carregando categorias publicadas…</p>
          ) : activeQuery.isError ? (
            <div role="alert" className="mt-6 border border-[hsl(0,0%,18%)] p-8 text-sm">
              Não foi possível consultar o acervo oficial.
              <button className="ml-4 border border-[hsl(var(--gold-accent))] px-4 py-2 text-[hsl(var(--gold-accent))]" type="button" onClick={() => void activeQuery.refetch()}>
                Tentar novamente
              </button>
            </div>
          ) : themeKey ? (
            franchises.length === 0 ? (
              <p role="status" className="mt-6 p-8 text-sm">
                Nenhuma franquia publicada nesta categoria.
              </p>
            ) : (
              <>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {franchises.map((franchise) => (
                    <ArcadeCard key={franchise.category + "/" + franchise.id}>
                      <Link className="group flex min-h-44 flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--gold-accent))]" to={PUBLIC_ROUTES.catalog + "/" + themeKey + "/" + franchise.id}>
                        <div className="aspect-[4/3] w-full overflow-hidden bg-[hsl(0,0%,8%)]">
                          <CanonicalCatalogImage
                            src={gateway.mediaUrl(franchise.coverStorageKey ?? null)}
                            alt={"Prévia de " + franchise.label}
                            imageClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                            fallbackClassName="flex h-full w-full items-center justify-center"
                            fallbackIcon={<FolderOpen className="h-8 w-8 text-[hsl(var(--gold-accent))]" aria-hidden="true" />}
                            fallbackLabel=""
                          />
                        </div>
                        <div className="flex flex-1 flex-col gap-2 p-4">
                          <span className="line-clamp-2 break-words text-[clamp(0.625rem,3vw,0.875rem)] font-semibold uppercase">{franchise.label}</span>
                          <span className="mt-auto flex items-center justify-between gap-2 text-xs text-[hsl(0,0%,56%)]">
                            {formatModelCountLabel(franchise.count)} <ArrowRight size={16} aria-hidden="true" />
                          </span>
                        </div>
                      </Link>
                    </ArcadeCard>
                  ))}
                </div>
                {franchisesQuery.data?.truncated && (
                  <p role="status" className="mt-5 text-xs text-[hsl(0,0%,56%)]">
                    Exibindo parte das franquias. Pesquise pelo nome acima para encontrar outras sem carregar todas as páginas do acervo.
                  </p>
                )}
              </>
            )
          ) : visibleCategories.length === 0 ? (
            <p role="status" className="mt-6 p-8 text-sm">
              Nenhuma categoria publicada no momento.
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-3 min-[320px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {visibleCategories.map((category) => {
                const displayLabel = categoryDisplayLabel(category.id, category.label);
                const isAnimeCategory = category.id === "animes-desenhos";
                return (
                  <ArcadeCard key={category.id}>
                    <Link className="group flex min-h-44 flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--gold-accent))]" to={PUBLIC_ROUTES.catalog + "/" + encodeURIComponent(category.id)}>
                      <div className="aspect-[4/3] w-full overflow-hidden bg-[hsl(0,0%,8%)]">
                        <CanonicalCatalogImage
                          src={gateway.mediaUrl(category.coverStorageKey ?? null)}
                          alt={"Prévia de " + displayLabel}
                          imageClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                          fallbackClassName="flex h-full w-full items-center justify-center"
                          fallbackIcon={<ImageOff className="h-8 w-8 text-[hsl(var(--gold-accent))]" aria-hidden="true" />}
                          fallbackLabel=""
                        />
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
                        <span
                          className={
                            isAnimeCategory
                              ? "whitespace-nowrap tracking-tight text-sm min-[320px]:text-[clamp(0.625rem,3.2vw,0.875rem)] font-semibold uppercase"
                              : "break-normal text-[clamp(0.75rem,4vw,1rem)] font-semibold uppercase"
                          }
                        >
                          {displayLabel}
                        </span>
                        <span className="mt-auto flex items-center justify-between gap-2 text-xs text-[hsl(0,0%,56%)]">
                          {formatModelCountLabel(category.count)} <ArrowRight size={16} aria-hidden="true" />
                        </span>
                      </div>
                    </Link>
                  </ArcadeCard>
                );
              })}
            </div>
          )}
          {themeKey && !franchiseKey && !invalidScope && (
            <Link className="mt-8 inline-flex items-center gap-2 border border-[hsl(var(--gold-accent)/0.4)] px-5 py-3 text-sm text-[hsl(var(--gold-accent))]" to={modelsPath(themeKey)}>
              Explorar modelos desta categoria <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
        </div>
      </main>
    </Page>
  );
}
