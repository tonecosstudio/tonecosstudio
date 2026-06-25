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
