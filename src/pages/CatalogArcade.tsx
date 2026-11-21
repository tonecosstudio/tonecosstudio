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
import { PUBLIC_ROUTES, catalogModelsPath } from "@/config/routes";
import { formatModelCountLabel } from "@/lib/catalog-model-count";
import { CanonicalUniverseFolders } from "@/pages/catalog/CanonicalUniverseFolders";
import { CatalogUniverseEditorialPanel } from "@/pages/catalog/CatalogUniverseEditorialPanel";
import { CANONICAL_CATALOG_API_BASE } from "@/config/canonical-catalog-endpoint";
import { isCatalogMediaUnderReview } from "@/config/catalog-public-mvp";
import {
  createPublicCatalogGateway,
  validCatalogFolder,
} from "@/services/catalog/public-catalog-gateway";

const VALID_SLUG = /^[a-z0-9][a-z0-9-]{0,239}$/;

function readableSlugLabel(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeUniverseLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " e ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const ALL_MODELS_CATEGORY_KEYS = new Set([
  "all",
  "all-categories",
  "all-items",
  "all-models",
  "acervo-completo",
  "catalogo-completo",
  "todas",
  "todas-as-categorias",
  "todas-categorias",
  "todos",
  "todos-modelos",
  "todos-os-modelos",
]);

function isAllModelsCategory(category: { id: string; label: string }): boolean {
  return (
    ALL_MODELS_CATEGORY_KEYS.has(normalizeUniverseLabel(category.id)) ||
    ALL_MODELS_CATEGORY_KEYS.has(normalizeUniverseLabel(category.label))
  );
}

function isAnimesAndDrawingsCategory(id: string, label?: string): boolean {
  const animeKeys = new Set(["animes-desenhos", "animes-e-desenhos"]);
  return (
    animeKeys.has(normalizeUniverseLabel(id)) ||
    animeKeys.has(normalizeUniverseLabel(label ?? ""))
  );
}

function categoryDisplayLabel(id: string, label?: string): string {
  if (isAnimesAndDrawingsCategory(id, label)) return "Animes e Desenhos";
  return label ?? readableSlugLabel(id);
}

function UniverseCardsSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" className="mt-6">
      <p role="status" className="sr-only">
        {label}
      </p>
      <div
        aria-hidden="true"
        className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
      >
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="overflow-hidden border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,7%)]"
          >
            <div className="aspect-[4/3] animate-pulse bg-gradient-to-br from-[hsl(0,0%,10%)] via-[hsl(0,0%,8%)] to-[hsl(var(--gold-accent)/0.06)] motion-reduce:animate-none" />
            <div className="space-y-3 p-4">
              <div className="h-4 w-3/4 animate-pulse bg-[hsl(0,0%,14%)] motion-reduce:animate-none" />
              <div className="h-3 w-2/5 animate-pulse bg-[hsl(0,0%,11%)] motion-reduce:animate-none" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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
  const mediaUnderReview = isCatalogMediaUnderReview();
  const [searchParams, setSearchParams] = useSearchParams();
  const folderScope = searchParams.get("folder");
  const invalidFolderScope =
    folderScope !== null && !validCatalogFolder(folderScope);
  const invalidScope =
    (themeKey !== undefined && !VALID_SLUG.test(themeKey)) ||
    (franchiseKey !== undefined && !VALID_SLUG.test(franchiseKey)) ||
    invalidFolderScope;
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
    if (
      needle &&
      (Array.from(needle).length < 3 || Array.from(needle).length > 80)
    ) {
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
    enabled: gateway !== null && !invalidScope && !mediaUnderReview,
    retry: false,
    staleTime: 15 * 60 * 1000,
  });

  const franchisesQuery = useQuery({
    queryKey: [
      "tonecos-universe-canonical-franchises",
      themeKey,
      franchiseLabelSearch,
    ],
    queryFn: ({ signal }) =>
      gateway!.listFranchises(
        {
          category: themeKey,
          search: franchiseLabelSearch || undefined,
          limit: 24,
        },
        signal,
      ),
    enabled:
      gateway !== null &&
      !mediaUnderReview &&
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
    return <Navigate to={catalogModelsPath(themeKey, franchiseKey)} replace />;
  }

  const activeQuery = themeKey ? franchisesQuery : categoriesQuery;
  const categories = categoriesQuery.data ?? [];
  // The API's aggregate "Todos" points to the same catalog as the CTA above.
  const visibleCategories = categories.filter(
    (category) => !isAllModelsCategory(category),
  );
  const franchises = franchisesQuery.data?.items ?? [];
  const categoryLabel = themeKey
    ? categoryDisplayLabel(
        themeKey,
        categories.find((category) => category.id === themeKey)?.label,
      )
    : "";
  const franchiseLabel = franchiseKey
    ? (franchises.find(
        (franchise) =>
          franchise.id === franchiseKey && franchise.category === themeKey,
      )?.label ?? readableSlugLabel(franchiseKey))
    : "";

  return (
    <Page
      title="Universo de modelos — TONART Studio"
      description="Explore categorias, franquias e modelos publicados no acervo canônico TONART Studio."
      keywords={["tonart", "universo", "modelos", "catálogo"]}
    >
      <div className="min-h-[80vh] bg-[hsl(0,0%,4%)] pb-20 text-[hsl(0,0%,94%)]">
        <ArcadeHero
          badge="ACERVO TONART"
          title="UNIVERSO"
          subtitle="EXPLORE CATEGORIAS, PERSONAGENS E UNIVERSOS."
          stats={[]}
          compact
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pt-8 md:px-6">
          <nav
            aria-label="Navegação do acervo"
            className="mb-8 flex flex-wrap items-center gap-3 text-xs"
          >
            <Link
              className="inline-flex min-h-11 items-center text-[hsl(var(--gold-accent))] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]"
              to={PUBLIC_ROUTES.catalog}
            >
              Universo
            </Link>
            {themeKey && (
              <Link
                className="inline-flex min-h-11 items-center text-[hsl(0,0%,56%)] hover:text-[hsl(var(--gold-accent))] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]"
                to={PUBLIC_ROUTES.catalog + "/" + encodeURIComponent(themeKey)}
              >
                / {categoryLabel}
              </Link>
            )}
            {franchiseKey && (
              <span className="text-[hsl(0,0%,56%)]">/ {franchiseLabel}</span>
            )}
            <Link
              className="ml-auto inline-flex min-h-11 items-center justify-center border border-[hsl(var(--gold-accent)/0.4)] px-4 py-3 font-mono text-xs uppercase tracking-wide text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]"
              to={catalogModelsPath()}
            >
              Ver todos os modelos
            </Link>
          </nav>
          {themeKey && franchiseKey ? (
            <CatalogUniverseEditorialPanel
              categorySlug={themeKey}
              franchiseSlug={franchiseKey}
            />
          ) : null}
          <ArcadeSectionTitle>
            {franchiseKey
              ? "PASTAS E MODELOS"
              : themeKey
                ? "FRANQUIAS DA CATEGORIA"
                : "CATEGORIAS"}
          </ArcadeSectionTitle>

          {themeKey && !franchiseKey && !invalidScope && !mediaUnderReview && (
            <form
              role="search"
              aria-label="Buscar franquias desta categoria"
              onSubmit={(event) => {
                event.preventDefault();
                submitFranchiseSearch();
              }}
              className="mt-6 flex flex-wrap items-center gap-3"
            >
              <label className="w-full min-w-0 flex-1 sm:w-auto sm:min-w-56">
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
                disabled={
                  Boolean(franchiseDraft.trim()) &&
                  Array.from(franchiseDraft.trim()).length < 3
                }
                className="h-12 w-full border border-[hsl(var(--gold-accent))] px-5 font-mono text-xs uppercase text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)] disabled:opacity-40 sm:w-auto"
              >
                Buscar franquias
              </button>
              {franchiseSearch && (
                <Link
                  to={
                    PUBLIC_ROUTES.catalog + "/" + encodeURIComponent(themeKey)
                  }
                  className="inline-flex min-h-12 items-center border border-[hsl(0,0%,18%)] px-4 text-xs text-[hsl(0,0%,75%)] hover:text-[hsl(var(--gold-accent))]"
                >
                  Limpar busca
                </Link>
              )}
            </form>
          )}

          {gateway === null ? (
            <div
              role="status"
              className="mt-6 border border-[hsl(0,0%,18%)] p-8 text-sm"
            >
              O acervo não está disponível agora. Tente novamente mais tarde.
            </div>
          ) : invalidScope ? (
            <div
              role={invalidFolderScope ? "alert" : "status"}
              className="mt-6 border border-[hsl(0,0%,18%)] p-8 text-sm"
            >
              {invalidFolderScope
                ? "Não foi possível encontrar esta pasta. Volte ao catálogo para continuar."
                : "Categoria ou franquia inválida. Volte ao Universo para navegar pelas categorias publicadas."}
            </div>
          ) : mediaUnderReview ? (
            <section
              role="status"
              aria-labelledby="universe-review-title"
              className="mt-6 border border-[hsl(var(--gold-accent)/0.3)] bg-[hsl(0,0%,7%)] px-6 py-9 sm:px-9"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--gold-accent))]">
                ACERVO TONART
              </p>
              <h3
                id="universe-review-title"
                className="mt-4 text-2xl font-semibold uppercase tracking-wide sm:text-3xl"
              >
                Explore nosso universo
              </h3>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[hsl(0,0%,70%)]">
                Conheça as referências disponíveis no catálogo e explore
                diferentes personagens e estilos.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to={PUBLIC_ROUTES.catalogModels}
                  className="inline-flex min-h-11 items-center gap-2 border border-[hsl(var(--gold-accent))] px-5 py-3 text-sm font-semibold text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)]"
                >
                  Consultar modelos <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <Link
                  to={PUBLIC_ROUTES.contact}
                  className="inline-flex min-h-11 items-center border border-[hsl(0,0%,30%)] px-5 py-3 text-sm text-[hsl(0,0%,85%)] hover:border-[hsl(var(--gold-accent))]"
                >
                  Falar com o estúdio
                </Link>
              </div>
            </section>
          ) : themeKey && !franchiseKey && invalidFranchiseSearch ? (
            <p
              role="status"
              className="mt-6 border border-[hsl(0,0%,18%)] p-8 text-sm"
            >
              Pesquise franquias usando de 3 a 80 caracteres ou limpe a busca.
            </p>
          ) : franchiseKey && themeKey ? (
            <CanonicalUniverseFolders
              category={themeKey}
              franchise={franchiseKey}
              gateway={gateway}
            />
          ) : activeQuery.isPending ? (
            <UniverseCardsSkeleton
              label={
                themeKey
                  ? "Carregando franquias publicadas…"
                  : "Carregando categorias publicadas…"
              }
            />
          ) : activeQuery.isError ? (
            <div
              role="alert"
              className="mt-6 border border-[hsl(0,0%,18%)] p-8 text-sm"
            >
              Não foi possível consultar o acervo oficial.
              <button
                className="ml-0 inline-flex min-h-11 items-center justify-center border border-[hsl(var(--gold-accent))] px-4 text-[hsl(var(--gold-accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))] sm:ml-2"
                type="button"
                onClick={() => void activeQuery.refetch()}
              >
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
                <div className="mt-6 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                  {franchises.map((franchise) => (
                    <ArcadeCard key={franchise.category + "/" + franchise.id}>
                      <Link
                        className="group flex min-h-44 flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]"
                        to={
                          PUBLIC_ROUTES.catalog +
                          "/" +
                          themeKey +
                          "/" +
                          franchise.id
                        }
                      >
                        <div className="aspect-[4/3] w-full overflow-hidden bg-[hsl(0,0%,8%)]">
                          <CanonicalCatalogImage
                            src={gateway.mediaUrl(
                              franchise.coverStorageKey ?? null,
                            )}
                            alt={"Prévia de " + franchise.label}
                            imageClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                            fallbackClassName="flex h-full w-full items-center justify-center"
                            fallbackIcon={
                              <FolderOpen
                                className="h-8 w-8 text-[hsl(var(--gold-accent))]"
                                aria-hidden="true"
                              />
                            }
                            fallbackLabel=""
                          />
                        </div>
                        <div className="flex flex-1 flex-col gap-2 p-4">
                          <span className="line-clamp-3 break-words text-[clamp(0.625rem,3vw,0.875rem)] font-semibold uppercase sm:line-clamp-2">
                            {franchise.label}
                          </span>
                          <span className="mt-auto flex items-center justify-between gap-2 text-xs text-[hsl(0,0%,56%)]">
                            {formatModelCountLabel(franchise.count)}{" "}
                            <ArrowRight size={16} aria-hidden="true" />
                          </span>
                        </div>
                      </Link>
                    </ArcadeCard>
                  ))}
                </div>
                {franchisesQuery.data?.truncated && (
                  <p
                    role="status"
                    className="mt-5 text-xs text-[hsl(0,0%,56%)]"
                  >
                    Exibindo parte das franquias. Pesquise pelo nome acima para
                    encontrar outras sem carregar todas as páginas do acervo.
                  </p>
                )}
              </>
            )
          ) : visibleCategories.length === 0 ? (
            <p role="status" className="mt-6 p-8 text-sm">
              Nenhuma categoria publicada no momento.
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {visibleCategories.map((category) => {
                const displayLabel = categoryDisplayLabel(
                  category.id,
                  category.label,
                );
                const isAnimeCategory = isAnimesAndDrawingsCategory(
                  category.id,
                  category.label,
                );
                return (
                  <ArcadeCard key={category.id}>
                    <Link
                      className="group flex min-h-44 flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]"
                      to={
                        PUBLIC_ROUTES.catalog +
                        "/" +
                        encodeURIComponent(category.id)
                      }
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden bg-[hsl(0,0%,8%)]">
                        <CanonicalCatalogImage
                          src={gateway.mediaUrl(
                            category.coverStorageKey ?? null,
                          )}
                          alt={"Prévia de " + displayLabel}
                          imageClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                          fallbackClassName="flex h-full w-full items-center justify-center"
                          fallbackIcon={
                            <ImageOff
                              className="h-8 w-8 text-[hsl(var(--gold-accent))]"
                              aria-hidden="true"
                            />
                          }
                          fallbackLabel=""
                        />
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
                        <span
                          className={
                            isAnimeCategory
                              ? "block max-w-full min-w-0 whitespace-nowrap tracking-tight text-sm min-[360px]:text-[clamp(0.625rem,2.8vw,0.875rem)] font-semibold uppercase"
                              : "break-normal text-[clamp(0.75rem,4vw,1rem)] font-semibold uppercase"
                          }
                        >
                          {displayLabel}
                        </span>
                        <span className="mt-auto flex items-center justify-between gap-2 text-xs text-[hsl(0,0%,56%)]">
                          {formatModelCountLabel(category.count)}{" "}
                          <ArrowRight size={16} aria-hidden="true" />
                        </span>
                      </div>
                    </Link>
                  </ArcadeCard>
                );
              })}
            </div>
          )}
          {themeKey && !franchiseKey && !invalidScope && !mediaUnderReview && (
            <Link
              className="mt-8 inline-flex items-center gap-2 border border-[hsl(var(--gold-accent)/0.4)] px-5 py-3 text-sm text-[hsl(var(--gold-accent))]"
              to={catalogModelsPath(themeKey)}
            >
              Explorar modelos desta categoria{" "}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </Page>
  );
}
