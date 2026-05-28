import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type {
  ConversationPriority,
  ConversationStatus,
  ConversationTag,
  RiskFlag,
} from "@/types/support";

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

interface JsonObject {
  [key: string]: JsonValue | undefined;
}

export type SupportConversationMutationRow =
  Database["public"]["Tables"]["support_conversations"]["Row"] & {
    order_id?: string | null;
    quote_id?: string | null;
    subscription_id?: string | null;
    promised_date?: string | null;
    tags?: unknown;
    risk_flags?: unknown;
  };

interface SupportConversationRpcError {
  message: string;
}

interface SupportConversationRpcClient {
  rpc(
    name: "create_support_conversation",
    args: {
      p_user_id: string;
      p_subject: string;
      p_status: ConversationStatus | "open";
      p_priority: ConversationPriority | "medium";
      p_tags: string[];
      p_order_id: string | null;
      p_quote_id: string | null;
      p_subscription_id: string | null;
      p_payment_id: string | null;
      p_first_message: string | null;
    }
  ): Promise<{ data: SupportConversationMutationRow | null; error: SupportConversationRpcError | null }>;
  rpc(
    name: "admin_update_support_conversation",
    args: { p_conversation_id: string; p_updates: JsonObject }
  ): Promise<{ data: SupportConversationMutationRow | null; error: SupportConversationRpcError | null }>;
}

const supportConversationRpc = supabase as unknown as SupportConversationRpcClient;

export async function createSupportConversationRpc(input: {
  userId: string;
  subject: string;
  status?: ConversationStatus | "open";
  priority?: ConversationPriority | "medium";
  tags?: ConversationTag[];
  orderId?: string | null;
  quoteId?: string | null;
  subscriptionId?: string | null;
  paymentId?: string | null;
  firstMessage?: string | null;
}): Promise<SupportConversationMutationRow> {
  const { data, error } = await supportConversationRpc.rpc("create_support_conversation", {
    p_user_id: input.userId,
    p_subject: input.subject,
    p_status: input.status ?? "new",
    p_priority: input.priority ?? "normal",
    p_tags: input.tags ?? [],
    p_order_id: input.orderId ?? null,
    p_quote_id: input.quoteId ?? null,
    p_subscription_id: input.subscriptionId ?? null,
    p_payment_id: input.paymentId ?? null,
    p_first_message: input.firstMessage ?? null,
  });

  if (error) throw error;
  if (!data) throw new Error("Conversa de suporte nao encontrada");

  return data;
}

export async function updateSupportConversationRpc(
  conversationId: string,
  updates: {
    status?: ConversationStatus | "open";
    priority?: ConversationPriority | "medium";
    tags?: ConversationTag[];
    risk_flags?: RiskFlag[];
    promised_date?: string | null;
    assigned_to?: string | null;
  }
): Promise<SupportConversationMutationRow> {
  const { data, error } = await supportConversationRpc.rpc("admin_update_support_conversation", {
    p_conversation_id: conversationId,
    p_updates: updates as JsonObject,
  });

  if (error) throw error;
  if (!data) throw new Error("Conversa de suporte nao encontrada");

  return data;
}
