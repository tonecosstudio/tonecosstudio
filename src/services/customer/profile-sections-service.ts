import { supabase } from "@/integrations/supabase/client";
import {
  createRealtimeChannel,
  removeRealtimeChannel,
} from "@/services/supabase/realtime-client";
import { createSupportConversationRpc } from "@/services/support/support-conversation-mutations-service";
import {
  assertCurrentUserId,
  requireAuthenticatedUserId,
} from "@/services/auth/current-user";
import { fetchActiveSubscriptionSummary } from "@/services/subscriptions/subscription-summary-service";
import type {
  ActiveSubscription,
  ProfilePaymentMethod,
  SupportConversation,
  SupportMessage,
} from "@/types/profile-sections";

interface ProfileSectionRpcError {
  message: string;
}

interface ProfileSectionRpcClient {
  rpc(
    name: "delete_profile_payment_method",
    args: { p_payment_method_id: string }
  ): Promise<{ data: string | null; error: ProfileSectionRpcError | null }>;
  rpc(
    name: "set_default_profile_payment_method",
    args: { p_payment_method_id: string }
  ): Promise<{ data: string | null; error: ProfileSectionRpcError | null }>;
  rpc(
    name: "mark_customer_support_conversation_read",
    args: { p_conversation_id: string }
  ): Promise<{ data: number | null; error: ProfileSectionRpcError | null }>;
  rpc(
    name: "send_support_message",
    args: {
      p_conversation_id: string;
      p_sender_type: "customer";
      p_message: string;
      p_is_internal: false;
    }
  ): Promise<{ data: SupportMessage | null; error: ProfileSectionRpcError | null }>;
}

const profileSectionRpc = supabase as unknown as ProfileSectionRpcClient;

interface ProfilePaymentMethodsQuery extends PromiseLike<{
  data: ProfilePaymentMethod[] | null;
  error: { message: string } | null;
}> {
  eq(column: string, value: string | boolean): ProfilePaymentMethodsQuery;
  order(column: string, options?: { ascending?: boolean }): ProfilePaymentMethodsQuery;
}

interface SupportMessagesQuery extends PromiseLike<{
  data: SupportMessage[] | null;
  error: { message: string } | null;
}> {
  eq(column: string, value: string | boolean): SupportMessagesQuery;
  order(column: string, options?: { ascending?: boolean }): SupportMessagesQuery;
}

interface ProfileSectionsGateway {
  from(table: "payment_methods"): {
    select(columns: "*"): ProfilePaymentMethodsQuery;
  };
  from(table: "support_messages"): {
    select(columns: "*"): SupportMessagesQuery;
  };
}

const profileSectionsGateway = supabase as unknown as ProfileSectionsGateway;

async function ensureOwnSupportConversation(conversationId: string, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("support_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Conversa de suporte nao encontrada");
}

export async function listProfilePaymentMethods(userId: string): Promise<ProfilePaymentMethod[]> {
  await assertCurrentUserId(userId);

  const { data, error } = await profileSectionsGateway
    .from("payment_methods")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("is_default", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function deleteProfilePaymentMethod(paymentMethodId: string): Promise<void> {
  await requireAuthenticatedUserId();

  const { error } = await profileSectionRpc.rpc("delete_profile_payment_method", {
    p_payment_method_id: paymentMethodId,
  });

  if (error) throw error;
}

export async function setDefaultProfilePaymentMethod(paymentMethodId: string): Promise<void> {
  await requireAuthenticatedUserId();

  const { error } = await profileSectionRpc.rpc("set_default_profile_payment_method", {
    p_payment_method_id: paymentMethodId,
  });

  if (error) throw error;
}

export async function getActiveSubscription(userId: string): Promise<ActiveSubscription | null> {
  await assertCurrentUserId(userId);
  return fetchActiveSubscriptionSummary(userId);
}

export async function listSupportConversations(userId: string): Promise<SupportConversation[]> {
  await assertCurrentUserId(userId);

  const { data, error } = await supabase
    .from("support_conversations")
    .select("*")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SupportConversation[];
}

export async function listSupportMessages(conversationId: string): Promise<SupportMessage[]> {
  const userId = await requireAuthenticatedUserId();
  await ensureOwnSupportConversation(conversationId, userId);

  const { data, error } = await profileSectionsGateway
    .from("support_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("is_internal", false)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export function subscribeToSupportMessages(
  conversationId: string,
  onMessage: (message: SupportMessage) => void,
) {
  const channel = createRealtimeChannel(`support_messages_${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const message = payload.new as SupportMessage;
        if (!message.is_internal) onMessage(message);
      },
    )
    .subscribe();

  return () => {
    removeRealtimeChannel(channel);
  };
}

export async function markSupportMessagesRead(params: {
  conversationId: string;
  userId: string;
}): Promise<void> {
  await assertCurrentUserId(params.userId);
  await ensureOwnSupportConversation(params.conversationId, params.userId);

  const { error } = await profileSectionRpc.rpc("mark_customer_support_conversation_read", {
    p_conversation_id: params.conversationId,
  });

  if (error) throw error;
}

export async function createSupportConversation(params: {
  userId: string;
  subject: string;
  firstMessage: string;
}): Promise<SupportConversation> {
  await assertCurrentUserId(params.userId);

  const conversation = await createSupportConversationRpc({
    userId: params.userId,
    subject: params.subject,
    status: "waiting_admin",
    priority: "normal",
    tags: ["duvida"],
    firstMessage: params.firstMessage,
  });

  return conversation as SupportConversation;
}

export async function sendSupportMessage(params: {
  conversationId: string;
  userId: string;
  message: string;
}): Promise<void> {
  await assertCurrentUserId(params.userId);

  const { error } = await profileSectionRpc.rpc("send_support_message", {
    p_conversation_id: params.conversationId,
    p_sender_type: "customer",
    p_message: params.message,
    p_is_internal: false,
  });

  if (error) throw error;
}
