import { supabase } from "@/integrations/supabase/client";
import { sanitizePostgrestSearchTerm } from "@/lib/postgrest-search";
import {
  assertCurrentUserId,
  requireAuthenticatedUserId,
} from "@/services/auth/current-user";
import type {
  NotificationCenterItem,
  UserNotificationPriority,
  UserNotificationCenterItem,
  UserNotificationFilter,
} from "@/types/notifications";

type NotificationRow = {
  id: string;
  user_id: string;
  type: string | null;
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

type UserNotificationRow = {
  id: string;
  user_id: string;
  type: string | null;
  priority: string;
  title: string;
  message: string | null;
  icon: string | null;
  related_id: string | null;
  related_type: string | null;
  action_url: string | null;
  action_label: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  metadata: unknown;
};

const USER_NOTIFICATION_PRIORITIES: readonly UserNotificationPriority[] = [
  "low",
  "medium",
  "high",
  "critical",
];

function toNotificationCenterItem(row: NotificationRow): NotificationCenterItem {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    link: null,
    is_read: row.is_read,
    created_at: row.created_at,
  };
}

function toUserNotificationPriority(value: string): UserNotificationPriority {
  return USER_NOTIFICATION_PRIORITIES.includes(value as UserNotificationPriority)
    ? (value as UserNotificationPriority)
    : "medium";
}

function toUserNotificationCenterItem(row: UserNotificationRow): UserNotificationCenterItem {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type ?? "system",
    priority: toUserNotificationPriority(row.priority),
    title: row.title,
    message: row.message ?? "",
    icon: row.icon ?? undefined,
    related_id: row.related_id ?? undefined,
    related_type: row.related_type ?? undefined,
    action_url: row.action_url ?? undefined,
    action_label: row.action_label ?? undefined,
    is_read: row.is_read,
    read_at: row.read_at ?? undefined,
    created_at: row.created_at,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : undefined,
  };
}

export async function listNotifications(userId: string): Promise<NotificationCenterItem[]> {
  await assertCurrentUserId(userId);

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return ((data ?? []) as NotificationRow[]).map(toNotificationCenterItem);
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await requireAuthenticatedUserId();

  const { error } = await supabase.rpc("mark_notification_as_read", {
    notification_id: notificationId,
  });

  if (error) throw error;
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await requireAuthenticatedUserId();

  const { error } = await supabase.rpc("mark_all_notifications_as_read");

  if (error) throw error;
}

export async function deleteNotification(notificationId: string): Promise<void> {
  await requireAuthenticatedUserId();

  const { error } = await supabase.rpc("delete_user_notification", {
    p_notification_id: notificationId,
  });

  if (error) throw error;
}

export async function listUserNotifications(
  filter: UserNotificationFilter,
  searchQuery = "",
): Promise<UserNotificationCenterItem[]> {
  const userId = await requireAuthenticatedUserId();

  let query = supabase
    .from("user_notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (filter === "unread") {
    query = query.eq("is_read", false);
  } else if (filter === "read") {
    query = query.eq("is_read", true);
  }

  const search = sanitizePostgrestSearchTerm(searchQuery);
  if (search) {
    query = query.or(`title.ilike.%${search}%,message.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return ((data ?? []) as UserNotificationRow[]).map(toUserNotificationCenterItem);
}

export async function markUserNotificationAsRead(notificationId: string): Promise<void> {
  await requireAuthenticatedUserId();

  const { error } = await supabase.rpc("mark_user_notification_read", {
    p_notification_id: notificationId,
  });

  if (error) throw error;
}

export async function markAllUserNotificationsAsRead(): Promise<number> {
  await requireAuthenticatedUserId();

  const { data, error } = await supabase.rpc("mark_all_user_notifications_read");

  if (error) throw error;
  return typeof data === "number" ? data : 0;
}

export async function deleteUserNotification(notificationId: string): Promise<void> {
  await requireAuthenticatedUserId();

  const { error } = await supabase.rpc("delete_user_notification", {
    p_notification_id: notificationId,
  });

  if (error) throw error;
}
