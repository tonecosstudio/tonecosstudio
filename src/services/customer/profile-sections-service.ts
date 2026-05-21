import { supabase } from "@/integrations/supabase/client";

export type ProfilePaymentMethod = {
  id: string;
  type: string | null;
  card_brand?: string | null;
  card_last4?: string | null;
  card_holder_name?: string | null;
  card_expiry_month?: number | null;
  card_expiry_year?: number | null;
  is_default?: boolean | null;
};

export type ActiveSubscription = {
  id: string;
  user_id: string;
  plan_type: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

export type SupportConversation = {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  created_at: string;
  last_message_at: string | null;
};

export type SupportMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  is_internal?: boolean | null;
};

export async function listProfilePaymentMethods(userId: string): Promise<ProfilePaymentMethod[]> {
  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("is_default", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ProfilePaymentMethod[];
}

export async function deleteProfilePaymentMethod(paymentMethodId: string): Promise<void> {
  const { error } = await supabase.from("payment_methods").delete().eq("id", paymentMethodId);
  if (error) throw error;
}

export async function setDefaultProfilePaymentMethod(paymentMethodId: string): Promise<void> {
  const { error } = await supabase
    .from("payment_methods")
    .update({ is_default: true })
    .eq("id", paymentMethodId);

  if (error) throw error;
}

export async function getActiveSubscription(userId: string): Promise<ActiveSubscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id,user_id,plan_type,status,created_at,updated_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return (data ?? null) as ActiveSubscription | null;
}

export async function listSupportConversations(userId: string): Promise<SupportConversation[]> {
  const { data, error } = await supabase
    .from("support_conversations")
    .select("*")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SupportConversation[];
}

export async function listSupportMessages(conversationId: string): Promise<SupportMessage[]> {
  const { data, error } = await supabase
    .from("support_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("is_internal", false)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SupportMessage[];
}

export function subscribeToSupportMessages(
  conversationId: string,
  onMessage: (message: SupportMessage) => void,
) {
  const channel = supabase
    .channel(`support_messages_${conversationId}`)
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
    supabase.removeChannel(channel);
  };
}

export async function markSupportMessagesRead(params: {
  conversationId: string;
  userId: string;
}): Promise<void> {
  const { error } = await supabase
    .from("support_messages")
    .update({ read_by_customer: true, read_at: new Date().toISOString() })
    .eq("conversation_id", params.conversationId)
    .eq("read_by_customer", false)
    .neq("sender_id", params.userId);

  if (error) throw error;
}

export async function createSupportConversation(params: {
  userId: string;
  subject: string;
  firstMessage: string;
}): Promise<SupportConversation> {
  const { data: conversation, error: convError } = await supabase
    .from("support_conversations")
    .insert({
      user_id: params.userId,
      subject: params.subject,
      status: "waiting_admin",
    })
    .select()
    .single();

  if (convError) throw convError;

  const { error: msgError } = await supabase.from("support_messages").insert({
    conversation_id: conversation.id,
    sender_id: params.userId,
    message: params.firstMessage,
  });

  if (msgError) throw msgError;
  return conversation as SupportConversation;
}

export async function sendSupportMessage(params: {
  conversationId: string;
  userId: string;
  message: string;
}): Promise<void> {
  const { error } = await supabase.from("support_messages").insert({
    conversation_id: params.conversationId,
    sender_id: params.userId,
    message: params.message,
  });

  if (error) throw error;
}
