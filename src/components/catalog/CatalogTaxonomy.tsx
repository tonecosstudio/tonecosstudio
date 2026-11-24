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
    <div className="space-y-1.5">
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
      ) : null}
    </div>
  );
}
