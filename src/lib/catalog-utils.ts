import catalogTagPolicy from "@/config/catalog-tag-policy.json";

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

const INTERNAL_TAG_PREFIXES = catalogTagPolicy.internalTagPrefixes;
const INTERNAL_TAGS = new Set(catalogTagPolicy.internalTags);
const PUBLIC_TAG_ALIASES: Record<string, string> =
  catalogTagPolicy.publicTagAliases;

export function normalizeCatalogTag(value: string | null | undefined): string {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();

  return PUBLIC_TAG_ALIASES[normalized] || normalized;
}

export function isInternalCatalogTag(tag: string | null | undefined): boolean {
  const canonicalTag = normalizeCatalogTag(tag).replace(/\s+/g, "-");
  return (
    INTERNAL_TAGS.has(canonicalTag) ||
    INTERNAL_TAG_PREFIXES.some((prefix) => canonicalTag.startsWith(prefix))
  );
}

export function isPublicCatalogTag(tag: string | null | undefined): boolean {
  const normalized = normalizeCatalogTag(tag);
  return Boolean(normalized) && !isInternalCatalogTag(normalized);
}

export function normalizeCatalogTags(
  tags: Array<string | null | undefined>,
  limit = 20,
): string[] {
  return Array.from(
    new Set(
      tags.map((tag) => normalizeCatalogTag(tag)).filter(isPublicCatalogTag),
    ),
  ).slice(0, limit);
}

export function getCatalogTagFilterValues(
  tag: string | null | undefined,
): string[] {
  const normalized = normalizeCatalogTag(tag);
  if (!isPublicCatalogTag(normalized)) return [];

  return Array.from(
    new Set([
      normalized,
      ...Object.entries(PUBLIC_TAG_ALIASES)
        .filter(([, canonical]) => canonical === normalized)
        .map(([alias]) => alias),
    ]),
  ).filter(isPublicCatalogTag);
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
  return normalizeCatalogTags(tags, limit);
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

  return normalizeCatalogTags(candidates, limit);
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
