import { supabase } from "@/integrations/supabase/client";
import type {
  NotificationCenterItem,
  UserNotificationCenterItem,
  UserNotificationFilter,
} from "@/types/notifications";

function normalizeNotificationSearch(searchQuery: string) {
  return searchQuery.trim().replace(/,/g, " ").slice(0, 120);
}

export async function listNotifications(userId: string): Promise<NotificationCenterItem[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as NotificationCenterItem[];
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_notification_as_read", {
    notification_id: notificationId,
  });

  if (error) throw error;
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const { error } = await supabase.rpc("mark_all_notifications_as_read");

  if (error) throw error;
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await supabase.from("notifications").delete().eq("id", notificationId);

  if (error) throw error;
}

export async function listUserNotifications(
  filter: UserNotificationFilter,
  searchQuery = "",
): Promise<UserNotificationCenterItem[]> {
  let query = supabase
    .from("user_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (filter === "unread") {
    query = query.eq("is_read", false);
  } else if (filter === "read") {
    query = query.eq("is_read", true);
  }

  const search = normalizeNotificationSearch(searchQuery);
  if (search) {
    query = query.or(`title.ilike.%${search}%,message.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as UserNotificationCenterItem[];
}

export async function markUserNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_user_notification_read", {
    p_notification_id: notificationId,
  });

  if (error) throw error;
}

export async function markAllUserNotificationsAsRead(): Promise<number> {
  const { data, error } = await supabase.rpc("mark_all_user_notifications_read");

  if (error) throw error;
  return typeof data === "number" ? data : 0;
}

export async function deleteUserNotification(notificationId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_user_notification", {
    p_notification_id: notificationId,
  });

  if (error) throw error;
}
