import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, Search, Images } from "lucide-react";

type Model = {
  id: string;
  name: string;
  studio: string;
  character?: string;
  variant: string;
  imageCount: number;
  provisional: boolean;
  cover: string | null;
};
type GalleryImage = { position: number; thumb: string; display: string };
type Detail = Model & { images: GalleryImage[] };
type Page = { total: number; offset: number; limit: number; items: Model[] };
type Studio = { studio: string; total: number };
type Route = {
  view: "models" | "studios";
  studio: string;
  provisional: "" | "0" | "1";
  query: string;
  offset: number;
  selected: string | null;
};

const API = "/catalogo-api/api/telegram-studios";
const PAGE_SIZE = 24;
const MODEL_ID = /^tg_[a-f0-9]{24}$/;
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
      provisional: "",
      query: "",
      offset: 0,
      selected: null,
    };
  const params = new URLSearchParams(window.location.search);
  const view =
    window.location.pathname === "/estudios" || params.has("studio")
      ? "studios"
      : "models";
  const studio =
    view === "studios" ? (params.get("studio") || "").slice(0, 120) : "";
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
    provisional,
    query,
    offset,
    selected: MODEL_ID.test(candidate) ? candidate : null,
  };
}

function urlForRoute(route: Route): string {
  const url = new URL(window.location.href);
  const params = new URLSearchParams();
  url.pathname = route.view === "studios" ? "/estudios" : "/";
  if (route.view === "studios" && route.studio)
    params.set("studio", route.studio);
  if (route.provisional) params.set("situacao", route.provisional);
  if (route.query) params.set("q", route.query);
  if (route.offset > 0)
    params.set("pagina", String(Math.floor(route.offset / PAGE_SIZE) + 1));
  if (route.selected) params.set("modelo", route.selected);
  url.search = params.toString();
  return url.pathname + url.search;
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(API + path, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("catalog_unavailable");
  return response.json() as Promise<T>;
}

export default function TelegramStudioCatalog() {
  const [route, setRoute] = useState<Route>(() => readRoute());
  const [draft, setDraft] = useState(route.query);
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const { view, studio, provisional, query, offset, selected } = route;

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
  }, [view, studio, provisional, query, offset, reloadVersion]);

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

  useEffect(() => {
    if (!selected) return;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setRoute((current) => {
          const next = { ...current, selected: null };
          window.history.replaceState(null, "", urlForRoute(next));
          return next;
        });
      } else if (detail && detail.id === selected && detail.images.length > 1) {
        if (event.key === "ArrowRight")
          setPhotoIndex((index) => (index + 1) % detail.images.length);
        if (event.key === "ArrowLeft")
          setPhotoIndex(
            (index) =>
              (index + detail.images.length - 1) % detail.images.length,
          );
      }
      if (event.key === "Tab" && dialogRef.current) {
        const buttons = Array.from(
          dialogRef.current.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ),
        );
        if (!buttons.length) return;
        if (
          event.shiftKey &&
          (document.activeElement === buttons[0] ||
            document.activeElement === dialogRef.current)
        ) {
          event.preventDefault();
          buttons[buttons.length - 1].focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === buttons[buttons.length - 1]
        ) {
          event.preventDefault();
          buttons[0].focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected, detail]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = draft.trim();
    if (term.length > 0 && term.length < 3) {
      setSearchError("Digite pelo menos 3 caracteres para pesquisar.");
      return;
    }
    setSearchError("");
    navigate({ ...route, query: term, offset: 0, selected: null });
  }

  function changeStudio(nextStudio: string) {
    navigate({
      view: "studios",
      studio: nextStudio,
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

  const selectedImage =
    detail?.id === selected ? detail.images[photoIndex] : undefined;
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
  const modelTags = Array.from(
    new Set(
      (page?.items ?? [])
        .flatMap((item) => [item.character, item.variant])
        .filter((value): value is string =>
          Boolean(
            value && value.trim().length >= 3 && value.trim().length <= 50,
          ),
        )
        .map((value) => value.trim()),
    ),
  ).slice(0, 12);
  const lastPage = page ? Math.ceil(page.total / PAGE_SIZE) : 0;

  return (
    <div className="min-h-screen bg-[#0e120f] text-[#f4eee4] selection:bg-[#c7ac80] selection:text-[#10140e]">
      <a
        href={view === "studios" && !studio ? "#estudios" : "#colecao"}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:bg-[#dfbd8d] focus:p-3 focus:text-[#11140e]"
      >
        Ir para o conteúdo
      </a>
      <header className="sticky top-0 z-30 border-b border-[#ffffff16] bg-[#0e120f]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[78px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <a
            href="/"
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
              href="/"
              aria-current={view === "models" ? "page" : undefined}
              className="hover:text-[#eacb98] aria-[current=page]:text-[#efcd9b]"
            >
              Modelos
            </a>
            <a
              href="/estudios"
              aria-current={view === "studios" ? "page" : undefined}
              className="hover:text-[#eacb98] aria-[current=page]:text-[#efcd9b]"
            >
              Estúdios
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-5 pb-24 sm:px-8 lg:px-12">
        {view === "models" && (
          <section
            aria-labelledby="catalog-hero-heading"
            className="relative isolate overflow-hidden border-b border-[#ffffff18] py-14 sm:py-20"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-48 -top-64 -z-10 h-[680px] w-[680px] rounded-full bg-[#927c59]/10 blur-[95px]"
            />
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="max-w-[670px]">
                <p className="mb-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.23em] text-[#c7ab7c] sm:text-xs">
                  <span className="h-px w-8 bg-[#c7ab7c]" />
                  Biblioteca visual de modelos
                </p>
                <h1
                  id="catalog-hero-heading"
                  className="font-serif text-[clamp(3.1rem,5.4vw,6.2rem)] leading-[1.035] tracking-[-0.045em]"
                >
                  Modelos 3D{" "}
                  <span className="block italic text-[#ccb18a]">
                    organizados.
                  </span>
                </h1>
                <p className="mt-7 max-w-xl text-base leading-8 text-[#b9b9ae] sm:text-lg">
                  Navegue por modelos, personagens, variantes e galerias de
                  imagens. Use as tags e a classificação da curadoria para
                  encontrar cada escultura.
                </p>
                <div className="mt-9 flex flex-wrap gap-3">
                  <a
                    href="#colecao"
                    className="inline-flex min-h-12 items-center gap-3 rounded-lg bg-[#d2b58a] px-6 text-sm font-semibold text-[#171b13] transition hover:bg-[#efdbb7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efc792]"
                  >
                    Explorar modelos{" "}
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                  <a
                    href="/estudios"
                    className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-[#776c52] px-5 text-sm text-[#eee0c9] hover:border-[#d2b58a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efc792]"
                  >
                    Coleções por estúdio{" "}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
                <div className="mt-12 flex flex-wrap gap-9 border-t border-[#ffffff1c] pt-6">
                  <div>
                    <span className="block font-serif text-3xl text-[#eeddbb]">
                      {!studio && !query && page
                        ? page.total.toLocaleString("pt-BR")
                        : "—"}
                    </span>
                    <span className="mt-1 block text-[10px] uppercase tracking-[0.18em] text-[#9ba297]">
                      Modelos no acervo
                    </span>
                  </div>
                </div>
              </div>
              <div
                aria-label="Prévia de modelos do catálogo"
                className="relative mx-auto grid h-[330px] w-full max-w-[560px] grid-cols-[1fr_0.83fr] gap-3 sm:h-[460px] lg:h-[520px]"
              >
                {[0, 1, 2].map((index) => {
                  const item = page?.items[index];
                  return item && imageUrl(item.cover) ? (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => navigate({ ...route, selected: item.id })}
                      aria-label={
                        "Abrir prévia de " + item.name + ", " + item.studio
                      }
                      className={
                        "group relative overflow-hidden rounded-xl border border-[#ffffff1c] bg-[#292e26] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#efc792] " +
                        (index === 0 ? "row-span-2" : "")
                      }
                    >
                      <img
                        src={imageUrl(item.cover)}
                        alt=""
                        className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.05]"
                      />
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0d110e] to-transparent"
                      />
                      <span className="sr-only">
                        Abrir modelo do estúdio {item.studio}
                      </span>
                    </button>
                  ) : (
                    <div
                      key={index}
                      className={
                        "rounded-xl border border-[#ffffff18] bg-gradient-to-br from-[#353a2e] to-[#181c17] " +
                        (index === 0 ? "row-span-2" : "")
                      }
                    />
                  );
                })}
                <span className="pointer-events-none absolute -bottom-4 -left-2 inline-flex items-center gap-2 rounded-md border border-[#7e7058] bg-[#171c16] px-4 py-3 text-[11px] text-[#e8d4b2] shadow-xl sm:-left-5">
                  <Images aria-hidden="true" className="h-4 w-4" /> Galeria de
                  renders digitais
                </span>
              </div>
            </div>
          </section>
        )}
        {(view === "models" || Boolean(studio)) && (
          <section
            id="colecao"
            aria-label="Buscar modelos"
            className="scroll-mt-28 pt-12 sm:pt-16"
          >
            <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
              <div>
                {studio && (
                  <a
                    href="/estudios"
                    className="mb-4 inline-flex items-center gap-2 text-sm text-[#d8b88d] hover:underline"
                  >
                    ← Todos os estúdios
                  </a>
                )}
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#c7ab7c]">
                  {studio ? "Coleção do estúdio" : "Explore o acervo"}
                </p>
                <h2 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
                  {studio || "Consulte os modelos."}
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-[#aeb1a5]">
                {studio
                  ? "Modelos e variantes vinculados a este estúdio, com galerias e paginação."
                  : "Busque modelos, personagens e variantes com tags da curadoria."}
              </p>
            </div>
            <form
              onSubmit={search}
              className="grid gap-3 rounded-xl border border-[#ffffff22] bg-[#1a2019] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-5"
            >
              <div>
                <label
                  htmlFor="catalog-search"
                  className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#c9ac88]"
                >
                  Pesquisar
                </label>
                <input
                  id="catalog-search"
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setSearchError("");
                  }}
                  maxLength={80}
                  placeholder="Personagem, escultura ou versão"
                  autoComplete="off"
                  aria-describedby={
                    searchError ? "catalog-search-error" : undefined
                  }
                  className="min-h-12 w-full rounded-lg border border-[#565c50] bg-[#101610] px-4 text-[#f1e9df] outline-none placeholder:text-[#959b8f] focus:border-[#e1b784]"
                />
              </div>
              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center gap-2 self-end rounded-lg bg-[#d2b58a] px-5 font-semibold text-[#141810] hover:bg-[#efdbb7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#efc792]"
              >
                <Search aria-hidden="true" className="h-4 w-4" /> Pesquisar
              </button>
            </form>

            <div className="mt-5 grid gap-5 rounded-xl border border-[#ffffff18] bg-[#161b16] p-5 lg:grid-cols-2">
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
                  Tags de personagem e variante
                </p>
                <p className="mt-1 text-xs text-[#929c90]">
                  Extraídas dos modelos desta página, não de um índice global.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {modelTags.length > 0 ? (
                    modelTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setDraft(tag);
                          navigate({
                            ...route,
                            query: tag,
                            offset: 0,
                            selected: null,
                          });
                        }}
                        className="rounded-full border border-[#5c6253] bg-[#252d23] px-3 py-2 text-xs text-[#d9dfd0] hover:border-[#ccae7c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#efc792]"
                      >
                        {tag}
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-[#949c91]">
                      As tags aparecem quando a lista de modelos é carregada.
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

            <div className="mt-12 flex flex-wrap items-end justify-between gap-3 border-b border-[#ffffff20] pb-5">
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl">
                  {studio ? "Modelos de " + studio : "Galeria de modelos"}
                </h2>
                {query && (
                  <p className="mt-1 text-sm text-[#b7a99a]">
                    Resultados para “{query}”
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
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
                {(query || provisional) && (
                  <button
                    type="button"
                    className="text-sm text-[#e5bd8c] underline underline-offset-4"
                    onClick={() => {
                      setDraft("");
                      navigate({
                        ...route,
                        query: "",
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
                className="grid grid-cols-2 gap-4 py-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
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
              <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
                {page.items.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => navigate({ ...route, selected: model.id })}
                    aria-label={
                      "Abrir galeria de " + model.name + ", " + model.studio
                    }
                    className="group overflow-hidden rounded-xl border border-[#ffffff1b] bg-[#1b211c] text-left transition duration-300 hover:-translate-y-1 hover:border-[#d2b58a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e5bd8c]"
                  >
                    <div className="flex aspect-[3/4] items-center justify-center overflow-hidden bg-[#2b3028]">
                      {imageUrl(model.cover) ? (
                        <img
                          src={imageUrl(model.cover)}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.045]"
                        />
                      ) : (
                        <span className="p-3 text-center text-sm text-[#b6a496]">
                          Render em preparação
                        </span>
                      )}
                    </div>
                    <div className="p-3 sm:p-4">
                      {view === "studios" && (
                        <p className="text-[11px] font-medium uppercase tracking-wider text-[#d9ac79]">
                          {model.studio}
                        </p>
                      )}
                      {view === "models" && model.character && (
                        <p className="text-[11px] font-medium uppercase tracking-wider text-[#d9ac79]">
                          {model.character}
                        </p>
                      )}
                      <h3 className="mt-2 line-clamp-2 font-semibold leading-5">
                        {model.name}
                      </h3>
                      {model.variant && (
                        <p className="mt-2 line-clamp-2 text-xs text-[#c2b5a7]">
                          {model.variant}
                        </p>
                      )}
                      <p className="mt-3 text-xs text-[#b6a496]">
                        {model.imageCount}{" "}
                        {model.imageCount === 1 ? "imagem" : "imagens"}
                        {model.provisional ? " · Em curadoria" : ""}
                      </p>
                    </div>
                  </button>
                ))}
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
            className="scroll-mt-28 pt-12 sm:pt-20"
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
            Vitrine visual
          </span>
        </aside>
      </main>

      {selected && (
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Galeria do modelo"
          className="fixed inset-0 z-50 overflow-y-auto bg-[#0e0b09]/98 p-4 outline-none sm:p-8"
        >
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap justify-between gap-3">
              <button type="button" className={classes} onClick={closeGallery}>
                Fechar galeria <span aria-hidden="true">×</span>
              </button>
              <button type="button" className={classes} onClick={copyLink}>
                Copiar link deste modelo
              </button>
            </div>
            {copyMessage && (
              <p role="status" className="mt-2 text-sm text-[#d5b895]">
                {copyMessage}
              </p>
            )}
            {detailError && (
              <p role="alert" className="mt-10 text-[#f0b5a7]">
                {detailError}
              </p>
            )}
            {!detailError && (!detail || detail.id !== selected) && (
              <p role="status" className="mt-10 text-[#c2b5a7]">
                Carregando galeria…
              </p>
            )}
            {detail?.id === selected && (
              <>
                {view === "studios" && (
                  <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-[#e3b57e]">
                    {detail.studio}
                  </p>
                )}
                <h2
                  id="catalog-detail-title"
                  className="mt-2 text-3xl font-semibold sm:text-4xl"
                >
                  {detail.name}
                </h2>
                {detail.variant && (
                  <p className="mt-2 text-sm text-[#cbb7a4]">
                    {detail.variant}
                  </p>
                )}
                <p className="mt-3 text-sm text-[#bba99a]">
                  {detail.images.length}{" "}
                  {detail.images.length === 1 ? "imagem" : "imagens"} ·{" "}
                  {detail.provisional
                    ? "Identificação em curadoria"
                    : "Identificação do acervo"}
                </p>
                {selectedImage && (
                  <div className="mt-6">
                    <div className="flex min-h-[300px] items-center justify-center rounded-lg bg-[#211a15] sm:min-h-[490px]">
                      {imageUrl(selectedImage.display) && (
                        <img
                          key={selectedImage.display}
                          src={imageUrl(selectedImage.display)}
                          alt={
                            detail.name +
                            ", imagem " +
                            (photoIndex + 1) +
                            " de " +
                            detail.images.length
                          }
                          className="max-h-[70vh] w-full object-contain"
                        />
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        className={classes}
                        disabled={detail.images.length < 2}
                        onClick={() =>
                          setPhotoIndex(
                            (index) =>
                              (index + detail.images.length - 1) %
                              detail.images.length,
                          )
                        }
                      >
                        Anterior foto
                      </button>
                      <span
                        role="status"
                        aria-live="polite"
                        className="text-sm text-[#c6b3a0]"
                      >
                        {photoIndex + 1} / {detail.images.length}
                      </span>
                      <button
                        type="button"
                        className={classes}
                        disabled={detail.images.length < 2}
                        onClick={() =>
                          setPhotoIndex(
                            (index) => (index + 1) % detail.images.length,
                          )
                        }
                      >
                        Próxima foto
                      </button>
                    </div>
                    {detail.images.length > 1 && (
                      <div
                        className="mt-5 flex gap-2 overflow-x-auto pb-3"
                        aria-label="Miniaturas da galeria"
                      >
                        {detail.images.map((item, index) => (
                          <button
                            type="button"
                            key={item.position + ":" + index}
                            onClick={() => setPhotoIndex(index)}
                            aria-label={"Mostrar imagem " + (index + 1)}
                            aria-pressed={index === photoIndex}
                            className={
                              "h-20 w-16 shrink-0 overflow-hidden rounded border-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#efc792] " +
                              (index === photoIndex
                                ? "border-[#f0bd7e]"
                                : "border-[#524131]")
                            }
                          >
                            {imageUrl(item.thumb) && (
                              <img
                                src={imageUrl(item.thumb)}
                                alt=""
                                loading="lazy"
                                className="h-full w-full object-contain"
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {!detail.images.length && (
                  <p className="mt-6 text-sm text-[#b6a496]">
                    Imagens em preparação.
                  </p>
                )}
                <p className="mt-6 text-xs text-[#a99c8e]">
                  Use as setas do teclado para navegar pelas imagens e Esc para
                  fechar.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <footer className="border-t border-[#ffffff20] bg-[#0a0e0b]">
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
      </footer>
    </div>
  );
}
