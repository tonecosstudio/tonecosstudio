import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { log } from "@/lib/logger";
import type {
  Conversation,
  ConversationPriority,
  ConversationStatus,
  ConversationTag,
  RiskFlag,
} from "@/types/support";

export type SupportConversationRow = Database["public"]["Tables"]["support_conversations"]["Row"] & {
  order_id?: string | null;
  quote_id?: string | null;
  subscription_id?: string | null;
  promised_date?: string | null;
  tags?: unknown;
  risk_flags?: unknown;
};

export type ProfileSummary = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "full_name" | "email"
>;

export type ConversationViewerType = "admin" | "customer";

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function getProfileDisplayName(profile?: ProfileSummary): string {
  return profile?.full_name || profile?.email || "Usuario";
}

function isConversationOverdue(conversation: Pick<Conversation, "status" | "promised_date" | "last_message_at">, now = new Date()): boolean {
  const promisedDateExpired =
    !!conversation.promised_date &&
    new Date(conversation.promised_date) < now &&
    conversation.status !== "resolved" &&
    conversation.status !== "closed";

  const waitingAdminTooLong =
    conversation.status === "waiting_admin" &&
    new Date(conversation.last_message_at).getTime() < now.getTime() - 24 * 60 * 60 * 1000;

  return promisedDateExpired || waitingAdminTooLong;
}

function getHoursSinceLastMessage(lastMessageAt: string, now = new Date()): number {
  const diffMs = now.getTime() - new Date(lastMessageAt).getTime();
  return Math.max(0, Math.floor(diffMs / (60 * 60 * 1000)));
}

function mapSupportConversationBase(
  row: SupportConversationRow,
  profile?: ProfileSummary
): Conversation {
  return {
    id: row.id,
    user_id: row.user_id,
    subject: row.subject ?? "Sem assunto",
    status: row.status as ConversationStatus,
    priority: (row.priority ?? "normal") as ConversationPriority,
    tags: toStringArray(row.tags) as ConversationTag[],
    risk_flags: toStringArray(row.risk_flags) as RiskFlag[],
    assigned_to: row.assigned_to ?? undefined,
    promised_date: row.promised_date ?? undefined,
    first_response_at: row.first_response_at ?? undefined,
    resolved_at: row.resolved_at ?? undefined,
    last_message_at: row.last_message_at ?? row.updated_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    order_id: row.order_id ?? undefined,
    quote_id: row.quote_id ?? undefined,
    subscription_id: row.subscription_id ?? undefined,
    payment_id: row.payment_id ?? undefined,
    user_name: getProfileDisplayName(profile),
    user_email: profile?.email || "",
    unread_count: 0,
    hours_since_last_message: 0,
    is_overdue: false,
  };
}

function applyConversationDerivedFields(
  conversation: Conversation,
  unreadCount: number,
  now = new Date()
): Conversation {
  return {
    ...conversation,
    unread_count: unreadCount,
    hours_since_last_message: getHoursSinceLastMessage(conversation.last_message_at, now),
    is_overdue: isConversationOverdue(conversation, now),
  };
}

export async function fetchSupportProfilesMap(userIds: string[]): Promise<Map<string, ProfileSummary>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  if (error) {
    log.warn("Failed to load support profile summaries", { error, userIds });
    return new Map();
  }

  return new Map((data ?? []).map((profile) => [profile.id, profile]));
}

export async function fetchSupportUnreadCountMap(
  conversationIds: string[],
  viewerType: ConversationViewerType
): Promise<Map<string, number>> {
  if (conversationIds.length === 0) {
    return new Map();
  }

  let query = supabase
    .from("support_messages")
    .select("conversation_id")
    .in("conversation_id", conversationIds)
    .eq("is_internal", false);

  if (viewerType === "admin") {
    query = query.eq("sender_type", "customer").eq("read_by_admin", false);
  } else {
    query = query.in("sender_type", ["admin", "system"]).eq("read_by_customer", false);
  }

  const { data, error } = await query;

  if (error) {
    log.warn("Failed to load support unread counts", {
      error,
      conversationIds,
      viewerType,
    });
    return new Map();
  }

  return (data ?? []).reduce((map, row) => {
    const current = map.get(row.conversation_id) ?? 0;
    map.set(row.conversation_id, current + 1);
    return map;
  }, new Map<string, number>());
}

export async function hydrateSupportConversations(
  rows: SupportConversationRow[],
  viewerType: ConversationViewerType
): Promise<Conversation[]> {
  const userIds = [...new Set(rows.map((conversation) => conversation.user_id))];
  const conversationIds = rows.map((conversation) => conversation.id);
  const [profilesMap, unreadCountMap] = await Promise.all([
    fetchSupportProfilesMap(userIds),
    fetchSupportUnreadCountMap(conversationIds, viewerType),
  ]);

  const now = new Date();

  return rows.map((row) =>
    applyConversationDerivedFields(
      mapSupportConversationBase(row, profilesMap.get(row.user_id)),
      unreadCountMap.get(row.id) ?? 0,
      now
    )
  );
}

export async function hydrateSupportConversation(
  row: SupportConversationRow,
  viewerType: ConversationViewerType
): Promise<Conversation> {
  const [profilesMap, unreadCountMap] = await Promise.all([
    fetchSupportProfilesMap([row.user_id]),
    fetchSupportUnreadCountMap([row.id], viewerType),
  ]);

  return applyConversationDerivedFields(
    mapSupportConversationBase(row, profilesMap.get(row.user_id)),
    unreadCountMap.get(row.id) ?? 0
  );
}
