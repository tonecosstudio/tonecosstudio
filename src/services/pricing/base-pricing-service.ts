import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { requireAuthenticatedUserId } from "@/services/auth/current-user";

export interface CollectionBasePrice {
  collection_type_id: string;
  collection_type_name: string;
  collection_type_display_name: string;
  base_price_coins: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sort_order?: number | null;
}

export interface UpdateBasePriceInput {
  collection_type_id: string;
  new_base_price_coins: number;
  reason?: string;
}

export interface UpdateBasePriceResponse {
  success: boolean;
  old_price: number;
  new_price: number;
  message: string;
}

interface CollectionTypeJoin {
  name: string;
  display_name: string;
  sort_order?: number | null;
}

interface CollectionBasePricingRow {
  collection_type_id: string;
  base_price_coins: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  collection_types: CollectionTypeJoin;
}

interface BasePricingRpcClient {
  rpc(
    fn: "update_base_price_with_history",
    args: {
      p_collection_type_id: string;
      p_new_base_price_coins: number;
      p_changed_by: string;
      p_reason: string | null;
    },
  ): Promise<{ data: unknown; error: { message: string } | null }>;
}

const basePricingRpc = supabase as unknown as BasePricingRpcClient;

const updateBasePriceResponseSchema = z.object({
  success: z.boolean(),
  old_price: z.number().int().positive(),
  new_price: z.number().int().positive(),
  message: z.string(),
});

function parseUpdateBasePriceResult(value: unknown): UpdateBasePriceResponse {
  const parsed = z.array(updateBasePriceResponseSchema).length(1).safeParse(value);
  if (!parsed.success) {
    throw new Error("Resposta invalida ao atualizar preco base");
  }

  return parsed.data[0];
}

function toCollectionBasePrice(item: CollectionBasePricingRow): CollectionBasePrice {
  return {
    collection_type_id: item.collection_type_id,
    collection_type_name: item.collection_types.name,
    collection_type_display_name: item.collection_types.display_name,
    base_price_coins: item.base_price_coins,
    is_active: item.is_active,
    created_at: item.created_at,
    updated_at: item.updated_at,
    sort_order: item.collection_types.sort_order,
  };
}

export async function listActiveBasePricing(): Promise<CollectionBasePrice[]> {
  const { data, error } = await supabase
    .from("collection_base_pricing")
    .select(`
      collection_type_id,
      base_price_coins,
      is_active,
      created_at,
      updated_at,
      collection_types!inner (
        name,
        display_name,
        sort_order
      )
    `)
    .eq("is_active", true)
    .order("collection_type_id", { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar precos base: ${error.message}`);
  }

  return ((data || []) as unknown as CollectionBasePricingRow[])
    .map(toCollectionBasePrice)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

export async function getBasePriceByType(
  collectionTypeId: string,
): Promise<CollectionBasePrice> {
  const { data, error } = await supabase
    .from("collection_base_pricing")
    .select(`
      collection_type_id,
      base_price_coins,
      is_active,
      created_at,
      updated_at,
      collection_types!inner (
        name,
        display_name
      )
    `)
    .eq("collection_type_id", collectionTypeId)
    .eq("is_active", true)
    .single();

  if (error) {
    throw new Error(`Erro ao buscar preco base: ${error.message}`);
  }

  return toCollectionBasePrice(data as unknown as CollectionBasePricingRow);
}

export async function updateBasePriceWithHistory(
  input: UpdateBasePriceInput,
): Promise<UpdateBasePriceResponse> {
  const userId = await requireAuthenticatedUserId();

  const { data, error } = await basePricingRpc.rpc("update_base_price_with_history", {
    p_collection_type_id: input.collection_type_id,
    p_new_base_price_coins: input.new_base_price_coins,
    p_changed_by: userId,
    p_reason: input.reason || null,
  });

  if (error) {
    throw new Error(`Erro ao atualizar preco base: ${error.message}`);
  }

  const result = parseUpdateBasePriceResult(data);

  if (!result.success) {
    throw new Error(result.message);
  }

  return result;
}
