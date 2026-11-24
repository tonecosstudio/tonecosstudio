import type { PropsWithChildren } from "react";
import { Images } from "lucide-react";

/** Canonical category order and visible classification for both TONART catalog channels. */
export type CatalogCategoryOption = { id: string; label: string };

const CATEGORY_ORDER = [
  "animes & desenhos",
  "games",
  "filmes & series",
  "marvel & dc",
  "tokusatsu & cultura japonesa",
  "pessoas",
  "originais",
] as const;

function normalizeCategoryLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

/** Visual ordering only; API labels and taxonomic identifiers remain untouched. */
function categoryOrderKey(label: string): string {
  const normalized = normalizeCategoryLabel(label);
  if (normalized === "anime" || normalized === "animes e desenhos") return "animes & desenhos";
  if (normalized === "filmes e series") return "filmes & series";
  if (normalized === "tokusatsu") return "tokusatsu & cultura japonesa";
  return normalized;
}

/** Stable ordering, without inventing categories absent from the current data. */
export function orderCatalogCategories<T extends CatalogCategoryOption>(options: readonly T[]): T[] {
  const seen = new Set<string>();
  return options
    .filter((option) => {
      if (!option.id || !option.label.trim() || seen.has(option.id)) return false;
      seen.add(option.id);
      return true;
    })
    .sort((a, b) => {
      const aLabel = categoryOrderKey(a.label);
      const bLabel = categoryOrderKey(b.label);
      const aRank = CATEGORY_ORDER.indexOf(aLabel as (typeof CATEGORY_ORDER)[number]);
      const bRank = CATEGORY_ORDER.indexOf(bLabel as (typeof CATEGORY_ORDER)[number]);
      if (aRank >= 0 && bRank >= 0) return aRank - bRank;
      if (aRank >= 0) return -1;
      if (bRank >= 0) return 1;
      return aLabel.localeCompare(bLabel, "pt-BR") || a.id.localeCompare(b.id, "pt-BR");
    });
}

export function CatalogCategoryBadge({ label }: { label: string }) {
  return (
    <span className="absolute left-2 top-2 z-10 max-w-[calc(100%-1rem)] truncate rounded-full border border-[hsl(var(--gold-accent)/0.55)] bg-[hsl(0,0%,5%)/0.9] px-2.5 py-1 font-mono text-[10px] font-semibold text-[hsl(var(--gold-accent))]">
      {label}
    </span>
  );
}

/** Exactly the same text hierarchy in published and review cards. */
export function CatalogCardIdentity({
  name,
  franchise,
  franchiseProvisional = false,
}: {
  name: string;
  franchise?: string | null;
  franchiseProvisional?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <h3 className="line-clamp-2 min-h-[2.6em] text-sm font-semibold uppercase leading-snug tracking-wide text-[hsl(0,0%,94%)]">
        {name}
      </h3>
      {franchise ? (
        <p
          className="truncate text-xs font-medium text-[hsl(0,0%,72%)]"
          aria-label={franchiseProvisional ? "Franquia em revisão: " + franchise : undefined}
        >
          {franchise}{franchiseProvisional ? " · em revisão" : ""}
        </p>
      ) : <span aria-hidden="true" className="block h-4" />}
    </div>
  );
}


/** Shared TONART arcade card surface. Standalone Telegram retains its approved legacy shell until cutover. */
export function CatalogModelCardShell({
  children,
  selected = false,
  standalone = false,
}: PropsWithChildren<{ selected?: boolean; standalone?: boolean }>) {
  return (
    <article
      className={standalone
        ? "group relative flex h-full flex-col overflow-hidden rounded-xl border border-[#ffffff1b] bg-[#1b211c] transition-colors hover:border-[#d2b58a]"
        : `group relative flex h-full flex-col overflow-hidden border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,7%)] transition-colors duration-300 hover:border-[hsl(var(--gold-accent)/0.6)] ${selected ? "ring-1 ring-[hsl(var(--gold-accent)/0.28)]" : ""}`}
    >
      {!standalone && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
          <span className="absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 border-[hsl(var(--gold-accent)/0.3)] group-hover:border-[hsl(var(--gold-accent))]" />
          <span className="absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-[hsl(var(--gold-accent)/0.3)] group-hover:border-[hsl(var(--gold-accent))]" />
          <span className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-[hsl(var(--gold-accent)/0.3)] group-hover:border-[hsl(var(--gold-accent))]" />
          <span className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-[hsl(var(--gold-accent)/0.3)] group-hover:border-[hsl(var(--gold-accent))]" />
        </div>
      )}
      {children}
    </article>
  );
}

/** Same bottom metadata row; each catalog supplies only facts it owns. */
export function CatalogCardMetadata({ description, status }: { description: string; status?: string }) {
  return (
    <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-[10px] tracking-[0.04em] text-[hsl(0,0%,53%)]">
      <span className="min-w-0 truncate">{description}</span>
      {status ? <span className="text-[hsl(var(--gold-accent)/0.85)]">{status}</span> : null}
    </div>
  );
}


/** One image stage: consistent crop, inset, and multi-photo marker in both catalog channels. */
export function CatalogCardMediaFrame({
  children,
  imageCount,
  standalone = false,
}: PropsWithChildren<{ imageCount?: number; standalone?: boolean }>) {
  return (
    <div
      className={standalone
        ? "relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden bg-[#2b3028]"
        : "relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,hsl(0_0%_13%),hsl(0_0%_7%)_72%)]"}
    >
      {children}
      {imageCount && imageCount > 1 ? (
        <span className="absolute bottom-2 right-2 z-10 inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--gold-accent)/0.45)] bg-[hsl(0,0%,5%)/0.9] px-2.5 py-1 font-mono text-[10px] text-[hsl(0,0%,90%)]">
          <Images size={14} aria-hidden="true" />
          {imageCount} fotos
        </span>
      ) : null}
    </div>
  );
}

/** Shared responsive discovery layout and loading surface. */
export type CatalogView = "grid" | "list";
export const catalogGridClass = (view: CatalogView) => view === "grid"
  ? "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:gap-5"
  : "grid grid-cols-1 gap-3 sm:gap-4";
export const catalogCardLinkClass = (view: CatalogView) =>
  `grid w-full min-w-0 flex-1 items-start text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[hsl(var(--gold-accent))] ${view === "list" ? "grid-cols-[minmax(0,38%)_minmax(0,1fr)] sm:grid-cols-[minmax(0,28%)_minmax(0,1fr)]" : "grid-cols-1"}`;
export const CATALOG_CARD_BODY_CLASS = "min-w-0 space-y-1.5 p-3 md:p-4";
export const CATALOG_CARD_ACTION_CLASS = "flex items-center justify-between gap-2 pt-1 text-xs font-semibold text-[hsl(var(--gold-accent))]";
export const CATALOG_CARD_IMAGE_CLASS = "h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none sm:p-3";
export const CATALOG_RESULTS_TITLE_CLASS = "text-xl font-semibold uppercase tracking-wide text-white sm:text-2xl";

export function CatalogGridSkeleton({ view, label }: { view: CatalogView; label: string }) {
  return (
    <>
      <p role="status" className="sr-only">{label}</p>
      <div aria-hidden="true" className={catalogGridClass(view)}>
        {Array.from({ length: 6 }, (_, index) => (
          <CatalogModelCardShell key={index}>
            <div className={catalogCardLinkClass(view)}>
              <CatalogCardMediaFrame>
                <div className="h-full w-full animate-pulse bg-[hsl(0,0%,11%)] motion-reduce:animate-none" />
              </CatalogCardMediaFrame>
              <div className="space-y-3 p-3 md:p-4">
                <div className="h-4 w-4/5 animate-pulse bg-[hsl(0,0%,14%)] motion-reduce:animate-none" />
                <div className="h-3 w-2/3 animate-pulse bg-[hsl(0,0%,11%)] motion-reduce:animate-none" />
              </div>
            </div>
          </CatalogModelCardShell>
        ))}
      </div>
    </>
  );
}
