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
import type { Database } from "@/integrations/supabase/types";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  requireAdminRpcMatchingId,
  requireAdminRpcRecord,
  requireAdminRpcUuid,
} from "@/services/admin/rpc/admin-rpc-results";
import type { ReminderType } from "@/types/support";

export interface ConversationReminder {
  id: string;
  conversation_id: string;
  reminder_type: ReminderType;
  scheduled_for: string;
  sent_at: string | null;
  is_active: boolean;
  created_at: string;
}

type ConversationReminderRow =
  Database["public"]["Tables"]["conversation_reminders"]["Row"];

function isReminderType(value: string): value is ReminderType {
  return (
    value === "quote_followup" ||
    value === "payment_pending" ||
    value === "promised_date"
  );
}

function mapReminderRow(row: ConversationReminderRow): ConversationReminder {
  if (!isReminderType(row.reminder_type)) {
    throw new Error(`Reminder ${row.id} has an invalid reminder_type`);
  }

  return {
    id: row.id,
    conversation_id: row.conversation_id,
    reminder_type: row.reminder_type,
    scheduled_for: row.scheduled_for,
    sent_at: row.sent_at,
    is_active: row.is_active,
    created_at: row.created_at,
  };
}

function requireReminder(
  value: unknown,
  expected: {
    conversationId: string;
    reminderType: ReminderType;
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
    reminder_type: expected.reminderType,
    scheduled_for: record.scheduled_for as string,
    sent_at: null,
    is_active: true,
    created_at: record.created_at as string,
  };
}

export async function createReminder(
  conversationId: string,
  reminderType: ReminderType,
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
  let query = supabase
    .from("conversation_reminders")
    .select("*")
    .eq("conversation_id", conversationId);

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.order("scheduled_for", { ascending: true });

  if (error) {
    throw new Error(`Failed to get reminders: ${error.message}`);
  }

  return (data ?? []).map(mapReminderRow);
}
