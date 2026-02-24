/**
 * ConversationService - Service for managing support conversations for payments
 *
 * Requirements: 4.1-4.11
 * Design: .kiro/specs/manual-payment-system/design.md
 *
 * This service extends the support conversation system to handle payment-related
 * conversations with automatic creation, message handling, and real-time updates.
 */

import { supabase } from "@/integrations/supabase/client";
import type { SupportConversation } from "@/types/manual-payment";
import { getNotificationService } from "./notification-service";

/**
 * Message structure for support conversations
 */
export interface ConversationMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  is_internal: boolean;
  attachments: string[];
  read_by_customer: boolean;
  read_by_admin: boolean;
  read_at?: string | null;
  created_at: string;
}

/**
 * Create a support conversation for a payment
 * Automatically formats the subject as "Pagamento - Pedido #[reference_number]"
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4
 *
 * @param paymentId - Payment UUID
 * @param userId - User UUID who created the payment
 * @param referenceNumber - Payment reference number
 * @returns Created conversation record
 * @throws Error if conversation creation fails
 */
export async function createForPayment(
  paymentId: string,
  userId: string,
  referenceNumber: string
): Promise<SupportConversation> {
  // Format subject according to requirement 4.2
  const subject = `Pagamento - Pedido #${referenceNumber}`;

  const { data, error } = await supabase
    .from("support_conversations")
    .insert({
      user_id: userId,
      subject,
      status: "waiting_admin",
      priority: "normal",
      payment_id: paymentId,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  return data as SupportConversation;
}

/**
 * Send a message in a conversation with optional attachments
 *
 * Requirements: 4.8
 *
 * @param conversationId - Conversation UUID
 * @param senderId - User UUID sending the message
 * @param message - Message text content
 * @param attachments - Optional array of attachment URLs
 * @param isInternal - Whether this is an internal admin note (default: false)
 * @returns Created message record
 * @throws Error if message send fails
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  message: string,
  attachments?: string[],
  isInternal: boolean = false
): Promise<ConversationMessage> {
  if (!message || message.trim().length === 0) {
    throw new Error("Message content is required");
  }

  const { data, error } = await supabase
    .from("support_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      message: message.trim(),
      attachments: attachments || [],
      is_internal: isInternal,
      read_by_customer: false,
      read_by_admin: false,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to send message: ${error.message}`);
  }

  const messageRecord = data as ConversationMessage;

  // Send new message notification (unless it's an internal message)
  if (!isInternal) {
    try {
      const notificationService = getNotificationService();
      await notificationService.sendNewMessage(conversationId, messageRecord.id);
    } catch (error) {
      // Don't fail message sending if notification fails
      console.error("Failed to send new message notification:", error);
    }
  }

  return messageRecord;
}

/**
 * Mark conversation messages as read
 *
 * Requirements: 4.10, 4.11
 *
 * @param conversationId - Conversation UUID
 * @param isAdmin - Whether the reader is an admin (true) or customer (false)
 * @throws Error if mark as read fails
 */
export async function markAsRead(conversationId: string, isAdmin: boolean): Promise<void> {
  const updateField = isAdmin ? "read_by_admin" : "read_by_customer";

  const { error } = await supabase
    .from("support_messages")
    .update({
      [updateField]: true,
      read_at: new Date().toISOString(),
    })
    .eq("conversation_id", conversationId)
    .eq(updateField, false);

  if (error) {
    throw new Error(`Failed to mark messages as read: ${error.message}`);
  }
}

/**
 * Get all messages for a conversation
 *
 * Requirements: 4.9
 *
 * @param conversationId - Conversation UUID
 * @param includeInternal - Whether to include internal admin notes (default: false)
 * @returns Array of messages ordered by creation date
 * @throws Error if fetch fails
 */
export async function getMessages(
  conversationId: string,
  includeInternal: boolean = false
): Promise<ConversationMessage[]> {
  let query = supabase.from("support_messages").select("*").eq("conversation_id", conversationId);

  // Filter out internal messages unless explicitly requested
  if (!includeInternal) {
    query = query.eq("is_internal", false);
  }

  // Order by creation date (oldest first for chat display)
  query = query.order("created_at", { ascending: true });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get messages: ${error.message}`);
  }

  return data as ConversationMessage[];
}

/**
 * Subscribe to real-time message updates for a conversation
 *
 * Requirements: 4.9, 16.7
 *
 * @param conversationId - Conversation UUID
 * @param callback - Function to call when new messages arrive
 * @returns Unsubscribe function to clean up the subscription
 */
export function subscribeToMessages(
  conversationId: string,
  callback: (message: ConversationMessage) => void
): () => void {
  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        callback(payload.new as ConversationMessage);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Get conversation by payment ID
 *
 * @param paymentId - Payment UUID
 * @returns Conversation record or null if not found
 * @throws Error if fetch fails
 */
export async function getConversationByPaymentId(
  paymentId: string
): Promise<SupportConversation | null> {
  const { data, error } = await supabase
    .from("support_conversations")
    .select("*")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get conversation: ${error.message}`);
  }

  return data as SupportConversation | null;
}

/**
 * Get unread message count for a conversation
 *
 * @param conversationId - Conversation UUID
 * @param isAdmin - Whether to count unread for admin (true) or customer (false)
 * @returns Number of unread messages
 * @throws Error if count fails
 */
export async function getUnreadCount(conversationId: string, isAdmin: boolean): Promise<number> {
  const readField = isAdmin ? "read_by_admin" : "read_by_customer";

  const { count, error } = await supabase
    .from("support_messages")
    .select("*", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq(readField, false)
    .eq("is_internal", false);

  if (error) {
    throw new Error(`Failed to get unread count: ${error.message}`);
  }

  return count || 0;
}
