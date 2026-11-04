import { useEffect, useMemo, useRef, useState } from "react";
import { useCatalogBrowsing } from "@/services/catalog/catalog-browsing-context";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bookmark, Search, X } from "lucide-react";
import { CanonicalCatalogImage } from "@/components/catalog/CanonicalCatalogImage";
import {
  MAX_CANONICAL_SELECTION,
  toggleCanonicalSelection,
} from "@/services/catalog/public-catalog-selection";
import { Page } from "@/components/layouts/Page";
import {
  ArcadeCard,
  ArcadeHero,
  ArcadeSectionTitle,
} from "@/components/arcade/ArcadeLayout";
import { catalogModelDetailsPath } from "@/config/routes";
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

function ModelCover({
  model,
  mediaUrl,
}: {
  model: PublicCatalogModel;
  mediaUrl: (key: string | null) => string | null;
}) {
  const url = mediaUrl(model.coverStorageKey);
  return (
    <div className="flex aspect-[2/3] items-center justify-center overflow-hidden bg-[hsl(0,0%,9%)]">
      <CanonicalCatalogImage
        src={url}
        alt={"Imagem de referência: " + model.name}
        imageClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
      />
    </div>
  );
}

export default function CatalogModelsArcade() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q")?.trim() ?? "";
  const category = searchParams.get("category")?.trim() ?? "";
  const franchise = searchParams.get("franchise")?.trim() ?? "";
  const folder = searchParams.get("folder")?.trim() ?? "";
  const [draft, setDraft] = useState(search);
  const [loadCategories, setLoadCategories] = useState(Boolean(category));
  const [loadFranchises, setLoadFranchises] = useState(Boolean(franchise));
  const [franchiseDraft, setFranchiseDraft] = useState("");
  const [franchiseNeedle, setFranchiseNeedle] = useState("");
  const { selectedModels, setSelectedModels, paging, setPaging } =
    useCatalogBrowsing();
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => setDraft(search), [search]);

  const gateway = useMemo(() => {
    if (!API_BASE) return null;
    try {
      return createPublicCatalogGateway(API_BASE, fetch);
    } catch {
      return null;
    }
  }, []);

  const scope = JSON.stringify([search, category, franchise, folder]);
  const activePage =
    paging.scope === scope ? paging : { scope, cursors: [undefined], index: 0 };
  const cursor = activePage.cursors[activePage.index];
  const searchLength = Array.from(search).length;
  const invalidSearch = searchLength > 0 && (searchLength < 3 || searchLength > 80);
  const invalidCatalogScope =
    Boolean(category && category !== "all" && !validCatalogSlug(category)) ||
    Boolean(franchise && !validCatalogSlug(franchise)) ||
    Boolean(folder && !validCatalogFolder(folder));
  const invalidFolderScope = Boolean(folder && (!category || !franchise));

  const categories = useQuery({
    queryKey: ["tonecos-catalog-categories"],
    queryFn: ({ signal }) => gateway!.listCategories(signal),
    enabled: gateway !== null && loadCategories && !invalidCatalogScope && !invalidSearch,
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
    enabled: gateway !== null && loadFranchises && !invalidCatalogScope && !invalidSearch,
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
          search: search || undefined,
          limit: PAGE_SIZE,
          cursor,
        },
        signal,
      ),
    enabled: gateway !== null && !invalidSearch && !invalidFolderScope && !invalidCatalogScope,
    retry: false,
    staleTime: 60 * 1000,
  });

  const rows = models.data?.items ?? [];
  const categoryLabel =
    categories.data?.find((item) => item.id === category)?.label || category;
  const franchiseLabel =
    franchises.data?.items.find((item) => item.id === franchise)?.label || franchise;
  const hasActiveFilters = Boolean(search || (category && category !== "all") || franchise || folder);

  function clearFilters() {
    setDraft("");
    setFranchiseDraft("");
    setFranchiseNeedle("");
    changeParams("", "", "", false);
  }

  function toggleSelected(model: PublicCatalogModel) {
    setSelectedModels((current) => toggleCanonicalSelection(current, model));
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
    if (keepFolder && folder && nextCategory === category && nextFranchise === franchise) {
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

  const canGoNext = models.isSuccess && Boolean(models.data?.nextCursor) && !repeatedCursor;

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
    resultsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  function goBack() {
    if (activePage.index === 0) return;
    setPaging({ ...activePage, index: activePage.index - 1 });
    resultsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  return (
    <Page
      title="Catálogo de modelos"
      description="Explore referências de esculturas e modelos do acervo Tonecos Studio, com busca por categoria e navegação paginada."
      keywords={["tonecos", "esculturas", "modelos", "catálogo"]}
    >
      <Sheet>
        <section className="min-h-[80vh] bg-[hsl(0,0%,4%)] pb-20 text-[hsl(0,0%,94%)]">
          <ArcadeHero
            badge="ACERVO TONECOS"
            title="MODELOS"
            subtitle=">> BUSCA, CATEGORIAS E REFERÊNCIAS DO ACERVO."
            compact
          />

          <div className="relative z-10 mx-auto -mt-4 w-full max-w-[1600px] px-4 md:px-6 xl:px-8">
            <div className="border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,6%)] p-3 sm:p-4">
              <form
                role="search"
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(9rem,0.38fr)_minmax(9rem,0.38fr)_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  changeParams(draft.trim(), category);
                }}
              >
                <label className="relative col-start-1 row-start-1 min-w-0 sm:col-span-2 lg:col-span-1">
                  <span className="sr-only">Pesquisar modelos</span>
                  <Search
                    aria-hidden="true"
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(0,0%,56%)]"
                  />
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    maxLength={80}
                    placeholder="Buscar modelos"
                    className={`h-12 w-full rounded-none border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] pl-12 ${draft ? "pr-12" : "pr-3"} text-sm outline-none transition-colors focus-visible:border-[hsl(var(--gold-accent))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold-accent)/0.2)]`}
                  />
                  {draft && (
                    <button
                      type="button"
                      aria-label="Limpar busca"
                      onClick={() => {
                        setDraft("");
                        changeParams("", category);
                      }}
                      className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-none hover:bg-[hsl(0,0%,9%)]"
                    >
                      <X size={17} aria-hidden="true" />
                    </button>
                  )}
                </label>
                <label className="col-span-2 col-start-1 row-start-2 min-w-0 sm:col-span-1 lg:col-start-2 lg:row-start-1">
                  <span className="sr-only">Filtrar por categoria</span>
                  <select
                    value={category === "all" ? "" : category}
                    onChange={(event) => {
                      setFranchiseDraft("");
                      setFranchiseNeedle("");
                      changeParams(search, event.target.value, "");
                    }}
                    onFocus={() => setLoadCategories(true)}
                    onPointerDown={() => setLoadCategories(true)}
                    aria-busy={loadCategories && categories.isFetching}
                    disabled={
                      gateway === null || (loadCategories && categories.isError)
                    }
                    className="h-12 w-full rounded-none border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold-accent)/0.2)] disabled:opacity-60"
                  >
                    <option value="">Todas as categorias</option>
                    {category && category !== "all" &&
                      !categories.data?.some((item) => item.id === category) && (
                        <option value={category}>{categoryLabel}</option>
                      )}
                    {categories.data
                      ?.filter((item) => item.id !== "all")
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="col-span-2 min-w-0 sm:col-span-2 sm:col-start-2 sm:row-start-2 lg:col-span-1 lg:col-start-3 lg:row-start-1">
                  <span className="sr-only">Filtrar por franquia</span>
                  <select
                    value={franchise}
                    onChange={(event) =>
                      changeParams(search, category, event.target.value)
                    }
                    onFocus={() => setLoadFranchises(true)}
                    onPointerDown={() => setLoadFranchises(true)}
                    aria-busy={loadFranchises && franchises.isFetching}
                    disabled={
                      gateway === null || (loadFranchises && franchises.isError)
                    }
                    className="h-12 w-full border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] px-3 text-sm text-[hsl(0,0%,94%)] outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold-accent)/0.2)] disabled:opacity-60"
                  >
                    <option value="">Todas as franquias</option>
                    {franchise &&
                      !franchises.data?.items.some(
                        (item) => item.id === franchise,
                      ) && <option value={franchise}>{franchise}</option>}
                    {franchises.data?.items.map((item) => (
                      <option key={item.category + "/" + item.id} value={item.id}>
                        {item.label} ({item.count})
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  className="col-start-2 row-start-1 h-12 border border-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent))] px-3 font-mono sm:col-start-3 sm:px-6 lg:col-start-4 text-xs font-semibold uppercase tracking-[0.15em] text-[hsl(0,0%,5%)] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  Buscar
                </button>
              </form>

              {categories.isError && !invalidSearch && !invalidCatalogScope && (
                <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[hsl(0,0%,56%)]">
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
              )}

              <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-[hsl(0,0%,15%)] pt-3">
                <label className="min-w-0 flex-1 basis-44 sm:max-w-sm">
                  <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-[hsl(0,0%,56%)]">
                    Encontrar franquia
                  </span>
                  <input
                    value={franchiseDraft}
                    onChange={(event) => setFranchiseDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        findFranchises();
                      }
                    }}
                    maxLength={80}
                    placeholder="Digite ao menos 3 caracteres"
                    aria-label="Pesquisar franquias"
                    disabled={gateway === null}
                    className="h-11 w-full border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] px-3 font-mono text-xs text-[hsl(0,0%,94%)] placeholder:text-[hsl(0,0%,42%)] focus-visible:outline-2 focus-visible:outline-[hsl(var(--gold-accent))] disabled:opacity-60"
                  />
                </label>
                <button
                  type="button"
                  onClick={findFranchises}
                  disabled={
                    gateway === null ||
                    (franchiseDraft.trim().length > 0 &&
                      Array.from(franchiseDraft.trim()).length < 3)
                  }
                  className="h-11 border border-[hsl(var(--gold-accent)/0.5)] px-4 font-mono text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)] disabled:opacity-40"
                >
                  Buscar franquias
                </button>
                {franchises.data?.truncated ? (
                  <p
                    className="max-w-xs text-xs text-[hsl(0,0%,56%)]"
                    role="status"
                  >
                    A lista mostra apenas parte das franquias. Pesquise pelo nome
                    para refinar.
                  </p>
                ) : null}
                {franchises.isError && !invalidSearch && !invalidCatalogScope ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[hsl(0,0%,56%)]" role="alert">
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
                <div role="status" className="mt-3 flex flex-wrap items-center gap-2 break-all text-xs text-[hsl(var(--gold-accent))]">
                  Pasta selecionada: {folder}
                  <button type="button" onClick={() => changeParams(search, category, franchise, false)} className="border border-[hsl(var(--gold-accent)/0.5)] px-3 py-2">
                    Limpar pasta
                  </button>
                </div>
              )}

              {hasActiveFilters && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {search && <span className="max-w-full break-words border border-[hsl(0,0%,24%)] px-2 py-1">Busca: {search}</span>}
                  {category && category !== "all" && (
                    <span className="max-w-full break-words border border-[hsl(0,0%,24%)] px-2 py-1">Categoria: {categoryLabel}</span>
                  )}
                  {franchise && (
                    <span className="max-w-full break-words border border-[hsl(0,0%,24%)] px-2 py-1">Franquia: {franchiseLabel}</span>
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

            <div ref={resultsRef} className="mb-4 mt-6 flex scroll-mt-24 flex-wrap items-end justify-between gap-3">
              <ArcadeSectionTitle>MODELOS DO ACERVO</ArcadeSectionTitle>
              <div className="flex flex-wrap items-center gap-3">
                {models.isSuccess && (
                  <p className="text-sm text-[hsl(0,0%,62%)]" aria-live="polite">
                    Página {activePage.index + 1} · {rows.length} modelos nesta
                    página{canGoNext ? " · Há mais modelos" : ""}
                  </p>
                )}
                {models.isSuccess && (activePage.index > 0 || canGoNext) && (
                  <nav aria-label="Navegação rápida do catálogo" className="flex flex-wrap items-center gap-2">
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
                <SheetTrigger asChild>
                  <button
                    type="button"
                    aria-label={
                      "Abrir seleção para orçamento com " +
                      selectedModels.length +
                      (selectedModels.length === 1 ? " modelo" : " modelos")
                    }
                    className="inline-flex min-h-11 items-center gap-2 border border-[hsl(var(--gold-accent))] px-3 text-sm font-semibold text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <Bookmark size={16} aria-hidden="true" />
                    Minha seleção
                    <span aria-hidden="true" className="bg-[hsl(var(--gold-accent)/0.12)] px-1.5 py-0.5 font-mono text-xs">
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
                <h3 className="text-xl">Catálogo em integração</h3>
                <p className="mt-2 max-w-xl text-sm text-[hsl(0,0%,56%)]">
                  A origem oficial do catálogo ainda não foi configurada neste
                  ambiente. Nenhum modelo ou preço será apresentado como
                  disponível sem essa validação.
                </p>
              </div>
            ) : invalidCatalogScope ? (
              <p role="status" className="rounded-none bg-[hsl(0,0%,7%)] p-7 text-sm">
                Categoria, franquia ou pasta inválida. Revise os filtros da URL.
              </p>
            ) : invalidFolderScope ? (
              <p role="status" className="rounded-none bg-[hsl(0,0%,7%)] p-7 text-sm">
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
              <p
                role="status"
                className="rounded-none bg-[hsl(0,0%,7%)] p-7 text-sm"
              >
                Carregando os modelos publicados…
              </p>
            ) : models.isError ? (
              <div
                role="alert"
                className="rounded-none border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] p-7"
              >
                <h3 className="text-lg">Não foi possível consultar o acervo.</h3>
                <p className="mt-2 text-sm text-[hsl(0,0%,56%)]">
                  Verifique a conexão e tente novamente. Não exibimos resultados
                  antigos como se estivessem disponíveis.
                </p>
                <button
                  type="button"
                  onClick={() => void models.refetch()}
                  className="mt-4 rounded-none border border-[hsl(var(--gold-accent))] px-4 py-2 text-sm"
                >
                  Tentar novamente
                </button>
              </div>
            ) : rows.length === 0 ? (
              <p
                role="status"
                className="rounded-none bg-[hsl(0,0%,7%)] p-7 text-sm"
              >
                Nenhum modelo publicado corresponde aos filtros utilizados.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 xl:grid-cols-5 2xl:grid-cols-6 2xl:gap-5">
                {rows.map((model) => {
                  const isSelected = selectedModels.some(
                    (item) => item.id === model.id,
                  );
                  return (
                    <ArcadeCard key={model.id} className="flex h-full flex-col">
                      <div className="flex h-full flex-col">
                        <Link
                          to={catalogModelDetailsPath(model.slug)}
                          state={{ catalogReturnSearch: searchParams.toString() }}
                          aria-label={"Ver detalhes de " + model.name}
                          className="block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]"
                        >
                          <ModelCover
                            model={model}
                            mediaUrl={(key) => gateway.mediaUrl(key)}
                          />
                          <div className="space-y-1.5 p-3 md:p-4">
                            <p className="line-clamp-2 min-h-[2.5em] font-mono text-xs font-semibold uppercase tracking-[0.08em] leading-snug text-[hsl(0,0%,92%)] md:text-sm">
                              {model.name}
                            </p>
                            <p className="truncate text-xs text-[hsl(0,0%,56%)]">
                              {model.variantName || model.franchise}
                            </p>
                            <p className="text-xs text-[hsl(0,0%,56%)]">
                              {model.code}
                            </p>
                            <p className="pt-1 text-xs font-semibold text-[hsl(var(--gold-accent))]">
                              Ver detalhes
                            </p>
                          </div>
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleSelected(model)}
                          disabled={
                            !isSelected &&
                            selectedModels.length >= MAX_CANONICAL_SELECTION
                          }
                          aria-pressed={isSelected}
                          className="mx-3 mb-3 flex min-h-11 w-[calc(100%-1.5rem)] items-center justify-center rounded-none border border-[hsl(0,0%,15%)] px-2 text-xs font-medium transition-colors hover:border-[hsl(var(--gold-accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isSelected
                            ? "Remover da seleção"
                            : "Adicionar à seleção"}
                        </button>
                      </div>
                    </ArcadeCard>
                  );
                })}
              </div>
            )}

            {models.isSuccess && repeatedCursor && (
              <p role="status" className="mt-5 text-center text-sm text-[hsl(0,0%,56%)]">
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
                    className="inline-flex min-h-12 items-center gap-2 rounded-none border border-[hsl(0,0%,36%)] px-5 text-sm font-semibold text-[hsl(0,0%,90%)] hover:border-[hsl(var(--gold-accent))] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ArrowLeft size={16} aria-hidden="true" /> Anterior
                  </button>
                  <span className="min-w-24 text-center font-mono text-sm font-semibold text-[hsl(var(--gold-accent))]">
                    Página {activePage.index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!canGoNext}
                    className="inline-flex min-h-12 items-center gap-2 rounded-none border border-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent))] px-5 text-sm font-bold text-[hsl(0,0%,5%)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Próxima <ArrowRight size={16} aria-hidden="true" />
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
              Acervo Tonecos
            </span>
            <SheetTitle className="text-2xl text-[hsl(0,0%,94%)]">Minha seleção</SheetTitle>
            <SheetDescription className="text-[hsl(0,0%,66%)]">
              Revise os modelos que você reuniu para um futuro orçamento.
            </SheetDescription>
            <p role="status" className="text-sm text-[hsl(var(--gold-accent))]">
              {selectedModels.length} de {MAX_CANONICAL_SELECTION} modelos selecionados.
            </p>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
            {selectedModels.length === 0 ? (
              <div className="border border-dashed border-[hsl(0,0%,24%)] bg-[hsl(0,0%,9%)] p-5">
                <Bookmark size={20} aria-hidden="true" className="mb-3 text-[hsl(var(--gold-accent))]" />
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
                        <div aria-hidden="true" className="flex h-14 w-12 shrink-0 items-center justify-center overflow-hidden bg-[hsl(0,0%,5%)]">
                          <CanonicalCatalogImage
                            src={gateway?.mediaUrl(item.coverStorageKey) ?? null}
                            alt=""
                            imageClassName="h-full w-full object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold">{item.name}</p>
                          <p className="break-words text-xs text-[hsl(0,0%,66%)]">{item.code}</p>
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
              A seleção fica disponível durante esta visita. Nenhum orçamento foi enviado.
            </p>
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
