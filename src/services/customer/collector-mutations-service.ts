import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

type RpcError = {
  message: string;
};

type RpcResult<T> = Promise<{
  data: T | null;
  error: RpcError | null;
}>;

export type CollectorProfileMutationInput = {
  username?: string | null;
  display_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  is_public?: boolean;
};

interface CollectorMutationRpcClient {
  rpc(
    fn: "update_current_user_collector_profile",
    args: { p_updates: Record<string, Json> }
  ): RpcResult<Json>;
  rpc(
    fn: "add_current_user_public_collection_item",
    args: { p_model_id: string; p_notes: string | null }
  ): RpcResult<Json>;
  rpc(
    fn: "remove_current_user_public_collection_item",
    args: { p_collection_id: string }
  ): RpcResult<string>;
  rpc(
    fn: "update_current_user_public_collection_notes",
    args: { p_collection_id: string; p_notes: string | null }
  ): RpcResult<Json>;
  rpc(
    fn: "update_current_user_public_collection_order",
    args: { p_items: Array<{ id: string; display_order: number }> }
  ): RpcResult<Json>;
}

const collectorMutationRpc = supabase as unknown as CollectorMutationRpcClient;

function unwrapRpcData<T>(data: T | null, error: RpcError | null, fallback: string): T {
  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error(fallback);
  }

  return data;
}

export async function updateCollectorProfileRpc(
  updates: CollectorProfileMutationInput
): Promise<Json> {
  const payload = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined)
  ) as Record<string, Json>;

  const { data, error } = await collectorMutationRpc.rpc("update_current_user_collector_profile", {
    p_updates: payload,
  });

  return unwrapRpcData(data, error, "Collector profile update did not return data");
}

export async function addPublicCollectionItemRpc(input: {
  modelId: string;
  notes?: string;
}): Promise<Json> {
  const { data, error } = await collectorMutationRpc.rpc("add_current_user_public_collection_item", {
    p_model_id: input.modelId,
    p_notes: input.notes ?? null,
  });

  return unwrapRpcData(data, error, "Public collection add did not return data");
}

export async function removePublicCollectionItemRpc(collectionId: string): Promise<void> {
  const { data, error } = await collectorMutationRpc.rpc("remove_current_user_public_collection_item", {
    p_collection_id: collectionId,
  });

  unwrapRpcData(data, error, "Public collection removal did not return data");
}

export async function updatePublicCollectionNotesRpc(
  collectionId: string,
  notes: string
): Promise<Json> {
  const { data, error } = await collectorMutationRpc.rpc("update_current_user_public_collection_notes", {
    p_collection_id: collectionId,
    p_notes: notes,
  });

  return unwrapRpcData(data, error, "Public collection notes update did not return data");
}

export async function updatePublicCollectionOrderRpc(
  items: Array<{ id: string; display_order: number }>
): Promise<void> {
  const { data, error } = await collectorMutationRpc.rpc("update_current_user_public_collection_order", {
    p_items: items,
  });

  unwrapRpcData(data, error, "Public collection order update did not return data");
}
