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
import {
  requireAdminRpcMatchingId,
  requireAdminRpcRecord,
  requireAdminRpcUuid,
} from "@/services/admin/rpc/admin-rpc-results";

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

function requireReminder(
  value: unknown,
  expected: {
    conversationId: string;
    reminderType: ConversationReminder["reminder_type"];
    scheduledFor: string;
  },
): ConversationReminder {
  const operation = "Reminder creation";
  const record = requireAdminRpcRecord(value, operation);
  const id = requireAdminRpcUuid(record.id, operation);
  requireAdminRpcUuid(record.conversation_id, operation);

  const scheduledTime =
    typeof record.scheduled_for === "string" ? Date.parse(record.scheduled_for) : Number.NaN;
  const expectedTime = Date.parse(expected.scheduledFor);
  const createdTime =
    typeof record.created_at === "string" ? Date.parse(record.created_at) : Number.NaN;

  if (
    record.conversation_id !== expected.conversationId ||
    record.reminder_type !== expected.reminderType ||
    !Number.isFinite(scheduledTime) ||
    scheduledTime !== expectedTime ||
    record.sent_at !== null ||
    record.is_active !== true ||
    !Number.isFinite(createdTime)
  ) {
    throw new Error(`${operation} returned inconsistent reminder data`);
  }

  return {
    id,
    conversation_id: record.conversation_id as string,
    reminder_type: record.reminder_type as ConversationReminder["reminder_type"],
    scheduled_for: record.scheduled_for as string,
    sent_at: null,
    is_active: true,
    created_at: record.created_at as string,
  };
}

export async function createReminder(
  conversationId: string,
  reminderType: ConversationReminder["reminder_type"],
  scheduledFor: Date
): Promise<ConversationReminder> {
  const scheduledForIso = scheduledFor.toISOString();
  const data = await callAdminRpc<unknown>("admin_create_conversation_reminder", {
    p_conversation_id: conversationId,
    p_reminder_type: reminderType,
    p_scheduled_for: scheduledForIso,
  });

  return requireReminder(data, {
    conversationId,
    reminderType,
    scheduledFor: scheduledForIso,
  });
}

export async function cancelReminder(reminderId: string): Promise<void> {
  const result = await callAdminRpc<unknown>("admin_cancel_conversation_reminder", {
    p_reminder_id: reminderId,
  });

  requireAdminRpcMatchingId(result, reminderId, "Reminder cancellation");
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
