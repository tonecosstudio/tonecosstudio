import { supabase } from "@/integrations/supabase/client";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHARACTER_STATUSES = new Set(["released", "coming_soon", "upcoming", "revealed"]);

export interface CatalogCharacterInput {
  name: string;
  description: string;
  status: string;
  price_category_id: string;
  theme_category: string;
  product_line: string;
  image_url: string;
  is_catalog: boolean;
}

export interface PriceCategoryInput {
  name: string;
  display_name: string;
  description: string;
  price_coins: number;
  coin_value_in_cents: number;
  price_standalone: number;
  display_order: number;
  is_active: boolean;
}

interface AdminCatalogRpcError {
  message: string;
}

interface AdminCatalogRpcClient {
  rpc(
    name: "admin_upsert_catalog_character",
    args: {
      p_character_id: string | null;
      p_name: string;
      p_description: string | null;
      p_status: string;
      p_price_category_id: string | null;
      p_theme_category: string | null;
      p_product_line: string | null;
      p_image_url: string | null;
      p_is_catalog: boolean;
    }
  ): Promise<{ data: string | null; error: AdminCatalogRpcError | null }>;
  rpc(
    name: "admin_delete_catalog_character",
    args: { p_character_id: string }
  ): Promise<{ data: unknown; error: AdminCatalogRpcError | null }>;
  rpc(
    name: "admin_upsert_price_category",
    args: {
      p_category_id: string | null;
      p_name: string;
      p_display_name: string;
      p_description: string | null;
      p_price_coins: number;
      p_coin_value_in_cents: number;
      p_price_standalone: number;
      p_display_order: number;
      p_is_active: boolean;
    }
  ): Promise<{ data: string | null; error: AdminCatalogRpcError | null }>;
  rpc(
    name: "admin_delete_price_category",
    args: { p_category_id: string }
  ): Promise<{ data: unknown; error: AdminCatalogRpcError | null }>;
}

const adminCatalogRpc = supabase as unknown as AdminCatalogRpcClient;

function requiredText(value: string, field: string, maxLength: number): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${field} e obrigatorio`);
  if (trimmed.length > maxLength) throw new Error(`${field} deve ter no maximo ${maxLength} caracteres`);
  if (/<[^>]*>/g.test(trimmed)) throw new Error(`${field} nao pode conter HTML`);
  return trimmed;
}

function optionalText(value: string, field: string, maxLength: number): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) throw new Error(`${field} deve ter no maximo ${maxLength} caracteres`);
  if (/<[^>]*>/g.test(trimmed)) throw new Error(`${field} nao pode conter HTML`);
  return trimmed;
}

function optionalUuid(value: string, field: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!UUID_PATTERN.test(trimmed)) throw new Error(`${field} invalido`);
  return trimmed;
}

function optionalHttpsUrl(value: string, field: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") throw new Error("invalid protocol");
    return url.toString();
  } catch {
    throw new Error(`${field} deve ser uma URL HTTPS valida`);
  }
}

function nonNegativeInteger(value: number, field: string, maxValue: number): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > maxValue) {
    throw new Error(`${field} invalido`);
  }
  return parsed;
}

function sanitizeCatalogCharacterInput(input: CatalogCharacterInput) {
  if (!CHARACTER_STATUSES.has(input.status)) throw new Error("Status do personagem invalido");

  return {
    name: requiredText(input.name, "Nome do personagem", 120),
    description: optionalText(input.description, "Descricao", 1000),
    status: input.status,
    price_category_id: optionalUuid(input.price_category_id, "Categoria de preco"),
    theme_category: optionalText(input.theme_category, "Categoria tematica", 80),
    product_line: optionalText(input.product_line, "Linha de produto", 80),
    image_url: optionalHttpsUrl(input.image_url, "Imagem"),
    is_catalog: Boolean(input.is_catalog),
  };
}

function sanitizePriceCategoryInput(input: PriceCategoryInput) {
  return {
    name: requiredText(input.name, "Identificador", 80),
    display_name: requiredText(input.display_name, "Nome exibido", 120),
    description: optionalText(input.description, "Descricao", 500),
    price_coins: nonNegativeInteger(input.price_coins, "Preco em coins", 1_000_000),
    coin_value_in_cents: nonNegativeInteger(input.coin_value_in_cents, "Valor do coin", 1_000_000),
    price_standalone: nonNegativeInteger(input.price_standalone, "Preco avulso", 100_000_000),
    display_order: nonNegativeInteger(input.display_order, "Ordem", 10_000),
    is_active: Boolean(input.is_active),
  };
}

export async function fetchCatalogCharacters() {
  const { data, error } = await supabase
    .from("collection_characters")
    .select(`
      *,
      price_categories (
        id,
        name,
        display_name,
        price_coins,
        price_standalone
      )
    `)
    .eq("is_catalog", true)
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function fetchPriceCategories() {
  const { data, error } = await supabase
    .from("price_categories")
    .select("*")
    .order("display_order");

  if (error) throw error;
  return data || [];
}

export async function deleteCatalogCharacterById(id: string) {
  if (!UUID_PATTERN.test(id)) throw new Error("Personagem invalido");
  const { error } = await adminCatalogRpc.rpc("admin_delete_catalog_character", {
    p_character_id: id,
  });
  if (error) throw error;
}

export async function fetchUniqueThemeCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from("collection_characters")
    .select("theme_category")
    .not("theme_category", "is", null)
    .order("theme_category");

  if (error) throw error;
  return [...new Set((data || []).map((row) => row.theme_category).filter(Boolean))] as string[];
}

export async function fetchUniqueProductLines(): Promise<string[]> {
  const { data, error } = await supabase
    .from("collection_characters")
    .select("product_line")
    .not("product_line", "is", null)
    .order("product_line");

  if (error) throw error;
  return [...new Set((data || []).map((row) => row.product_line).filter(Boolean))] as string[];
}

export async function saveCatalogCharacter(characterId: string | null, input: CatalogCharacterInput): Promise<void> {
  const payload = sanitizeCatalogCharacterInput(input);

  if (characterId && !UUID_PATTERN.test(characterId)) throw new Error("Personagem invalido");

  const { error } = await adminCatalogRpc.rpc("admin_upsert_catalog_character", {
    p_character_id: characterId,
    p_name: payload.name,
    p_description: payload.description,
    p_status: payload.status,
    p_price_category_id: payload.price_category_id,
    p_theme_category: payload.theme_category,
    p_product_line: payload.product_line,
    p_image_url: payload.image_url,
    p_is_catalog: payload.is_catalog,
  });
  if (error) throw error;
}

export async function countCharactersByPriceCategory(categoryId: string): Promise<number> {
  if (!UUID_PATTERN.test(categoryId)) throw new Error("Categoria invalida");

  const { count, error } = await supabase
    .from("collection_characters")
    .select("id", { count: "exact", head: true })
    .eq("price_category_id", categoryId);

  if (error) throw error;
  return count || 0;
}

export async function deletePriceCategory(id: string): Promise<void> {
  if (!UUID_PATTERN.test(id)) throw new Error("Categoria invalida");

  const characterCount = await countCharactersByPriceCategory(id);
  if (characterCount > 0) {
    throw new Error("Nao e possivel excluir uma categoria que possui personagens vinculados");
  }

  const { error } = await adminCatalogRpc.rpc("admin_delete_price_category", {
    p_category_id: id,
  });
  if (error) throw error;
}

export async function savePriceCategory(categoryId: string | null, input: PriceCategoryInput): Promise<void> {
  const payload = sanitizePriceCategoryInput(input);

  if (categoryId && !UUID_PATTERN.test(categoryId)) throw new Error("Categoria invalida");

  const { error } = await adminCatalogRpc.rpc("admin_upsert_price_category", {
    p_category_id: categoryId,
    p_name: payload.name,
    p_display_name: payload.display_name,
    p_description: payload.description,
    p_price_coins: payload.price_coins,
    p_coin_value_in_cents: payload.coin_value_in_cents,
    p_price_standalone: payload.price_standalone,
    p_display_order: payload.display_order,
    p_is_active: payload.is_active,
  });
  if (error) throw error;
}
