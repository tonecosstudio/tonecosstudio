/**
 * ReminderService - Service for processing automatic conversation reminders
 *
 * Requirements: 23.3, 23.4
 * Design: .kiro/specs/advanced-chat-support-system/design.md
 *
 * This service processes pending reminders for quotes, payments, and promised dates.
 * Mutations are routed through SECURITY DEFINER RPCs so browser code never writes
 * directly to support_messages or conversation_reminders.
 */

import { supabase } from "@/integrations/supabase/client";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";

export interface ConversationReminder {
  id: string;
  conversation_id: string;
  reminder_type: "quote_followup" | "payment_pending" | "promised_date";
  scheduled_for: string;
  sent_at: string | null;
  is_active: boolean;
  created_at: string;
}

type ReminderQueryError = {
  message: string;
};

type ConversationReminderQueryResult = {
  data: ConversationReminder[] | null;
  error: ReminderQueryError | null;
};

interface ConversationReminderQuery extends PromiseLike<ConversationReminderQueryResult> {
  eq(column: string, value: boolean | string | null): ConversationReminderQuery;
  is(column: string, value: null): ConversationReminderQuery;
  lte(column: string, value: string): ConversationReminderQuery;
  order(column: string, options: { ascending: boolean }): ConversationReminderQuery;
}

interface ConversationReminderSelect {
  select(columns: string): ConversationReminderQuery;
}

interface ConversationReminderTableClient {
  from(table: "conversation_reminders"): ConversationReminderSelect;
}

const conversationReminderTable = supabase as unknown as ConversationReminderTableClient;

export async function createReminder(
  conversationId: string,
  reminderType: ConversationReminder["reminder_type"],
  scheduledFor: Date
): Promise<ConversationReminder> {
  const data = await callAdminRpc<ConversationReminder | null>("admin_create_conversation_reminder", {
    p_conversation_id: conversationId,
    p_reminder_type: reminderType,
    p_scheduled_for: scheduledFor.toISOString(),
  });

  if (!data) {
    throw new Error("Failed to create reminder: No reminder returned");
  }

  return data;
}

export async function cancelReminder(reminderId: string): Promise<void> {
  await callAdminRpc("admin_cancel_conversation_reminder", {
    p_reminder_id: reminderId,
  });
}

export async function getReminders(
  conversationId: string,
  includeInactive: boolean = false
): Promise<ConversationReminder[]> {
  let query = conversationReminderTable
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

  return data ?? [];
}
