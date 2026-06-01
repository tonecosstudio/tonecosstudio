import {
  CATALOG_PAGE_SIZE,
  PUBLIC_CATALOG_VISIBILITIES,
} from "@/config/catalog";
import { supabase } from "@/integrations/supabase/client";
import { getCatalogTagFilterValues } from "@/lib/catalog-utils";
import type {
  CatalogModelDetailsRow,
  CatalogModelGalleryImage,
  CatalogModelRow,
} from "@/types/catalog";

export type CatalogSort = "recent" | "az";
export type CatalogMode = "public" | "staging";

export type CatalogSourceType =
  | "anime"
  | "manga"
  | "movie"
  | "series"
  | "game"
  | "comic"
  | "tokusatsu"
  | "original"
  | "other";
export type CatalogVariantType =
  | "default"
  | "form"
  | "costume"
  | "pose"
  | "scale"
  | "edition"
  | "variant"
  | "other";

export type CatalogModelFilters = {
  character: string;
  franchise: string;
  category: string;
  sourceType: string;
  variantType: string;
  tagsCSV: string;
  catalogMode: CatalogMode;
  sort: CatalogSort;
};

type CatalogModelDbRow = Omit<CatalogModelRow, "imageUrl" | "thumbnailUrl">;
type CatalogModelDetailsDbRow = Omit<
  CatalogModelDetailsRow,
  "galleryImages" | "imageUrl" | "thumbnailUrl"
>;
type CatalogModelGalleryDbRow = Omit<
  CatalogModelGalleryImage,
  "imageUrl" | "thumbnailUrl"
>;

const CATALOG_MODEL_COLUMNS = [
  "id",
  "name",
  "franchise",
  "category",
  "subcategory",
  "tags",
  "is_active",
  "image_bucket",
  "image_path",
  "thumbnail_url",
  "created_at",
  "price_mode",
  "price_standalone_override",
  "price_coins_override",
  "character_name",
  "variant_name",
  "variant_type",
  "source_title",
  "source_type",
  "catalog_visibility",
];

const CATALOG_MODEL_SELECT = CATALOG_MODEL_COLUMNS.join(",");
const CATALOG_MODEL_DETAILS_SELECT = [
  ...CATALOG_MODEL_COLUMNS,
  "description",
].join(",");
type CatalogModelsQueryResult<T> = { data: T[] | null; error: unknown };

interface CatalogModelsQuery<T> extends PromiseLike<
  CatalogModelsQueryResult<T>
> {
  contains(column: string, value: string[]): CatalogModelsQuery<T>;
  eq(column: string, value: string | boolean): CatalogModelsQuery<T>;
  ilike(column: string, pattern: string): CatalogModelsQuery<T>;
  in(column: string, values: readonly string[]): CatalogModelsQuery<T>;
  limit(count: number): CatalogModelsQuery<T>;
  maybeSingle(): Promise<{ data: T | null; error: unknown }>;
  not(column: string, operator: string, value: string): CatalogModelsQuery<T>;
  or(filters: string): CatalogModelsQuery<T>;
  order(
    column: string,
    options?: { ascending?: boolean },
  ): CatalogModelsQuery<T>;
  overlaps(column: string, values: string[]): CatalogModelsQuery<T>;
  range(from: number, to: number): CatalogModelsQuery<T>;
}

interface CatalogModelsGateway {
  from(table: "models"): {
    select(columns: string): CatalogModelsQuery<CatalogModelDetailsDbRow>;
  };
}

interface ModelGalleryQuery extends PromiseLike<{
  data: CatalogModelGalleryDbRow[] | null;
  error: unknown;
}> {
  eq(column: string, value: string): ModelGalleryQuery;
  order(column: string, options?: { ascending?: boolean }): ModelGalleryQuery;
}

interface ModelGalleryGateway {
  from(table: "model_gallery_images"): {
    select(columns: string): ModelGalleryQuery;
  };
}

const catalogModelsGateway = supabase as unknown as CatalogModelsGateway;
const modelGalleryGateway = supabase as unknown as ModelGalleryGateway;

function normalizeTags(tagsCSV: string) {
  return Array.from(
    new Set(
      tagsCSV.split(",").flatMap((tag) => getCatalogTagFilterValues(tag)),
    ),
  ).slice(0, 20);
}

function getPublicModelImageUrl(bucket: string | null, path: string | null) {
  if (!bucket || !path) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function normalizeSearchValue(value: string) {
  return value
    .replace(/[%_,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildWordStartPatterns(value: string) {
  if (value.length <= 2) return [`${value}%`];
  return [`${value}%`, `% ${value}%`];
}

function mapCatalogModel(row: CatalogModelDbRow): CatalogModelRow {
  const imageUrl = getPublicModelImageUrl(row.image_bucket, row.image_path);
  return {
    ...row,
    imageUrl,
    thumbnailUrl: row.thumbnail_url ?? imageUrl,
  };
}

function mapCatalogModelDetails(
  row: CatalogModelDetailsDbRow,
): CatalogModelDetailsRow {
  const imageUrl = getPublicModelImageUrl(row.image_bucket, row.image_path);
  return {
    ...row,
    imageUrl,
    thumbnailUrl: row.thumbnail_url ?? imageUrl,
    galleryImages: [],
  };
}

function mapModelGalleryImage(
  row: CatalogModelGalleryDbRow,
): CatalogModelGalleryImage {
  const imageUrl =
    row.image_url ?? getPublicModelImageUrl(row.storage_bucket, row.storage_path);
  return {
    ...row,
    imageUrl,
    thumbnailUrl: row.thumbnail_url ?? imageUrl,
  };
}

function isMissingGalleryTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("model_gallery_images")
  );
}

async function listModelGalleryImages(modelId: string) {
  const { data, error } = await modelGalleryGateway
    .from("model_gallery_images")
    .select(
      "id,model_id,source_drive_file_id,storage_bucket,storage_path,thumbnail_url,image_url,alt_text,sort_order,image_role",
    )
    .eq("model_id", modelId)
    .order("sort_order", { ascending: true });

  if (error) {
    if (isMissingGalleryTableError(error)) return [];
    throw error;
  }

  return ((data ?? []) as CatalogModelGalleryDbRow[]).map(
    mapModelGalleryImage,
  );
}

function scoreByPreferenceTags(
  model: CatalogModelRow,
  preferenceTags: Set<string>,
) {
  if (!preferenceTags.size) return 0;

  return (model.tags ?? [])
    .map((tag) => String(tag).trim().toLocaleLowerCase())
    .filter(Boolean)
    .reduce((score, tag) => score + (preferenceTags.has(tag) ? 1 : 0), 0);
}

function formatPostgrestIdList(ids: string[]) {
  return `(${ids.map((id) => `"${String(id).replace(/"/g, '""')}"`).join(",")})`;
}

export async function listCatalogModels(params: {
  needle: string;
  page: number;
  filters: CatalogModelFilters;
}) {
  const { needle, page, filters } = params;
  const from = page * CATALOG_PAGE_SIZE;
  const to = from + CATALOG_PAGE_SIZE;
  const stagingMode = filters.catalogMode === "staging";

  let query = catalogModelsGateway
    .from("models")
    .select(CATALOG_MODEL_SELECT)
    .range(from, to);

  if (stagingMode) {
    query = query.contains("tags", ["catalog-staging"]);
  } else {
    query = query.eq("is_active", true);
  }

  if (!stagingMode) {
    query = query.in("catalog_visibility", PUBLIC_CATALOG_VISIBILITIES);
  }

  if (filters.sort === "az") {
    query = query.order("name", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const normalizedNeedle = normalizeSearchValue(needle);
  if (normalizedNeedle) {
    const patterns = buildWordStartPatterns(normalizedNeedle);
    const searchFields = [
      "name",
      "character_name",
      "variant_name",
      "source_title",
      "franchise",
      "category",
      "subcategory",
    ]
      .flatMap((field) =>
        patterns.map((pattern) => `${field}.ilike.${pattern}`),
      )
      .join(",");
    query = query.or(searchFields);
  }

  const franchise = normalizeSearchValue(filters.franchise ?? "");
  if (franchise) {
    const pattern = `%${franchise}%`;
    query = query.or(
      `source_title.ilike.${pattern},franchise.ilike.${pattern}`,
    );
  }

  const character = normalizeSearchValue(filters.character ?? "");
  if (character) {
    const pattern = `%${character}%`;
    query = query.or(`character_name.ilike.${pattern},name.ilike.${pattern}`);
  }

  const category = (filters.category ?? "").trim();
  if (category) query = query.eq("category", category);

  const sourceType = (filters.sourceType ?? "").trim();
  if (sourceType) query = query.eq("source_type", sourceType);

  const variantType = (filters.variantType ?? "").trim();
  if (variantType) query = query.eq("variant_type", variantType);

  const tags = normalizeTags(filters.tagsCSV ?? "");
  if (tags.length) query = query.overlaps("tags", tags);

  const { data, error } = await query;
  if (error) throw error;

  const all = ((data ?? []) as CatalogModelDbRow[]).map(mapCatalogModel);
  const hasNext = all.length > CATALOG_PAGE_SIZE;
  const rows = hasNext ? all.slice(0, CATALOG_PAGE_SIZE) : all;

  return { rows, hasNext };
}

export async function listForYouCatalogModels(params: {
  excludedIds: string[];
  preferenceTags: Set<string>;
}) {
  const exclude = params.excludedIds.filter(Boolean).slice(0, 50);

  let query = catalogModelsGateway
    .from("models")
    .select(CATALOG_MODEL_SELECT)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(8)
    .in("catalog_visibility", PUBLIC_CATALOG_VISIBILITIES);

  if (exclude.length) {
    query = query.not("id", "in", formatPostgrestIdList(exclude));
  }

  const { data, error } = await query;
  if (error) throw error;

  const models = ((data ?? []) as CatalogModelDbRow[]).map(mapCatalogModel);
  if (params.preferenceTags.size) {
    models.sort(
      (left, right) =>
        scoreByPreferenceTags(right, params.preferenceTags) -
        scoreByPreferenceTags(left, params.preferenceTags),
    );
  }

  return models;
}

export async function getCatalogModelDetails(modelId: string) {
  const { data, error } = await catalogModelsGateway
    .from("models")
    .select(CATALOG_MODEL_DETAILS_SELECT)
    .eq("id", modelId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const model = mapCatalogModelDetails(data as CatalogModelDetailsDbRow);
  model.galleryImages = await listModelGalleryImages(model.id);
  return model;
}

export async function listRecentLandingModels(
  limit = 6,
): Promise<CatalogModelRow[]> {
  const { data, error } = await catalogModelsGateway
    .from("models")
    .select(CATALOG_MODEL_SELECT)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit)
    .in("catalog_visibility", PUBLIC_CATALOG_VISIBILITIES);

  if (error) throw error;
  return ((data ?? []) as CatalogModelDbRow[]).map(mapCatalogModel);
}
