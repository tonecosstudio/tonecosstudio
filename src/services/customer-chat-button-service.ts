import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type {
  Conversation,
  ConversationPriority,
  ConversationStatus,
  ConversationTag,
  RiskFlag,
} from "@/types/support";

type SupportConversationRow = Tables<"support_conversations"> & {
  order_id?: string | null;
  quote_id?: string | null;
  subscription_id?: string | null;
  promised_date?: string | null;
  tags?: unknown;
  risk_flags?: unknown;
};

interface CountQueryResult {
  count: number | null;
  error: { message: string } | null;
}

interface SupportMessageUnreadQuery {
  in(column: string, values: string[]): SupportMessageUnreadQuery;
  eq(column: string, value: unknown): SupportMessageUnreadQuery;
  then<TResult1 = CountQueryResult, TResult2 = never>(
    onfulfilled?: ((value: CountQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2>;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function mapConversation(row: SupportConversationRow): Conversation {
  return {
    id: row.id,
    user_id: row.user_id,
    subject: row.subject,
    status: row.status as ConversationStatus,
    priority: (row.priority ?? "normal") as ConversationPriority,
    tags: toStringArray(row.tags) as ConversationTag[],
    risk_flags: toStringArray(row.risk_flags) as RiskFlag[],
    assigned_to: row.assigned_to ?? undefined,
    promised_date: row.promised_date ?? undefined,
    first_response_at: row.first_response_at ?? undefined,
    resolved_at: row.resolved_at ?? undefined,
    last_message_at: row.last_message_at ?? row.updated_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    order_id: row.order_id ?? undefined,
    quote_id: row.quote_id ?? undefined,
    subscription_id: row.subscription_id ?? undefined,
    payment_id: row.payment_id ?? undefined,
  };
}

export async function countUnreadCustomerSupportMessages(userId: string): Promise<number> {
  const { data: conversations, error: conversationError } = await supabase
    .from("support_conversations")
    .select("id")
    .eq("user_id", userId)
    .neq("status", "closed");

  if (conversationError) {
    throw conversationError;
  }

  const conversationIds = (conversations ?? []).map((conversation) => conversation.id);
  if (conversationIds.length === 0) {
    return 0;
  }

  const unreadQuery = supabase
    .from("support_messages")
    .select("*", { count: "exact", head: true }) as unknown as SupportMessageUnreadQuery;

  const { count, error } = await unreadQuery
    .in("conversation_id", conversationIds)
    .eq("sender_type", "admin")
    .eq("read_by_customer", false);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function listCustomerSupportConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("support_conversations")
    .select("*")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as SupportConversationRow[]).map(mapConversation);
}

export async function createCustomerSupportConversation(userId: string): Promise<Conversation> {
  const { data, error } = await supabase
    .from("support_conversations")
    .insert({
      user_id: userId,
      subject: "Nova Solicitação",
      status: "new",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapConversation(data as SupportConversationRow);
}

export function subscribeToCustomerChatUpdates(
  userId: string,
  onChange: () => void
): RealtimeChannel {
  return supabase
    .channel("chat_button_updates")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "support_conversations",
        filter: `user_id=eq.${userId}`,
      },
      onChange
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
      },
      onChange
    )
    .subscribe();
}

export function unsubscribeFromCustomerChatUpdates(channel: RealtimeChannel): void {
  void supabase.removeChannel(channel);
}
