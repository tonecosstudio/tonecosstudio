import { supabase } from "@/integrations/supabase/client";

const MAX_MODEL_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MODEL_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const SAFE_MODEL_IMAGE_PATH =
  /^(?:collections|characters)\/[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp)$/i;

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

interface JsonObject {
  [key: string]: JsonValue | undefined;
}

interface AdminCollectionsRpcError {
  message: string;
}

interface AdminCollectionsRpcClient {
  rpc(
    name: "admin_create_collection",
    args: { p_payload: JsonObject },
  ): Promise<{
    data: JsonObject | null;
    error: AdminCollectionsRpcError | null;
  }>;
  rpc(
    name: "admin_update_collection",
    args: { p_collection_id: string; p_payload: JsonObject },
  ): Promise<{ data: string | null; error: AdminCollectionsRpcError | null }>;
  rpc(
    name: "admin_delete_collection",
    args: { p_collection_id: string },
  ): Promise<{ data: string | null; error: AdminCollectionsRpcError | null }>;
  rpc(
    name: "admin_insert_collection_characters",
    args: { p_characters: JsonObject[] },
  ): Promise<{
    data: JsonValue | null;
    error: AdminCollectionsRpcError | null;
  }>;
  rpc(
    name: "admin_insert_collection_character",
    args: { p_payload: JsonObject },
  ): Promise<{ data: string | null; error: AdminCollectionsRpcError | null }>;
  rpc(
    name: "admin_update_collection_character",
    args: { p_character_id: string; p_payload: JsonObject },
  ): Promise<{ data: string | null; error: AdminCollectionsRpcError | null }>;
  rpc(
    name: "admin_delete_collection_character",
    args: { p_character_id: string },
  ): Promise<{ data: string | null; error: AdminCollectionsRpcError | null }>;
  rpc(
    name: "get_collection_financial_analysis",
    args: { p_collection_id: string },
  ): Promise<{
    data: CollectionFinancialAnalysis[] | null;
    error: AdminCollectionsRpcError | null;
  }>;
}

const adminCollectionsRpc = supabase as unknown as AdminCollectionsRpcClient;

export interface CollectionFinancialSummary {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_characters: number;
  catalog_characters: number;
  total_subscriptions: number;
  active_subscriptions: number;
  subscription_revenue: number;
  total_standalone_purchases: number;
  standalone_revenue: number;
  total_manual_payments: number;
  manual_payments_revenue: number;
  total_quotes: number;
  approved_quotes: number;
  quotes_revenue: number;
  total_revenue: number;
  price_pix?: number | null;
  cost_total?: number | null;
  profit_pix_gross?: number | null;
  margin_pix_gross?: number | null;
}

export interface CollectionFinancialAnalysis extends CollectionFinancialSummary {
  net_profit_pix?: number | null;
  net_margin_pix?: number | null;
  roi_pix?: number | null;
  breakeven_units?: number | null;
}

interface CollectionsFinancialSummaryClient {
  from(table: "collections_financial_summary"): {
    select(columns: "*"): {
      order(column: "name"): Promise<{
        data: CollectionFinancialSummary[] | null;
        error: AdminCollectionsRpcError | null;
      }>;
    };
  };
}

const collectionsFinancialSupabase =
  supabase as unknown as CollectionsFinancialSummaryClient;

type CreateCollectionInput = {
  name: string;
  slug: string;
  description: string;
  cover_image_url: string | null;
  rotation_type: string;
  tier_id: string | null;
  is_active: boolean;
};

type CreateCharacterInput = {
  collection_id: string;
  name: string;
  description: string;
  image_url: string | null;
  image_urls?: string[] | null;
  franchise?: string | null;
  product_line?: string | null;
  theme_category?: string | null;
  stock_quantity?: number;
  display_order?: number | null;
  release_order: number;
  release_month: number | null;
  release_date?: string | null;
  unlock_override?: boolean;
  status: string;
};

type CollectionRowWithImageAlias = {
  id?: unknown;
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  cover_image_url?: string | null;
  image_url?: string | null;
  is_active?: unknown;
  rotation_type?: unknown;
  total_characters?: unknown;
  character_count?: unknown;
  [key: string]: unknown;
};

export type CollectionRotationType = "fixed" | "odd_months" | "even_months";

export interface AdminCollectionItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  rotation_type: CollectionRotationType;
  total_characters: number;
  character_count: number;
}

export interface AdminCharacterItem {
  id: string;
  collection_id: string;
  name: string;
  description: string | null;
  franchise: string | null;
  product_line: string | null;
  theme_category: string | null;
  stock_quantity: number;
  display_order: number | null;
  release_order: number;
  release_month: number | null;
  release_date: string | null;
  unlock_override: boolean;
  status: string;
  image_url: string | null;
  image_urls: string[] | null;
}

function toRotationType(value: unknown): CollectionRotationType {
  return value === "odd_months" || value === "even_months" || value === "fixed"
    ? value
    : "fixed";
}

function toStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeCollectionImage<T extends CollectionRowWithImageAlias>(
  collection: T,
) {
  return {
    ...collection,
    id: toStringValue(collection.id),
    name: toStringValue(collection.name),
    slug: toStringValue(collection.slug),
    description:
      typeof collection.description === "string"
        ? collection.description
        : null,
    image_url: collection.image_url ?? collection.cover_image_url ?? null,
    is_active: collection.is_active === true,
    rotation_type: toRotationType(collection.rotation_type),
    total_characters:
      typeof collection.total_characters === "number"
        ? collection.total_characters
        : 0,
    character_count:
      typeof collection.character_count === "number"
        ? collection.character_count
        : 0,
  };
}

function validateModelImageUpload(filePath: string, file: File) {
  if (!SAFE_MODEL_IMAGE_PATH.test(filePath) || filePath.includes("..")) {
    throw new Error("Caminho de imagem invalido");
  }

  if (!ALLOWED_MODEL_IMAGE_TYPES.has(file.type)) {
    throw new Error("Formato de imagem invalido");
  }

  if (file.size > MAX_MODEL_IMAGE_SIZE_BYTES) {
    throw new Error("Imagem excede o limite de 5MB");
  }
}

export async function fetchCollectionsWithCharacterCount(): Promise<
  AdminCollectionItem[]
> {
  const { data: collections, error } = await supabase
    .from("collections")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!collections) return [];

  const withCount = await Promise.all(
    collections.map(async (collection) => {
      const { count, error: countError } = await supabase
        .from("collection_characters")
        .select("*", { count: "exact", head: true })
        .eq("collection_id", collection.id);

      if (countError) {
        return normalizeCollectionImage({ ...collection, character_count: 0 });
      }

      return normalizeCollectionImage({
        ...collection,
        character_count: count || 0,
      });
    }),
  );

  return withCount;
}

export async function fetchCharactersByCollection(
  collectionId: string,
): Promise<AdminCharacterItem[]> {
  const { data, error } = await supabase
    .from("collection_characters")
    .select("*")
    .eq("collection_id", collectionId)
    .order("release_order", { ascending: true });

  if (error) throw error;
  return (data || []).map((character) => ({
    id: character.id,
    collection_id: character.collection_id,
    name: character.name,
    description: character.description,
    franchise: character.franchise ?? null,
    product_line: character.product_line ?? null,
    theme_category: character.theme_category ?? null,
    stock_quantity:
      typeof character.stock_quantity === "number"
        ? character.stock_quantity
        : 0,
    display_order: character.display_order ?? null,
    release_order: character.release_order ?? 0,
    release_month: character.release_month,
    release_date: character.release_date ?? null,
    unlock_override: character.unlock_override === true,
    status: character.status,
    image_url: character.image_url,
    image_urls: Array.isArray(character.image_urls)
      ? character.image_urls
      : null,
  }));
}

export async function createCollection(
  input: CreateCollectionInput,
): Promise<{ id: string }> {
  const { data, error } = await adminCollectionsRpc.rpc(
    "admin_create_collection",
    {
      p_payload: input,
    },
  );
  if (error) throw error;
  if (!data?.id || typeof data.id !== "string") {
    throw new Error("Colecao criada sem identificador");
  }
  return { id: data.id };
}

export async function insertCollectionCharacters(
  characters: CreateCharacterInput[],
) {
  const { error } = await adminCollectionsRpc.rpc(
    "admin_insert_collection_characters",
    {
      p_characters: characters,
    },
  );
  if (error) throw error;
}

export async function deleteCollectionById(collectionId: string) {
  const { error } = await adminCollectionsRpc.rpc("admin_delete_collection", {
    p_collection_id: collectionId,
  });
  if (error) throw error;
}

export async function updateCollectionById(
  collectionId: string,
  payload: Record<string, unknown>,
) {
  const { error } = await adminCollectionsRpc.rpc("admin_update_collection", {
    p_collection_id: collectionId,
    p_payload: payload as JsonObject,
  });
  if (error) throw error;
}

export async function uploadModelImage(filePath: string, file: File) {
  validateModelImageUpload(filePath, file);

  const { error } = await supabase.storage
    .from("models")
    .upload(filePath, file);
  if (error) throw error;
}

export function getModelPublicUrl(filePath: string) {
  const {
    data: { publicUrl },
  } = supabase.storage.from("models").getPublicUrl(filePath);

  return publicUrl;
}

export async function insertCollectionCharacter(payload: CreateCharacterInput) {
  const { error } = await adminCollectionsRpc.rpc(
    "admin_insert_collection_character",
    {
      p_payload: payload,
    },
  );
  if (error) throw error;
}

export async function updateCollectionCharacterById(
  characterId: string,
  payload: Record<string, unknown>,
) {
  const { error } = await adminCollectionsRpc.rpc(
    "admin_update_collection_character",
    {
      p_character_id: characterId,
      p_payload: payload as JsonObject,
    },
  );
  if (error) throw error;
}

export async function deleteCollectionCharacterById(characterId: string) {
  const { error } = await adminCollectionsRpc.rpc(
    "admin_delete_collection_character",
    {
      p_character_id: characterId,
    },
  );
  if (error) throw error;
}

export async function countActiveFixedCollections() {
  const { count, error } = await supabase
    .from("collections")
    .select("*", { count: "exact", head: true })
    .eq("rotation_type", "fixed")
    .eq("is_active", true);

  if (error) throw error;
  return count || 0;
}

export async function countCharactersByCollection(collectionId: string) {
  const { count, error } = await supabase
    .from("collection_characters")
    .select("*", { count: "exact", head: true })
    .eq("collection_id", collectionId);

  if (error) throw error;
  return count || 0;
}

export async function fetchCollectionsFinancialSummary() {
  const { data, error } = await collectionsFinancialSupabase
    .from("collections_financial_summary")
    .select("*")
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function fetchCollectionFinancialAnalysis(collectionId: string) {
  const { data, error } = await adminCollectionsRpc.rpc(
    "get_collection_financial_analysis",
    {
      p_collection_id: collectionId,
    },
  );

  if (error) throw error;
  return data?.[0] || null;
}
