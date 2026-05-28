import { supabase } from "@/integrations/supabase/client";

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

interface JsonObject {
  [key: string]: JsonValue | undefined;
}

interface CatalogCurationRpcError {
  code?: string;
  message: string;
}

interface CatalogCurationRpcClient {
  rpc(
    name: "admin_publish_catalog_import_item",
    args: { p_queue_id: string; p_payload: JsonObject }
  ): Promise<{ data: string | null; error: CatalogCurationRpcError | null }>;
}

const catalogCurationRpc = supabase as unknown as CatalogCurationRpcClient;

export type CatalogCurationStatus =
  | "queued"
  | "draft"
  | "review"
  | "approved"
  | "published"
  | "duplicate"
  | "rejected"
  | "hidden";

export type CatalogPriceMode = "consultation" | "category" | "fixed";
export type CatalogVisibility = "general" | "collection" | "both" | "hidden";
export type CatalogVariantType = "default" | "form" | "costume" | "pose" | "scale" | "edition" | "variant" | "other";
export type CatalogMediaType = "anime" | "manga" | "movie" | "series" | "game" | "comic" | "tokusatsu" | "original" | "other";

export type CatalogCurationItem = {
  id: string;
  source_type: string;
  source_folder_id: string | null;
  source_folder_name: string | null;
  source_drive_path: string | null;
  source_file_id: string | null;
  source_file_url: string | null;
  file_name: string;
  mime_type: string | null;
  original_size_bytes: number | null;
  storage_bucket: string | null;
  storage_path: string | null;
  thumbnail_url: string | null;
  status: CatalogCurationStatus | string;
  proposed_name: string | null;
  character_name: string | null;
  variant_name: string | null;
  variant_type: CatalogVariantType | string;
  source_title: string | null;
  media_type: CatalogMediaType | string;
  category: string | null;
  subcategory: string | null;
  tags: string[] | null;
  catalog_visibility: CatalogVisibility | string;
  collection_id: string | null;
  published_model_id: string | null;
  confidence: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  published_at: string | null;
  image_url: string | null;
};

export type CatalogPublishInput = {
  queueId: string;
  name: string;
  description: string;
  characterName: string;
  variantName: string;
  variantType: CatalogVariantType;
  sourceTitle: string;
  mediaType: CatalogMediaType;
  franchise: string;
  category: string;
  subcategory: string;
  tags: string;
  catalogVisibility: CatalogVisibility;
  collectionId: string | null;
  priceMode: CatalogPriceMode;
  priceStandaloneOverride: number | null;
  priceCoinsOverride: number | null;
};

export type CatalogCollectionTarget = {
  id: string;
  name: string;
  slug: string | null;
  is_active: boolean | null;
};

const CATALOG_IMPORT_SELECT =
  "id,source_type,source_folder_id,source_folder_name,source_drive_path,source_file_id,source_file_url,file_name,mime_type,original_size_bytes,storage_bucket,storage_path,thumbnail_url,status,proposed_name,character_name,variant_name,variant_type,source_title,media_type,category,subcategory,tags,catalog_visibility,collection_id,published_model_id,confidence,notes,created_at,updated_at,reviewed_at,published_at";

type CatalogImportRow = Omit<CatalogCurationItem, "image_url">;

interface CatalogImportQuery extends PromiseLike<{ data: CatalogImportRow[] | null; error: CatalogCurationRpcError | null }> {
  eq(column: string, value: string): CatalogImportQuery;
  order(column: string, options?: { ascending?: boolean }): CatalogImportQuery;
  limit(count: number): CatalogImportQuery;
}

interface CatalogImportUpdateQuery {
  eq(column: string, value: string): Promise<{ error: CatalogCurationRpcError | null }>;
}

interface CatalogImportItemsGateway {
  from(table: "catalog_import_items"): {
    select(columns: string): CatalogImportQuery;
    update(values: Partial<CatalogImportRow>): CatalogImportUpdateQuery;
  };
}

const catalogImportItemsGateway = supabase as unknown as CatalogImportItemsGateway;

function normalizeTags(tags: string) {
  return tags
    .split(",")
    .map((tag) => tag.trim().toLocaleLowerCase())
    .filter(Boolean)
    .slice(0, 20);
}

function getQueueImageUrl(row: {
  storage_bucket: string | null;
  storage_path: string | null;
  thumbnail_url: string | null;
}) {
  if (row.thumbnail_url) return row.thumbnail_url;
  if (!row.storage_bucket || !row.storage_path) return null;
  return supabase.storage.from(row.storage_bucket).getPublicUrl(row.storage_path).data.publicUrl;
}

function mapQueueItem(row: CatalogImportRow): CatalogCurationItem {
  return {
    ...row,
    image_url: getQueueImageUrl(row),
  };
}

function isMissingImportTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error ? String(error.message) : "";
  const code = "code" in error ? String(error.code) : "";
  return code === "42P01" || code === "PGRST205" || message.includes("catalog_import_items");
}

function isMissingPublishRpcError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error ? String(error.message) : "";
  const code = "code" in error ? String(error.code) : "";
  return code === "PGRST202" || code === "42883" || message.includes("admin_publish_catalog_import_item");
}

export async function listCatalogCurationQueue(status: string): Promise<CatalogCurationItem[]> {
  let query = catalogImportItemsGateway
    .from("catalog_import_items")
    .select(CATALOG_IMPORT_SELECT)
    .order("created_at", { ascending: false })
    .limit(120);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingImportTableError(error)) {
      throw new Error("A fila profissional de catalogo ainda nao foi aplicada no Supabase.");
    }
    throw error;
  }

  return (data ?? []).map(mapQueueItem);
}

export async function listCatalogCollectionTargets(): Promise<CatalogCollectionTarget[]> {
  const { data, error } = await supabase
    .from("collections")
    .select("id,name,slug,is_active")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(200);

  if (error) throw error;
  return (data ?? []) as CatalogCollectionTarget[];
}

export async function updateCurationItemStatus(queueId: string, status: CatalogCurationStatus) {
  const now = new Date().toISOString();
  const patch: Record<string, string> = { status, updated_at: now };
  if (status === "approved" || status === "rejected" || status === "duplicate" || status === "hidden") {
    patch.reviewed_at = now;
  }

  const { error } = await catalogImportItemsGateway
    .from("catalog_import_items")
    .update(patch)
    .eq("id", queueId);

  if (error) throw error;
}

export async function classifyCurationImage(queueId: string, model: "gpt-4o-mini" | "gpt-4o" = "gpt-4o-mini") {
  const { data, error } = await supabase.functions.invoke("classify-image-vision", {
    body: { catalog_import_item_id: queueId, model },
  });

  if (error) throw error;
  return data as {
    name?: string;
    character_name?: string;
    variant_name?: string;
    source_title?: string;
    category?: string;
    subcategory?: string;
    tags?: string[];
    confidence?: number;
  };
}

export async function publishCurationItem(input: CatalogPublishInput) {
  const name = input.name.trim();
  if (!name) throw new Error("Nome do modelo e obrigatorio");

  const tags = normalizeTags(input.tags);
  const rpcPayload: JsonObject = {
    name,
    description: input.description.trim() || null,
    character_name: input.characterName.trim() || name,
    variant_name: input.variantName.trim() || null,
    variant_type: input.variantType,
    source_title: input.sourceTitle.trim() || null,
    source_type: input.mediaType,
    franchise: input.franchise.trim() || null,
    category: input.category.trim() || null,
    subcategory: input.subcategory.trim() || null,
    tags,
    catalog_visibility: input.catalogVisibility,
    collection_id: input.collectionId,
    price_mode: input.priceMode,
    price_standalone_override: input.priceStandaloneOverride,
    price_coins_override: input.priceCoinsOverride,
  };

  const { error: rpcError } = await catalogCurationRpc.rpc("admin_publish_catalog_import_item", {
    p_queue_id: input.queueId,
    p_payload: rpcPayload,
  });

  if (rpcError) {
    if (isMissingPublishRpcError(rpcError)) {
      throw new Error("A RPC profissional de publicacao do catalogo ainda nao foi aplicada no Supabase.");
    }
    throw rpcError;
  }
}
