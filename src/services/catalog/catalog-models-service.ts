import { CATALOG_PAGE_SIZE } from "@/config/catalog";
import { supabase } from "@/integrations/supabase/client";
import type { CatalogModelDetailsRow, CatalogModelRow } from "@/types/catalog";

export type CatalogSort = "recent" | "az";

export type CatalogModelFilters = {
  franchise: string;
  category: string;
  tagsCSV: string;
  sort: CatalogSort;
};

type CatalogModelDbRow = Omit<CatalogModelRow, "imageUrl">;
type CatalogModelDetailsDbRow = Omit<CatalogModelDetailsRow, "imageUrl">;

const CATALOG_MODEL_SELECT =
  "id,name,franchise,category,subcategory,tags,image_bucket,image_path,created_at";

const CATALOG_MODEL_DETAILS_SELECT = `${CATALOG_MODEL_SELECT},description`;

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

function mapCatalogModel(row: CatalogModelDbRow): CatalogModelRow {
  return {
    ...row,
    imageUrl: getPublicModelImageUrl(row.image_bucket, row.image_path),
  };
}

function mapCatalogModelDetails(row: CatalogModelDetailsDbRow): CatalogModelDetailsRow {
  return {
    ...row,
    imageUrl: getPublicModelImageUrl(row.image_bucket, row.image_path),
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

  let query = supabase.from("models").select(CATALOG_MODEL_SELECT).range(from, to);

  if (filters.sort === "az") {
    query = query.order("name", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  if (needle) {
    query = query.ilike("name", needle.length <= 2 ? `${needle}%` : `%${needle}%`);
  }

  const franchise = (filters.franchise ?? "").trim();
  if (franchise) query = query.ilike("franchise", `%${franchise}%`);

  const category = (filters.category ?? "").trim();
  if (category) query = query.eq("category", category);

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
  let query = supabase
    .from("models")
    .select(CATALOG_MODEL_SELECT)
    .order("created_at", { ascending: false })
    .limit(8);

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
        scoreByPreferenceTags(left, params.preferenceTags)
    );
  }

  return models;
}

export async function getCatalogModelDetails(modelId: string) {
  const { data, error } = await supabase
    .from("models")
    .select(CATALOG_MODEL_DETAILS_SELECT)
    .eq("id", modelId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapCatalogModelDetails(data as CatalogModelDetailsDbRow) : null;
}

export async function listRecentLandingModels(limit = 6): Promise<CatalogModelRow[]> {
  const { data, error } = await supabase
    .from("models")
    .select("id,name,franchise,category,subcategory,tags,image_bucket,image_path,created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as CatalogModelDbRow[]).map(mapCatalogModel);
}
