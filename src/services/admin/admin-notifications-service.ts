import { supabase } from "@/integrations/supabase/client";

export type NotificationType =
  | "new_quote"
  | "quote_approved"
  | "payment_received"
  | "payment_failed"
  | "new_subscription"
  | "subscription_cancelled"
  | "support_ticket"
  | "low_stock"
  | "system_error"
  | "user_registered";

export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  read: boolean;
  action_url: string | null;
  created_at: string;
}

interface AdminNotificationRow {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

export type NotificationFilter = "all" | "unread" | "read";

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

interface AdminNotificationRpcError {
  message: string;
}

interface AdminNotificationRpcClient {
  rpc(
    name: "admin_delete_notification",
    args: { p_notification_id: string }
  ): Promise<{ data: string | null; error: AdminNotificationRpcError | null }>;
  rpc(
    name: "admin_get_or_create_notification_settings"
  ): Promise<{ data: AdminNotificationSettings | null; error: AdminNotificationRpcError | null }>;
  rpc(
    name: "admin_update_notification_settings",
    args: { p_updates: Record<string, NotificationSettingUpdateValue> }
  ): Promise<{ data: AdminNotificationSettings | null; error: AdminNotificationRpcError | null }>;
  rpc(
    name: "create_admin_notification",
    args: {
      p_type: NotificationType | "info";
      p_title: string;
      p_message: string;
      p_priority: NotificationPriority;
      p_icon?: string | null;
      p_action_url?: string | null;
      p_related_id?: string | null;
      p_related_type?: string | null;
      p_metadata?: Record<string, unknown>;
      p_recipient_user_id?: string | null;
    }
  ): Promise<{ data: string | null; error: AdminNotificationRpcError | null }>;
}

const adminNotificationRpc = supabase as unknown as AdminNotificationRpcClient;

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

export async function fetchAdminNotificationsHistory(filter: NotificationFilter): Promise<AdminNotification[]> {
  let query = supabase
    .from("admin_notifications")
    .select("id,type,title,message,priority,is_read,action_url,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (filter === "unread") query = query.eq("is_read", false);
  if (filter === "read") query = query.eq("is_read", true);
  const { data, error } = await query;
  if (error) throw error;
  return ((data || []) as AdminNotificationRow[]).map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    priority: notification.priority,
    read: notification.is_read,
    action_url: notification.action_url,
    created_at: notification.created_at,
  }));
}

export async function markAdminNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_notification_read", { p_notification_id: notificationId });
  if (error) throw error;
}

export async function markAllAdminNotificationsRead(): Promise<void> {
  const { error } = await supabase.rpc("mark_all_notifications_read");
  if (error) throw error;
}

export async function deleteAdminNotification(notificationId: string): Promise<void> {
  const { error } = await adminNotificationRpc.rpc("admin_delete_notification", {
    p_notification_id: notificationId,
  });
  if (error) throw error;
}

export async function fetchAdminNotificationSettings(): Promise<AdminNotificationSettings> {
  const { data, error } = await adminNotificationRpc.rpc("admin_get_or_create_notification_settings");
  if (error) throw error;
  if (!data) throw new Error("Configuracoes de notificacao nao encontradas");
  return data as AdminNotificationSettings;
}

export async function updateAdminNotificationSettings(
  updates: Partial<AdminNotificationSettings>
): Promise<void> {
  const sanitizedUpdates = Object.fromEntries(
    Object.entries(updates).filter(([key]) =>
      UPDATEABLE_NOTIFICATION_SETTING_KEYS.has(key as keyof AdminNotificationSettings)
    )
  ) as Record<string, NotificationSettingUpdateValue>;

  const { error } = await adminNotificationRpc.rpc("admin_update_notification_settings", {
    p_updates: sanitizedUpdates,
  });
  if (error) throw error;
}

export async function sendAdminNotificationTest(): Promise<void> {
  const { error } = await adminNotificationRpc.rpc("create_admin_notification", {
    p_type: "system_error",
    p_title: "Notificação de Teste",
    p_message: "Esta é uma notificação de teste para verificar suas configurações.",
    p_priority: "medium",
    p_icon: "Bell",
  });
  if (error) throw error;
}
