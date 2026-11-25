import { useEffect, useMemo, useRef, useState } from "react";
import {
  catalogBrowsingScope,
  useCatalogBrowsing,
} from "@/services/catalog/catalog-browsing-context";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bookmark } from "lucide-react";
import { CanonicalCatalogImage } from "@/components/catalog/CanonicalCatalogImage";
import { CatalogImageDownload } from "@/components/catalog/CatalogImageDownload";
import {
  CatalogExplorerHeader,
  CatalogGridListToggle,
} from "@/components/catalog/CatalogExplorerHeader";
import {
  catalogModelDisplayName,
  catalogTagGroupsFromPublicTags,
  CatalogCardIdentity,
  CatalogCardMediaFrame,
  CatalogCardTagRow,
  CatalogModelCardShell,
} from "@/components/catalog/CatalogTaxonomy";
import type { CatalogTag } from "@/types/catalog-tags";
import { ApprovedModelShowcase } from "./catalog/ApprovedModelShowcase";
import {
  MAX_CANONICAL_SELECTION,
  toggleCanonicalSelection,
} from "@/services/catalog/public-catalog-selection";
import { Page } from "@/components/layouts/Page";
import { ArcadeSectionTitle } from "@/components/arcade/ArcadeLayout";
import { PUBLIC_ROUTES, catalogModelDetailsPath } from "@/config/routes";
import {
  isCatalogMediaUnderReview,
  isCatalogPublicMvpEnabled,
} from "@/config/catalog-public-mvp";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CANONICAL_CATALOG_API_BASE } from "@/config/canonical-catalog-endpoint";
import {
  createPublicCatalogGateway,
  validCatalogFolder,
  validCatalogSlug,
  type PublicCatalogModel,
} from "@/services/catalog/public-catalog-gateway";

const PAGE_SIZE = 36;
const API_BASE = CANONICAL_CATALOG_API_BASE;
const CATALOG_GRID_CLASS =
  "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 md:gap-4 2xl:gap-5";

function CatalogGridSkeleton() {
  return (
    <>
      <p role="status" className="sr-only">
        Carregando os modelos publicados…
      </p>
      <div aria-hidden="true" className={CATALOG_GRID_CLASS}>
        {Array.from({ length: 10 }, (_, index) => (
          <div
            key={index}
            className="overflow-hidden border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,7%)]"
          >
            <div className="aspect-[4/3] animate-pulse bg-gradient-to-br from-[hsl(0,0%,10%)] via-[hsl(0,0%,8%)] to-[hsl(var(--gold-accent)/0.06)] motion-reduce:animate-none" />
            <div className="space-y-3 p-3 md:p-4">
              <div className="h-4 w-4/5 animate-pulse bg-[hsl(0,0%,14%)] motion-reduce:animate-none" />
              <div className="h-3 w-2/3 animate-pulse bg-[hsl(0,0%,11%)] motion-reduce:animate-none" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ModelCover({
  model,
  mediaUrl,
}: {
  model: PublicCatalogModel;
  mediaUrl: (key: string | null) => string | null;
}) {
  const url = model.telegramPreview
    ? model.telegramPreview.cover
      ? "/catalogo-api" + model.telegramPreview.cover
      : null
    : mediaUrl(model.coverStorageKey);
  return (
    <CatalogCardMediaFrame imageCount={model.imageCount}>
      <CanonicalCatalogImage
        src={url}
        alt={"Imagem de referência: " + model.name}
        imageClassName="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none sm:p-3"
      />
    </CatalogCardMediaFrame>
  );
}

export default function CatalogModelsArcade() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q")?.trim() ?? "";
  const category = searchParams.get("category")?.trim() ?? "";
  const franchise = searchParams.get("franchise")?.trim() ?? "";
  const folder = searchParams.get("folder")?.trim() ?? "";
  const characterId = searchParams.get("character_id")?.trim() ?? "";
  const attributeId = searchParams.get("attribute_id")?.trim() ?? "";
  const quoteRequestPath =
    PUBLIC_ROUTES.quoteRequest +
    (searchParams.get("tipo") === "pre-venda" ? "?tipo=pre-venda" : "");
  const [draft, setDraft] = useState(search);
  const [catalogView, setCatalogView] = useState<"grid" | "list">("grid");
  const [filtersExpanded, setFiltersExpanded] = useState(() =>
    Boolean(category || franchise || folder || characterId || attributeId),
  );
  // Deep links already contain the selected IDs. In a public image-review
  // build, avoid extra category/franchise reads just to populate closed selects.
  // Opening either filter remains the explicit trigger for its indexed lookup.
  const mediaUnderReview = isCatalogMediaUnderReview();
  const publicReadOnly =
    import.meta.env.VITE_PREVIEW_READ_ONLY === "true" &&
    isCatalogPublicMvpEnabled();
  const publicationBlocked = publicReadOnly && mediaUnderReview;
  const [loadCategories, setLoadCategories] = useState(
    Boolean(category) && !mediaUnderReview,
  );
  const [loadFranchises, setLoadFranchises] = useState(
    Boolean(franchise) && !mediaUnderReview,
  );
  const [franchiseDraft, setFranchiseDraft] = useState("");
  const [franchiseNeedle, setFranchiseNeedle] = useState("");
  const { selectedModels, setSelectedModels, paging, setPaging } =
    useCatalogBrowsing();
  const resultsRef = useRef<HTMLDivElement>(null);
  const returnCardRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => setDraft(search), [search]);
  useEffect(() => {
    if (category || franchise || folder || characterId || attributeId)
      setFiltersExpanded(true);
  }, [category, franchise, folder, characterId, attributeId]);

  const gateway = useMemo(() => {
    if (!API_BASE) return null;
    try {
      return createPublicCatalogGateway(API_BASE, fetch);
    } catch {
      return null;
    }
  }, []);

  const scope = catalogBrowsingScope(searchParams);
  const activePage =
    paging.scope === scope ? paging : { scope, cursors: [undefined], index: 0 };
  const cursor = activePage.cursors[activePage.index];
  const searchLength = Array.from(search).length;
  const invalidSearch =
    searchLength > 0 && (searchLength < 3 || searchLength > 80);
  const invalidCatalogScope =
    Boolean(category && category !== "all" && !validCatalogSlug(category)) ||
    Boolean(franchise && !validCatalogSlug(franchise)) ||
    Boolean(folder && !validCatalogFolder(folder));
  const invalidFolderScope = Boolean(folder && (!category || !franchise));
  const invalidTaxonomyScope = Boolean(
    (characterId && !/^[A-Za-z0-9_-]{3,100}$/.test(characterId)) ||
    (attributeId && !/^[A-Za-z0-9_-]{3,100}$/.test(attributeId)) ||
    (characterId && attributeId),
  );

  const categories = useQuery({
    queryKey: ["tonecos-catalog-categories"],
    queryFn: ({ signal }) => gateway!.listCategories(signal),
    enabled:
      gateway !== null &&
      !publicationBlocked &&
      loadCategories &&
      !invalidCatalogScope &&
      !invalidSearch,
    retry: false,
    staleTime: 15 * 60 * 1000,
  });

  const franchises = useQuery({
    queryKey: ["tonecos-catalog-franchises", category, franchiseNeedle],
    queryFn: ({ signal }) =>
      gateway!.listFranchises(
        {
          category: category || undefined,
          search: franchiseNeedle || undefined,
          limit: 24,
        },
        signal,
      ),
    enabled:
      gateway !== null &&
      !publicationBlocked &&
      loadFranchises &&
      !invalidCatalogScope &&
      !invalidSearch,
    retry: false,
    staleTime: 15 * 60 * 1000,
  });

  const models = useQuery({
    queryKey: ["tonecos-catalog-list", scope, cursor],
    queryFn: ({ signal }) =>
      gateway!.listPage(
        {
          category: category || undefined,
          franchise: franchise || undefined,
          folder: folder || undefined,
          characterId: characterId || undefined,
          attributeId: attributeId || undefined,
          search: search || undefined,
          globalSearch: Boolean(search),
          limit: PAGE_SIZE,
          cursor,
        },
        signal,
      ),
    enabled:
      gateway !== null &&
      !publicationBlocked &&
      !invalidSearch &&
      !invalidTaxonomyScope &&
      !invalidFolderScope &&
      !invalidCatalogScope,
    retry: false,
    staleTime: 60 * 1000,
    // Public gallery follows the canonical Worker; no parallel catalog
    // snapshot or client-side upload channel. Background tabs do not poll.
    refetchInterval: publicReadOnly ? 2 * 60 * 1000 : false,
    refetchIntervalInBackground: false,
  });

  const rows = models.data?.items ?? [];
  // Restore the selected card only when the original filtered page is ready.
  // This one-shot field shares the existing paging state: no pixel storage,
  // browser globals, repeated catalog reads or second navigation authority.
  useEffect(() => {
    const slug = paging.returnFocusSlug;
    if (paging.scope !== scope || !slug || !models.isSuccess) return;
    const card = returnCardRef.current;
    if (card) {
      card.scrollIntoView?.({ behavior: "auto", block: "center" });
      card.focus({ preventScroll: true });
    }
    // Also discard a stale target (the result may have been unpublished).
    setPaging((current) =>
      current.scope === scope && current.returnFocusSlug === slug
        ? { ...current, returnFocusSlug: undefined }
        : current,
    );
  }, [
    models.isSuccess,
    paging.scope,
    paging.returnFocusSlug,
    scope,
    setPaging,
  ]);
  // One already fetched, bounded page. Do not request adjacent model pages
  // to build detail navigation; the current list is the only authority here.
  const pageSlugs =
    rows.length > 1 &&
    rows.length <= 36 &&
    rows.every((item) => !item.telegramPreview) &&
    rows.every((item) => validCatalogSlug(item.slug))
      ? rows.map((item) => item.slug)
      : [];
  const categoryLabel =
    categories.data?.find((item) => item.id === category)?.label || category;
  const franchiseLabel =
    franchises.data?.items.find((item) => item.id === franchise)?.label ||
    franchise;
  const hasActiveFilters = Boolean(
    search ||
    (category && category !== "all") ||
    franchise ||
    folder ||
    characterId ||
    attributeId,
  );
  const activeFacetCount = [
    category && category !== "all",
    franchise,
    folder,
    characterId,
    attributeId,
  ].filter(Boolean).length;

  function clearFilters() {
    setDraft("");
    setFranchiseDraft("");
    setFranchiseNeedle("");
    changeParams("", "", "", false);
  }

  function toggleSelected(model: PublicCatalogModel) {
    setSelectedModels((current) => toggleCanonicalSelection(current, model));
  }

  function applyCanonicalTag(model: PublicCatalogModel, tag: CatalogTag) {
    const params = new URLSearchParams();
    if (tag.kind === "category") params.set("category", tag.slug);
    else if (tag.kind === "franchise") params.set("franchise", tag.slug);
    else {
      params.set("category", model.categorySlug);
      params.set("franchise", model.franchiseSlug);
      params.set(
        tag.kind === "character" ? "character_id" : "attribute_id",
        tag.id,
      );
    }
    setSearchParams(params);
  }

  function changeParams(
    nextSearch: string,
    nextCategory: string,
    nextFranchise = franchise,
    keepFolder = true,
  ) {
    const next = new URLSearchParams();
    if (nextSearch) next.set("q", nextSearch);
    if (nextCategory && nextCategory !== "all")
      next.set("category", nextCategory);
    if (nextFranchise) next.set("franchise", nextFranchise);
    if (
      keepFolder &&
      folder &&
      nextCategory === category &&
      nextFranchise === franchise
    ) {
      next.set("folder", folder);
    }
    setSearchParams(next);
  }

  function findFranchises() {
    const query = franchiseDraft.trim();
    const length = Array.from(query).length;
    if (query && (length < 3 || length > 80)) return;
    setFranchiseNeedle(query);
    setLoadFranchises(true);
  }

  // Prevent a Worker cursor that points back to an already visited page
  // from trapping visitors in a multi-page loop. Adjacent forward history
  // remains usable after returning to a previous page.
  const repeatedCursor = Boolean(
    models.data?.nextCursor &&
    activePage.cursors
      .slice(0, activePage.index + 1)
      .includes(models.data.nextCursor),
  );

  const canGoNext =
    models.isSuccess && Boolean(models.data?.nextCursor) && !repeatedCursor;

  function goNext() {
    if (!canGoNext || !models.data?.nextCursor) return;
    setPaging({
      scope,
      cursors: [
        ...activePage.cursors.slice(0, activePage.index + 1),
        models.data.nextCursor,
      ],
      index: activePage.index + 1,
    });
    resultsRef.current?.scrollIntoView?.({
      behavior: "smooth",
      block: "start",
    });
  }

  function goBack() {
    if (activePage.index === 0) return;
    setPaging({ ...activePage, index: activePage.index - 1 });
    resultsRef.current?.scrollIntoView?.({
      behavior: "smooth",
      block: "start",
    });
  }

  // The public read-only gallery reads exclusively from reviewed cover IDs,
  // never a page of unapproved Worker entries. An empty manifest still shows
  // the editorial pre-MVP state with zero requests.
  if (publicationBlocked) return <ApprovedModelShowcase gateway={gateway} />;

  return (
    <Page
      title="Catálogo de modelos"
      description="Explore referências de esculturas e modelos do acervo TONART Studio, com busca por categoria e navegação paginada."
      keywords={["tonart", "esculturas", "modelos", "catálogo"]}
    >
      <Sheet>
        <section className="min-h-[80vh] bg-[hsl(0,0%,4%)] pb-20 text-[hsl(0,0%,94%)]">
          <CatalogExplorerHeader
            kind="historical"
            search={draft}
            onSearchChange={setDraft}
            onSearchSubmit={(event) => {
              event.preventDefault();
              changeParams(draft.trim(), category);
            }}
            onSearchClear={() => {
              setDraft("");
              changeParams("", category);
            }}
            categories={
              categories.data?.map(({ id, label }) => ({ id, label })) ??
              Array.from(
                new Map(
                  rows
                    .filter((item) => validCatalogSlug(item.categorySlug))
                    .map((item) => [item.categorySlug, item.category] as const),
                ),
              ).map(([id, label]) => ({ id, label }))
            }
            category={category === "all" ? "" : category}
            onCategoryChange={(next) => {
              setFranchiseDraft("");
              setFranchiseNeedle("");
              changeParams(draft.trim(), next, "");
            }}
            onFiltersClick={() => {
              if (!filtersExpanded) setLoadCategories(true);
              setFiltersExpanded((expanded) => !expanded);
            }}
            filterCount={activeFacetCount}
            filtersExpanded={filtersExpanded}
            filtersControlId="catalog-advanced-filters"
            totalLabel={
              models.isSuccess
                ? `Página ${activePage.index + 1} · ${rows.length} modelos nesta página`
                : undefined
            }
            coverUrl={
              rows[0] && gateway
                ? gateway.mediaUrl(rows[0].coverStorageKey)
                : undefined
            }
            collectionHref={PUBLIC_ROUTES.catalog}
          />

          <div className="relative z-10 mx-auto mt-2 w-full max-w-[1600px] px-4 md:px-6 xl:px-8">
            {mediaUnderReview ? (
              <p className="mb-4 border-l-2 border-[hsl(var(--gold-accent)/0.5)] bg-[hsl(0,0%,7%)] px-4 py-3 text-sm text-[hsl(0,0%,72%)]">
                Explore as referências disponíveis. Algumas opções podem não
                estar visíveis neste momento.
              </p>
            ) : null}
            <div
              className={
                filtersExpanded || hasActiveFilters
                  ? "border border-[hsl(var(--gold-accent)/0.2)] bg-[hsl(0,0%,6%)] p-3 sm:p-4"
                  : "border-0 p-0"
              }
            >
              {/* A pesquisa principal é compartilhada pelo cabeçalho dos dois acervos. */}

              {/* Toggle de filtros único no cabeçalho compartilhado. */}

              <div
                id="catalog-advanced-filters"
                className={`${filtersExpanded ? "grid" : "hidden"} grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4`}
              >
                <label className="min-w-0">
                  <span className="sr-only">Filtrar por categoria</span>
                  <select
                    value={category === "all" ? "" : category}
                    onChange={(event) => {
                      setFranchiseDraft("");
                      setFranchiseNeedle("");
                      changeParams(draft.trim(), event.target.value, "");
                    }}
                    onFocus={() => setLoadCategories(true)}
                    onPointerDown={() => setLoadCategories(true)}
                    aria-busy={loadCategories && categories.isFetching}
                    disabled={
                      gateway === null || (loadCategories && categories.isError)
                    }
                    className="h-12 w-full rounded-none border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] px-3 text-sm outline-none focus-visible:border-[hsl(var(--gold-accent))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold-accent)/0.2)] disabled:opacity-60"
                  >
                    <option value="">
                      {categories.isFetching
                        ? "Carregando categorias…"
                        : "Todas as categorias"}
                    </option>
                    {category &&
                      category !== "all" &&
                      !categories.data?.some(
                        (item) => item.id === category,
                      ) && <option value={category}>{categoryLabel}</option>}
                    {categories.data
                      ?.filter((item) => item.id !== "all")
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="min-w-0">
                  <span className="sr-only">Filtrar por franquia</span>
                  <select
                    value={franchise}
                    onChange={(event) =>
                      changeParams(draft.trim(), category, event.target.value)
                    }
                    onFocus={() => setLoadFranchises(true)}
                    onPointerDown={() => setLoadFranchises(true)}
                    aria-busy={loadFranchises && franchises.isFetching}
                    disabled={
                      gateway === null || (loadFranchises && franchises.isError)
                    }
                    className="h-12 w-full border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] px-3 text-sm text-[hsl(0,0%,94%)] outline-none focus-visible:border-[hsl(var(--gold-accent))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold-accent)/0.2)] disabled:opacity-60"
                  >
                    <option value="">
                      {franchises.isFetching
                        ? "Carregando franquias…"
                        : "Todas as franquias"}
                    </option>
                    {franchise &&
                      !franchises.data?.items.some(
                        (item) => item.id === franchise,
                      ) && <option value={franchise}>{franchise}</option>}
                    {franchises.data?.items.map((item) => (
                      <option
                        key={item.category + "/" + item.id}
                        value={item.id}
                      >
                        {item.label} ({item.count})
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex min-w-0 flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4">
                  <label className="min-w-0 flex-1 basis-44 sm:max-w-sm">
                    <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-[hsl(0,0%,56%)]">
                      Encontrar franquia
                    </span>
                    <input
                      value={franchiseDraft}
                      onChange={(event) =>
                        setFranchiseDraft(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          findFranchises();
                        }
                      }}
                      maxLength={80}
                      placeholder="Digite 3 letras ou mais"
                      aria-label="Pesquisar franquias"
                      aria-describedby="franchise-search-hint"
                      disabled={gateway === null}
                      className="h-12 w-full border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] px-3 font-mono text-xs text-[hsl(0,0%,94%)] placeholder:text-[hsl(0,0%,42%)] focus-visible:outline-2 focus-visible:outline-[hsl(var(--gold-accent))] disabled:opacity-60"
                    />
                    <span id="franchise-search-hint" className="sr-only">
                      Pesquise franquias pelo nome, usando até 80 caracteres.
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={findFranchises}
                    disabled={
                      gateway === null ||
                      (franchiseDraft.trim().length > 0 &&
                        Array.from(franchiseDraft.trim()).length < 3)
                    }
                    aria-label="Buscar franquias"
                    className="inline-flex min-h-12 items-center justify-center border border-[hsl(var(--gold-accent)/0.5)] px-4 font-mono text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))] disabled:opacity-40"
                  >
                    Buscar franquias
                  </button>
                  {franchises.data?.truncated ? (
                    <p
                      className="max-w-xs text-xs text-[hsl(0,0%,56%)]"
                      role="status"
                    >
                      A lista mostra apenas parte das franquias. Pesquise pelo
                      nome para refinar.
                    </p>
                  ) : null}
                </div>

                {categories.isError &&
                !invalidSearch &&
                !invalidCatalogScope ? (
                  <div
                    role="alert"
                    className="flex flex-wrap items-center gap-3 text-xs text-[hsl(0,0%,56%)] sm:col-span-2 lg:col-span-4"
                  >
                    <span>Não foi possível carregar as categorias.</span>
                    <button
                      type="button"
                      onClick={() => void categories.refetch()}
                      disabled={categories.isFetching}
                      className="min-h-11 border border-[hsl(var(--gold-accent)/0.5)] px-3 text-[hsl(var(--gold-accent))] disabled:opacity-40"
                    >
                      Tentar novamente categorias
                    </button>
                  </div>
                ) : null}

                {franchises.isError &&
                !invalidSearch &&
                !invalidCatalogScope ? (
                  <div
                    className="flex flex-wrap items-center gap-2 text-xs text-[hsl(0,0%,56%)] sm:col-span-2 lg:col-span-4"
                    role="alert"
                  >
                    <span>Não foi possível consultar as franquias.</span>
                    <button
                      type="button"
                      onClick={() => void franchises.refetch()}
                      disabled={franchises.isFetching}
                      className="min-h-11 border border-[hsl(var(--gold-accent)/0.5)] px-3 text-[hsl(var(--gold-accent))] disabled:opacity-40"
                    >
                      Tentar novamente franquias
                    </button>
                  </div>
                ) : null}
              </div>

              {folder && !invalidFolderScope && !invalidCatalogScope && (
                <div
                  role="status"
                  className="mt-3 flex flex-wrap items-center gap-2 break-all text-xs text-[hsl(var(--gold-accent))]"
                >
                  Pasta selecionada: {folder}
                  <button
                    type="button"
                    onClick={() =>
                      changeParams(search, category, franchise, false)
                    }
                    className="border border-[hsl(var(--gold-accent)/0.5)] px-3 py-2"
                  >
                    Limpar pasta
                  </button>
                </div>
              )}

              {hasActiveFilters && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {search && (
                    <span className="max-w-full break-words border border-[hsl(0,0%,24%)] px-2 py-1">
                      Busca: {search}
                    </span>
                  )}
                  {category && category !== "all" && (
                    <span className="max-w-full break-words border border-[hsl(0,0%,24%)] px-2 py-1">
                      Categoria: {categoryLabel}
                    </span>
                  )}
                  {franchise && (
                    <span className="max-w-full break-words border border-[hsl(0,0%,24%)] px-2 py-1">
                      Franquia: {franchiseLabel}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="min-h-11 px-2 text-[hsl(var(--gold-accent))] underline underline-offset-4"
                  >
                    Limpar filtros
                  </button>
                </div>
              )}
            </div>

            <div
              ref={resultsRef}
              className="mb-4 mt-4 flex scroll-mt-24 flex-wrap items-end justify-between gap-3"
            >
              <ArcadeSectionTitle>MODELOS DO ACERVO</ArcadeSectionTitle>
              <div className="flex flex-wrap items-center gap-3">
                {models.isSuccess && (
                  <p
                    className="text-sm text-[hsl(0,0%,62%)]"
                    aria-live="polite"
                  >
                    Página {activePage.index + 1} · {rows.length}{" "}
                    {rows.length === 1 ? "modelo" : "modelos"} nesta página
                    {canGoNext ? " · Há mais modelos" : ""}
                  </p>
                )}
                {models.isSuccess && (activePage.index > 0 || canGoNext) && (
                  <nav
                    aria-label="Navegação rápida do catálogo"
                    className="flex flex-wrap items-center gap-2"
                  >
                    {activePage.index > 0 && (
                      <button
                        type="button"
                        onClick={goBack}
                        className="inline-flex min-h-11 items-center gap-2 border border-[hsl(0,0%,28%)] px-3 text-xs font-semibold text-[hsl(0,0%,88%)] hover:border-[hsl(var(--gold-accent))]"
                      >
                        <ArrowLeft size={15} aria-hidden="true" />
                        Voltar à página {activePage.index}
                      </button>
                    )}
                    {canGoNext && (
                      <button
                        type="button"
                        onClick={goNext}
                        className="inline-flex min-h-11 items-center gap-2 border border-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent))] px-4 text-xs font-bold uppercase tracking-[0.08em] text-[hsl(0,0%,5%)] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        Ver página {activePage.index + 2}
                        <ArrowRight size={16} aria-hidden="true" />
                      </button>
                    )}
                  </nav>
                )}
                <CatalogGridListToggle
                  view={catalogView}
                  onChange={setCatalogView}
                />
                <SheetTrigger asChild>
                  <button
                    type="button"
                    aria-label={
                      (publicReadOnly
                        ? "Abrir referências salvas com "
                        : "Abrir seleção para orçamento com ") +
                      selectedModels.length +
                      (selectedModels.length === 1 ? " modelo" : " modelos")
                    }
                    className="inline-flex min-h-11 items-center gap-2 border border-[hsl(var(--gold-accent))] px-3 text-sm font-semibold text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <Bookmark size={16} aria-hidden="true" />
                    Minha seleção
                    <span
                      aria-hidden="true"
                      className="bg-[hsl(var(--gold-accent)/0.12)] px-1.5 py-0.5 font-mono text-xs"
                    >
                      {selectedModels.length}/{MAX_CANONICAL_SELECTION}
                    </span>
                  </button>
                </SheetTrigger>
              </div>
            </div>

            {gateway === null ? (
              <div
                role="status"
                className="rounded-none border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] p-8"
              >
                <h3 className="text-xl">
                  Catálogo temporariamente indisponível
                </h3>
                <p className="mt-2 max-w-xl text-sm text-[hsl(0,0%,56%)]">
                  Não foi possível acessar os modelos agora. Tente novamente
                  mais tarde.
                </p>
              </div>
            ) : invalidCatalogScope ? (
              <p
                role="status"
                className="rounded-none bg-[hsl(0,0%,7%)] p-7 text-sm"
              >
                Categoria, franquia ou pasta inválida. Revise os filtros da URL.
              </p>
            ) : invalidFolderScope ? (
              <p
                role="status"
                className="rounded-none bg-[hsl(0,0%,7%)] p-7 text-sm"
              >
                A pasta requer uma categoria e uma franquia válidas.
              </p>
            ) : invalidSearch ? (
              <p
                role="status"
                className="rounded-none bg-[hsl(0,0%,7%)] p-7 text-sm"
              >
                {searchLength > 80
                  ? "Utilize no máximo 80 caracteres na pesquisa."
                  : "Utilize ao menos três caracteres na pesquisa."}
              </p>
            ) : models.isPending ? (
              <CatalogGridSkeleton />
            ) : models.isError ? (
              <div
                role="alert"
                className="rounded-none border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] p-7"
              >
                <h3 className="text-lg">
                  Não foi possível consultar o acervo.
                </h3>
                <p className="mt-2 text-sm text-[hsl(0,0%,56%)]">
                  Verifique sua conexão e tente novamente em instantes.
                </p>
                <button
                  type="button"
                  onClick={() => void models.refetch()}
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-none border border-[hsl(var(--gold-accent))] px-4 text-sm hover:bg-[hsl(var(--gold-accent)/0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]"
                >
                  Tentar novamente
                </button>
              </div>
            ) : rows.length === 0 ? (
              <div
                role="status"
                className="border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] p-6 sm:p-8"
              >
                <p className="text-sm leading-relaxed text-[hsl(0,0%,75%)]">
                  {canGoNext
                    ? "Não há modelos disponíveis nesta página. Continue para ver mais resultados."
                    : "Nenhum modelo disponível corresponde aos filtros utilizados. Tente outra busca."}
                </p>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 inline-flex min-h-11 items-center justify-center border border-[hsl(var(--gold-accent)/0.6)] px-4 text-sm font-semibold text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]"
                  >
                    Limpar filtros e ver o acervo
                  </button>
                ) : null}
              </div>
            ) : (
              <div
                className={
                  catalogView === "grid"
                    ? CATALOG_GRID_CLASS
                    : "grid grid-cols-1 gap-3 sm:gap-4"
                }
              >
                {rows.map((model) => {
                  const displayName = catalogModelDisplayName(model);
                  const isSelected = selectedModels.some(
                    (item) => item.id === model.id,
                  );
                  const tagGroups = catalogTagGroupsFromPublicTags(
                    model.tags ?? [],
                    (tag) => applyCanonicalTag(model, tag),
                  );
                  return (
                    <CatalogModelCardShell key={model.id} selected={isSelected}>
                      <div className="flex h-full flex-col">
                        <Link
                          to={
                            model.telegramPreview
                              ? PUBLIC_ROUTES.catalogReview +
                                "?modelo=" +
                                model.id
                              : catalogModelDetailsPath(model.slug)
                          }
                          ref={
                            paging.scope === scope &&
                            paging.returnFocusSlug === model.slug
                              ? returnCardRef
                              : undefined
                          }
                          state={{
                            catalogReturnSearch: searchParams.toString(),
                            catalogSiblingSlugs: pageSlugs,
                          }}
                          aria-label={"Ver detalhes de " + model.name}
                          className="block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]"
                        >
                          <ModelCover
                            model={model}
                            mediaUrl={(key) => gateway.mediaUrl(key)}
                          />
                          <div className="p-3 pb-1 md:px-4 md:pt-4">
                            <CatalogCardIdentity name={displayName} />
                            {model.telegramPreview?.pending && (
                              <span className="mt-1 inline-block text-xs text-[hsl(var(--gold-accent))]">
                                Em revisão
                              </span>
                            )}
                          </div>
                        </Link>
                        <CatalogImageDownload
                          src={
                            model.telegramPreview
                              ? model.telegramPreview.cover
                                ? "/catalogo-api" +
                                  model.telegramPreview.cover.replace(
                                    /\/thumb$/,
                                    "/display",
                                  )
                                : null
                              : gateway.mediaUrl(model.coverStorageKey)
                          }
                          name={model.name}
                          id={model.id}
                          className="mx-3 mb-2"
                        />
                        <CatalogCardTagRow
                          label={"Filtros de " + model.name}
                          groups={tagGroups}
                        />
                        {!model.telegramPreview && (
                          <button
                            type="button"
                            onClick={() => toggleSelected(model)}
                            disabled={
                              !isSelected &&
                              selectedModels.length >= MAX_CANONICAL_SELECTION
                            }
                            aria-pressed={isSelected}
                            className="mx-3 mb-3 inline-flex min-h-11 items-center justify-center border border-[hsl(0,0%,25%)] px-2 text-xs font-medium hover:border-[hsl(var(--gold-accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
                          >
                            {isSelected
                              ? "Remover da seleção"
                              : "Adicionar à seleção"}
                          </button>
                        )}
                      </div>
                    </CatalogModelCardShell>
                  );
                })}
              </div>
            )}

            {models.isSuccess && repeatedCursor && (
              <p
                role="status"
                className="mt-5 text-center text-sm text-[hsl(0,0%,56%)]"
              >
                Esta sequência de páginas retornaria a uma página já visitada.
                Volte ou refine a busca para continuar.
              </p>
            )}

            {models.isSuccess &&
              (activePage.index > 0 || !!models.data.nextCursor) && (
                <nav
                  aria-label="Páginas do catálogo"
                  className="mt-10 flex flex-wrap items-center justify-center gap-3 border-t border-[hsl(0,0%,16%)] pt-7 sm:gap-5"
                >
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={activePage.index === 0}
                    aria-label="Página anterior"
                    className="inline-flex min-h-12 items-center gap-2 rounded-none border border-[hsl(0,0%,36%)] px-5 text-sm font-semibold text-[hsl(0,0%,90%)] hover:border-[hsl(var(--gold-accent))] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ArrowLeft size={16} aria-hidden="true" />
                    <span className="hidden sm:inline">Anterior</span>
                  </button>
                  <span className="min-w-24 text-center font-mono text-sm font-semibold text-[hsl(var(--gold-accent))]">
                    Página {activePage.index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!canGoNext}
                    aria-label="Próxima página"
                    className="inline-flex min-h-12 items-center gap-2 rounded-none border border-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent))] px-5 text-sm font-bold text-[hsl(0,0%,5%)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <span className="hidden sm:inline">Próxima</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </nav>
              )}
          </div>
        </section>

        <SheetContent
          side="right"
          className="flex h-dvh w-full flex-col gap-0 border-[hsl(var(--gold-accent)/0.3)] bg-[hsl(0,0%,7%)] p-0 text-[hsl(0,0%,94%)] sm:max-w-md motion-reduce:animate-none"
        >
          <SheetHeader className="shrink-0 border-b border-[hsl(0,0%,18%)] px-5 py-5 pr-12 text-left sm:px-6 sm:pr-12">
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-[hsl(var(--gold-accent))]">
              Acervo TONART
            </span>
            <SheetTitle className="text-2xl text-[hsl(0,0%,94%)]">
              Minha seleção
            </SheetTitle>
            <SheetDescription className="text-[hsl(0,0%,66%)]">
              {publicReadOnly
                ? "Reúna referências para comparar durante esta visita. O catálogo público não recebe solicitações."
                : "Revise os modelos que você reuniu para um futuro orçamento."}
            </SheetDescription>
            <p role="status" className="text-sm text-[hsl(var(--gold-accent))]">
              {selectedModels.length} de {MAX_CANONICAL_SELECTION} modelos
              selecionados.
            </p>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
            {selectedModels.length === 0 ? (
              <div className="border border-dashed border-[hsl(0,0%,24%)] bg-[hsl(0,0%,9%)] p-5">
                <Bookmark
                  size={20}
                  aria-hidden="true"
                  className="mb-3 text-[hsl(var(--gold-accent))]"
                />
                <p className="text-sm font-semibold">Sua seleção está vazia.</p>
                <p className="mt-1 text-sm text-[hsl(0,0%,66%)]">
                  Adicione modelos do catálogo para vê-los aqui.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {selectedModels.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center gap-3 border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,9%)] p-2"
                  >
                    <SheetClose asChild>
                      <Link
                        to={catalogModelDetailsPath(item.slug)}
                        state={{ catalogReturnSearch: searchParams.toString() }}
                        className="flex min-w-0 flex-1 basis-36 items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--gold-accent))]"
                      >
                        <div
                          aria-hidden="true"
                          className="flex h-14 w-12 shrink-0 items-center justify-center overflow-hidden bg-[hsl(0,0%,5%)]"
                        >
                          <CanonicalCatalogImage
                            src={
                              gateway?.mediaUrl(item.coverStorageKey) ?? null
                            }
                            alt=""
                            imageClassName="h-full w-full object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold">
                            {item.name}
                          </p>
                          <p className="break-words text-xs text-[hsl(0,0%,66%)]">
                            {item.code}
                          </p>
                        </div>
                      </Link>
                    </SheetClose>
                    <button
                      type="button"
                      onClick={() => toggleSelected(item)}
                      aria-label={"Remover " + item.name + " da seleção"}
                      className="ml-auto min-h-11 shrink-0 border border-[hsl(0,0%,25%)] px-2 text-xs hover:border-[hsl(var(--gold-accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--gold-accent))]"
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <footer className="shrink-0 border-t border-[hsl(0,0%,18%)] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
            <p className="mb-3 text-xs leading-relaxed text-[hsl(0,0%,66%)]">
              {publicReadOnly
                ? "A seleção fica apenas nesta visita e não é enviada ao estúdio."
                : "A seleção fica disponível durante esta visita. Nenhum orçamento foi enviado."}
            </p>
            {selectedModels.length > 0 &&
            import.meta.env.VITE_TONECOS_COMMERCIAL_MVP === "true" ? (
              <SheetClose asChild>
                <Link
                  to={quoteRequestPath}
                  className="mb-3 inline-flex min-h-11 w-full items-center justify-center bg-[hsl(var(--gold-accent))] px-4 text-sm font-semibold text-black hover:brightness-110"
                >
                  Solicitar orçamento dos modelos
                </Link>
              </SheetClose>
            ) : null}
            <SheetClose asChild>
              <button
                type="button"
                className="min-h-11 w-full border border-[hsl(var(--gold-accent))] px-4 text-sm font-semibold text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Continuar explorando
              </button>
            </SheetClose>
          </footer>
        </SheetContent>
      </Sheet>
    </Page>
  );
}
