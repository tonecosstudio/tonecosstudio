import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";

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
}

export interface UpdateBasePriceResponse {
  success: boolean;
  collection_type_id: string;
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

const updateBasePriceResponseSchema = z.object({
  success: z.literal(true),
  collection_type_id: z.string().uuid(),
  old_price: z.number().int().positive(),
  new_price: z.number().int().positive(),
  message: z.string().min(1),
});

function parseUpdateBasePriceResult(
  value: unknown,
  expectedCollectionTypeId: string,
  expectedPrice: number,
): UpdateBasePriceResponse {
  const parsed = updateBasePriceResponseSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("Resposta invalida ao atualizar preco base");
  }

  if (
    parsed.data.collection_type_id !== expectedCollectionTypeId ||
    parsed.data.new_price !== expectedPrice
  ) {
    throw new Error("Resposta inconsistente ao atualizar preco base");
  }

  return parsed.data;
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
        display_name,
        sort_order
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

export async function updateBasePrice(
  input: UpdateBasePriceInput,
): Promise<UpdateBasePriceResponse> {
  const data = await callAdminRpc<unknown>("admin_update_collection_base_price", {
    p_collection_type_id: input.collection_type_id,
    p_new_base_price_coins: input.new_base_price_coins,
  });

  return parseUpdateBasePriceResult(
    data,
    input.collection_type_id,
    input.new_base_price_coins,
  );
}
