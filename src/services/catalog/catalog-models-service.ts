import {
  CATALOG_PAGE_SIZE,
  PUBLIC_CATALOG_VISIBILITIES,
} from "@/config/catalog";
import { supabase } from "@/integrations/supabase/client";
import { getCatalogStoragePublicUrl } from "@/lib/catalog-assets";
import {
  getCatalogSensitivity,
  getCatalogTagFilterValues,
} from "@/lib/catalog-utils";
import type {
  CatalogModelDetailsRow,
  CatalogModelGalleryImage,
  CatalogModelRow,
} from "@/types/catalog";
import {
  getMockCatalogModelDetails,
  isWebpCatalogMockEnabled,
  listMockCatalogModels,
  listMockForYouCatalogModels,
  listRecentMockCatalogModels,
} from "./mock-webp-catalog";

export type CatalogSort = "recent" | "az";
export type CatalogMode = "public" | "staging";
export type CatalogContentMode = "general" | "nsfw";

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
  contentMode?: CatalogContentMode;
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
  "canonical_identity_key",
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
  in(column: string, values: readonly string[]): ModelGalleryQuery;
  order(column: string, options?: { ascending?: boolean }): ModelGalleryQuery;
}

interface ModelGalleryGateway {
  from(table: "model_gallery_images"): {
    select(columns: string): ModelGalleryQuery;
  };
}

const catalogModelsGateway = supabase as unknown as CatalogModelsGateway;
const modelGalleryGateway = supabase as unknown as ModelGalleryGateway;
function isModelGalleryEnabled() {
  return import.meta.env.VITE_ENABLE_MODEL_GALLERY === "true";
}

function normalizeTags(tagsCSV: string) {
  return Array.from(
    new Set(
      tagsCSV.split(",").flatMap((tag) => getCatalogTagFilterValues(tag)),
    ),
  ).slice(0, 20);
}

function getPublicModelImageUrl(bucket: string | null, path: string | null) {
  return getCatalogStoragePublicUrl(bucket, path);
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

function normalizeGroupKey(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function toCatalogSlug(value: string | null | undefined) {
  return normalizeGroupKey(value).replace(/\s+/g, "-");
}

const PRODUCT_FAMILY_SUFFIXES = [
  "candy",
  "frontal",
  "lateral",
  "traseira",
  "costas",
  "detalhe",
  "close",
  "front",
  "side",
  "rear",
  "back",
];

function getCharacterIdentityGroupKey(row: {
  source_title?: string | null;
  character_name?: string | null;
}) {
  const sourceTitle = normalizeGroupKey(row.source_title);
  const characterName = normalizeGroupKey(row.character_name);
  if (!sourceTitle || !characterName) return "";
  return `${sourceTitle}::${characterName}`;
}

function getDerivedImageGroupKey(path: string | null | undefined) {
  if (!path) return "";
  const normalizedPath = String(path).trim().toLowerCase();
  if (!normalizedPath) return "";

  const segments = normalizedPath.split("/");
  const fileName = segments.pop() || "";
  const directory = segments.join("/");
  const stem = fileName.replace(/\.[^.]+$/, "");
  if (!stem) return "";

  const withoutId = stem.replace(/-\d+$/, "");
  const withoutAngle = withoutId.replace(/-\d+$/, "");
  const key = normalizeProductFamilyStem(withoutAngle || withoutId || stem);
  return `${directory}/${key}`;
}

function normalizeProductFamilyStem(stem: string) {
  let next = stem;
  let changed = true;

  while (changed) {
    changed = false;
    for (const suffix of PRODUCT_FAMILY_SUFFIXES) {
      const marker = `-${suffix}`;
      if (next.endsWith(marker)) {
        next = next.slice(0, -marker.length);
        changed = true;
      }
    }
  }

  return next;
}

function getSpecificCanonicalIdentityKey(row: {
  canonical_identity_key?: string | null;
  character_name?: string | null;
}) {
  const canonicalKey = normalizeGroupKey(row.canonical_identity_key);
  if (!canonicalKey) return "";

  const lastSegment = canonicalKey.split("|").pop() || "";
  const characterSlug = toCatalogSlug(row.character_name);
  if (!lastSegment) return "";
  const normalizedSegment = normalizeProductFamilyStem(lastSegment);
  if (characterSlug && normalizedSegment === characterSlug) return "";

  return canonicalKey.slice(0, -lastSegment.length) + normalizedSegment;
}

function getCatalogModelGroupKey(row: {
  source_title?: string | null;
  character_name?: string | null;
  canonical_identity_key?: string | null;
  image_path?: string | null;
  id: string;
}) {
  return (
    getSpecificCanonicalIdentityKey(row) ||
    getDerivedImageGroupKey(row.image_path) ||
    getCharacterIdentityGroupKey(row) ||
    row.id
  );
}

function getPublicCatalogModelGroupKey(row: {
  source_title?: string | null;
  character_name?: string | null;
  canonical_identity_key?: string | null;
  image_path?: string | null;
  id: string;
}) {
  return getCatalogModelGroupKey(row);
}

function compareCatalogRowsByCanonicalSurface(
  left: {
    image_path?: string | null;
    created_at?: string | null;
    id: string;
  },
  right: {
    image_path?: string | null;
    created_at?: string | null;
    id: string;
  },
) {
  const byImagePath = String(left.image_path || "").localeCompare(
    String(right.image_path || ""),
  );
  if (byImagePath !== 0) return byImagePath;

  const byCreatedAt = String(left.created_at || "").localeCompare(
    String(right.created_at || ""),
  );
  if (byCreatedAt !== 0) return byCreatedAt;

  return left.id.localeCompare(right.id);
}

function pickCatalogGroupPrimary<T extends CatalogModelRow | CatalogModelDetailsRow>(
  rows: T[],
  mode: "public" | "asset" = "public",
) {
  if (rows.length <= 1) return rows[0];
  if (mode === "asset") return rows[0];
  return [...rows].sort(compareCatalogRowsByCanonicalSurface)[0];
}

function groupCatalogModels<T extends CatalogModelRow>(
  rows: T[],
  mode: "public" | "asset" = "public",
) {
  const groups = new Map<string, T[]>();

  for (const row of rows) {
    const key =
      mode === "public"
        ? getPublicCatalogModelGroupKey(row)
        : getCatalogModelGroupKey(row);
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }

  return Array.from(groups.values()).map(
    (group) => pickCatalogGroupPrimary(group, mode) ?? group[0],
  );
}

function buildSiblingGalleryImages(
  primary: CatalogModelDetailsRow,
  siblings: CatalogModelDetailsRow[],
): CatalogModelGalleryImage[] {
  return siblings
    .filter((sibling) => sibling.imageUrl)
    .map((sibling, index) => ({
      id: sibling.id,
      model_id: primary.id,
      source_drive_file_id: null,
      storage_bucket: sibling.image_bucket,
      storage_path: sibling.image_path,
      thumbnail_url: sibling.thumbnailUrl,
      image_url: sibling.imageUrl,
      alt_text: sibling.variant_name
        ? `${primary.character_name || primary.name} - ${sibling.variant_name}`
        : sibling.character_name || sibling.name,
      metadata: null,
      sort_order: index,
      image_role: index === 0 ? "primary_reference" : "gallery",
      imageUrl: sibling.imageUrl,
      thumbnailUrl: sibling.thumbnailUrl,
    }));
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
  if (!isModelGalleryEnabled()) return [];

  const { data, error } = await modelGalleryGateway
    .from("model_gallery_images")
    .select(
      "id,model_id,source_drive_file_id,storage_bucket,storage_path,thumbnail_url,image_url,alt_text,metadata,sort_order,image_role",
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

async function listNsfwGalleryPreviews(modelIds: string[]) {
  if (modelIds.length === 0) return new Map<string, CatalogModelGalleryImage>();
  if (!isModelGalleryEnabled()) {
    return new Map<string, CatalogModelGalleryImage>();
  }

  const { data, error } = await modelGalleryGateway
    .from("model_gallery_images")
    .select(
      "id,model_id,source_drive_file_id,storage_bucket,storage_path,thumbnail_url,image_url,alt_text,metadata,sort_order,image_role",
    )
    .in("model_id", modelIds)
    .order("sort_order", { ascending: true });

  if (error) {
    if (isMissingGalleryTableError(error)) {
      return new Map<string, CatalogModelGalleryImage>();
    }
    throw error;
  }

  const previews = new Map<string, CatalogModelGalleryImage>();
  for (const image of ((data ?? []) as CatalogModelGalleryDbRow[]).map(
    mapModelGalleryImage,
  )) {
    if (previews.has(image.model_id)) continue;
    const sensitivity = getCatalogSensitivity(image);
    if (
      sensitivity.shouldBlur &&
      sensitivity.level !== "age-ambiguous-review"
    ) {
      previews.set(image.model_id, image);
    }
  }

  return previews;
}

async function applyNsfwGalleryPreviews(
  models: CatalogModelRow[],
): Promise<CatalogModelRow[]> {
  const previews = await listNsfwGalleryPreviews(models.map((model) => model.id));
  if (previews.size === 0) return models;

  return models.map((model) => {
    const preview = previews.get(model.id);
    if (!preview?.imageUrl) return model;
    return {
      ...model,
      imageUrl: preview.imageUrl,
      thumbnailUrl: preview.thumbnailUrl ?? preview.imageUrl,
      content_rating: "nsfw",
    };
  });
}

async function listSiblingModelsByIdentity(model: CatalogModelDetailsRow) {
  const targetKey = getPublicCatalogModelGroupKey(model);
  if (!targetKey) return [];

  const canonicalKey = getSpecificCanonicalIdentityKey(model);

  let query = catalogModelsGateway
    .from("models")
    .select(CATALOG_MODEL_DETAILS_SELECT)
    .eq("is_active", true)
    .in("catalog_visibility", PUBLIC_CATALOG_VISIBILITIES)
    .order("created_at", { ascending: true });

  if (canonicalKey) {
    query = query.eq("canonical_identity_key", canonicalKey);
  } else if (model.source_title && model.character_name) {
    query = query
      .eq("source_title", model.source_title)
      .eq("character_name", model.character_name);
  } else if (model.canonical_identity_key) {
    query = query.eq("canonical_identity_key", model.canonical_identity_key);
  } else {
    return [];
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as CatalogModelDetailsDbRow[])
    .map(mapCatalogModelDetails)
    .filter((row) => row.id !== model.id)
    .filter(
      (row) => getPublicCatalogModelGroupKey(row) === targetKey,
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
  if (isWebpCatalogMockEnabled()) {
    return listMockCatalogModels(params);
  }

  const { needle, page, filters } = params;
  const from = page * CATALOG_PAGE_SIZE;
  const rawWindowSize = Math.max(CATALOG_PAGE_SIZE * (page + 1) * 4, 49);
  const stagingMode = filters.catalogMode === "staging";

  let query = catalogModelsGateway
    .from("models")
    .select(CATALOG_MODEL_SELECT)
    .range(0, rawWindowSize);

  if (stagingMode) {
    query = query.contains("tags", ["catalog-staging"]);
  } else {
    query = query.eq("is_active", true);
  }

  if (!stagingMode) {
    query = query.in("catalog_visibility", PUBLIC_CATALOG_VISIBILITIES);
    if (filters.contentMode === "nsfw") {
      query = query
        .overlaps("tags", [
          "nsfw",
          "sensitive-blur",
          "sensitive-review",
          "sensitive-has-variant",
        ])
        .not("tags", "ov", "{age-ambiguous-review}");
    } else {
      query = query.not(
        "tags",
        "ov",
        "{nsfw,sensitive-blur,sensitive-review,age-ambiguous-review}",
      );
    }
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
  const grouped = stagingMode ? all : groupCatalogModels(all, "public");
  const hasNext = grouped.length > from + CATALOG_PAGE_SIZE;
  const pageRows = grouped.slice(from, from + CATALOG_PAGE_SIZE);
  const rows =
    filters.contentMode === "nsfw"
      ? await applyNsfwGalleryPreviews(pageRows)
      : pageRows;

  return { rows, hasNext };
}

export async function listForYouCatalogModels(params: {
  excludedIds: string[];
  preferenceTags: Set<string>;
}) {
  if (isWebpCatalogMockEnabled()) {
    return listMockForYouCatalogModels(params);
  }

  const exclude = params.excludedIds.filter(Boolean).slice(0, 50);

  let query = catalogModelsGateway
    .from("models")
    .select(CATALOG_MODEL_SELECT)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(8)
    .in("catalog_visibility", PUBLIC_CATALOG_VISIBILITIES)
    .not(
      "tags",
      "ov",
      "{nsfw,sensitive-blur,sensitive-review,age-ambiguous-review}",
    );

  if (exclude.length) {
    query = query.not("id", "in", formatPostgrestIdList(exclude));
  }

  const { data, error } = await query;
  if (error) throw error;

  const models = ((data ?? []) as CatalogModelDbRow[]).map(mapCatalogModel);
  const groupedModels = groupCatalogModels(models, "public");
  if (params.preferenceTags.size) {
    groupedModels.sort(
      (left, right) =>
        scoreByPreferenceTags(right, params.preferenceTags) -
        scoreByPreferenceTags(left, params.preferenceTags),
    );
  }

  return groupedModels;
}

export async function getCatalogModelDetails(modelId: string) {
  if (isWebpCatalogMockEnabled()) {
    return getMockCatalogModelDetails(modelId);
  }

  const { data, error } = await catalogModelsGateway
    .from("models")
    .select(CATALOG_MODEL_DETAILS_SELECT)
    .eq("id", modelId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const model = mapCatalogModelDetails(data as CatalogModelDetailsDbRow);
  const siblings = await listSiblingModelsByIdentity(model);
  const siblingPool = [model, ...siblings];
  const canonicalModel = pickCatalogGroupPrimary(siblingPool, "public") ?? model;

  canonicalModel.galleryImages = await listModelGalleryImages(canonicalModel.id);
  if (canonicalModel.galleryImages.length === 0) {
    if (siblingPool.length > 1) {
      canonicalModel.galleryImages = buildSiblingGalleryImages(canonicalModel, [
        canonicalModel,
        ...siblingPool.filter((sibling) => sibling.id !== canonicalModel.id),
      ]);
    }
  }
  return canonicalModel;
}

export async function listRecentLandingModels(
  limit = 6,
): Promise<CatalogModelRow[]> {
  if (isWebpCatalogMockEnabled()) {
    return listRecentMockCatalogModels(limit);
  }

  const { data, error } = await catalogModelsGateway
    .from("models")
    .select(CATALOG_MODEL_SELECT)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit)
    .in("catalog_visibility", PUBLIC_CATALOG_VISIBILITIES)
    .not(
      "tags",
      "ov",
      "{nsfw,sensitive-blur,sensitive-review,age-ambiguous-review}",
    );

  if (error) throw error;
  return groupCatalogModels(
    ((data ?? []) as CatalogModelDbRow[]).map(mapCatalogModel),
    "public",
  ).slice(0, limit);
}
