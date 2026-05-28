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
import { log } from "@/lib/logger";

export interface ConversationReminder {
  id: string;
  conversation_id: string;
  reminder_type: "quote_followup" | "payment_pending" | "promised_date";
  scheduled_for: string;
  sent_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ProcessRemindersResult {
  processed: number;
  failed: number;
  errors: Array<{ reminderId: string; error: string }>;
}

interface ReminderRpcError {
  message: string;
}

interface ReminderRpcClient {
  rpc(
    name: "admin_create_conversation_reminder",
    args: {
      p_conversation_id: string;
      p_reminder_type: ConversationReminder["reminder_type"];
      p_scheduled_for: string;
    }
  ): Promise<{ data: ConversationReminder | null; error: ReminderRpcError | null }>;
  rpc(
    name: "admin_cancel_conversation_reminder",
    args: { p_reminder_id: string }
  ): Promise<{ data: string | null; error: ReminderRpcError | null }>;
  rpc(
    name: "process_due_conversation_reminder",
    args: { p_reminder_id: string }
  ): Promise<{ data: string | null; error: ReminderRpcError | null }>;
}

const reminderRpc = supabase as unknown as ReminderRpcClient;

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

export async function processReminders(): Promise<ProcessRemindersResult> {
  const result: ProcessRemindersResult = {
    processed: 0,
    failed: 0,
    errors: [],
  };

  try {
    const { data: reminders, error: fetchError } = await conversationReminderTable
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

    for (const reminder of reminders) {
      try {
        const { error } = await reminderRpc.rpc("process_due_conversation_reminder", {
          p_reminder_id: reminder.id,
        });

        if (error) {
          throw new Error(`Failed to process reminder: ${error.message}`);
        }

        result.processed++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          reminderId: reminder.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        log.error("Failed to process reminder", { reminderId: reminder.id, error });
      }
    }

    return result;
  } catch (error) {
    log.error("Failed to process reminders", { error });
    throw error;
  }
}

export async function createReminder(
  conversationId: string,
  reminderType: ConversationReminder["reminder_type"],
  scheduledFor: Date
): Promise<ConversationReminder> {
  const { data, error } = await reminderRpc.rpc("admin_create_conversation_reminder", {
    p_conversation_id: conversationId,
    p_reminder_type: reminderType,
    p_scheduled_for: scheduledFor.toISOString(),
  });

  if (error || !data) {
    throw new Error(`Failed to create reminder: ${error?.message ?? "No reminder returned"}`);
  }

  return data;
}

export async function cancelReminder(reminderId: string): Promise<void> {
  const { error } = await reminderRpc.rpc("admin_cancel_conversation_reminder", {
    p_reminder_id: reminderId,
  });

  if (error) {
    throw new Error(`Failed to cancel reminder: ${error.message}`);
  }
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
