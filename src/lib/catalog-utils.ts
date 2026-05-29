export type CatalogDisplayModel = {
  name?: string | null;
  franchise?: string | null;
  category?: string | null;
  subcategory?: string | null;
  tags?: string[] | null;
  character_name?: string | null;
  variant_name?: string | null;
  source_title?: string | null;
  source_type?: string | null;
};

const INTERNAL_TAG_PREFIXES = [
  "drive-id-",
  "media-",
  "category-",
  "source-",
  "price-",
  "bg-",
  "needs-",
];

const INTERNAL_TAGS = new Set([
  "drive-import",
  "drive-identified",
  "catalog-staging",
  "queued-from-staging",
  "generic-filename",
  "needs-visual-review",
  "needs-name-review",
  "manually-identified",
  "hidden-duplicate",
  "duplicate-legacy",
  "ia",
  "revisao",
  "revisar",
  "oculto",
]);

export function normalizeCatalogTag(value: string | null | undefined): string {
  return String(value || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^animes$/i, "anime")
    .toLocaleLowerCase();
}

export function isInternalCatalogTag(tag: string): boolean {
  const canonicalTag = normalizeCatalogTag(tag).replace(/\s+/g, "-");
  return (
    INTERNAL_TAGS.has(canonicalTag) ||
    INTERNAL_TAG_PREFIXES.some((prefix) => canonicalTag.startsWith(prefix))
  );
}

export function getCatalogCharacterName(
  model: CatalogDisplayModel | null | undefined,
): string {
  return model?.character_name || model?.name || "Modelo";
}

export function getCatalogSourceName(
  model: CatalogDisplayModel | null | undefined,
): string | null {
  return model?.source_title || model?.franchise || null;
}

export function getCatalogVersionName(
  model: CatalogDisplayModel | null | undefined,
): string | null {
  return model?.variant_name || null;
}

export function buildModelTitle(
  name: string,
  franchise: string | null,
): string {
  if (!franchise) return name;
  return `${name} (${franchise})`;
}

export function compactTags(
  tags: string[] | null,
  limit: number = 2,
): string[] {
  if (!tags || tags.length === 0) return [];
  return tags
    .map((tag) => normalizeCatalogTag(tag))
    .filter(Boolean)
    .filter((tag) => !isInternalCatalogTag(tag))
    .slice(0, limit);
}

export function getCatalogPublicTags(
  model: CatalogDisplayModel | null | undefined,
  limit = 8,
): string[] {
  if (!model) return [];

  const candidates = [
    getCatalogSourceName(model),
    model.character_name,
    model.source_type === "anime" ? "anime" : model.source_type,
    model.category,
    model.subcategory,
    ...(model.tags ?? []),
  ];

  return Array.from(
    new Set(
      candidates
        .map((tag) => normalizeCatalogTag(tag))
        .filter(Boolean)
        .filter((tag) => !isInternalCatalogTag(tag)),
    ),
  ).slice(0, limit);
}

export function getCatalogTitle(
  model: CatalogDisplayModel | null | undefined,
): string {
  const characterName = getCatalogCharacterName(model);
  const sourceName = getCatalogSourceName(model);
  const versionName = getCatalogVersionName(model);

  if (versionName) return `${characterName} - ${versionName}`;
  return buildModelTitle(characterName, sourceName);
}
