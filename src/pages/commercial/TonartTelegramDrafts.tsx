import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  editTelegramDraft,
  getTelegramDraft,
  getTelegramDraftImage,
  listTelegramDraftStudios,
  searchTelegramStudioIndex,
  telegramStudioCoverUrl,
  type TelegramDraft,
  type TelegramDraftEdit,
  type TelegramStudioIndexPage,
} from "@/services/catalog/tonart-telegram-drafts";
import { actionClass, secondaryClass } from "./CommercialPage";

const inputClass =
  "min-h-11 w-full rounded-md border border-[#594737] bg-[#171411] px-3 py-2.5 text-sm text-[#f2e7d7] outline-none transition placeholder:text-[#80776b] focus:border-[#d4a66e] focus:ring-1 focus:ring-[#d4a66e]/30";
const outlineButton =
  "inline-flex min-h-10 items-center justify-center rounded-md border border-[#62503c] bg-[#211c17] px-3 text-sm text-[#e8d2b5] transition hover:border-[#d4a66e] hover:bg-[#342719] disabled:cursor-not-allowed disabled:opacity-30";
const statusOptions: Array<{
  value: TelegramDraft["reviewStatus"];
  label: string;
}> = [
  { value: "pending", label: "Pendente" },
  { value: "reviewing", label: "Em revisão" },
  { value: "confirmed", label: "Identidade confirmada" },
  { value: "rejected", label: "Identidade rejeitada" },
];
const integer = new Intl.NumberFormat("pt-BR");

function hasChanges(selected: TelegramDraft | null, form: TelegramDraftEdit | null) {
  if (!selected || !form) return false;
  return (
    form.name !== selected.name ||
    form.studio !== selected.studio ||
    form.character !== selected.character ||
    form.variant !== selected.variant ||
    form.reviewStatus !== selected.reviewStatus ||
    form.imageOrder.join(",") !== selected.images.map((x) => x.messageId).join(",")
  );
}

export default function TonartTelegramDrafts() {
  const [studios, setStudios] = useState<Array<{ studio: string; total: number }>>([]);
  const [studio, setStudio] = useState("");
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState<TelegramStudioIndexPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<TelegramDraft | null>(null);
  const [form, setForm] = useState<TelegramDraftEdit | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [previews, setPreviews] = useState<Array<{ messageId: number; url: string }>>([]);
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [fullImage, setFullImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editorError, setEditorError] = useState("");
  const dirty = useMemo(() => hasChanges(selected, form), [selected, form]);
  const activeMessageId = form?.imageOrder[activePhoto];
  const activePreview = previews.find((x) => x.messageId === activeMessageId)?.url;
  const searchRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const selectedIndex = page?.items.findIndex((item) => item.id === selectedId) ?? -1;
  const previousId = selectedIndex > 0 ? page?.items[selectedIndex - 1]?.id : undefined;
  const nextId = selectedIndex >= 0 ? page?.items[selectedIndex + 1]?.id : undefined;

  useEffect(() => {
    let live = true;
    listTelegramDraftStudios()
      .then(({ studios: result }) => { if (live) setStudios(result); })
      .catch(() => { if (live) setStudios([]); });
    return () => { live = false; };
  }, []);

  // The existing D1 index handles global search and pagination, not an in-page filter.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setOffset(0);
      setQuery(searchText.trim());
    }, 280);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    searchTelegramStudioIndex(studio, query, offset)
      .then((result) => { if (live) setPage(result); })
      .catch(() => {
        if (live) {
          setPage(null);
          setError("Não foi possível consultar o índice do catálogo. Nenhuma ficha foi modificada.");
        }
      })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [studio, query, offset, refresh]);

  useEffect(() => {
    let live = true;
    setSelected(null);
    setForm(null);
    setPreviews([]);
    setActivePhoto(0);
    setLightbox(false);
    setEditorError("");
    setSaved(false);
    if (!selectedId) { setInspecting(false); return; }
    setInspecting(true);
    getTelegramDraft(selectedId)
      .then((data) => {
        if (!live) return;
        setSelected(data);
        setForm({
          revision: data.revision,
          name: data.name,
          studio: data.studio,
          character: data.character,
          variant: data.variant,
          reviewStatus: data.reviewStatus,
          imageOrder: data.images.map((x) => x.messageId),
        });
      })
      .catch(() => {
        if (live) setEditorError("Não foi possível abrir a ficha privada. A edição não foi iniciada.");
      })
      .finally(() => { if (live) setInspecting(false); });
    return () => { live = false; };
  }, [selectedId]);

  // Object URLs are short-lived and belong only to the selected private gallery.
  useEffect(() => {
    let live = true;
    const urls: string[] = [];
    setPreviews([]);
    if (!selected) return;
    // Limit authenticated media requests: large galleries must not create a burst
    // of Supabase admin checks or Worker/R2 requests.
    let cursor = 0;
    const load = async () => {
      while (live && cursor < selected.images.length) {
        const photo = selected.images[cursor++];
        try {
          const url = await getTelegramDraftImage(photo.thumbPath);
          if (live) {
            urls.push(url);
            setPreviews((current) => [...current, { messageId: photo.messageId, url }]);
          } else {
            URL.revokeObjectURL(url);
          }
        } catch {
          // One unavailable private image must not hide the rest of the gallery.
        }
      }
    };
    void Promise.all(Array.from({ length: Math.min(4, selected.images.length) }, load));
    return () => {
      live = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selected?.id, selected?.revision, selected?.images.length]);

  useEffect(() => {
    let live = true;
    let url = "";
    setFullImage(null);
    if (!lightbox || !selected || activeMessageId === undefined) return;
    const image = selected.images.find((x) => x.messageId === activeMessageId);
    if (!image) return;
    getTelegramDraftImage(image.displayPath)
      .then((value) => {
        url = value;
        if (live) setFullImage(value);
        else URL.revokeObjectURL(value);
      })
      .catch(() => { /* The authorized thumbnail remains available as fallback. */ });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [lightbox, selected?.id, selected?.revision, activeMessageId]);

  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  useEffect(() => {
    if (!lightbox) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(false);
      if (event.key === "ArrowLeft") setActivePhoto((x) => Math.max(0, x - 1));
      if (event.key === "ArrowRight")
        setActivePhoto((x) => Math.min((form?.imageOrder.length ?? 1) - 1, x + 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, form?.imageOrder.length]);

  // On mobile the editor is a full-screen workspace. Prevent background
  // scrolling and restore keyboard focus when the workspace is dismissed.
  useEffect(() => {
    if (!selectedId && !lightbox) return;
    const before = document.body.style.overflow;
    const desktop = window.matchMedia("(min-width: 1280px)");
    const updateLock = () => {
      document.body.style.overflow = lightbox || (selectedId && !desktop.matches)
        ? "hidden"
        : before;
    };
    updateLock();
    desktop.addEventListener("change", updateLock);
    return () => {
      desktop.removeEventListener("change", updateLock);
      document.body.style.overflow = before;
    };
  }, [selectedId, lightbox]);

  useEffect(() => {
    if (selectedId) {
      editorRef.current?.scrollTo({ top: 0, behavior: "auto" });
      if (!window.matchMedia("(min-width: 1280px)").matches) {
        editorRef.current?.focus();
      }
    } else if (previousFocusRef.current?.isConnected) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [selectedId]);

  // J/K traverse the currently visible batch; / focuses the global search.
  // Typing in an input never triggers gallery navigation.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (lightbox || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      const editing = target instanceof HTMLElement &&
        !!target.closest("input, textarea, select, [contenteditable='true']");
      if (editing) return;
      if (event.key === "/" && !selectedId) {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "Escape" && selectedId) {
        event.preventDefault();
        choose(null);
      } else if (event.key.toLowerCase() === "j" && nextId) {
        event.preventDefault();
        choose(nextId);
      } else if (event.key.toLowerCase() === "k" && previousId) {
        event.preventDefault();
        choose(previousId);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, nextId, previousId, saving, dirty, lightbox]);

  function choose(id: string | null) {
    if (saving) return;
    if (id === selectedId) return;
    if (dirty && !window.confirm("Existem alterações não salvas. Descartar e continuar?")) return;
    if (id && !selectedId && document.activeElement instanceof HTMLElement) {
      previousFocusRef.current = document.activeElement;
    }
    setSelectedId(id);
  }

  function movePhoto(index: number, direction: -1 | 1) {
    if (!form || saving) return;
    const target = index + direction;
    if (target < 0 || target >= form.imageOrder.length) return;
    const imageOrder = [...form.imageOrder];
    [imageOrder[index], imageOrder[target]] = [imageOrder[target], imageOrder[index]];
    setForm({ ...form, imageOrder });
    setActivePhoto(target);
    setSaved(false);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!selected || !form || saving || !dirty) return;
    const submittedBy = (event.nativeEvent as SubmitEvent).submitter;
    const advance = submittedBy instanceof HTMLElement &&
      submittedBy.getAttribute("data-advance") === "true";
    const followingId = advance ? nextId : undefined;
    setSaving(true);
    setSaved(false);
    setEditorError("");
    try {
      const updated = await editTelegramDraft(selected.id, form);
      const persisted = await getTelegramDraft(updated.id);
      if (
        persisted.id !== selected.id ||
        persisted.revision !== form.revision + 1 ||
        persisted.revision !== updated.revision ||
        persisted.name !== form.name.trim() ||
        persisted.studio !== form.studio.trim() ||
        persisted.character !== form.character.trim() ||
        persisted.variant !== form.variant.trim() ||
        persisted.reviewStatus !== form.reviewStatus ||
        persisted.groupKey !== selected.groupKey ||
        persisted.originId !== selected.originId ||
        persisted.rightsStatus !== selected.rightsStatus ||
        persisted.published !== false ||
        persisted.imageCount !== selected.imageCount ||
        persisted.images.length !== form.imageOrder.length ||
        persisted.images.some((image, index) => image.messageId !== form.imageOrder[index])
      ) {
        throw new Error("persisted_draft_mismatch");
      }
      setSelected(persisted);
      setForm({
        revision: persisted.revision,
        name: persisted.name,
        studio: persisted.studio,
        character: persisted.character,
        variant: persisted.variant,
        reviewStatus: persisted.reviewStatus,
        imageOrder: persisted.images.map((x) => x.messageId),
      });
      setSaved(!followingId);
      setRefresh((x) => x + 1);
      if (followingId) setSelectedId(followingId);
    } catch {
      setEditorError("A gravação não pôde ser reconfirmada. Reabra a ficha antes de tentar novamente.");
    } finally {
      setSaving(false);
    }
  }

  const totalPages = page ? Math.max(1, Math.ceil(page.total / page.limit)) : 1;
  const currentPage = page ? Math.floor(offset / page.limit) + 1 : 1;

  return (
    <section className="space-y-5 text-[#efe6d8]" aria-label="Mesa visual de curadoria dos estúdios Telegram">
      <div className="overflow-hidden rounded-xl border border-[#53402f] bg-[#14110f]">
        <div className="relative overflow-hidden border-b border-[#443629] bg-[#211911] px-5 py-7 sm:px-8">
          <div className="absolute -right-16 -top-24 h-60 w-60 rounded-full border border-[#b8925c]/15" aria-hidden="true" />
          <div className="absolute -right-2 -top-11 h-44 w-44 rounded-full border border-[#b8925c]/15" aria-hidden="true" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.23em] text-[#d8b47c]">
                TONART / Estúdios Telegram
              </p>
              <h3 className="mt-3 font-serif text-3xl font-medium tracking-tight text-[#f3e6d4] sm:text-4xl">
                Mesa de curadoria
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#c3b3a2]">
                Explore as esculturas visualmente, compare fotografias e refine cada ficha.
                Os registros continuam privados para edição; salvar não publica nem coloca à venda.
              </p>
            </div>
            <div className="rounded-lg border border-[#967348]/40 bg-[#120f0c]/65 px-5 py-4 text-right">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#b89d7b]">Modelos no acervo</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-[#ecd0a6]">
                {page ? integer.format(page.total) : "—"}
              </p>
              <p className="mt-1 text-xs text-[#b9ad9c]">{studio || query ? "Nesta seleção" : "Acervo completo"} · D1</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-4 py-5 sm:px-6">
          <div className="flex flex-wrap gap-2" aria-label="Estúdios">
            <button type="button" onClick={() => { setStudio(""); setOffset(0); }}
              aria-pressed={!studio}
              className={"rounded-full border px-4 py-2 text-xs transition " +
                (!studio ? "border-[#d8b47c] bg-[#d8b47c] text-[#19130d]" :
                  "border-[#594a39] text-[#cbb8a0] hover:border-[#d8b47c]")}>
              Todos os estúdios
            </button>
            {studios.map((item) => (
              <button key={item.studio} type="button"
                onClick={() => { setStudio(item.studio); setOffset(0); }}
                aria-pressed={studio === item.studio}
                className={"rounded-full border px-4 py-2 text-xs transition " +
                  (studio === item.studio ? "border-[#d8b47c] bg-[#d8b47c] text-[#19130d]" :
                    "border-[#594a39] text-[#cbb8a0] hover:border-[#d8b47c]")}>
                {item.studio} <span className="opacity-65">{integer.format(item.total)}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <form className="flex min-w-0 flex-1 items-center gap-2" onSubmit={(event) => {
              event.preventDefault();
              setQuery(searchText.trim());
              setOffset(0);
            }}>
              <label htmlFor="tonart-studio-search" className="sr-only">Buscar em todos os modelos</label>
              <div className="relative min-w-0 flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#aa967f]" aria-hidden="true">⌕</span>
                <input ref={searchRef} id="tonart-studio-search" className={inputClass + " pl-9 pr-10"}
                  type="search" maxLength={80} value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Buscar no acervo inteiro por nome, personagem ou variante"
                />
                {searchText && <button type="button" onClick={() => setSearchText("")}
                  aria-label="Limpar pesquisa"
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[#e3c6a3] hover:text-white">×</button>}
              </div>
              <button type="submit" className={outlineButton}>Buscar</button>
            </form>
            <div className="inline-flex items-center self-start rounded-md border border-[#594737] bg-[#171411] p-1" aria-label="Modo de visualização">
              <button type="button" aria-pressed={layout === "grid"} onClick={() => setLayout("grid")}
                className={"min-h-9 rounded px-4 text-xs " + (layout === "grid" ? "bg-[#d2a66d] font-semibold text-[#1a140e]" : "text-[#b8a590]")}>
                Grade
              </button>
              <button type="button" aria-pressed={layout === "list"} onClick={() => setLayout("list")}
                className={"min-h-9 rounded px-4 text-xs " + (layout === "list" ? "bg-[#d2a66d] font-semibold text-[#1a140e]" : "text-[#b8a590]")}>
                Lista
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#b9a995]">
            <p role="status">
              {loading ? "Consultando o acervo..." :
                page ? integer.format(page.total) + " esculturas encontradas" : "Índice indisponível"}
              {query ? " para “" + query + "”" : ""}
            </p>
            <span>Uma ficha por modelo · J/K navegam entre fichas · / busca</span>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-[#9c5f53] bg-[#321d1b] p-4 text-sm text-[#ffd1c8]">{error}</p>
      )}

      <div className={selectedId ? "grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,410px)]" : "block"}>
        <div className="min-w-0">
          {loading && !page ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Carregando modelos">
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="animate-pulse overflow-hidden rounded-lg border border-[#42352a] bg-[#211b16]">
                  <div className="aspect-[4/5] bg-[#2d251e]" />
                  <div className="space-y-2 p-3"><div className="h-3 w-2/3 rounded bg-[#534231]" /><div className="h-4 rounded bg-[#534231]" /></div>
                </div>
              ))}
            </div>
          ) : page && page.items.length === 0 ? (
            <div className="rounded-xl border border-[#49392b] bg-[#1d1814] px-6 py-20 text-center">
              <p className="font-serif text-2xl text-[#f1e0c9]">Nenhuma escultura encontrada</p>
              <p className="mt-2 text-sm text-[#baa794]">Experimente outro termo ou selecione todos os estúdios.</p>
              <button type="button" className={outlineButton + " mt-5"} onClick={() => { setSearchText(""); setStudio(""); }}>Limpar filtros</button>
            </div>
          ) : (
            <div className={layout === "grid" ?
              "grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4" :
              "grid min-w-0 gap-3"}>
              {page?.items.map((item) => {
                const cover = telegramStudioCoverUrl(item.cover);
                const active = selectedId === item.id;
                return (
                  <button key={item.id} type="button"
                    aria-pressed={active}
                    onClick={() => choose(item.id)}
                    className={"group min-w-0 overflow-hidden rounded-lg border text-left transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d2a66d] " +
                      (active ? "border-[#e5b979] bg-[#302419] shadow-[0_0_0_1px_#ad8350]" :
                        "border-[#46382c] bg-[#211b17] hover:-translate-y-0.5 hover:border-[#aa8557] hover:bg-[#2c221a]") +
                      (layout === "list" ? " flex items-center gap-4 p-2" : "")}>
                    <div className={"relative flex shrink-0 items-center justify-center overflow-hidden bg-[#312922] " +
                      (layout === "grid" ? "aspect-[4/5] w-full" : "h-24 w-24 rounded-md sm:h-28 sm:w-28")}>
                      {cover ? (
                        <img src={cover} alt="" loading="lazy"
                          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.035]" />
                      ) : (
                        <span className="px-3 text-center text-xs text-[#ab9c89]">Fotografia em preparação</span>
                      )}
                      {layout === "grid" && (
                        <span className="absolute bottom-2 left-2 rounded bg-black/75 px-2 py-1 text-[10px] text-[#eee0cc]">
                          {item.imageCount} {item.imageCount === 1 ? "foto" : "fotos"}
                        </span>
                      )}
                    </div>
                    <div className={layout === "grid" ? "min-w-0 p-3 sm:p-4" : "min-w-0 flex-1 py-2 pr-2"}>
                      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#d7ad79]">{item.studio}</p>
                      <h4 className={"mt-1 font-semibold leading-snug text-[#f2e8d8] " + (layout === "grid" ? "line-clamp-2 min-h-10 text-sm" : "truncate text-base")}>
                        {item.name}
                      </h4>
                      <p className="mt-1 truncate text-xs text-[#b6a796]">{item.variant || item.character || "Modelo do estúdio"}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {item.provisional && <span className="rounded border border-[#8b673e] px-1.5 py-0.5 text-[10px] text-[#d9b681]">Nome provisório</span>}
                        {layout === "list" && <span className="text-xs text-[#a99b8a]">{item.imageCount} fotos</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {page && page.total > 0 && (
            <nav aria-label="Paginação dos modelos" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#48382a] bg-[#1a1511] px-4 py-3">
              <span className="text-xs text-[#c7b29c]">Página {integer.format(currentPage)} de {integer.format(totalPages)}</span>
              <div className="flex items-center gap-2">
                <button type="button" className={outlineButton} disabled={loading || offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - page.limit))}>← Anterior</button>
                <button type="button" className={outlineButton} disabled={loading || offset + page.limit >= page.total}
                  onClick={() => setOffset(offset + page.limit)}>Próxima →</button>
              </div>
            </nav>
          )}
        </div>

        {selectedId && (
          <aside ref={editorRef} tabIndex={-1} role="dialog" aria-label="Editor de estatueta Telegram"
            className="fixed inset-0 z-50 overflow-y-auto border-l border-[#71563a] bg-[#17120f] shadow-2xl xl:sticky xl:top-4 xl:z-auto xl:max-h-[calc(100vh-2rem)] xl:rounded-xl xl:border xl:border-[#6b5138]">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#584431] bg-[#231b15] px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d5a96b]">Ficha editorial</p>
                <p className="mt-1 truncate text-xs text-[#c6af95]">{selected?.studio || "Carregando dados..."}</p>
              </div>
              <button type="button" className={outlineButton} onClick={() => choose(null)} disabled={saving}
                aria-label="Fechar editor">Fechar ×</button>
            </div>

            {inspecting ? (
              <div className="space-y-4 p-5" role="status">
                <div className="aspect-square animate-pulse rounded-lg bg-[#33271d]" />
                <p className="text-sm text-[#d4bea6]">Abrindo a ficha autorizada...</p>
              </div>
            ) : !selected || !form ? (
              <div className="p-5"><p role="alert" className="text-sm text-[#f1b4a6]">{editorError || "Ficha indisponível."}</p></div>
            ) : (
              <>
                <div className="space-y-5 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2 rounded-md border border-[#55412f] bg-[#211a14] p-2">
                    <button type="button" className={outlineButton} disabled={!previousId || saving}
                      onClick={() => previousId && choose(previousId)} aria-label="Abrir ficha anterior">
                      ← Anterior
                    </button>
                    <span className="text-center text-[11px] text-[#c8b199]">
                      {selectedIndex < 0 ? "Ficha do acervo" :
                        "Ficha " + (selectedIndex + 1) + " de " + page?.items.length + " nesta página"}
                    </span>
                    <button type="button" className={outlineButton} disabled={!nextId || saving}
                      onClick={() => nextId && choose(nextId)} aria-label="Abrir próxima ficha">
                      Próxima →
                    </button>
                  </div>
                  <div>
                    <h4 className="font-serif text-2xl leading-tight text-[#f3e2c9]">{selected.name}</h4>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-[#6c5237] px-2.5 py-1 text-[11px] text-[#deb980]">
                        {statusOptions.find((x) => x.value === selected.reviewStatus)?.label || selected.reviewStatus}
                      </span>
                      {selected.provisionalName && <span className="rounded-full border border-[#654f3c] px-2.5 py-1 text-[11px] text-[#c9b6a2]">Identidade provisória</span>}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-[#574534] bg-[#292119]">
                    <button type="button" onClick={() => setLightbox(true)} disabled={!activePreview}
                      className="flex aspect-[5/4] w-full items-center justify-center overflow-hidden bg-[#241e18] disabled:cursor-default"
                      aria-label="Ampliar fotografia selecionada">
                      {activePreview ? <img src={activePreview} alt={"Fotografia " + (activePhoto + 1) + " de " + selected.name} className="h-full w-full object-contain" /> :
                        <span className="text-xs text-[#b7a18b]">Carregando fotografia privada...</span>}
                    </button>
                    <div className="flex items-center justify-between gap-2 border-t border-[#574534] px-3 py-2 text-xs text-[#d2b89a]">
                      <span>Foto {activePhoto + 1} de {form.imageOrder.length} · toque para ampliar</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setActivePhoto(Math.max(0, activePhoto - 1))}
                          disabled={activePhoto === 0} className={outlineButton} aria-label="Foto anterior">‹</button>
                        <button type="button" onClick={() => setActivePhoto(Math.min(form.imageOrder.length - 1, activePhoto + 1))}
                          disabled={activePhoto === form.imageOrder.length - 1} className={outlineButton} aria-label="Próxima foto">›</button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h5 className="text-sm font-semibold text-[#eed8b9]">Organizar galeria</h5>
                      <span className="text-[11px] text-[#b6a28b]">A primeira imagem será a capa</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {form.imageOrder.map((messageId, index) => {
                        const thumbnail = previews.find((x) => x.messageId === messageId)?.url;
                        return (
                          <div key={messageId} className="overflow-hidden rounded-md border border-[#574534] bg-[#292119]">
                            <button type="button" onClick={() => setActivePhoto(index)} aria-pressed={activePhoto === index}
                              className={"relative flex aspect-square w-full items-center justify-center border-2 " +
                                (activePhoto === index ? "border-[#e1b77d]" : "border-transparent")}>
                              {thumbnail ?
                                <img src={thumbnail} alt={"Fotografia " + (index + 1)} className="h-full w-full object-contain" /> :
                                <span className="text-xs text-[#9e8a76]">...</span>}
                              {index === 0 && <span className="absolute left-1 top-1 rounded bg-[#d2aa73] px-1.5 py-0.5 text-[9px] font-bold text-[#1c130d]">CAPA</span>}
                            </button>
                            <div className="flex items-center justify-center gap-1 border-t border-[#574534] p-1">
                              <button type="button" className="min-h-8 min-w-8 rounded border border-[#6e563c] text-sm disabled:opacity-20"
                                disabled={saving || index === 0} onClick={() => movePhoto(index, -1)}
                                aria-label={"Mover foto " + (index + 1) + " para a esquerda"}>←</button>
                              <button type="button" className="min-h-8 min-w-8 rounded border border-[#6e563c] text-sm disabled:opacity-20"
                                disabled={saving || index === form.imageOrder.length - 1}
                                onClick={() => movePhoto(index, 1)}
                                aria-label={"Mover foto " + (index + 1) + " para a direita"}>→</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <form id="tonart-editor-form" onSubmit={(event) => void save(event)}
                    onKeyDown={(event) => {
                      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                        event.preventDefault();
                        event.currentTarget.requestSubmit();
                      }
                    }}
                    className="space-y-4 border-t border-[#594737] pt-5">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                      <label className="block space-y-1.5 text-xs text-[#d7c1aa]">
                        Nome da escultura
                        <input disabled={saving} className={inputClass} maxLength={160} required value={form.name}
                          onChange={(event) => { setForm({ ...form, name: event.target.value }); setSaved(false); }} />
                      </label>
                      <label className="block space-y-1.5 text-xs text-[#d7c1aa]">
                        Estúdio
                        <input disabled={saving} className={inputClass} maxLength={120} required value={form.studio}
                          onChange={(event) => { setForm({ ...form, studio: event.target.value }); setSaved(false); }} />
                      </label>
                      <label className="block space-y-1.5 text-xs text-[#d7c1aa]">
                        Personagem
                        <input disabled={saving} className={inputClass} maxLength={160} value={form.character}
                          onChange={(event) => { setForm({ ...form, character: event.target.value }); setSaved(false); }} />
                      </label>
                      <label className="block space-y-1.5 text-xs text-[#d7c1aa]">
                        Variante
                        <input disabled={saving} className={inputClass} maxLength={160} value={form.variant}
                          onChange={(event) => { setForm({ ...form, variant: event.target.value }); setSaved(false); }} />
                      </label>
                    </div>
                    <label className="block space-y-1.5 text-xs text-[#d7c1aa]">
                      Estado da revisão
                      <select disabled={saving} className={inputClass} value={form.reviewStatus}
                        onChange={(event) => {
                          setForm({ ...form, reviewStatus: event.target.value as TelegramDraft["reviewStatus"] });
                          setSaved(false);
                        }}>
                        {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <div className="flex items-center justify-between gap-3 rounded-md bg-[#2b241c] p-3 text-xs text-[#c4af97]">
                      <span>Revisão {selected.revision} · {selected.imageCount} fotos</span>
                      <span className={dirty ? "font-semibold text-[#e6bd83]" : "text-[#ad9e8d]"}>
                        {dirty ? "Alterações não salvas" : "Sem alterações"}
                      </span>
                    </div>
                    {editorError && <p role="alert" className="rounded border border-[#925446] p-3 text-sm text-[#ffd0c5]">{editorError}</p>}
                    {saved && <p role="status" className="rounded border border-[#68805d] p-3 text-sm text-[#cce3c3]">
                      Ficha salva e reconfirmada na autoridade do catálogo.
                    </p>}
                    <button type="submit" className={actionClass + " w-full"} disabled={saving || !dirty}>
                      {saving ? "Salvando e conferindo..." : dirty ? "Salvar alterações" : "Ficha atualizada"}
                    </button>
                    <button type="submit" data-advance="true" className={outlineButton + " w-full"}
                      disabled={saving || !dirty || !nextId}>
                      Salvar e abrir próxima ficha →
                    </button>
                    <p className="text-center text-[11px] text-[#978775]">
                      Ctrl + Enter salva · J/K navegam · nenhuma edição publica automaticamente
                    </p>
                  </form>
                  <div className="border-t border-[#51402f] pt-3 text-[11px] leading-relaxed text-[#9e8d79]">
                    <p>ID estável: {selected.id}</p>
                    <p>Origem Telegram: {selected.groupKey}</p>
                    <p>Direitos comerciais: {selected.rightsStatus}</p>
                  </div>
                </div>
              </>
            )}
          </aside>
        )}
      </div>

      {lightbox && selected && form && (
        <div role="dialog" aria-modal="true" aria-label="Fotografia ampliada"
          className="fixed inset-0 z-[80] flex flex-col bg-[#0b0908]/95 p-3 sm:p-7">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#d1a876]">{selected.studio}</p>
              <p className="mt-1 text-sm text-[#eee0cf]">{selected.name} · {activePhoto + 1}/{form.imageOrder.length}</p>
            </div>
            <button type="button" className={outlineButton} onClick={() => setLightbox(false)}>Fechar ×</button>
          </div>
          <div className="mx-auto mt-5 flex min-h-0 w-full max-w-6xl flex-1 items-center justify-center">
            {(fullImage || activePreview) ?
              <img src={fullImage || activePreview} alt={"Fotografia ampliada de " + selected.name}
                className="max-h-full max-w-full object-contain" /> :
              <p className="text-sm text-[#c2aa8e]">Carregando imagem...</p>}
          </div>
          <div className="mx-auto mt-4 flex w-full max-w-6xl items-center justify-between">
            <button type="button" className={outlineButton} disabled={activePhoto === 0}
              onClick={() => setActivePhoto(Math.max(0, activePhoto - 1))}>← Anterior</button>
            <span className="text-xs text-[#a99b8a]">Use as setas do teclado para navegar</span>
            <button type="button" className={outlineButton} disabled={activePhoto === form.imageOrder.length - 1}
              onClick={() => setActivePhoto(Math.min(form.imageOrder.length - 1, activePhoto + 1))}>Próxima →</button>
          </div>
        </div>
      )}
    </section>
  );
}
