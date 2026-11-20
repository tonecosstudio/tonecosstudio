import { useEffect, useState, type FormEvent } from "react";

type Model = { id: string; name: string; studio: string; variant: string; imageCount: number; provisional: boolean; cover: string | null };
type GalleryImage = { position: number; thumb: string; display: string };
type Detail = Model & { images: GalleryImage[] };
type Page = { total: number; offset: number; limit: number; items: Model[] };
type Studio = { studio: string; total: number };
const API = "/catalogo-api/api/telegram-studios";
const classes = "min-h-11 border border-[#9f774e] bg-[#171412] px-4 py-2 text-[#e2c39e] hover:bg-[#9f774e]/15 disabled:opacity-30";
function imageUrl(p: string | null): string | undefined {
  return p && /^\/api\/telegram-studios\/tg_[a-f0-9]{24}\/media\/[a-f0-9]{64}\/(thumb|display)$/.test(p)
    ? "/catalogo-api" + p : undefined;
}
async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const r = await fetch(API + path, { signal, cache: "no-store" });
  if (!r.ok) throw new Error("catalog_unavailable");
  return r.json() as Promise<T>;
}
export default function TelegramStudioCatalog() {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [studio, setStudio] = useState("");
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);

  useEffect(() => {
    const c = new AbortController();
    get<{studios: Studio[]}>("/studios", c.signal).then(d => setStudios(d.studios))
      .catch(() => { if (!c.signal.aborted) setError("Falha ao carregar estúdios."); });
    return () => c.abort();
  }, []);
  useEffect(() => {
    const c = new AbortController();
    const q = new URLSearchParams({ offset: String(offset), limit: "24" });
    if (studio) q.set("studio", studio);
    if (query) q.set("q", query);
    setLoading(true);
    get<Page>("?" + q, c.signal).then(setPage)
      .catch(() => { if (!c.signal.aborted) {setPage(null);setError("Catálogo indisponível.");} })
      .finally(() => { if (!c.signal.aborted) setLoading(false); });
    return () => c.abort();
  }, [studio, offset, query]);
  useEffect(() => {
    setDetail(null);
    if (!selected) return;
    const c = new AbortController();
    get<Detail>("/" + selected, c.signal).then(setDetail)
      .catch(() => { if (!c.signal.aborted) setError("Falha ao carregar galeria."); });
    return () => c.abort();
  }, [selected]);
  function search(e: FormEvent) { e.preventDefault();setOffset(0);setQuery(draft.trim()); }
  return <div className="min-h-screen bg-[#100f0d] text-[#e9e4dd]">
    <header className="border-b border-[#514031] px-5 py-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div><div className="text-3xl font-black tracking-[0.18em]">TONART</div>
          <p className="text-xs uppercase tracking-[0.22em] text-[#d8aa78]">Catálogo dos estúdios</p></div>
        <div className="text-xs uppercase tracking-widest text-[#afa497]">Acervo Telegram · nomes provisórios</div>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-5 pb-20 pt-12">
      <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[#d8aa78]">Coleção dos estúdios</p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Modelos e esculturas</h1>
      <p className="mt-5 max-w-2xl leading-7 text-[#ada59b]">Acervo dos estúdios do Telegram, com nomes e variantes editáveis.
        Esta vitrine não representa disponibilidade comercial.</p>
      <form onSubmit={search} className="mt-8 flex flex-col gap-3 sm:flex-row">
        <input value={draft} onChange={e => setDraft(e.target.value)} maxLength={80}
          aria-label="Pesquisar modelos" placeholder="Buscar personagem ou escultura"
          className="min-h-11 flex-1 border border-[#80664a] bg-[#1e1a16] px-4 outline-none focus:border-[#d8aa78]"/>
        <select aria-label="Filtrar estúdio" className="min-h-11 border border-[#80664a] bg-[#1e1a16] px-4"
          value={studio} onChange={e => {setStudio(e.target.value);setOffset(0);}}>
          <option value="">Todos os estúdios</option>
          {studios.map(s => <option key={s.studio} value={s.studio}>{s.studio} ({s.total})</option>)}
        </select>
        <button className={classes}>Pesquisar</button>
      </form>
      <div className="mt-10 flex justify-between border-b border-[#514031] pb-4">
        <h2 className="font-semibold">Esculturas dos estúdios</h2>
        <span role="status" className="text-sm text-[#aaa095]">{loading ? "Carregando..." : page ? page.total.toLocaleString("pt-BR") + " modelos" : "Indisponível"}</span>
      </div>
      {error && <p role="alert" className="mt-4 border border-[#ad5a4a] p-4 text-[#f1b6aa]">{error}</p>}
      {!loading && page?.items.length === 0 && <p className="py-16 text-center text-[#aaa095]">Nenhum modelo encontrado.</p>}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {page?.items.map(m => <button key={m.id} type="button" onClick={() => setSelected(m.id)}
          className="group overflow-hidden border border-[#43372b] bg-[#201c18] text-left transition hover:border-[#d8aa78]">
          <div className="flex aspect-[3/4] items-center justify-center bg-[#29221c]">
            {imageUrl(m.cover) ? <img src={imageUrl(m.cover)} alt={m.name} loading="lazy"
              className="h-full w-full object-contain transition-transform group-hover:scale-[1.03]"/> :
              <span className="p-3 text-center text-sm text-[#a59b8c]">Imagem em preparação</span>}
          </div>
          <div className="p-4"><p className="text-xs uppercase tracking-wider text-[#d8aa78]">{m.studio}</p>
            <h3 className="mt-2 line-clamp-2 font-semibold">{m.name}</h3>
            {m.variant && <p className="mt-1 truncate text-xs text-[#afa497]">{m.variant}</p>}
            <p className="mt-2 text-xs text-[#afa497]">{m.imageCount} fotos {m.provisional ? "· Nome provisório" : ""}</p></div>
        </button>)}
      </div>
      {page && page.total > 0 && <nav aria-label="Paginação" className="mt-10 flex justify-center gap-4">
        <button className={classes} disabled={loading || offset === 0} onClick={() => setOffset(Math.max(0, offset-24))}>Anterior</button>
        <span className="self-center text-sm text-[#aaa095]">{Math.floor(offset/24)+1} / {Math.ceil(page.total/24)}</span>
        <button className={classes} disabled={loading || offset+24 >= page.total} onClick={() => setOffset(offset+24)}>Próxima</button>
      </nav>}
    </main>
    {selected && <div role="dialog" aria-modal="true" aria-label="Galeria" className="fixed inset-0 z-50 overflow-y-auto bg-black/95 p-5 sm:p-9">
      <div className="mx-auto max-w-6xl">
        <button type="button" className={classes} onClick={() => setSelected(null)}>Fechar galeria</button>
        {detail?.id === selected ? <><p className="mt-8 text-xs uppercase text-[#d8aa78]">{detail.studio}</p>
          <h2 className="mt-2 text-3xl font-semibold">{detail.name}</h2>
          <p className="my-5 text-sm text-[#afa497]">{detail.images.length} fotografias · Identificação provisória</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {detail.images.map((im,i) => <img key={im.position + ":" + i} src={imageUrl(im.display)} loading="lazy"
              alt={detail.name + " · fotografia " + (i+1)} className="max-h-[560px] w-full bg-[#211c18] object-contain"/>)}
          </div></> : <p className="mt-8">Carregando galeria…</p>}
      </div>
    </div>}
    <footer className="border-t border-[#514031] px-5 py-6 text-center text-xs text-[#aaa095]">TONART Studio · Acervo Telegram em organização</footer>
  </div>;
}
