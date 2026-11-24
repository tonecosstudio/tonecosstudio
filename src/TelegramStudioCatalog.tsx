import { useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import TelegramModelGallery from "./TelegramModelGallery";
import { PUBLIC_ROUTES } from "@/config/routes";
import { CatalogExplorerHeader, CatalogGridListToggle } from "@/components/catalog/CatalogExplorerHeader";
import { catalogTagKey, catalogTagGroupsFromPublicTags, CatalogCardIdentity, CatalogCardMediaFrame, CatalogCardTagRow, CatalogModelCardShell, orderCatalogCategories } from "@/components/catalog/CatalogTaxonomy";
import { canonicalTagsForModel, type CatalogTag, type CatalogTagKind } from "@/types/catalog-tags";

type Model = {
  id: string;
  name: string;
  studio: string;
  variant: string;
  imageCount: number;
  provisional: boolean;
  category?: string;
  categorySlug?: string;
  franchise?: string;
  franchiseSlug?: string;
  tags?: CatalogTag[];
  cover: string | null;
};
type GalleryImage = { position: number; thumb: string; display: string };
type Detail = Model & { images: GalleryImage[] };
type Page = { total: number; offset: number; limit: number; items: Model[] };
type Studio = { studio: string; total: number };
type Route = {
  view: "models" | "studios";
  studio: string;
  category: string;
  franchise: string;
  character: string;
  attribute: string;
  provisional: "" | "0" | "1";
  query: string;
  offset: number;
  selected: string | null;
};

const API = "/catalogo-api/api/telegram-studios";
function isEmbeddedCatalogRoute(pathname: string): boolean {
  return pathname === PUBLIC_ROUTES.catalogReview ||
    pathname === PUBLIC_ROUTES.catalogReviewStudios;
}
const PAGE_SIZE = 24;
const MODEL_ID = /^tg_[a-f0-9]{24}$/;
type FacetKind = CatalogTagKind;
function tagKey(text: string) {
  return catalogTagKey(text);
}
function modelFacets(model: Model): CatalogTag[] {
  return canonicalTagsForModel(model.tags, {
    category: model.category,
    categorySlug: model.categorySlug,
    franchise: model.franchise,
    franchiseSlug: model.franchiseSlug,
  });
}
const classes =
  "min-h-11 rounded-lg border border-[#75644b] bg-[#22251f] px-4 py-2 text-[#f2dbb6] transition hover:border-[#d0ae7d] hover:bg-[#32342a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#efc792] disabled:cursor-not-allowed disabled:opacity-40";

function imageUrl(path: string | null | undefined): string | undefined {
  return path &&
    /^\/api\/telegram-studios\/tg_[a-f0-9]{24}\/media\/[a-f0-9]{64}\/(thumb|display)$/.test(
      path,
    )
    ? "/catalogo-api" + path
    : undefined;
}

function readRoute(): Route {
  if (typeof window === "undefined")
    return {
      view: "models",
      studio: "",
      category: "",
      franchise: "",
      character: "",
      attribute: "",
      provisional: "",
      query: "",
      offset: 0,
      selected: null,
    };
  const params = new URLSearchParams(window.location.search);
  const view =
    (window.location.pathname === "/estudios" ||
      window.location.pathname === PUBLIC_ROUTES.catalogReviewStudios) || params.has("studio")
      ? "studios"
      : "models";
  const studio =
    view === "studios" ? (params.get("studio") || "").slice(0, 120) : "";
  const requestedCategory = params.get("categoria") || "";
  const category =
    requestedCategory.length <= 80 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requestedCategory)
      ? requestedCategory
      : "";
  const rawFranchise = params.get("franquia") || "";
  const franchise =
    rawFranchise.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rawFranchise)
      ? rawFranchise
      : "";
  const rawCharacter = (params.get("personagem") || "").trim();
  const character = franchise && /^[A-Za-z0-9_-]{3,100}$/.test(rawCharacter)
    ? rawCharacter
    : "";
  const rawAttribute = (params.get("atributo") || "").trim();
  const attribute = franchise && /^[A-Za-z0-9_-]{3,100}$/.test(rawAttribute)
    ? rawAttribute
    : "";
  const provisionalParam = params.get("situacao");
  const provisional =
    provisionalParam === "0" || provisionalParam === "1"
      ? provisionalParam
      : "";
  const rawQuery = (params.get("q") || "").trim().slice(0, 80);
  const query = rawQuery.length >= 3 ? rawQuery : "";
  const rawPage = params.get("pagina") || "1";
  const number = /^\d{1,4}$/.test(rawPage) ? Number(rawPage) : 1;
  const offset = (Math.min(4167, Math.max(1, number)) - 1) * PAGE_SIZE;
  const candidate = params.get("modelo") || "";
  return {
    view,
    studio,
    category,
    franchise,
    character,
    attribute,
    provisional,
    query,
    offset,
    selected: MODEL_ID.test(candidate) ? candidate : null,
  };
}

function urlForRoute(route: Route): string {
  const url = new URL(window.location.href);
  const params = new URLSearchParams();
  const embedded = isEmbeddedCatalogRoute(window.location.pathname);
  url.pathname = route.view === "studios"
    ? (embedded ? PUBLIC_ROUTES.catalogReviewStudios : "/estudios")
    : (embedded ? PUBLIC_ROUTES.catalogReview : "/");
  if (route.view === "studios" && route.studio)
    params.set("studio", route.studio);
  if (route.category) params.set("categoria", route.category);
  if (route.franchise) params.set("franquia", route.franchise);
  if (route.franchise && route.character)
    params.set("personagem", route.character);
  if (route.franchise && route.attribute)
    params.set("atributo", route.attribute);
  if (route.provisional) params.set("situacao", route.provisional);
  if (route.query) params.set("q", route.query);
  if (route.offset > 0)
    params.set("pagina", String(Math.floor(route.offset / PAGE_SIZE) + 1));
  if (route.selected) params.set("modelo", route.selected);
  url.search = params.toString();
  return url.pathname + url.search;
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  // Only the anonymous directory and paged list use the bounded CDN TTL.
  // Gallery details and media must always recheck current visibility/rights.
  const publicMetadata = path === "/studios" || path.startsWith("?");
  const response = await fetch(API + path, {
    signal,
    cache: publicMetadata ? "default" : "no-store",
  });
  if (!response.ok) throw new Error("catalog_unavailable");
  return response.json() as Promise<T>;
}

export default function TelegramStudioCatalog({ embedded = false }: { embedded?: boolean }) {
  const [route, setRoute] = useState<Route>(() => readRoute());
  const [draft, setDraft] = useState(route.query);
  const [catalogView, setCatalogView] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(() => Boolean(route.franchise || route.character || route.attribute || route.provisional));
  const [studios, setStudios] = useState<Studio[]>([]);
  const [studioSearch, setStudioSearch] = useState("");
  const [studiosError, setStudiosError] = useState("");
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  const [searchError, setSearchError] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailError, setDetailError] = useState("");
  const [photoIndex, setPhotoIndex] = useState(0);
  const [copyMessage, setCopyMessage] = useState("");
  const {
    view,
    studio,
    category,
    franchise,
    character,
    attribute,
    provisional,
    query,
    offset,
    selected,
  } = route;

  // Studio-specific editorial chips belong in a studio collection, not the
  // global Modelos feed. The API and top-level search filters remain shared.
  const showStudioModelTags = view === "studios" && Boolean(studio);

  function applyFacet(kind: FacetKind, model: Model, tag: CatalogTag) {
    const next: Route = {
      ...route,
      view: "models",
      studio: "",
      category: "",
      franchise: "",
      character: "",
      attribute: "",
      provisional: "",
      query: "",
      offset: 0,
      selected: null,
    };
    if (kind === "category") next.category = tag.slug;
    if (kind === "franchise") next.franchise = tag.slug;
    if (kind === "character") {
      next.franchise = model.franchiseSlug || "";
      next.character = tag.id;
    }
    if (kind === "publisher" || kind === "universe" || kind === "sign" || kind === "constellation") {
      next.franchise = model.franchiseSlug || "";
      next.attribute = tag.id;
    }
    setDraft("");
    navigate(next);
  }

  function navigate(next: Route, replace = false) {
    const path = urlForRoute(next);
    if (replace) window.history.replaceState(null, "", path);
    else if (path !== window.location.pathname + window.location.search) {
      window.history.pushState(null, "", path);
    }
    setRoute(next);
  }

  useEffect(() => {
    const onPopState = () => setRoute(readRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    setDraft(query);
    setSearchError("");
  }, [query]);
  useEffect(() => {
    if (view === "studios" && studio) {
      document.getElementById("colecao")?.scrollIntoView?.({ block: "start" });
    }
  }, [view, studio]);

  useEffect(() => {
    if (view !== "studios") return;
    const c = new AbortController();
    get<{ studios: Studio[] }>("/studios", c.signal)
      .then((data) => {
        if (!c.signal.aborted) setStudios(data.studios);
      })
      .catch(() => {
        if (!c.signal.aborted)
          setStudiosError("Não foi possível carregar a lista de estúdios.");
      });
    return () => c.abort();
  }, [view]);

  useEffect(() => {
    if (view === "studios" && !studio) {
      setLoading(false);
      setListError("");
      setPage(null);
      return;
    }
    const c = new AbortController();
    const params = new URLSearchParams({
      offset: String(offset),
      limit: String(PAGE_SIZE),
    });
    if (studio) params.set("studio", studio);
    if (category) params.set("category", category);
    if (franchise) params.set("franchise", franchise);
    if (franchise && character) params.set("character_id", character);
    if (franchise && attribute) params.set("attribute_id", attribute);
    if (query) params.set("q", query);
    if (provisional) params.set("provisional", provisional);
    setLoading(true);
    setListError("");
    setPage(null);
    get<Page>("?" + params, c.signal)
      .then((data) => {
        if (!c.signal.aborted) setPage(data);
      })
      .catch(() => {
        if (!c.signal.aborted)
          setListError(
            "Não foi possível carregar os modelos. Tente novamente.",
          );
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [
    view,
    studio,
    category,
    franchise,
    character,
    attribute,
    provisional,
    query,
    offset,
    reloadVersion,
  ]);

  useEffect(() => {
    const c = new AbortController();
    setDetail(null);
    setDetailError("");
    setPhotoIndex(0);
    setCopyMessage("");
    if (selected) {
      get<Detail>("/" + selected, c.signal)
        .then((data) => {
          if (!c.signal.aborted) setDetail(data);
        })
        .catch(() => {
          if (!c.signal.aborted)
            setDetailError("Não foi possível abrir esta galeria.");
        });
    }
    return () => c.abort();
  }, [selected]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = draft.trim();
    if (term.length > 0 && term.length < 3) {
      setSearchError("Digite pelo menos 3 caracteres para pesquisar.");
      return;
    }
    setSearchError("");
    navigate({
      ...route,
      franchise: "",
      character: "",
      attribute: "",
      query: term,
      offset: 0,
      selected: null,
    });
  }

  function changeStudio(nextStudio: string) {
    navigate({
      view: "studios",
      studio: nextStudio,
      category: "",
      franchise: "",
      character: "",
      attribute: "",
      provisional: "",
      query: "",
      offset: 0,
      selected: null,
    });
  }

  function closeGallery() {
    navigate({ ...route, selected: null }, true);
  }

  async function copyLink() {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyMessage("Link copiado.");
    } catch {
      setCopyMessage("Não foi possível copiar o link.");
    }
  }

  const normalizedStudioSearch = studioSearch
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
  const visibleStudios = studios
    .filter((item) =>
      item.studio
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedStudioSearch),
    )
    .sort((a, b) => a.studio.localeCompare(b.studio, "pt-BR"));
  const categoryMap = new Map<string, string>();
  for (const item of page?.items ?? []) {
    if (
      item.category &&
      item.categorySlug &&
      item.categorySlug !== "curadoria-pendente"
    ) {
      categoryMap.set(item.categorySlug, item.category);
    }
  }
  const modelCategories = orderCatalogCategories(
    Array.from(categoryMap, ([id, label]) => ({ id, label })),
  ).map(({ id, label }) => ({ slug: id, name: label }));
  const modelTags = Array.from(
    new Map(
      (page?.items ?? []).flatMap((item) =>
        modelFacets(item)
          .filter((facet) => facet.kind !== "category")
          .map(
            (facet) =>
              [
                facet.kind +
                  ":" +
                  (item.franchiseSlug || "") +
                  ":" +
                  tagKey(facet.label),
                { ...facet, model: item },
              ] as const,
          ),
      ),
    ).values(),
  ).slice(0, 12);
  const lastPage = page ? Math.ceil(page.total / PAGE_SIZE) : 0;

  const ContentContainer = embedded ? "div" : "main";
  return (
    <div className={embedded
      ? "min-h-screen bg-[hsl(0,0%,5%)] text-[hsl(0,0%,96%)] selection:bg-[hsl(var(--gold-accent))] selection:text-black"
      : "min-h-screen bg-[#0e120f] text-[#f4eee4] selection:bg-[#c7ac80] selection:text-[#10140e]"}>
      <a
        href={view === "studios" && !studio ? "#estudios" : "#colecao"}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:bg-[#dfbd8d] focus:p-3 focus:text-[#11140e]"
      >
        Ir para o conteúdo
      </a>
      {!embedded && <header className="sticky top-0 z-30 border-b border-[#ffffff16] bg-[#0e120f]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[78px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <a
            href={embedded ? PUBLIC_ROUTES.catalogReview : "/"}
            aria-label="TONART — início do catálogo"
            className="flex items-center gap-3 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efc792]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c3a678] font-serif text-2xl text-[#e9ce9f]">
              T
            </span>
            <span>
              <span className="block text-lg font-bold tracking-[0.22em]">
                TONART
              </span>
              <span className="block text-[9px] uppercase tracking-[0.2em] text-[#bba888]">
                Acervo de esculturas 3D
              </span>
            </span>
          </a>
          <nav
            aria-label="Navegação do catálogo"
            className="flex items-center gap-4 text-xs text-[#d7d0be] sm:gap-8 sm:text-sm"
          >
            <a
              href={embedded ? PUBLIC_ROUTES.catalogReview : "/"}
              aria-current={view === "models" ? "page" : undefined}
              className="hover:text-[#eacb98] aria-[current=page]:text-[#efcd9b]"
            >
              Modelos
            </a>
            <a
              href={embedded ? PUBLIC_ROUTES.catalogReviewStudios : "/estudios"}
              aria-current={view === "studios" ? "page" : undefined}
              className="hover:text-[#eacb98] aria-[current=page]:text-[#efcd9b]"
            >
              Estúdios
            </a>
          </nav>
        </div>
      </header>}
      <ContentContainer className="mx-auto w-full max-w-[1600px] pb-24">
        {(view === "models" || Boolean(studio)) && (
          <CatalogExplorerHeader
            kind="review"
            activeTab={view === "studios" ? "collections" : "explore"}
            standalone={!embedded}
            search={draft}
            onSearchChange={(value) => { setDraft(value); setSearchError(""); }}
            onSearchSubmit={search}
            onSearchClear={() => {
              setDraft("");
              setSearchError("");
              navigate({ ...route, query: "", offset: 0, selected: null });
            }}
            categories={modelCategories.map((item) => ({ id: item.slug, label: item.name }))}
            category={category}
            onCategoryChange={(next) => navigate({ ...route, category: next, offset: 0, selected: null })}
            onFiltersClick={() => setFiltersOpen((open) => !open)}
            filterCount={[category, franchise, character, attribute, provisional].filter(Boolean).length}
            filtersExpanded={filtersOpen}
            filtersControlId="telegram-catalog-filters"
            totalLabel={page ? page.total.toLocaleString("pt-BR") + " referências" : undefined}
            coverUrl={imageUrl(page?.items[0]?.cover)}
            collectionHref={embedded ? PUBLIC_ROUTES.catalogReviewStudios : "/estudios"}
          />
        )}
        {(view === "models" || Boolean(studio)) && (
          <section
            id="colecao"
            aria-label="Buscar modelos"
            className="scroll-mt-28 px-4 pt-2 sm:px-6 sm:pt-3 xl:px-8"
          >
            {studio ? (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <a href={embedded ? PUBLIC_ROUTES.catalogReviewStudios : "/estudios"} className="inline-flex min-h-10 items-center gap-2 text-sm text-[hsl(var(--gold-accent))] hover:underline">
                  ← Todos os estúdios
                </a>
                <p className="text-sm text-[hsl(0,0%,70%)]">Coleção do estúdio: <strong className="text-white">{studio}</strong></p>
              </div>
            ) : null}
            {/* Pesquisa única compartilhada com a navegação dos dois catálogos. */}

            <div id="telegram-catalog-filters" className={filtersOpen ? `mt-3 grid scroll-mt-24 gap-4 rounded-lg border border-[hsl(var(--gold-accent)/0.22)] bg-[hsl(0,0%,7%)] p-4 ${embedded ? "lg:grid-cols-2" : "lg:grid-cols-3"}` : "hidden"}>
              {!embedded && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#d6ba93]">
                  Categorias
                </p>
                <p className="mt-1 text-xs text-[#929c90]">
                  Categorias reais dos modelos desta página.
                </p>
                <div
                  className="mt-3 flex flex-wrap gap-2"
                  role="group"
                  aria-label="Categorias dos modelos"
                >
                  {modelCategories.map((item) => (
                    <button
                      type="button"
                      key={item.slug}
                      aria-pressed={category === item.slug}
                      onClick={() =>
                        navigate({
                          ...route,
                          category: category === item.slug ? "" : item.slug,
                          offset: 0,
                          selected: null,
                        })
                      }
                      className={
                        "min-h-11 rounded-full border px-3 py-2 text-xs transition hover:border-[#d6b484] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#efc792] " +
                        (category === item.slug
                          ? "border-[#d6b484] bg-[#5b4931] text-[#fff1db]"
                          : "border-[#555b4e] text-[#c0c4b8]")
                      }
                    >
                      {item.name}
                    </button>
                  ))}
                  {modelCategories.length === 0 && (
                    <p className="text-xs text-[#949c91]">
                      Nenhuma categoria classificada nesta página.
                    </p>
                  )}
                </div>
                <p className="mt-3 text-xs leading-5 text-[#949c91]">
                  O filtro pesquisa todo o acervo. Classificações pendentes não
                  são apresentadas como categorias oficiais.
                </p>
              </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#d6ba93]">
                  Situação da curadoria
                </p>
                <div
                  className="mt-3 flex flex-wrap gap-2"
                  role="group"
                  aria-label="Situação dos modelos"
                >
                  {[
                    { value: "", label: "Todos" },
                    { value: "0", label: "Identificados" },
                    { value: "1", label: "Em curadoria" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      aria-pressed={provisional === item.value}
                      onClick={() =>
                        navigate({
                          ...route,
                          provisional: item.value as Route["provisional"],
                          offset: 0,
                          selected: null,
                        })
                      }
                      className={
                        "rounded-full border px-3 py-2 text-xs transition hover:border-[#d6b484] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#efc792] " +
                        (provisional === item.value
                          ? "border-[#d6b484] bg-[#5b4931] text-[#fff1db]"
                          : "border-[#555b4e] text-[#c0c4b8]")
                      }
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-[#949c91]">
                  Categorias temáticas serão exibidas conforme a curadoria
                  validar sua classificação.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#d6ba93]">
                  Universos e personagens
                </p>
                <p className="mt-1 text-xs text-[#929c90]">
                  Filtros confirmados e franquias sugeridas, com revisão
                  claramente identificada.
                </p>
                <div
                  className="mt-3 flex flex-wrap gap-2"
                  data-taxonomy-contract="telegram-facets-v2"
                >
                  {modelTags.length > 0 ? (
                    modelTags.map((tag) =>
                      tag.provisional ? (
                        <span
                          key={
                            tag.kind +
                            ":" +
                            tag.model.franchiseSlug +
                            ":" +
                            tag.label
                          }
                          aria-label={"Franquia em revisão: " + tag.label}
                          className="rounded-full border border-dashed border-[#5c6253] bg-[#252d23] px-3 py-2 text-xs text-[#b7baab]"
                        >
                          {tag.label} · em revisão
                        </span>
                      ) : (
                        <button
                          key={
                            tag.kind +
                            ":" +
                            tag.model.franchiseSlug +
                            ":" +
                            tag.label
                          }
                          type="button"
                          onClick={() => applyFacet(tag.kind, tag.model, tag)}
                          className="rounded-full border border-[#5c6253] bg-[#252d23] px-3 py-2 text-xs text-[#d9dfd0] hover:border-[#ccae7c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#efc792]"
                        >
                          {tag.label}
                        </button>
                      ),
                    )
                  ) : (
                    <p className="text-xs text-[#949c91]">
                      Universos e personagens aparecem quando a curadoria
                      confirmar a classificação dos modelos.
                    </p>
                  )}
                </div>
              </div>
            </div>
            {searchError && (
              <p
                id="catalog-search-error"
                role="alert"
                className="mt-2 text-sm text-[#f0b5a7]"
              >
                {searchError}
              </p>
            )}
            {studiosError && (
              <p role="alert" className="mt-2 text-sm text-[#f0b5a7]">
                {studiosError}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-b border-[hsl(var(--gold-accent)/0.2)] pb-3">
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl">
                  {studio ? "Modelos de " + studio : "Galeria de modelos"}
                </h2>
                {query && (
                  <p className="mt-1 text-sm text-[#b7a99a]">
                    Resultados para “{query}”
                  </p>
                )}
                {franchise && (
                  <p className="mt-1 text-sm text-[#d6ba93]">
                    {character
                      ? "Personagem: " + character
                      : "Franquia: " + (page?.items[0]?.franchise || franchise)}
                    {character
                      ? " · " + (page?.items[0]?.franchise || franchise)
                      : ""}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <CatalogGridListToggle view={catalogView} onChange={setCatalogView} />
                <span
                  role="status"
                  aria-live="polite"
                  className="text-sm text-[#c2b5a7]"
                >
                  {loading
                    ? "Carregando…"
                    : page
                      ? page.total.toLocaleString("pt-BR") + " modelos"
                      : "Indisponível"}
                </span>
                {(query ||
                  provisional ||
                  category ||
                  franchise ||
                  character) && (
                  <button
                    type="button"
                    className="text-sm text-[#e5bd8c] underline underline-offset-4"
                    onClick={() => {
                      setDraft("");
                      navigate({
                        ...route,
                        query: "",
                        category: "",
                        franchise: "",
                        character: "",
                        attribute: "",
                        provisional: "",
                        offset: 0,
                        selected: null,
                      });
                    }}
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            </div>

            {listError && (
              <div
                role="alert"
                className="mt-6 rounded-lg border border-[#a45f50] p-5 text-[#f0b5a7]"
              >
                {listError}
                <button
                  type="button"
                  className="ml-3 underline"
                  onClick={() => setReloadVersion((version) => version + 1)}
                >
                  Tentar novamente
                </button>
              </div>
            )}
            {loading && (
              <div
                role="status"
                className="grid grid-cols-2 gap-3 py-6 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 lg:gap-5"
              >
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    className="aspect-[3/4] animate-pulse rounded-lg bg-[#2b231c]"
                  />
                ))}
              </div>
            )}
            {!loading && page?.items.length === 0 && (
              <div className="py-20 text-center">
                <p className="text-lg">Nenhum modelo encontrado.</p>
                <p className="mt-2 text-sm text-[#b7a99a]">
                  Experimente outra tag ou termo de pesquisa.
                </p>
              </div>
            )}
            {!loading && page && (
              <div className={catalogView === "grid" ? "mt-7 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 lg:gap-5" : "mt-7 grid grid-cols-1 gap-3 sm:gap-4"}>
                {page.items.map((model) => {
                  const facets = modelFacets(model);
                  const tagGroups = catalogTagGroupsFromPublicTags(
                    facets,
                    (tag) => applyFacet(tag.kind, model, tag),
                  );
                  return (
                  <CatalogModelCardShell key={model.id}>
                    <button
                      type="button"
                      onClick={() => navigate({ ...route, selected: model.id })}
                      aria-label={
                        "Abrir galeria de " + model.name + ", " + model.studio
                      }
                      className="flex w-full flex-1 flex-col text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e5bd8c]"
                    >
                      <CatalogCardMediaFrame imageCount={model.imageCount}>
                        {imageUrl(model.cover) ? (
                          <img
                            src={imageUrl(model.cover)}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none sm:p-3"
                          />
                        ) : (
                          <span className="p-3 text-center text-sm text-[#b6a496]">
                            Render em preparação
                          </span>
                        )}
                      </CatalogCardMediaFrame>
                      <div className="space-y-1.5 p-3 pb-1 md:px-4 md:pt-4">
                        {showStudioModelTags && (
                          <p className="text-[11px] font-medium uppercase tracking-wider text-[#d9ac79]">
                            {model.studio}
                          </p>
                        )}
                        <CatalogCardIdentity
                          name={model.name}
                        />
                      </div>
                    </button>
                    <CatalogCardTagRow
                      label={"Filtros de " + model.name}
                      groups={tagGroups}
                    />
                  </CatalogModelCardShell>
                  );
                })}
              </div>
            )}

            {page && lastPage > 1 && (
              <nav
                aria-label="Paginação do catálogo"
                className="mt-11 flex items-center justify-center gap-4"
              >
                <button
                  type="button"
                  className={classes}
                  disabled={loading || offset === 0}
                  onClick={() =>
                    navigate({
                      ...route,
                      offset: Math.max(0, offset - PAGE_SIZE),
                    })
                  }
                >
                  Anterior
                </button>
                <span className="text-sm text-[#d3c2b1]">
                  Página {Math.floor(offset / PAGE_SIZE) + 1} de {lastPage}
                </span>
                <button
                  type="button"
                  className={classes}
                  disabled={loading || offset + PAGE_SIZE >= page.total}
                  onClick={() =>
                    navigate({ ...route, offset: offset + PAGE_SIZE })
                  }
                >
                  Próxima
                </button>
              </nav>
            )}
          </section>
        )}
        {view === "studios" && !studio && (
          <section
            id="estudios"
            aria-labelledby="studios-heading"
            className="scroll-mt-28 px-4 pt-12 sm:px-6 sm:pt-20 xl:px-8"
          >
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.23em] text-[#c7ab7c]">
                Organização por origem
              </p>
              <h1
                id="studios-heading"
                className="mt-4 font-serif text-4xl tracking-tight sm:text-6xl"
              >
                Coleções por estúdio.
              </h1>
              <p className="mt-5 text-base leading-7 text-[#abb3a6]">
                Consulte os estúdios em ordem alfabética e abra suas coleções.
                Cada página reúne exclusivamente os modelos associados àquela
                origem.
              </p>
            </div>
            <div className="mt-10 max-w-lg">
              <label
                htmlFor="studio-directory-search"
                className="mb-2 block text-sm font-medium text-[#e8d7bb]"
              >
                Pesquisar estúdios
              </label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aeae9e]"
                />
                <input
                  id="studio-directory-search"
                  type="search"
                  maxLength={120}
                  value={studioSearch}
                  onChange={(event) => setStudioSearch(event.target.value)}
                  placeholder="Nome do estúdio"
                  className="min-h-12 w-full rounded-lg border border-[#565c50] bg-[#101610] py-2 pl-11 pr-4 text-[#f4eee4] outline-none placeholder:text-[#92998e] focus:border-[#e1b784]"
                />
              </div>
              {studiosError && (
                <p role="alert" className="mt-3 text-sm text-[#f0b5a7]">
                  {studiosError}
                </p>
              )}
              <p
                role="status"
                aria-live="polite"
                className="mt-3 text-sm text-[#c2b5a7]"
              >
                {visibleStudios.length.toLocaleString("pt-BR")}{" "}
                {visibleStudios.length === 1 ? "estúdio" : "estúdios"}
              </p>
            </div>
            {visibleStudios.length > 0 ? (
              <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {visibleStudios.map((item) => (
                  <button
                    key={item.studio}
                    type="button"
                    onClick={() => changeStudio(item.studio)}
                    className="group flex min-h-[144px] flex-col justify-between rounded-xl border border-[#ffffff1b] bg-[#1b221b] p-5 text-left transition-colors hover:border-[#cbb086] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#efc792]"
                  >
                    <span className="flex items-center justify-between">
                      <span
                        aria-hidden="true"
                        className="font-serif text-3xl text-[#d4bb90]"
                      >
                        {item.studio.charAt(0).toUpperCase()}
                      </span>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="h-4 w-4 text-[#d4bb90]"
                      />
                    </span>
                    <span>
                      <span className="block truncate font-medium">
                        {item.studio}
                      </span>
                      <span className="mt-1 block text-xs text-[#abb0a4]">
                        {item.total.toLocaleString("pt-BR")}{" "}
                        {item.total === 1 ? "modelo" : "modelos"}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-8 rounded-xl border border-[#ffffff1b] bg-[#1b211a] p-6 text-sm text-[#b8b7ad]">
                {studios.length
                  ? "Nenhum estúdio corresponde à pesquisa."
                  : "Não há estúdios disponíveis no momento."}
              </p>
            )}
          </section>
        )}
        <aside
          aria-label="Informações sobre o acervo"
          className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-xl border border-[#ffffff1a] bg-[#161b16] px-6 py-5 text-sm text-[#aeb6a8]"
        >
          <p className="max-w-3xl leading-6">
            <strong className="font-medium text-[#e8dbc5]">
              Sobre as imagens:
            </strong>{" "}
            galerias digitais de esculturas 3D, não fotografias de peças
            fabricadas. A exibição não implica disponibilidade comercial ou
            autorização de reprodução.
          </p>
          <span className="rounded-full border border-[#807052] px-3 py-1 text-[10px] uppercase tracking-widest text-[#e2c79c]">
            {embedded ? "Em revisão" : "Vitrine visual"}
          </span>
        </aside>
      </ContentContainer>

      {selected && (
        <TelegramModelGallery
          detail={detail?.id === selected ? detail : null}
          error={detailError}
          photoIndex={photoIndex}
          copyMessage={copyMessage}
          facets={detail?.id === selected
            ? modelFacets(detail)
            : []}
          showStudioVariant={showStudioModelTags}
          imageUrl={imageUrl}
          onClose={closeGallery}
          onCopy={copyLink}
          onFacet={(tag) => {
            if (detail?.id === selected) applyFacet(tag.kind, detail, tag);
          }}
          onStepPhoto={(direction) => {
            if (detail?.id !== selected || detail.images.length < 2) return;
            setPhotoIndex(
              (index) =>
                (index + detail.images.length + direction) %
                detail.images.length,
            );
          }}
          onSelectPhoto={setPhotoIndex}
        />
      )}

      {!embedded && <footer className="border-t border-[#ffffff20] bg-[#0a0e0b]">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-8 sm:px-8 lg:px-12">
          <div>
            <p className="font-semibold tracking-[0.22em]">TONART</p>
            <p className="mt-1 text-xs text-[#a9afa5]">
              Modelos 3D, estúdios e criatividade reunidos.
            </p>
          </div>
          <span className="text-xs text-[#aaa99d]">
            Acervo visual · Conteúdo em curadoria
          </span>
        </div>
      </footer>}
    </div>
  );
}
