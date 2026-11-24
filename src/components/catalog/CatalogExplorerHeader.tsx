import { useEffect, useRef, type FormEvent } from "react";
import { ArrowRight, Grid2X2, Layers3, Search, SlidersHorizontal, X } from "lucide-react";
import { Link } from "react-router-dom";
import { PUBLIC_ROUTES } from "@/config/routes";

type CatalogKind = "historical" | "review";
type CategoryChip = { id: string; label: string };

export type CatalogExplorerHeaderProps = {
  kind: CatalogKind;
  search: string;
  onSearchChange: (text: string) => void;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSearchClear: () => void;
  categories: CategoryChip[];
  category: string;
  onCategoryChange: (category: string) => void;
  onFiltersClick: () => void;
  filterCount?: number;
  filtersExpanded?: boolean;
  filtersControlId?: string;
  totalLabel?: string;
  coverUrl?: string | null;
  collectionHref: string;
};

/** Shared visual structure for both public catalog channels. Data and approval remain with their owners. */
export function CatalogExplorerHeader({
  kind,
  search,
  onSearchChange,
  onSearchSubmit,
  onSearchClear,
  categories,
  category,
  onCategoryChange,
  onFiltersClick,
  filterCount = 0,
  filtersExpanded,
  filtersControlId,
  totalLabel,
  coverUrl,
  collectionHref,
}: CatalogExplorerHeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const review = kind === "review";
  const title = review ? "MODELOS EM REVISÃO" : "TODOS OS MODELOS";
  const intro = review
    ? "Explore referências recebidas pelo Telegram. Identificações podem ser provisórias; nenhuma ficha implica liberação comercial."
    : "Explore modelos do acervo original, seus universos e suas galerias.";
  const tabs = [
    { label: "Explorar", href: review ? PUBLIC_ROUTES.catalogReview : PUBLIC_ROUTES.catalogHistorical, active: true },
    { label: "Coleções", href: collectionHref, active: false },
    { label: review ? "Originais" : "Em revisão", href: review ? PUBLIC_ROUTES.catalogHistorical : PUBLIC_ROUTES.catalogReview, active: false },
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pt-5 sm:px-6 xl:px-8">
      <form
        role="search"
        aria-label="Buscar modelos no catálogo"
        onSubmit={onSearchSubmit}
        className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-3"
      >
        <label className="relative col-start-1 row-start-1 min-w-0">
          <span className="sr-only">Pesquisar modelos</span>
          <Search aria-hidden="true" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--gold-accent)/0.7)]" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            maxLength={80}
            placeholder="Buscar modelos, personagens, franquias..."
            className="h-12 w-full rounded-lg border border-[hsl(0,0%,25%)] bg-[hsl(0,0%,10%)] pl-12 pr-12 text-sm text-white outline-none focus-visible:border-[hsl(var(--gold-accent))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold-accent)/0.2)]"
          />
          {search ? (
            <button type="button" aria-label="Limpar busca" onClick={onSearchClear} className="absolute right-1 top-0 flex h-12 w-11 items-center justify-center text-[hsl(0,0%,65%)] hover:text-white">
              <X size={17} aria-hidden="true" />
            </button>
          ) : (
            <kbd aria-hidden="true" className="pointer-events-none absolute right-3 top-3 hidden border border-[hsl(0,0%,25%)] px-1.5 py-1 font-mono text-[9px] text-[hsl(0,0%,55%)] sm:inline">Ctrl K</kbd>
          )}
        </label>
        <button
          type="submit"
          className="col-start-1 row-start-2 inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent))] px-5 font-mono text-xs font-semibold uppercase tracking-wider text-black transition hover:brightness-110 sm:col-start-2 sm:row-start-1 sm:w-auto"
        >
          Buscar modelos
        </button>
      </form>

      <nav aria-label="Explorar catálogo" className="mt-3 flex min-w-0 gap-2 overflow-x-auto border-b border-[hsl(0,0%,22%)]">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            to={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={`inline-flex min-h-12 shrink-0 items-center justify-center border-b-2 px-3 font-mono text-[11px] uppercase tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--gold-accent))] ${tab.active ? "border-[hsl(var(--gold-accent))] text-[hsl(var(--gold-accent))]" : "border-transparent text-[hsl(0,0%,60%)] hover:text-white"}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <header
        data-compact="true"
        className="relative isolate mt-5 flex min-h-[195px] flex-col justify-center overflow-hidden rounded-lg border border-[hsl(var(--gold-accent)/0.22)] bg-[hsl(0,0%,9%)] px-6 py-9 sm:min-h-[235px] sm:px-9"
      >
        {coverUrl ? (
          <img src={coverUrl} alt="" aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 -z-20 h-full w-full object-cover object-center opacity-30 sm:w-2/3" />
        ) : null}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-[hsl(0,0%,6%)] via-[hsl(0,0%,6%)/0.92] to-[hsl(0,0%,6%)/0.25]" />
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--gold-accent))]">
          {review ? "ACERVO TELEGRAM · CURADORIA" : "ACERVO TONART · CATÁLOGO ORIGINAL"}
        </p>
        <h1 className="mt-3 text-4xl font-bold uppercase leading-none tracking-wide text-white sm:text-5xl" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>{title}</h1>
        <p className="mt-3 max-w-lg text-xs leading-6 text-[hsl(0,0%,77%)] sm:text-sm">{intro}</p>
        {totalLabel ? <p className="mt-4 font-mono text-sm font-semibold text-[hsl(var(--gold-accent))]">{totalLabel}</p> : null}
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Categorias do catálogo">
        <button
          type="button"
          aria-pressed={!category}
          onClick={() => onCategoryChange("")}
          className={`min-h-10 rounded-full border px-4 text-xs transition-colors ${!category ? "border-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent))] font-semibold text-black" : "border-[hsl(0,0%,28%)] bg-[hsl(0,0%,12%)] text-white hover:border-[hsl(var(--gold-accent))]"}`}
        >
          Todos
        </button>
        {categories.slice(0, 8).map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={category === item.id}
            onClick={() => onCategoryChange(category === item.id ? "" : item.id)}
            className={`min-h-10 max-w-full truncate rounded-full border px-4 text-xs transition-colors ${category === item.id ? "border-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent))] font-semibold text-black" : "border-[hsl(0,0%,28%)] bg-[hsl(0,0%,12%)] text-white hover:border-[hsl(var(--gold-accent))]"}`}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onFiltersClick}
          aria-expanded={filtersExpanded}
          aria-controls={filtersControlId}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[hsl(var(--gold-accent)/0.4)] px-4 text-xs text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)]"
        >
          <SlidersHorizontal size={15} aria-hidden="true" />
          Filtros{filterCount ? ` (${filterCount})` : ""}
        </button>
        <Link to={collectionHref} className="ml-auto inline-flex min-h-10 items-center gap-2 px-2 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--gold-accent))] hover:underline">
          <Layers3 size={15} aria-hidden="true" /> Coleções <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export function CatalogGridListToggle({ view, onChange }: { view: "grid" | "list"; onChange: (value: "grid" | "list") => void }) {
  return (
    <div role="group" aria-label="Visualização dos modelos" className="inline-flex border border-[hsl(0,0%,25%)]">
      {(["grid", "list"] as const).map((mode) => (
        <button key={mode} type="button" aria-label={mode === "grid" ? "Visualizar em grade" : "Visualizar em lista"} aria-pressed={view === mode}
          onClick={() => onChange(mode)}
          className={`inline-flex min-h-11 items-center gap-2 border-r border-[hsl(0,0%,22%)] px-3 text-xs last:border-r-0 ${view === mode ? "bg-[hsl(var(--gold-accent)/0.16)] text-[hsl(var(--gold-accent))]" : "text-[hsl(0,0%,63%)] hover:text-white"}`}>
          {mode === "grid" ? <Grid2X2 size={16} aria-hidden="true" /> : <Layers3 size={16} aria-hidden="true" />}
          <span className="sr-only">{mode === "grid" ? "Grade" : "Lista"}</span>
        </button>
      ))}
    </div>
  );
}
