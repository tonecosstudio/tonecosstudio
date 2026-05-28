import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

type RpcError = {
  message: string;
};

type RpcResult<T> = Promise<{
  data: T | null;
  error: RpcError | null;
}>;

export type EmailDeliveryLogUpdate = {
  status?: string;
  sent_at?: string;
  error_message?: string;
  retry_count?: number;
  provider_message_id?: string;
};

interface EmailLogMutationRpcClient {
  rpc(
    fn: "create_email_delivery_log",
    args: {
      p_user_id: string | null;
      p_recipient_email: string;
      p_email_type: string;
      p_subject: string;
      p_status: string;
      p_provider: string;
      p_metadata: Json;
    }
  ): RpcResult<string>;
  rpc(
    fn: "update_email_delivery_log",
    args: {
      p_log_id: string;
      p_updates: EmailDeliveryLogUpdate;
    }
  ): RpcResult<string>;
}

const emailLogMutationRpc = supabase as unknown as EmailLogMutationRpcClient;

function unwrapRpcData<T>(data: T | null, error: RpcError | null, fallback: string): T {
  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error(fallback);
  }

  return data;
}

export async function createEmailDeliveryLogRpc(data: {
  userId?: string;
  recipientEmail: string;
  emailType: string;
  subject: string;
  status: string;
  provider: string;
  metadata: Record<string, Json>;
}): Promise<string> {
  const { data: logId, error } = await emailLogMutationRpc.rpc("create_email_delivery_log", {
    p_user_id: data.userId ?? null,
    p_recipient_email: data.recipientEmail,
    p_email_type: data.emailType,
    p_subject: data.subject,
    p_status: data.status,
    p_provider: data.provider,
    p_metadata: data.metadata,
  });

  return unwrapRpcData(logId, error, "Email delivery log creation did not return an id");
}

export async function updateEmailDeliveryLogRpc(
  logId: string,
  updates: EmailDeliveryLogUpdate
): Promise<void> {
  const { data, error } = await emailLogMutationRpc.rpc("update_email_delivery_log", {
    p_log_id: logId,
    p_updates: updates,
  });

  unwrapRpcData(data, error, "Email delivery log update did not return an id");
}
