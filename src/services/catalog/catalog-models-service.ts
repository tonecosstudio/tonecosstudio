import { CATALOG_PAGE_SIZE } from "@/config/catalog";
import { supabase } from "@/integrations/supabase/client";
import type { CatalogModelDetailsRow, CatalogModelRow } from "@/types/catalog";

export type CatalogSort = "recent" | "az";

export type CatalogSourceType = "anime" | "manga" | "movie" | "series" | "game" | "comic" | "tokusatsu" | "original" | "other";
export type CatalogVariantType = "default" | "form" | "costume" | "pose" | "scale" | "edition" | "variant" | "other";

export type CatalogModelFilters = {
  character: string;
  franchise: string;
  category: string;
  sourceType: string;
  variantType: string;
  tagsCSV: string;
  sort: CatalogSort;
};

type CatalogModelDbRow = Omit<CatalogModelRow, "imageUrl" | "thumbnailUrl">;
type CatalogModelDetailsDbRow = Omit<CatalogModelDetailsRow, "imageUrl" | "thumbnailUrl">;

const CATALOG_MODEL_SELECT =
  "id,name,franchise,category,subcategory,tags,image_bucket,image_path,thumbnail_url,created_at,price_mode,price_standalone_override,price_coins_override,character_name,variant_name,variant_type,source_title,source_type,catalog_visibility";

const CATALOG_MODEL_DETAILS_SELECT = `${CATALOG_MODEL_SELECT},description`;

type CatalogModelsQueryResult<T> = { data: T[] | null; error: Error | null };

interface CatalogModelsQuery<T> extends PromiseLike<CatalogModelsQueryResult<T>> {
  eq(column: string, value: string | boolean): CatalogModelsQuery<T>;
  ilike(column: string, pattern: string): CatalogModelsQuery<T>;
  in(column: string, values: string[]): CatalogModelsQuery<T>;
  limit(count: number): CatalogModelsQuery<T>;
  maybeSingle(): Promise<{ data: T | null; error: Error | null }>;
  not(column: string, operator: string, value: string): CatalogModelsQuery<T>;
  or(filters: string): CatalogModelsQuery<T>;
  order(column: string, options?: { ascending?: boolean }): CatalogModelsQuery<T>;
  overlaps(column: string, values: string[]): CatalogModelsQuery<T>;
  range(from: number, to: number): CatalogModelsQuery<T>;
}

interface CatalogModelsGateway {
  from(table: "models"): {
    select(columns: string): CatalogModelsQuery<CatalogModelDetailsDbRow>;
  };
}

const catalogModelsGateway = supabase as unknown as CatalogModelsGateway;

function normalizeTags(tagsCSV: string) {
  return tagsCSV
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function getPublicModelImageUrl(bucket: string | null, path: string | null) {
  if (!bucket || !path) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function normalizeSearchValue(value: string) {
  return value.replace(/[%_,()]/g, " ").replace(/\s+/g, " ").trim();
}

function mapCatalogModel(row: CatalogModelDbRow): CatalogModelRow {
  const imageUrl = getPublicModelImageUrl(row.image_bucket, row.image_path);
  return {
    ...row,
    imageUrl,
    thumbnailUrl: row.thumbnail_url ?? imageUrl,
  };
}

function mapCatalogModelDetails(row: CatalogModelDetailsDbRow): CatalogModelDetailsRow {
  const imageUrl = getPublicModelImageUrl(row.image_bucket, row.image_path);
  return {
    ...row,
    imageUrl,
    thumbnailUrl: row.thumbnail_url ?? imageUrl,
  };
}

function scoreByPreferenceTags(model: CatalogModelRow, preferenceTags: Set<string>) {
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

  const runQuery = async () => {
    let query = catalogModelsGateway
      .from("models")
      .select(CATALOG_MODEL_SELECT)
      .eq("is_active", true)
      .in("catalog_visibility", ["general", "both"])
      .range(from, to);

    if (filters.sort === "az") {
      query = query.order("name", { ascending: true });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const normalizedNeedle = normalizeSearchValue(needle);
    if (normalizedNeedle) {
      const pattern = normalizedNeedle.length <= 2 ? `${normalizedNeedle}%` : `%${normalizedNeedle}%`;
      query = query.or(`name.ilike.${pattern},character_name.ilike.${pattern},variant_name.ilike.${pattern},source_title.ilike.${pattern},franchise.ilike.${pattern},category.ilike.${pattern},subcategory.ilike.${pattern}`);
    }

    const franchise = normalizeSearchValue(filters.franchise ?? "");
    if (franchise) {
      const pattern = `%${franchise}%`;
      query = query.or(`source_title.ilike.${pattern},franchise.ilike.${pattern}`);
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

    return query;
  };

  const { data, error } = await runQuery();
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

  const runQuery = async () => {
    let query = catalogModelsGateway
      .from("models")
      .select(CATALOG_MODEL_SELECT)
      .eq("is_active", true)
      .in("catalog_visibility", ["general", "both"])
      .order("created_at", { ascending: false })
      .limit(8);

    if (exclude.length) {
      query = query.not("id", "in", formatPostgrestIdList(exclude));
    }

    return query;
  };

  const { data, error } = await runQuery();
  if (error) throw error;

  const models = ((data ?? []) as CatalogModelDbRow[]).map(mapCatalogModel);
  if (params.preferenceTags.size) {
    models.sort(
      (left, right) =>
        scoreByPreferenceTags(right, params.preferenceTags) -
        scoreByPreferenceTags(left, params.preferenceTags)
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
  return data ? mapCatalogModelDetails(data as CatalogModelDetailsDbRow) : null;
}

export async function listRecentLandingModels(limit = 6): Promise<CatalogModelRow[]> {
  const runQuery = async () => {
    const query = catalogModelsGateway
      .from("models")
      .select(CATALOG_MODEL_SELECT)
      .eq("is_active", true)
      .in("catalog_visibility", ["general", "both"])
      .order("created_at", { ascending: false })
      .limit(limit);

    return query;
  };

  const { data, error } = await runQuery();
  if (error) throw error;
  return ((data ?? []) as CatalogModelDbRow[]).map(mapCatalogModel);
}
