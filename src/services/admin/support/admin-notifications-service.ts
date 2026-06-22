import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";

type AdminNotificationRow = Database["public"]["Tables"]["admin_notifications"]["Row"];

export type NotificationType = AdminNotificationRow["type"];
export type NotificationPriority = "low" | "medium" | "high" | "urgent";
export type NotificationFilter = "all" | "unread" | "read";

export interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  icon: string | null;
  related_id: string | null;
  related_type: string | null;
  action_url: string | null;
  read: boolean;
  read_at: string | null;
  recipient_user_id: string | null;
  created_at: string;
  metadata: AdminNotificationRow["metadata"];
}

export interface AdminNotificationSettings {
  user_id: string;
  new_quote_enabled: boolean;
  payment_received_enabled: boolean;
  support_ticket_enabled: boolean;
  subscription_canceled_enabled: boolean;
  low_stock_enabled: boolean;
  system_error_enabled: boolean;
  new_user_enabled: boolean;
  preorder_completed_enabled: boolean;
  production_ready_enabled: boolean;
  message_received_enabled: boolean;
  sound_enabled: boolean;
  sound_volume: number;
  email_enabled: boolean;
  email_frequency: string;
  push_enabled: boolean;
}

type NotificationSettingUpdateValue = string | number | boolean | null;

const UPDATEABLE_NOTIFICATION_SETTING_KEYS = new Set<keyof AdminNotificationSettings>([
  "new_quote_enabled",
  "payment_received_enabled",
  "support_ticket_enabled",
  "subscription_canceled_enabled",
  "low_stock_enabled",
  "system_error_enabled",
  "new_user_enabled",
  "preorder_completed_enabled",
  "production_ready_enabled",
  "message_received_enabled",
  "sound_enabled",
  "sound_volume",
  "email_enabled",
  "email_frequency",
  "push_enabled",
]);

function toNotificationPriority(priority: string): NotificationPriority {
  if (priority === "low" || priority === "medium" || priority === "high" || priority === "urgent") {
    return priority;
  }

  return "medium";
}

function toAdminNotification(notification: AdminNotificationRow): AdminNotification {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    priority: toNotificationPriority(notification.priority),
    icon: notification.icon,
    related_id: notification.related_id,
    related_type: notification.related_type,
    action_url: notification.action_url,
    read: notification.is_read,
    read_at: notification.read_at,
    recipient_user_id: notification.recipient_user_id,
    created_at: notification.created_at,
    metadata: notification.metadata,
  };
}

export async function fetchAdminNotificationsHistory(filter: NotificationFilter): Promise<AdminNotification[]> {
  let query = supabase
    .from("admin_notifications")
    .select(
      "id,type,title,message,priority,icon,related_id,related_type,action_url,is_read,read_at,recipient_user_id,created_at,metadata"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (filter === "unread") query = query.eq("is_read", false);
  if (filter === "read") query = query.eq("is_read", true);

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as AdminNotificationRow[]).map(toAdminNotification);
}

export function fetchAdminNotifications(filter: "all" | "unread"): Promise<AdminNotification[]> {
  return fetchAdminNotificationsHistory(filter);
}

export async function markAdminNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_notification_read", {
    p_notification_id: notificationId,
  });

  if (error) throw error;
}

export async function markAllAdminNotificationsRead(): Promise<number> {
  const { data, error } = await supabase.rpc("mark_all_notifications_read");
  if (error) throw error;
  return data ?? 0;
}

export const markNotificationAsRead = markAdminNotificationRead;
export const markAllNotificationsAsRead = markAllAdminNotificationsRead;

export async function deleteAdminNotification(notificationId: string): Promise<void> {
  await callAdminRpc("admin_delete_notification", {
    p_notification_id: notificationId,
  });
}

export async function fetchAdminNotificationSettings(): Promise<AdminNotificationSettings> {
  const data = await callAdminRpc<AdminNotificationSettings | null>(
    "admin_get_or_create_notification_settings"
  );
  if (!data) throw new Error("Configuracoes de notificacao nao encontradas");
  return data;
}

export async function updateAdminNotificationSettings(
  updates: Partial<AdminNotificationSettings>
): Promise<void> {
  const sanitizedUpdates = Object.fromEntries(
    Object.entries(updates).filter(([key]) =>
      UPDATEABLE_NOTIFICATION_SETTING_KEYS.has(key as keyof AdminNotificationSettings)
    )
  ) as Record<string, NotificationSettingUpdateValue>;

  await callAdminRpc("admin_update_notification_settings", {
    p_updates: sanitizedUpdates,
  });
}

export async function sendAdminNotificationTest(): Promise<void> {
  await callAdminRpc("create_admin_notification", {
    p_type: "system_error",
    p_title: "Notificacao de teste",
    p_message: "Esta e uma notificacao de teste para verificar suas configuracoes.",
    p_priority: "medium",
    p_icon: "Bell",
  });
}
