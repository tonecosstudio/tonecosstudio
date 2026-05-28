import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

type RpcError = {
  message: string;
};

type RpcResult<T> = Promise<{
  data: T | null;
  error: RpcError | null;
}>;

type CapacityAlertConfigResponse = {
  threshold: number;
  email: string | null;
  sms: string | null;
};

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
  rpc(
    fn: "configure_capacity_alert",
    args: {
      p_cycle_id: string;
      p_threshold: number;
      p_email: string | null;
      p_sms: string | null;
    }
  ): RpcResult<CapacityAlertConfigResponse>;
  rpc(fn: "check_capacity_alert", args: { p_cycle_id: string }): RpcResult<boolean>;
  rpc(fn: "reset_capacity_alert", args: { p_cycle_id: string }): RpcResult<boolean>;
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

export async function configureCapacityAlertRpc(input: {
  cycleId: string;
  threshold: number;
  email: string | null;
  sms: string | null;
}): Promise<CapacityAlertConfigResponse> {
  const { data, error } = await customerAccountMutationRpc.rpc("configure_capacity_alert", {
    p_cycle_id: input.cycleId,
    p_threshold: input.threshold,
    p_email: input.email,
    p_sms: input.sms,
  });

  return unwrapRpcData(data, error, "Capacity alert configuration did not return data");
}

export async function checkCapacityAlertRpc(cycleId: string): Promise<boolean> {
  const { data, error } = await customerAccountMutationRpc.rpc("check_capacity_alert", {
    p_cycle_id: cycleId,
  });

  return unwrapRpcData(data, error, "Capacity alert check did not return data");
}

export async function resetCapacityAlertRpc(cycleId: string): Promise<boolean> {
  const { data, error } = await customerAccountMutationRpc.rpc("reset_capacity_alert", {
    p_cycle_id: cycleId,
  });

  return unwrapRpcData(data, error, "Capacity alert reset did not return data");
}

export async function upsertCurrentUserProfileRpc(input: Record<string, Json>): Promise<Json> {
  const { data, error } = await customerAccountMutationRpc.rpc("upsert_current_user_profile", {
    p_profile: input,
  });

  return unwrapRpcData(data, error, "Profile update did not return data");
}
