import { callAuthenticatedEdgeFunctionData } from "@/services/supabase/edge-function-client";

type AdminRpcArgs = Record<string, unknown>;

export async function callAdminRpc<TData = unknown>(
  functionName: string,
  args: AdminRpcArgs = {},
): Promise<TData> {
  return callAuthenticatedEdgeFunctionData<TData, {
    functionName: string;
    args: AdminRpcArgs;
  }>(
    "admin-rpc",
    { functionName, args },
    "Admin operation failed",
  );
}
