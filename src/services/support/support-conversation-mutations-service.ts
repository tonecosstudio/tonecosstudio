import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  requireAdminRpcRecord,
  requireAdminRpcRecordMatchingId,
  requireAdminRpcUuid,
} from "@/services/admin/rpc/admin-rpc-results";
import type {
  ConversationPriority,
  ConversationStatus,
  ConversationTag,
  RiskFlag,
} from "@/types/support";

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

interface JsonObject {
  [key: string]: JsonValue | undefined;
}

export type SupportConversationMutationRow =
  Database["public"]["Tables"]["support_conversations"]["Row"] & {
    order_id?: string | null;
    quote_id?: string | null;
    subscription_id?: string | null;
    promised_date?: string | null;
    tags?: unknown;
    risk_flags?: unknown;
  };

interface SupportConversationRpcError {
  message: string;
}

interface SupportConversationRpcClient {
  rpc(
    name: "create_support_conversation",
    args: {
      p_user_id: string;
      p_subject: string;
      p_status: ConversationStatus | "open";
      p_priority: ConversationPriority | "medium";
      p_tags: string[];
      p_order_id: string | null;
      p_quote_id: string | null;
      p_subscription_id: string | null;
      p_payment_id: string | null;
      p_first_message: string | null;
    }
  ): Promise<{ data: unknown; error: SupportConversationRpcError | null }>;
}

const supportConversationRpc = supabase as unknown as SupportConversationRpcClient;

function normalizeText(value: string): string {
  return value.trim();
}

function normalizeLower(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeStringSet(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    return null;
  }

  return [...new Set(value.map((item) => normalizeLower(item as string)).filter(Boolean))].sort();
}

function sameStringSet(value: unknown, expected: string[]): boolean {
  const normalized = normalizeStringSet(value);
  const normalizedExpected = [...new Set(expected.map(normalizeLower).filter(Boolean))].sort();
  return normalized !== null && JSON.stringify(normalized) === JSON.stringify(normalizedExpected);
}

function sameNullableTimestamp(value: unknown, expected: string | null): boolean {
  if (expected === null) return value === null;
  if (typeof value !== "string") return false;

  const actualTime = Date.parse(value);
  const expectedTime = Date.parse(expected);
  return Number.isFinite(actualTime) && Number.isFinite(expectedTime) && actualTime === expectedTime;
}

function requireConversationBase(
  value: unknown,
  operation: string,
  expectedId?: string,
): Record<string, unknown> {
  const record = expectedId
    ? requireAdminRpcRecordMatchingId(value, expectedId, operation)
    : requireAdminRpcRecord(value, operation);

  if (!expectedId) {
    requireAdminRpcUuid(record.id, operation);
  }
  requireAdminRpcUuid(record.user_id, operation);

  if (
    typeof record.subject !== "string" ||
    !record.subject.trim() ||
    typeof record.status !== "string" ||
    !record.status.trim() ||
    typeof record.priority !== "string" ||
    !record.priority.trim()
  ) {
    throw new Error(`${operation} returned invalid conversation data`);
  }

  return record;
}

export async function createSupportConversationRpc(input: {
  userId: string;
  subject: string;
  status?: ConversationStatus | "open";
  priority?: ConversationPriority | "medium";
  tags?: ConversationTag[];
  orderId?: string | null;
  quoteId?: string | null;
  subscriptionId?: string | null;
  paymentId?: string | null;
  firstMessage?: string | null;
}): Promise<SupportConversationMutationRow> {
  const expectedStatus = normalizeLower(input.status ?? "new");
  const expectedPriority = normalizeLower(input.priority ?? "normal");
  const expectedTags = input.tags ?? [];

  const { data, error } = await supportConversationRpc.rpc("create_support_conversation", {
    p_user_id: input.userId,
    p_subject: input.subject,
    p_status: input.status ?? "new",
    p_priority: input.priority ?? "normal",
    p_tags: expectedTags,
    p_order_id: input.orderId ?? null,
    p_quote_id: input.quoteId ?? null,
    p_subscription_id: input.subscriptionId ?? null,
    p_payment_id: input.paymentId ?? null,
    p_first_message: input.firstMessage ?? null,
  });

  if (error) throw error;

  const operation = "Support conversation creation";
  const record = requireConversationBase(data, operation);

  if (
    record.user_id !== input.userId ||
    record.subject !== normalizeText(input.subject) ||
    record.status !== expectedStatus ||
    record.priority !== expectedPriority ||
    !sameStringSet(record.tags, expectedTags) ||
    record.order_id !== (input.orderId ?? null) ||
    record.quote_id !== (input.quoteId ?? null) ||
    record.subscription_id !== (input.subscriptionId ?? null) ||
    record.payment_id !== (input.paymentId ?? null)
  ) {
    throw new Error(`${operation} returned inconsistent conversation data`);
  }

  return record as unknown as SupportConversationMutationRow;
}

export async function updateSupportConversationRpc(
  conversationId: string,
  updates: {
    status?: ConversationStatus | "open";
    priority?: ConversationPriority | "medium";
    tags?: ConversationTag[];
    risk_flags?: RiskFlag[];
    promised_date?: string | null;
    assigned_to?: string | null;
  }
): Promise<SupportConversationMutationRow> {
  const data = await callAdminRpc<unknown>("admin_update_support_conversation", {
    p_conversation_id: conversationId,
    p_updates: updates as JsonObject,
  });
  const operation = "Support conversation update";
  const record = requireConversationBase(data, operation, conversationId);

  if (
    (updates.status !== undefined && record.status !== normalizeLower(updates.status)) ||
    (updates.priority !== undefined && record.priority !== normalizeLower(updates.priority)) ||
    (updates.tags !== undefined && !sameStringSet(record.tags, updates.tags)) ||
    (updates.risk_flags !== undefined && !sameStringSet(record.risk_flags, updates.risk_flags)) ||
    ("promised_date" in updates &&
      !sameNullableTimestamp(record.promised_date, updates.promised_date ?? null)) ||
    ("assigned_to" in updates && record.assigned_to !== (updates.assigned_to ?? null))
  ) {
    throw new Error(`${operation} returned inconsistent conversation data`);
  }

  return record as unknown as SupportConversationMutationRow;
}
