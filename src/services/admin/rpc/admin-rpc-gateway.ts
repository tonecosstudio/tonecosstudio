import { callAuthenticatedEdgeFunctionData } from "@/services/supabase/edge-function-client";

type AdminRpcArgs = Record<string, unknown>;

const ADMIN_OPERATION_ERROR = "Admin operation failed";

const CONFIRMED_SUCCESS_RPCS = new Set([
  "admin_cancel_standalone_purchase",
  "admin_mark_standalone_production_complete",
  "admin_approve_standalone_payment_voucher",
  "admin_reject_standalone_payment_voucher",
  "admin_update_standalone_tracking_code",
  "admin_update_standalone_fulfillment_status",
]);

function assertConfirmedSuccess(functionName: string, value: unknown): void {
  if (!CONFIRMED_SUCCESS_RPCS.has(functionName)) {
    return;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(ADMIN_OPERATION_ERROR);
  }

  const response = value as {
    success?: unknown;
    error?: unknown;
    message?: unknown;
  };

  if (response.success === true) {
    return;
  }

  if (typeof response.error === "string" && response.error.trim()) {
    throw new Error(response.error);
  }

  if (typeof response.message === "string" && response.message.trim()) {
    throw new Error(response.message);
  }

  throw new Error(ADMIN_OPERATION_ERROR);
}

export async function callAdminRpc<TData = unknown>(
  functionName: string,
  args: AdminRpcArgs = {},
): Promise<TData> {
  const data = await callAuthenticatedEdgeFunctionData<TData, {
    functionName: string;
    args: AdminRpcArgs;
  }>(
    "admin-rpc",
    { functionName, args },
    ADMIN_OPERATION_ERROR,
  );

  assertConfirmedSuccess(functionName, data);
  return data;
}
