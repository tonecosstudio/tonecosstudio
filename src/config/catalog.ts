export const CATALOG_PAGE_SIZE = 24;

export const CATALOG_VISIBILITIES = [
  "general",
  "collection",
  "both",
  "hidden",
] as const;

export type CatalogVisibility = (typeof CATALOG_VISIBILITIES)[number];

export const PUBLIC_CATALOG_VISIBILITIES = [
  "general",
  "both",
] as const satisfies readonly CatalogVisibility[];

export const COLLECTION_CATALOG_VISIBILITIES = [
  "collection",
  "both",
] as const satisfies readonly CatalogVisibility[];
