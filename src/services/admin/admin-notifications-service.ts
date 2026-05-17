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

export async function fetchAdminNotificationsHistory(filter: NotificationFilter): Promise<AdminNotification[]> {
  let query = supabase.from("admin_notifications").select("*").order("created_at", { ascending: false }).limit(100);
  if (filter === "unread") query = query.eq("read", false);
  if (filter === "read") query = query.eq("read", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as AdminNotification[];
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
  const { error } = await supabase.from("admin_notifications").delete().eq("id", notificationId);
  if (error) throw error;
}

export async function fetchAdminNotificationSettings(): Promise<AdminNotificationSettings> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { data, error } = await supabase
    .from("admin_notification_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code === "PGRST116") {
    const { data: newSettings, error: insertError } = await supabase
      .from("admin_notification_settings")
      .insert({ user_id: user.id })
      .select()
      .single();
    if (insertError) throw insertError;
    return newSettings as AdminNotificationSettings;
  }
  if (error) throw error;
  return data as AdminNotificationSettings;
}

export async function updateAdminNotificationSettings(
  updates: Partial<AdminNotificationSettings>
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { error } = await supabase
    .from("admin_notification_settings")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);
  if (error) throw error;
}

export async function sendAdminNotificationTest(): Promise<void> {
  const { error } = await supabase.rpc("create_admin_notification", {
    p_type: "system_error",
    p_title: "Notificação de Teste",
    p_message: "Esta é uma notificação de teste para verificar suas configurações.",
    p_priority: "medium",
    p_icon: "Bell",
  });
  if (error) throw error;
}

