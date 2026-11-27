import type { PropsWithChildren } from "react";
import { Images } from "lucide-react";
import type { CatalogTag, CatalogTagKind } from "@/types/catalog-tags";

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

/** Compact display copy for long category names; IDs and API labels stay canonical. */
export function catalogTagLabel(label: string): string {
  const normalized = normalizeCategoryLabel(label);
  if (["anime", "animes e desenhos", "animes & desenhos"].includes(normalized))
    return "Animes/Desenho";
  if (normalized === "a mascara") return "O Máscara";
  return label;
}

/** Small editorial display corrections; canonical catalog values stay unchanged. */
export function catalogModelDisplayName(model: {
  slug: string;
  name: string;
}): string {
  return model.slug === "a-mascara-a-mascara" ? "O Máscara" : model.name;
}

/** Compare visible labels without case or accent differences. */
export function catalogTagKey(label: string): string {
  return label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

/** Visual ordering only; API labels and taxonomic identifiers remain untouched. */
function categoryOrderKey(label: string): string {
  const normalized = normalizeCategoryLabel(label);
  if (normalized === "anime" || normalized === "animes e desenhos")
    return "animes & desenhos";
  if (normalized === "filmes e series") return "filmes & series";
  if (normalized === "tokusatsu") return "tokusatsu & cultura japonesa";
  return normalized;
}

/** Stable ordering, without inventing categories absent from the current data. */
export function orderCatalogCategories<T extends CatalogCategoryOption>(
  options: readonly T[],
): T[] {
  const seen = new Set<string>();
  return options
    .filter((option) => {
      if (!option.id || !option.label.trim() || seen.has(option.id))
        return false;
      seen.add(option.id);
      return true;
    })
    .sort((a, b) => {
      const aLabel = categoryOrderKey(a.label);
      const bLabel = categoryOrderKey(b.label);
      const aRank = CATEGORY_ORDER.indexOf(
        aLabel as (typeof CATEGORY_ORDER)[number],
      );
      const bRank = CATEGORY_ORDER.indexOf(
        bLabel as (typeof CATEGORY_ORDER)[number],
      );
      if (aRank >= 0 && bRank >= 0) return aRank - bRank;
      if (aRank >= 0) return -1;
      if (bRank >= 0) return 1;
      return (
        aLabel.localeCompare(bLabel, "pt-BR") ||
        a.id.localeCompare(b.id, "pt-BR")
      );
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
export function CatalogCardIdentity({ name }: { name: string }) {
  return (
    <h3 className="line-clamp-2 min-h-[1.25em] text-base font-semibold uppercase leading-tight tracking-[0.04em] text-[hsl(0,0%,94%)]">
      {name}
    </h3>
  );
}

export type CatalogFilterTagKind = "name" | CatalogTagKind;

/** Quiet, actionable editorial tags shared by both catalog grids. */
export function CatalogFilterTag({
  label,
  kind,
  provisional = false,
  disabled = false,
  compact = false,
  balanced = false,
  onClick,
}: {
  label: string;
  kind: CatalogFilterTagKind;
  provisional?: boolean;
  disabled?: boolean;
  compact?: boolean;
  balanced?: boolean;
  onClick: () => void;
}) {
  const kindLabel =
    kind === "name"
      ? "nome"
      : kind === "category"
        ? "categoria"
        : kind === "character"
          ? "personagem"
          : kind === "publisher"
            ? "editora"
            : kind === "universe"
              ? "universo"
              : kind === "sign"
                ? "signo"
                : kind === "constellation"
                  ? "constelação"
                  : "franquia";
  const sizingClass = balanced
    ? kind === "franchise"
      ? "min-w-[1.75rem] max-w-[12rem] flex-1 shrink"
      : "max-w-[32%] shrink-0"
    : compact
      ? "max-w-full shrink"
      : "max-w-[12rem] shrink";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={
        (provisional
          ? "Filtrar por " + kindLabel + " em revisão "
          : "Filtrar por " + kindLabel + " ") + label
      }
      title={
        disabled ? "A pesquisa por nome exige pelo menos 3 caracteres." : label
      }
      className={`inline-flex min-h-10 min-w-0 items-center truncate rounded-full border border-[hsl(0,0%,24%)] bg-[hsl(0,0%,8%)] ${balanced ? "px-1.5 text-[10px] sm:px-2.5 sm:text-xs" : "px-2 text-xs"} text-[hsl(0,0%,66%)] transition-colors hover:border-[hsl(var(--gold-accent)/0.5)] hover:text-[hsl(var(--gold-accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-[hsl(0,0%,24%)] disabled:hover:text-[hsl(0,0%,66%)] ${sizingClass}`}
    >
      <span className="min-w-0 truncate">
        {label}
        {provisional ? " · em revisão" : ""}
      </span>
    </button>
  );
}

export type CatalogCardTagItem = {
  key: string;
  kind: CatalogFilterTagKind;
  label: string;
  provisional?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export type CatalogCardTagGroups = {
  identities: CatalogCardTagItem[];
  attributes?: CatalogCardTagItem[];
  franchise?: CatalogCardTagItem | null;
  category?: CatalogCardTagItem | null;
};

/** Hide generic editorial labels when specific publisher and universe tags exist. */
export function visibleCatalogTags(tags: CatalogTag[]): CatalogTag[] {
  const hasPublisher = tags.some((tag) => tag.kind === "publisher");
  const hasUniverse = tags.some((tag) => tag.kind === "universe");
  return tags.filter((tag) => {
    if (
      tag.kind === "franchise" &&
      tag.slug === "herois-individuais" &&
      (hasPublisher || hasUniverse)
    )
      return false;
    if (hasPublisher && tag.kind === "category" && tag.slug === "marvel-dc")
      return false;
    return true;
  });
}

/** Convert the Worker-owned tag objects into the one shared card taxonomy. */
export function catalogTagGroupsFromPublicTags(
  tags: CatalogTag[],
  onClick: (tag: CatalogTag) => void,
): CatalogCardTagGroups {
  const presentedTags = visibleCatalogTags(tags);
  const toItem = (tag: CatalogTag): CatalogCardTagItem => ({
    key: tag.kind + ":" + tag.id,
    kind: tag.kind,
    label: catalogTagLabel(tag.label),
    provisional: tag.provisional,
    disabled: tag.provisional === true,
    onClick: () => onClick(tag),
  });
  const identities = presentedTags
    .filter((tag) => tag.kind === "character")
    .map(toItem);
  const attributes = presentedTags
    .filter(
      (tag) =>
        tag.kind === "publisher" ||
        tag.kind === "universe" ||
        tag.kind === "sign" ||
        tag.kind === "constellation",
    )
    .map(toItem);
  const franchise = presentedTags.find((tag) => tag.kind === "franchise");
  const category = presentedTags.find((tag) => tag.kind === "category");
  return {
    identities,
    attributes,
    franchise: franchise ? toItem(franchise) : null,
    category: category ? toItem(category) : null,
  };
}

function uniqueCardTags(
  items: Array<CatalogCardTagItem | null | undefined>,
): CatalogCardTagItem[] {
  const seen = new Set<string>();
  return items.filter((item): item is CatalogCardTagItem => {
    if (!item) return false;
    const key = catalogTagKey(item.label);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Build the same canonical facet navigation for every public catalog card. */
export function catalogTagSearchParams(
  model: { categorySlug: string; franchiseSlug: string },
  tag: CatalogTag,
): URLSearchParams {
  const params = new URLSearchParams();
  if (tag.kind === "category") params.set("category", tag.slug);
  else if (tag.kind === "franchise") params.set("franchise", tag.slug);
  else {
    params.set("category", model.categorySlug);
    params.set("franchise", model.franchiseSlug);
    params.set(tag.kind === "character" ? "character_id" : "attribute_id", tag.id);
  }
  return params;
}

/** Render confirmed facets from the shared taxonomy without dropping them on narrow cards. */
export function CatalogCardTagRow({
  label,
  groups,
}: {
  label: string;
  groups: CatalogCardTagGroups;
}) {
  const items = uniqueCardTags([
    groups.franchise,
    ...groups.identities,
    ...(groups.attributes ?? []),
    groups.category,
  ]);
  if (items.length === 0) return null;
  return (
    <div
      role="group"
      aria-label={label}
      className="flex min-w-0 flex-wrap items-center gap-1 px-3 pb-3 md:px-4 md:pb-4"
    >
      {items.map((item) => (
        <CatalogFilterTag
          key={item.key}
          kind={item.kind}
          label={item.label}
          provisional={item.provisional}
          disabled={item.disabled}
          compact
          onClick={item.onClick}
        />
      ))}
    </div>
  );
}

/** Shared TONART arcade card surface across both public catalog channels. */
export function CatalogModelCardShell({
  children,
  selected = false,
}: PropsWithChildren<{ selected?: boolean }>) {
  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,7%)] transition-colors duration-300 hover:border-[hsl(var(--gold-accent)/0.6)] focus-within:border-[hsl(var(--gold-accent))] ${selected ? "ring-1 ring-[hsl(var(--gold-accent)/0.28)]" : ""}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10"
      >
        <span className="absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 border-[hsl(var(--gold-accent)/0.3)] group-hover:border-[hsl(var(--gold-accent))]" />
        <span className="absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-[hsl(var(--gold-accent)/0.3)] group-hover:border-[hsl(var(--gold-accent))]" />
        <span className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-[hsl(var(--gold-accent)/0.3)] group-hover:border-[hsl(var(--gold-accent))]" />
        <span className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-[hsl(var(--gold-accent)/0.3)] group-hover:border-[hsl(var(--gold-accent))]" />
      </div>
      {children}
    </article>
  );
}

/** Same bottom metadata row; each catalog supplies only facts it owns. */
export function CatalogCardMetadata({
  description,
  status,
}: {
  description: string;
  status?: string;
}) {
  return (
    <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-[10px] tracking-[0.04em] text-[hsl(0,0%,53%)]">
      <span className="min-w-0 truncate">{description}</span>
      {status ? (
        <span className="text-[hsl(var(--gold-accent)/0.85)]">{status}</span>
      ) : null}
    </div>
  );
}

/** One image stage: consistent crop, inset, and multi-photo marker in both catalog channels. */
export function CatalogCardMediaFrame({
  children,
  imageCount,
}: PropsWithChildren<{ imageCount?: number }>) {
  return (
    <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,hsl(0_0%_13%),hsl(0_0%_7%)_72%)]">
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
