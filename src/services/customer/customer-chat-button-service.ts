import { supabase } from "@/integrations/supabase/client";
import { assertCurrentUserId } from "@/services/auth/current-user";
import {
  createRealtimeChannel,
  removeRealtimeChannel,
  type SupabaseRealtimeChannel,
} from "@/services/supabase/realtime-client";
import { createSupportConversationRpc } from "@/services/support/support-conversation-mutations-service";
import {
  hydrateSupportConversation,
  hydrateSupportConversations,
  type SupportConversationRow,
} from "@/services/support/support-conversation-hydration-service";
import type { Conversation } from "@/types/support";

interface CountQueryResult {
  count: number | null;
  error: { message: string } | null;
}

interface SupportMessageUnreadQuery {
  in(column: string, values: string[]): SupportMessageUnreadQuery;
  eq(column: string, value: unknown): SupportMessageUnreadQuery;
  then<TResult1 = CountQueryResult, TResult2 = never>(
    onfulfilled?:
      | ((value: CountQueryResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2>;
}

export async function countUnreadCustomerSupportMessages(
  userId: string,
): Promise<number> {
  await assertCurrentUserId(userId);

  const { data: conversations, error: conversationError } = await supabase
    .from("support_conversations")
    .select("id")
    .eq("user_id", userId)
    .neq("status", "closed");

  if (conversationError) {
    throw conversationError;
  }

  const conversationIds = (conversations ?? []).map(
    (conversation) => conversation.id,
  );
  if (conversationIds.length === 0) {
    return 0;
  }

  const unreadQuery = supabase.from("support_messages").select("*", {
    count: "exact",
    head: true,
  }) as unknown as SupportMessageUnreadQuery;

  const { count, error } = await unreadQuery
    .in("conversation_id", conversationIds)
    .eq("sender_type", "admin")
    .eq("read_by_customer", false);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function listCustomerSupportConversations(
  userId: string,
): Promise<Conversation[]> {
  await assertCurrentUserId(userId);

  const { data, error } = await supabase
    .from("support_conversations")
    .select("*")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false });

  if (error) {
    throw error;
  }

  return hydrateSupportConversations(
    (data ?? []) as SupportConversationRow[],
    "customer",
  );
}

export async function createCustomerSupportConversation(
  userId: string,
): Promise<Conversation> {
  await assertCurrentUserId(userId);

  const conversation = await createSupportConversationRpc({
    userId,
    subject: "Nova solicitacao",
    status: "new",
    priority: "normal",
  });

  return hydrateSupportConversation(
    conversation as SupportConversationRow,
    "customer",
  );
}

export async function subscribeToCustomerChatUpdates(
  userId: string,
  onChange: () => void,
): Promise<SupabaseRealtimeChannel> {
  await assertCurrentUserId(userId);

  return createRealtimeChannel("chat_button_updates")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "support_conversations",
        filter: `user_id=eq.${userId}`,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
      },
      onChange,
    )
    .subscribe();
}

export function unsubscribeFromCustomerChatUpdates(
  channel: SupabaseRealtimeChannel,
): void {
  void removeRealtimeChannel(channel);
}
