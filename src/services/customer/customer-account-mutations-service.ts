import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

type RpcError = {
  message: string;
};

type RpcResult<T> = Promise<{
  data: T | null;
  error: RpcError | null;
}>;

interface CustomerAccountMutationRpcClient {
  rpc(
    fn: "submit_order_migration_request",
    args: {
      p_full_name: string;
      p_email: string;
      p_phone: string | null;
      p_old_order_number: string | null;
      p_order_description: string;
    }
  ): RpcResult<string>;
  rpc(fn: "upsert_current_user_profile", args: { p_profile: Record<string, Json> }): RpcResult<Json>;
}

const customerAccountMutationRpc = supabase as unknown as CustomerAccountMutationRpcClient;

function unwrapRpcData<T>(data: T | null, error: RpcError | null, fallback: string): T {
  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error(fallback);
  }

  return data;
}

export async function submitOrderMigrationRequestRpc(input: {
  fullName: string;
  email: string;
  phone?: string;
  oldOrderNumber?: string;
  orderDescription: string;
}): Promise<string> {
  const { data, error } = await customerAccountMutationRpc.rpc("submit_order_migration_request", {
    p_full_name: input.fullName,
    p_email: input.email,
    p_phone: input.phone ?? null,
    p_old_order_number: input.oldOrderNumber ?? null,
    p_order_description: input.orderDescription,
  });

  return unwrapRpcData(data, error, "Order migration request did not return an id");
}

export async function upsertCurrentUserProfileRpc(input: Record<string, Json>): Promise<Json> {
  const { data, error } = await customerAccountMutationRpc.rpc("upsert_current_user_profile", {
    p_profile: input,
  });

  return unwrapRpcData(data, error, "Profile update did not return data");
}
