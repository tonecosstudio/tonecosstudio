import { useEffect, useRef, useState, type FormEvent } from "react";

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
type Route = { studio: string; query: string; offset: number; selected: string | null };

const API = "/catalogo-api/api/telegram-studios";
const PAGE_SIZE = 24;
const MODEL_ID = /^tg_[a-f0-9]{24}$/;
const classes = "min-h-11 rounded-md border border-[#907351] bg-[#211c17] px-4 py-2 text-[#f0d3ad] transition hover:bg-[#413023] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#efc792] disabled:cursor-not-allowed disabled:opacity-40";

function imageUrl(path: string | null | undefined): string | undefined {
  return path && /^\/api\/telegram-studios\/tg_[a-f0-9]{24}\/media\/[a-f0-9]{64}\/(thumb|display)$/.test(path)
    ? "/catalogo-api" + path : undefined;
}

function readRoute(): Route {
  if (typeof window === "undefined") return { studio: "", query: "", offset: 0, selected: null };
  const params = new URLSearchParams(window.location.search);
  const studio = (params.get("studio") || "").slice(0, 120);
  const rawQuery = (params.get("q") || "").trim().slice(0, 80);
  const query = rawQuery.length >= 3 ? rawQuery : "";
  const rawPage = params.get("pagina") || "1";
  const number = /^\d{1,4}$/.test(rawPage) ? Number(rawPage) : 1;
  const offset = (Math.min(4167, Math.max(1, number)) - 1) * PAGE_SIZE;
  const candidate = params.get("modelo") || "";
  return { studio, query, offset, selected: MODEL_ID.test(candidate) ? candidate : null };
}

function urlForRoute(route: Route): string {
  const url = new URL(window.location.href);
  const params = new URLSearchParams();
  if (route.studio) params.set("studio", route.studio);
  if (route.query) params.set("q", route.query);
  if (route.offset > 0) params.set("pagina", String(Math.floor(route.offset / PAGE_SIZE) + 1));
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
  const { studio, query, offset, selected } = route;

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

  useEffect(() => { setDraft(query); setSearchError(""); }, [query]);

  useEffect(() => {
    const c = new AbortController();
    get<{ studios: Studio[] }>("/studios", c.signal)
      .then(data => { if (!c.signal.aborted) setStudios(data.studios); })
      .catch(() => { if (!c.signal.aborted) setStudiosError("Não foi possível carregar a lista de estúdios."); });
    return () => c.abort();
  }, []);

  useEffect(() => {
    const c = new AbortController();
    const params = new URLSearchParams({ offset: String(offset), limit: String(PAGE_SIZE) });
    if (studio) params.set("studio", studio);
    if (query) params.set("q", query);
    setLoading(true);
    setListError("");
    setPage(null);
    get<Page>("?" + params, c.signal)
      .then(data => { if (!c.signal.aborted) setPage(data); })
      .catch(() => { if (!c.signal.aborted) setListError("Não foi possível carregar os modelos. Tente novamente."); })
      .finally(() => { if (!c.signal.aborted) setLoading(false); });
    return () => c.abort();
  }, [studio, query, offset, reloadVersion]);

  useEffect(() => {
    const c = new AbortController();
    setDetail(null);
    setDetailError("");
    setPhotoIndex(0);
    setCopyMessage("");
    if (selected) {
      get<Detail>("/" + selected, c.signal)
        .then(data => { if (!c.signal.aborted) setDetail(data); })
        .catch(() => { if (!c.signal.aborted) setDetailError("Não foi possível abrir esta galeria."); });
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
        setRoute(current => {
          const next = { ...current, selected: null };
          window.history.replaceState(null, "", urlForRoute(next));
          return next;
        });
      } else if (detail && detail.id === selected && detail.images.length > 1) {
        if (event.key === "ArrowRight") setPhotoIndex(index => (index + 1) % detail.images.length);
        if (event.key === "ArrowLeft") setPhotoIndex(index => (index + detail.images.length - 1) % detail.images.length);
      }
      if (event.key === "Tab" && dialogRef.current) {
        const buttons = Array.from(dialogRef.current.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
        if (!buttons.length) return;
        if (event.shiftKey && (document.activeElement === buttons[0] || document.activeElement === dialogRef.current)) {
          event.preventDefault();
          buttons[buttons.length - 1].focus();
        } else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) {
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
    navigate({ studio, query: term, offset: 0, selected: null });
  }

  function changeStudio(nextStudio: string) {
    navigate({ studio: nextStudio, query, offset: 0, selected: null });
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

  const selectedImage = detail?.id === selected ? detail.images[photoIndex] : undefined;
  const featuredStudios = [...studios].sort((a, b) => b.total - a.total).slice(0, 7);
  const lastPage = page ? Math.ceil(page.total / PAGE_SIZE) : 0;

  return <div className="min-h-screen bg-[#110e0c] text-[#f1e9df]">
    <header className="border-b border-[#43372d] bg-[#191410]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-6">
        <a href="/" className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#efc792]">
          <span className="text-2xl font-black tracking-[0.2em] sm:text-3xl">TONART</span>
          <span className="block text-[11px] uppercase tracking-[0.22em] text-[#d7ae7d]">Acervo dos estúdios</span>
        </a>
        <p className="max-w-sm text-right text-xs leading-5 text-[#bcb0a4]">
          Catálogo visual de referências · sem vendas ou orçamentos
        </p>
      </div>
    </header>

    <main className="mx-auto max-w-7xl px-5 pb-20 pt-10 sm:pt-14">
      <div className="max-w-3xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.28em] text-[#d5aa74]">Coleção Telegram</p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">Esculturas de cada estúdio, em um só lugar.</h1>
        <p className="mt-5 leading-7 text-[#c2b5a7]">
          Explore personagens, modelos e diferentes versões. Identificações e galerias continuam em curadoria.
        </p>
      </div>

      <form onSubmit={search} className="mt-9 grid gap-3 rounded-xl border border-[#463628] bg-[#1c1713] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,240px)_auto]">
        <div>
          <label htmlFor="catalog-search" className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#c9ac88]">Pesquisar</label>
          <input id="catalog-search" value={draft} onChange={event => { setDraft(event.target.value); setSearchError(""); }}
            maxLength={80} placeholder="Personagem, escultura ou versão" autoComplete="off"
            aria-describedby={searchError ? "catalog-search-error" : undefined}
            className="min-h-11 w-full rounded-md border border-[#76614b] bg-[#120f0d] px-4 text-[#f1e9df] outline-none placeholder:text-[#9e9082] focus:border-[#e1b784]" />
        </div>
        <div>
          <label htmlFor="catalog-studio" className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#c9ac88]">Estúdio</label>
          <select id="catalog-studio" value={studio} onChange={event => changeStudio(event.target.value)}
            className="min-h-11 w-full rounded-md border border-[#76614b] bg-[#120f0d] px-3 text-[#f1e9df] focus:border-[#e1b784]">
            <option value="">Todos os estúdios</option>
            {studios.map(item => <option key={item.studio} value={item.studio}>{item.studio} ({item.total})</option>)}
          </select>
        </div>
        <button type="submit" className={classes + " self-end"}>Pesquisar</button>
      </form>
      {searchError && <p id="catalog-search-error" role="alert" className="mt-2 text-sm text-[#f0b5a7]">{searchError}</p>}
      {studiosError && <p role="alert" className="mt-2 text-sm text-[#f0b5a7]">{studiosError}</p>}

      {featuredStudios.length > 0 && <div className="mt-6 flex flex-wrap items-center gap-2" aria-label="Estúdios em destaque">
        <span className="mr-1 text-xs uppercase tracking-wider text-[#a99a8b]">Explorar:</span>
        {featuredStudios.map(item => <button key={item.studio} type="button" onClick={() => changeStudio(item.studio)}
          aria-pressed={studio === item.studio}
          className={"min-h-9 rounded-full border px-3 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#efc792] " +
            (studio === item.studio ? "border-[#dcad75] bg-[#5a402a] text-white" : "border-[#5f4b3b] text-[#dfc7a9] hover:border-[#dcad75]")}>
          {item.studio}
        </button>)}
      </div>}

      <div className="mt-11 flex flex-wrap items-end justify-between gap-3 border-b border-[#493b30] pb-4">
        <div>
          <h2 className="text-xl font-semibold">{studio || "Todos os estúdios"}</h2>
          {query && <p className="mt-1 text-sm text-[#b7a99a]">Resultados para “{query}”</p>}
        </div>
        <div className="flex items-center gap-3">
          <span role="status" aria-live="polite" className="text-sm text-[#c2b5a7]">
            {loading ? "Carregando…" : page ? page.total.toLocaleString("pt-BR") + " modelos" : "Indisponível"}
          </span>
          {(studio || query) && <button type="button" className="text-sm text-[#e5bd8c] underline underline-offset-4" onClick={() => {
            setDraft(""); navigate({ studio: "", query: "", offset: 0, selected: null });
          }}>Limpar filtros</button>}
        </div>
      </div>

      {listError && <div role="alert" className="mt-6 rounded-lg border border-[#a45f50] p-5 text-[#f0b5a7]">
        {listError}
        <button type="button" className="ml-3 underline" onClick={() => setReloadVersion(version => version + 1)}>Tentar novamente</button>
      </div>}
      {loading && <div role="status" className="grid grid-cols-2 gap-4 py-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-[#2b231c]" />)}
      </div>}
      {!loading && page?.items.length === 0 && <div className="py-20 text-center">
        <p className="text-lg">Nenhum modelo encontrado.</p>
        <p className="mt-2 text-sm text-[#b7a99a]">Experimente outro estúdio ou um termo diferente.</p>
      </div>}
      {!loading && page && <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {page.items.map(model => <button key={model.id} type="button"
          onClick={() => navigate({ ...route, selected: model.id })}
          aria-label={"Abrir galeria de " + model.name + ", " + model.studio}
          className="group overflow-hidden rounded-lg border border-[#423429] bg-[#211a15] text-left transition hover:-translate-y-0.5 hover:border-[#d7a772] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e5bd8c]">
          <div className="flex aspect-[3/4] items-center justify-center overflow-hidden bg-[#2d241d]">
            {imageUrl(model.cover) ? <img src={imageUrl(model.cover)} alt="" loading="lazy"
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.045]" />
              : <span className="p-3 text-center text-sm text-[#b6a496]">Fotografia em preparação</span>}
          </div>
          <div className="p-3 sm:p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#d9ac79]">{model.studio}</p>
            <h3 className="mt-2 line-clamp-2 font-semibold leading-5">{model.name}</h3>
            {model.variant && <p className="mt-2 line-clamp-2 text-xs text-[#c2b5a7]">{model.variant}</p>}
            <p className="mt-3 text-xs text-[#b6a496]">{model.imageCount} {model.imageCount === 1 ? "foto" : "fotos"}{model.provisional ? " · Em curadoria" : ""}</p>
          </div>
        </button>)}
      </div>}

      {page && lastPage > 1 && <nav aria-label="Paginação do catálogo" className="mt-11 flex items-center justify-center gap-4">
        <button type="button" className={classes} disabled={loading || offset === 0}
          onClick={() => navigate({ ...route, offset: Math.max(0, offset - PAGE_SIZE) })}>Anterior</button>
        <span className="text-sm text-[#d3c2b1]">Página {Math.floor(offset / PAGE_SIZE) + 1} de {lastPage}</span>
        <button type="button" className={classes} disabled={loading || offset + PAGE_SIZE >= page.total}
          onClick={() => navigate({ ...route, offset: offset + PAGE_SIZE })}>Próxima</button>
      </nav>}
    </main>

    {selected && <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Galeria do modelo"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#0e0b09]/98 p-4 outline-none sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap justify-between gap-3">
          <button type="button" className={classes} onClick={closeGallery}>Fechar galeria <span aria-hidden="true">×</span></button>
          <button type="button" className={classes} onClick={copyLink}>Copiar link deste modelo</button>
        </div>
        {copyMessage && <p role="status" className="mt-2 text-sm text-[#d5b895]">{copyMessage}</p>}
        {detailError && <p role="alert" className="mt-10 text-[#f0b5a7]">{detailError}</p>}
        {!detailError && (!detail || detail.id !== selected) && <p role="status" className="mt-10 text-[#c2b5a7]">Carregando galeria…</p>}
        {detail?.id === selected && <>
          <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-[#e3b57e]">{detail.studio}</p>
          <h2 id="catalog-detail-title" className="mt-2 text-3xl font-semibold sm:text-4xl">{detail.name}</h2>
          {detail.variant && <p className="mt-2 text-sm text-[#cbb7a4]">{detail.variant}</p>}
          <p className="mt-3 text-sm text-[#bba99a]">{detail.images.length} {detail.images.length === 1 ? "fotografia" : "fotografias"} · {detail.provisional ? "Identificação em curadoria" : "Identificação do acervo"}</p>
          {selectedImage && <div className="mt-6">
            <div className="flex min-h-[300px] items-center justify-center rounded-lg bg-[#211a15] sm:min-h-[490px]">
              {imageUrl(selectedImage.display) && <img key={selectedImage.display} src={imageUrl(selectedImage.display)}
                alt={detail.name + ", fotografia " + (photoIndex + 1) + " de " + detail.images.length}
                className="max-h-[70vh] w-full object-contain" />}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <button type="button" className={classes} disabled={detail.images.length < 2}
                onClick={() => setPhotoIndex(index => (index + detail.images.length - 1) % detail.images.length)}>Anterior foto</button>
              <span role="status" aria-live="polite" className="text-sm text-[#c6b3a0]">{photoIndex + 1} / {detail.images.length}</span>
              <button type="button" className={classes} disabled={detail.images.length < 2}
                onClick={() => setPhotoIndex(index => (index + 1) % detail.images.length)}>Próxima foto</button>
            </div>
            {detail.images.length > 1 && <div className="mt-5 flex gap-2 overflow-x-auto pb-3" aria-label="Miniaturas da galeria">
              {detail.images.map((item, index) => <button type="button" key={item.position + ":" + index}
                onClick={() => setPhotoIndex(index)} aria-label={"Mostrar fotografia " + (index + 1)}
                aria-pressed={index === photoIndex}
                className={"h-20 w-16 shrink-0 overflow-hidden rounded border-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#efc792] " +
                  (index === photoIndex ? "border-[#f0bd7e]" : "border-[#524131]")}>
                {imageUrl(item.thumb) && <img src={imageUrl(item.thumb)} alt="" loading="lazy" className="h-full w-full object-contain" />}
              </button>)}
            </div>}
          </div>}
          {!detail.images.length && <p className="mt-6 text-sm text-[#b6a496]">Fotografias em preparação.</p>}
          <p className="mt-6 text-xs text-[#a99c8e]">Use as setas do teclado para navegar pelas fotos e Esc para fechar.</p>
        </>}
      </div>
    </div>}

    <footer className="border-t border-[#43372d] px-5 py-6 text-center text-xs text-[#b5a89a]">
      TONART Studio · Catálogo visual de estúdios · Conteúdo em curadoria
    </footer>
  </div>;
}
