/**
 * ReminderService - Service for processing automatic conversation reminders
 *
 * Requirements: 23.3, 23.4
 * Design: .kiro/specs/advanced-chat-support-system/design.md
 *
 * This service processes pending reminders for quotes, payments, and promised dates,
 * creating automatic messages in conversations when reminders are due.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Reminder structure from conversation_reminders table
 */
export interface ConversationReminder {
  id: string;
  conversation_id: string;
  reminder_type: "quote_followup" | "payment_pending" | "promised_date";
  scheduled_for: string;
  sent_at: string | null;
  is_active: boolean;
  created_at: string;
}

/**
 * Result of processing reminders
 */
export interface ProcessRemindersResult {
  processed: number;
  failed: number;
  errors: Array<{ reminderId: string; error: string }>;
}

/**
 * Get reminder message template based on reminder type
 *
 * @param reminderType - Type of reminder
 * @returns Message template string
 */
function getReminderMessageTemplate(reminderType: ConversationReminder["reminder_type"]): string {
  const templates = {
    quote_followup:
      "🔔 Lembrete: Você tem um orçamento pendente de resposta. Podemos ajudar com alguma dúvida?",
    payment_pending:
      "🔔 Lembrete: Seu pagamento está aguardando confirmação. Se já realizou o pagamento, por favor envie o comprovante.",
    promised_date:
      "🔔 Lembrete: A data prometida para este atendimento está próxima. Estamos trabalhando para cumprir o prazo.",
  };

  return templates[reminderType];
}

/**
 * Process pending reminders and create automatic messages
 *
 * Fetches all reminders where:
 * - scheduled_for <= now (due or overdue)
 * - is_active = true (not cancelled)
 * - sent_at IS NULL (not yet sent)
 *
 * For each reminder:
 * 1. Creates an automatic system message in the conversation
 * 2. Marks the reminder as sent (sets sent_at = now)
 *
 * Requirements: 23.3, 23.4
 *
 * @returns Result object with counts of processed and failed reminders
 */
export async function processReminders(): Promise<ProcessRemindersResult> {
  const result: ProcessRemindersResult = {
    processed: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Fetch pending reminders that are due
    const { data: reminders, error: fetchError } = await supabase
      .from("conversation_reminders")
      .select("*")
      .lte("scheduled_for", new Date().toISOString())
      .eq("is_active", true)
      .is("sent_at", null)
      .order("scheduled_for", { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch reminders: ${fetchError.message}`);
    }

    if (!reminders || reminders.length === 0) {
      return result;
    }

    // Process each reminder
    for (const reminder of reminders as ConversationReminder[]) {
      try {
        // Get conversation to find user_id for sender_id
        const { data: conversation, error: convError } = await supabase
          .from("support_conversations")
          .select("user_id")
          .eq("id", reminder.conversation_id)
          .single();

        if (convError || !conversation) {
          throw new Error(`Conversation not found: ${convError?.message || "Unknown error"}`);
        }

        // Create automatic message in the conversation
        const message = getReminderMessageTemplate(reminder.reminder_type);

        const { error: messageError } = await supabase.from("support_messages").insert({
          conversation_id: reminder.conversation_id,
          sender_id: conversation.user_id,
          sender_type: "system",
          message,
          is_internal: false,
          read_by_customer: false,
          read_by_admin: false,
        });

        if (messageError) {
          throw new Error(`Failed to create message: ${messageError.message}`);
        }

        // Mark reminder as sent
        const { error: updateError } = await supabase
          .from("conversation_reminders")
          .update({
            sent_at: new Date().toISOString(),
          })
          .eq("id", reminder.id);

        if (updateError) {
          throw new Error(`Failed to mark reminder as sent: ${updateError.message}`);
        }

        result.processed++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          reminderId: reminder.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        console.error(`Failed to process reminder ${reminder.id}:`, error);
      }
    }

    return result;
  } catch (error) {
    console.error("Failed to process reminders:", error);
    throw error;
  }
}

/**
 * Create a new reminder for a conversation
 *
 * @param conversationId - Conversation UUID
 * @param reminderType - Type of reminder
 * @param scheduledFor - Date/time when reminder should be sent
 * @returns Created reminder record
 * @throws Error if reminder creation fails
 */
export async function createReminder(
  conversationId: string,
  reminderType: ConversationReminder["reminder_type"],
  scheduledFor: Date
): Promise<ConversationReminder> {
  const { data, error } = await supabase
    .from("conversation_reminders")
    .insert({
      conversation_id: conversationId,
      reminder_type: reminderType,
      scheduled_for: scheduledFor.toISOString(),
      is_active: true,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create reminder: ${error.message}`);
  }

  return data as ConversationReminder;
}

/**
 * Cancel a reminder (sets is_active to false)
 *
 * @param reminderId - Reminder UUID
 * @throws Error if cancellation fails
 */
export async function cancelReminder(reminderId: string): Promise<void> {
  const { error } = await supabase
    .from("conversation_reminders")
    .update({ is_active: false })
    .eq("id", reminderId);

  if (error) {
    throw new Error(`Failed to cancel reminder: ${error.message}`);
  }
}

/**
 * Get all reminders for a conversation
 *
 * @param conversationId - Conversation UUID
 * @param includeInactive - Whether to include cancelled reminders (default: false)
 * @returns Array of reminders ordered by scheduled date
 * @throws Error if fetch fails
 */
export async function getReminders(
  conversationId: string,
  includeInactive: boolean = false
): Promise<ConversationReminder[]> {
  let query = supabase
    .from("conversation_reminders")
    .select("*")
    .eq("conversation_id", conversationId);

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  query = query.order("scheduled_for", { ascending: true });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get reminders: ${error.message}`);
  }

  return data as ConversationReminder[];
}
