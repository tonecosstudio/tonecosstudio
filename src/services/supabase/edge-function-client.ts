import { supabase } from "@/integrations/supabase/client";
import type { FunctionInvokeOptions } from "@supabase/supabase-js";

async function getFunctionInvokeErrorMessage(
  error: unknown,
  fallbackErrorMessage: string,
): Promise<string> {
  const maybeError = error as {
    message?: string;
    context?: { clone?: () => Response; json?: () => Promise<unknown> };
  };
  const context = maybeError?.context;

  try {
    const response =
      typeof context?.clone === "function"
        ? context.clone()
        : (context as Response | undefined);
    const payload = await response?.json?.();

    if (payload && typeof payload === "object") {
      const body = payload as { error?: unknown; message?: unknown };
      if (typeof body.error === "string" && body.error.trim())
        return body.error;
      if (typeof body.message === "string" && body.message.trim())
        return body.message;
    }
  } catch {
    // Fall through to the SDK-provided message.
  }

  return maybeError?.message || fallbackErrorMessage;
}

export async function callAuthenticatedEdgeFunction<TResponse, TBody = unknown>(
  functionName: string,
  body: TBody,
  fallbackErrorMessage: string,
): Promise<TResponse> {
  const { data, error } = await supabase.functions.invoke<TResponse>(
    functionName,
    {
      body: body as FunctionInvokeOptions["body"],
    },
  );

  if (error) {
    throw new Error(
      await getFunctionInvokeErrorMessage(error, fallbackErrorMessage),
    );
  }

  if (data === null || data === undefined) {
    return undefined as TResponse;
  }

  return data;
}

export async function callAuthenticatedEdgeFunctionData<TData, TBody = unknown>(
  functionName: string,
  body: TBody,
  fallbackErrorMessage: string,
): Promise<TData> {
  const payload = await callAuthenticatedEdgeFunction<{ data: TData }, TBody>(
    functionName,
    body,
    fallbackErrorMessage,
  );

  return payload.data;
}
