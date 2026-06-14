import {
  CATALOG_PAGE_SIZE,
  PUBLIC_CATALOG_VISIBILITIES,
} from "@/config/catalog";
import { getCatalogCharacterPresentationOverride } from "@/config/catalog-character-presentation";
import { supabase } from "@/integrations/supabase/client";
import { getCatalogStoragePublicUrl } from "@/lib/catalog-assets";
import {
  getCatalogSensitivity,
  getCatalogPublicTags,
  getCatalogTagFilterValues,
} from "@/lib/catalog-utils";
import type {
  CatalogCharacterRow,
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
  "duplicate_status",
  "duplicate_of_model_id",
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

function slugifyCatalogSegment(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getCatalogCharacterIdentityKey(row: {
  source_title?: string | null;
  character_name?: string | null;
}) {
  const characterName = normalizeGroupKey(row.character_name);
  if (!characterName) return "";
  const sourceTitle = normalizeGroupKey(row.source_title);
  return sourceTitle ? `${sourceTitle}::${characterName}` : characterName;
}

function isPublicFinalizedModelPath(path: string | null | undefined) {
  return String(path || "").startsWith("catalog-webp-final/display/");
}

function isMarkedDuplicate(row: {
  duplicate_status?: string | null;
  duplicate_of_model_id?: string | null;
}) {
  return (
    normalizeGroupKey(row.duplicate_status) !== "unique" &&
    Boolean(row.duplicate_of_model_id)
  );
}

function isPublicCatalogEligibleRow(
  row: {
    image_path?: string | null;
    duplicate_status?: string | null;
    duplicate_of_model_id?: string | null;
  },
  mode: CatalogMode = "public",
) {
  if (mode === "staging") return true;
  return isPublicFinalizedModelPath(row.image_path) && !isMarkedDuplicate(row);
}

function normalizeGroupKey(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function toCatalogSlug(value: string | null | undefined) {
  return normalizeGroupKey(value).replace(/\s+/g, "-");
}

function titleCaseCatalogWords(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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

const CHARACTER_WRAPPER_PREFIXES = [/^busto\s+/i, /^painel\s+/i, /^conjunto\s+/i];
const CHARACTER_PRESENTATION_BLOCKLIST = new Set([
  "anime",
  "desenhos",
  "filme",
  "serie",
  "game",
  "quadrinhos",
  "android",
  "androids",
  "sayajins",
  "saiyajins",
  "raca-do-freeza",
  "raca do freeza",
  "forca-ginyu",
  "forca ginyu",
  "ginyu",
  "tropa do orgulho",
  "deuses",
  "majins",
  "terraqueo",
  "namekusei",
  "viloes",
  "criaturas",
  "conjuntos",
  "robos",
  "painel",
  "busto",
  "conjunto",
  "nsfw",
  "mascara",
  "figura",
  "miniatura",
  "dupla",
  "diorama",
  "modelo",
  "modelos",
]);

type CharacterPresentationAlias = {
  key: string;
  label: string;
};

function stripCharacterPresentationWrappers(value: string) {
  let next = value.trim();
  for (const pattern of CHARACTER_WRAPPER_PREFIXES) {
    next = next.replace(pattern, "");
  }
  return next.trim();
}

function splitCharacterPresentationCandidates(value: string) {
  return value
    .split(/\s+(?:vs|versus|x|e)\s+|,/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isCharacterPresentationAliasCandidate(
  value: string,
  sourceTitle: string | null | undefined,
) {
  const normalized = normalizeGroupKey(value);
  if (!normalized) return false;
  if (CHARACTER_PRESENTATION_BLOCKLIST.has(normalized)) return false;
  if (/^(?:busto|painel|conjunto)(?:\s|-)/.test(normalized)) return false;

  const normalizedSource = normalizeGroupKey(sourceTitle);
  const normalizedSourceSlug = toCatalogSlug(sourceTitle);
  const normalizedValueSlug = toCatalogSlug(value);
  if (normalizedSource && normalized === normalizedSource) return false;
  if (normalizedSource && normalized.includes(normalizedSource)) return false;
  if (normalizedSourceSlug && normalizedValueSlug === normalizedSourceSlug) {
    return false;
  }

  return true;
}

function deriveCharacterPresentationAliases(row: CatalogModelRow): CharacterPresentationAlias[] {
  const aliases = new Map<string, string>();
  const pushAlias = (rawValue: string | null | undefined, preferredLabel?: string) => {
    const normalized = normalizeGroupKey(rawValue);
    if (!isCharacterPresentationAliasCandidate(normalized, row.source_title)) return;
    if (aliases.has(normalized)) return;
    aliases.set(normalized, preferredLabel?.trim() || titleCaseCatalogWords(normalized));
  };

  const rawCharacterName = String(row.character_name || "").trim();
  const strippedCharacter = stripCharacterPresentationWrappers(rawCharacterName);
  const splitCharacterParts = splitCharacterPresentationCandidates(strippedCharacter);
  const isOperationalCharacterName =
    strippedCharacter !== rawCharacterName || splitCharacterParts.length > 1;

  if (isOperationalCharacterName) {
    for (const tag of getCatalogPublicTags(row, 12)) {
      pushAlias(tag, titleCaseCatalogWords(tag));
    }
  }

  if (splitCharacterParts.length > 1) {
    for (const part of splitCharacterParts) {
      pushAlias(part, part);
    }
  } else if (strippedCharacter) {
    const shouldUseWholeName =
      aliases.size === 0 ||
      normalizeGroupKey(row.character_name) === normalizeGroupKey(strippedCharacter);
    if (shouldUseWholeName) {
      pushAlias(strippedCharacter, strippedCharacter);
    } else {
      for (const part of splitCharacterPresentationCandidates(strippedCharacter)) {
        pushAlias(part, part);
      }
    }
  }

  if (aliases.size === 0 && row.character_name) {
    pushAlias(row.character_name, String(row.character_name).trim());
  }

  return Array.from(aliases.entries()).map(([key, label]) => ({ key, label }));
}

function matchesCharacterPresentationAlias(
  row: CatalogModelRow,
  normalizedCharacterName: string,
) {
  return deriveCharacterPresentationAliases(row).some(
    (alias) => alias.key === normalizedCharacterName,
  );
}

function getCatalogCharacterPresentationIdentityKey(
  sourceTitle: string | null | undefined,
  characterName: string | null | undefined,
) {
  const normalizedCharacter = normalizeGroupKey(characterName);
  if (!normalizedCharacter) return "";
  const normalizedSource = normalizeGroupKey(sourceTitle);
  return normalizedSource
    ? `${normalizedSource}::${normalizedCharacter}`
    : normalizedCharacter;
}

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

function scoreCharacterCoverCandidate(row: CatalogModelRow) {
  const name = normalizeGroupKey(row.name);
  const variantName = normalizeGroupKey(row.variant_name);
  const tags = (row.tags ?? []).map((tag) => normalizeGroupKey(tag));
  const sensitivity = getCatalogSensitivity(row);

  let score = 0;

  if (!sensitivity.shouldBlur) score += 100;
  if (row.variant_type === "default") score += 35;
  if (!variantName) score += 18;
  if (row.image_path?.includes("/display/")) score += 10;

  if (name.includes("busto") || variantName.includes("busto") || tags.includes("busto")) {
    score -= 40;
  }

  if (
    name.includes("close") ||
    name.includes("detalhe") ||
    variantName.includes("close") ||
    variantName.includes("detalhe")
  ) {
    score -= 25;
  }

  if (
    name.includes("traseira") ||
    name.includes("costas") ||
    variantName.includes("traseira") ||
    variantName.includes("costas")
  ) {
    score -= 30;
  }

  return score;
}

function pickCharacterGroupCover(rows: CatalogModelRow[]) {
  const first = rows[0];
  const override = getCatalogCharacterPresentationOverride({
    sourceTitle: first?.source_title,
    characterName: first?.character_name,
  });
  if (override?.coverModelId) {
    const forced = rows.find((row) => row.id === override.coverModelId);
    if (forced) return forced;
  }

  return [...rows].sort((left, right) => {
    const byScore =
      scoreCharacterCoverCandidate(right) - scoreCharacterCoverCandidate(left);
    if (byScore !== 0) return byScore;

    const byCreatedAt = String(right.created_at || "").localeCompare(
      String(left.created_at || ""),
    );
    if (byCreatedAt !== 0) return byCreatedAt;
    return left.id.localeCompare(right.id);
  })[0];
}

function mapCatalogCharacterGroup(
  rows: CatalogModelRow[],
  alias: CharacterPresentationAlias,
): CatalogCharacterRow | null {
  if (rows.length === 0) return null;
  const cover = pickCharacterGroupCover(rows);
  const characterName = alias.label.trim();
  if (!characterName) return null;

  return {
    id:
      getCatalogCharacterPresentationIdentityKey(
        cover.source_title,
        alias.key,
      ) || cover.id,
    slug: slugifyCatalogSegment([characterName, cover.source_title].filter(Boolean).join(" ")) || slugifyCatalogSegment(characterName) || cover.id,
    character_name: characterName,
    source_title: cover.source_title ?? cover.franchise ?? null,
    source_type: cover.source_type ?? null,
    category: cover.category ?? null,
    imageUrl: cover.imageUrl,
    thumbnailUrl: cover.thumbnailUrl,
    latest_model_id: cover.id,
    latest_model_name: cover.name,
    model_count: rows.length,
    created_at: cover.created_at,
    tags: Array.from(
      new Set(
        rows.flatMap((row) => row.tags ?? []).map((tag) => String(tag).trim()).filter(Boolean),
      ),
    ),
  };
}

function groupCatalogCharacters(
  rows: CatalogModelRow[],
  sort: CatalogSort,
) {
  const groups = new Map<
    string,
    { alias: CharacterPresentationAlias; rows: CatalogModelRow[] }
  >();

  for (const row of rows) {
    const aliases = deriveCharacterPresentationAliases(row);
    if (aliases.length === 0) continue;

    for (const alias of aliases) {
      const key =
        getCatalogCharacterPresentationIdentityKey(
          row.source_title,
          alias.key,
        ) || row.id;
      const existing = groups.get(key);
      if (existing) {
        existing.rows.push(row);
      } else {
        groups.set(key, { alias, rows: [row] });
      }
    }
  }

  const characters = Array.from(groups.values())
    .map((group) => mapCatalogCharacterGroup(group.rows, group.alias))
    .filter((row): row is CatalogCharacterRow => Boolean(row));

  if (sort === "az") {
    characters.sort((left, right) => {
      const byCharacter = left.character_name.localeCompare(right.character_name, "pt-BR");
      if (byCharacter !== 0) return byCharacter;
      return String(left.source_title || "").localeCompare(String(right.source_title || ""), "pt-BR");
    });
  } else {
    characters.sort((left, right) => {
      const byCreatedAt = String(right.created_at || "").localeCompare(String(left.created_at || ""));
      if (byCreatedAt !== 0) return byCreatedAt;
      return left.character_name.localeCompare(right.character_name, "pt-BR");
    });
  }

  return characters;
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
  if (!isPublicCatalogEligibleRow(model)) return [];
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
    .filter((row) => isPublicCatalogEligibleRow(row))
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

function applyCatalogListingFilters(
  query: CatalogModelsQuery<CatalogModelDetailsDbRow>,
  needle: string,
  filters: CatalogModelFilters,
) {
  let next = query;
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
      .flatMap((field) => patterns.map((pattern) => `${field}.ilike.${pattern}`))
      .join(",");
    next = next.or(searchFields);
  }

  const franchise = normalizeSearchValue(filters.franchise ?? "");
  if (franchise) {
    const pattern = `%${franchise}%`;
    next = next.or(`source_title.ilike.${pattern},franchise.ilike.${pattern}`);
  }

  const character = normalizeSearchValue(filters.character ?? "");
  if (character) {
    const pattern = `%${character}%`;
    next = next.or(`character_name.ilike.${pattern},name.ilike.${pattern}`);
  }

  const category = (filters.category ?? "").trim();
  if (category) next = next.eq("category", category);

  const sourceType = (filters.sourceType ?? "").trim();
  if (sourceType) next = next.eq("source_type", sourceType);

  const variantType = (filters.variantType ?? "").trim();
  if (variantType) next = next.eq("variant_type", variantType);

  const tags = normalizeTags(filters.tagsCSV ?? "");
  if (tags.length) next = next.overlaps("tags", tags);

  return next;
}

export async function listCatalogCharacters(params: {
  needle: string;
  page: number;
  filters: CatalogModelFilters;
}) {
  const { needle, page, filters } = params;
  const from = page * CATALOG_PAGE_SIZE;
  const rawWindowSize = Math.max(CATALOG_PAGE_SIZE * (page + 1) * 12, 199);

  let query = catalogModelsGateway
    .from("models")
    .select(CATALOG_MODEL_SELECT)
    .eq("is_active", true)
    .in("catalog_visibility", PUBLIC_CATALOG_VISIBILITIES)
    .not(
      "tags",
      "ov",
      "{nsfw,sensitive-blur,sensitive-review,age-ambiguous-review}",
    )
    .order("created_at", { ascending: false })
    .range(0, rawWindowSize);

  query = applyCatalogListingFilters(query, needle, filters);

  const { data, error } = await query;
  if (error) throw error;

  const eligible = ((data ?? []) as CatalogModelDbRow[])
    .map(mapCatalogModel)
    .filter((row) => isPublicCatalogEligibleRow(row, "public"));
  const groupedCharacters = groupCatalogCharacters(eligible, filters.sort);
  const hasNext = groupedCharacters.length > from + CATALOG_PAGE_SIZE;
  const rows = groupedCharacters.slice(from, from + CATALOG_PAGE_SIZE);

  return { rows, hasNext };
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

  query = applyCatalogListingFilters(query, needle, filters);

  const { data, error } = await query;
  if (error) throw error;

  const all = ((data ?? []) as CatalogModelDbRow[]).map(mapCatalogModel);
  const eligible = all.filter((row) =>
    isPublicCatalogEligibleRow(row, stagingMode ? "staging" : "public"),
  );
  const grouped = stagingMode ? eligible : groupCatalogModels(eligible, "public");
  const hasNext = grouped.length > from + CATALOG_PAGE_SIZE;
  const pageRows = grouped.slice(from, from + CATALOG_PAGE_SIZE);
  const rows =
    filters.contentMode === "nsfw"
      ? await applyNsfwGalleryPreviews(pageRows)
      : pageRows;

  return { rows, hasNext };
}

export async function listCatalogCharacterModels(params: {
  characterName: string;
  sourceTitle?: string | null;
}) {
  const characterName = params.characterName.trim();
  if (!characterName) return [];
  const normalizedCharacterName = normalizeGroupKey(characterName);
  const normalizedSourceTitle = normalizeGroupKey(params.sourceTitle);
  const rawWindowSize = 400;
  const characterPattern = `%${normalizeSearchValue(characterName)}%`;

  let query = catalogModelsGateway
    .from("models")
    .select(CATALOG_MODEL_SELECT)
    .eq("is_active", true)
    .in("catalog_visibility", PUBLIC_CATALOG_VISIBILITIES)
    .not(
      "tags",
      "ov",
      "{nsfw,sensitive-blur,sensitive-review,age-ambiguous-review}",
    )
    .order("created_at", { ascending: false })
    .or(`character_name.ilike.${characterPattern},name.ilike.${characterPattern}`)
    .range(0, rawWindowSize - 1);

  if (params.sourceTitle?.trim()) {
    query = query.eq("source_title", params.sourceTitle.trim());
  }

  const { data, error } = await query;
  if (error) throw error;

  return groupCatalogModels(
    ((data ?? []) as CatalogModelDbRow[])
      .map(mapCatalogModel)
      .filter((row) => isPublicCatalogEligibleRow(row, "public"))
      .filter(
        (row) =>
          matchesCharacterPresentationAlias(row, normalizedCharacterName) &&
          (!normalizedSourceTitle ||
            normalizeGroupKey(row.source_title) === normalizedSourceTitle),
      ),
    "public",
  );
}

export async function getCatalogCharacterContextBySlug(slug: string) {
  const normalizedSlug = normalizeGroupKey(decodeURIComponent(slug));
  if (!normalizedSlug) return null;

  let query = catalogModelsGateway
    .from("models")
    .select(CATALOG_MODEL_SELECT)
    .eq("is_active", true)
    .in("catalog_visibility", PUBLIC_CATALOG_VISIBILITIES)
    .not(
      "tags",
      "ov",
      "{nsfw,sensitive-blur,sensitive-review,age-ambiguous-review}",
    )
    .order("created_at", { ascending: false })
    .range(0, 999);

  const { data, error } = await query;
  if (error) throw error;

  const eligible = ((data ?? []) as CatalogModelDbRow[])
    .map(mapCatalogModel)
    .filter((row) => isPublicCatalogEligibleRow(row, "public"));
  const groupedCharacters = groupCatalogCharacters(eligible, "recent");

  const match = groupedCharacters.find(
    (row) => normalizeGroupKey(row.slug) === normalizedSlug,
  );

  if (!match) return null;
  return {
    slug: match.slug,
    characterName: match.character_name,
    sourceTitle: match.source_title ?? null,
  };
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
  const groupedModels = groupCatalogModels(
    models.filter((row) => isPublicCatalogEligibleRow(row, "public")),
    "public",
  );
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
  if (!isPublicCatalogEligibleRow(model)) {
    if (model.duplicate_of_model_id && model.duplicate_of_model_id !== model.id) {
      return getCatalogModelDetails(model.duplicate_of_model_id);
    }
    return null;
  }
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
    ((data ?? []) as CatalogModelDbRow[])
      .map(mapCatalogModel)
      .filter((row) => isPublicCatalogEligibleRow(row, "public")),
    "public",
  ).slice(0, limit);
}

export async function listRecentLandingCharacters(
  limit = 6,
): Promise<CatalogCharacterRow[]> {
  const models = await listRecentLandingModels(Math.max(limit * 6, 24));
  return groupCatalogCharacters(models, "recent").slice(0, limit);
}

export async function getPublicCatalogSummary() {
  const { data, error } = await catalogModelsGateway
    .from("models")
    .select(CATALOG_MODEL_SELECT)
    .eq("is_active", true)
    .in("catalog_visibility", PUBLIC_CATALOG_VISIBILITIES)
    .not(
      "tags",
      "ov",
      "{nsfw,sensitive-blur,sensitive-review,age-ambiguous-review}",
    )
    .order("created_at", { ascending: false })
    .range(0, 999);

  if (error) throw error;

  const eligible = ((data ?? []) as CatalogModelDbRow[])
    .map(mapCatalogModel)
    .filter((row) => isPublicCatalogEligibleRow(row, "public"));
  const groupedModels = groupCatalogModels(eligible, "public");
  const groupedCharacters = groupCatalogCharacters(eligible, "recent");

  return {
    characterCount: groupedCharacters.length,
    modelCount: groupedModels.length,
  };
}
