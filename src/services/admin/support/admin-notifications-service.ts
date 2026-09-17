import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  requireAdminRpcRecord,
  requireAdminRpcUuid,
} from "@/services/admin/rpc/admin-rpc-results";

type AdminNotificationRow = Database["public"]["Tables"]["admin_notifications"]["Row"];

export type NotificationType = NonNullable<AdminNotificationRow["type"]>;
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

const BOOLEAN_NOTIFICATION_SETTING_KEYS: Array<keyof AdminNotificationSettings> = [
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
  "email_enabled",
  "push_enabled",
];

const EMAIL_FREQUENCIES = new Set(["instant", "daily", "weekly", "never"]);

function toNotificationPriority(priority: string): NotificationPriority {
  if (priority === "low" || priority === "medium" || priority === "high" || priority === "urgent") {
    return priority;
  }

  return "medium";
}

function toAdminNotification(notification: AdminNotificationRow): AdminNotification {
  return {
    id: notification.id,
    type: notification.type ?? "system_error",
    title: notification.title,
    message: notification.message,
    priority: toNotificationPriority(notification.priority),
    icon: notification.icon,
    related_id: notification.related_id,
    related_type: notification.related_type,
    action_url: notification.action_url,
    read: notification.is_read ?? false,
    read_at: notification.read_at,
    recipient_user_id: notification.recipient_user_id,
    created_at: notification.created_at,
    metadata: notification.metadata,
  };
}

function requireNotificationSettings(
  value: unknown,
  operation: string,
): AdminNotificationSettings {
  const record = requireAdminRpcRecord(value, operation);
  const userId = requireAdminRpcUuid(record.user_id, operation);

  for (const key of BOOLEAN_NOTIFICATION_SETTING_KEYS) {
    if (typeof record[key] !== "boolean") {
      throw new Error(`${operation} returned invalid notification settings`);
    }
  }

  if (
    typeof record.sound_volume !== "number" ||
    !Number.isFinite(record.sound_volume) ||
    record.sound_volume < 0 ||
    record.sound_volume > 1 ||
    typeof record.email_frequency !== "string" ||
    !EMAIL_FREQUENCIES.has(record.email_frequency)
  ) {
    throw new Error(`${operation} returned invalid notification settings`);
  }

  return {
    user_id: userId,
    new_quote_enabled: record.new_quote_enabled as boolean,
    payment_received_enabled: record.payment_received_enabled as boolean,
    support_ticket_enabled: record.support_ticket_enabled as boolean,
    subscription_canceled_enabled: record.subscription_canceled_enabled as boolean,
    low_stock_enabled: record.low_stock_enabled as boolean,
    system_error_enabled: record.system_error_enabled as boolean,
    new_user_enabled: record.new_user_enabled as boolean,
    preorder_completed_enabled: record.preorder_completed_enabled as boolean,
    production_ready_enabled: record.production_ready_enabled as boolean,
    message_received_enabled: record.message_received_enabled as boolean,
    sound_enabled: record.sound_enabled as boolean,
    sound_volume: record.sound_volume,
    email_enabled: record.email_enabled as boolean,
    email_frequency: record.email_frequency,
    push_enabled: record.push_enabled as boolean,
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

export async function fetchAdminNotificationSettings(): Promise<AdminNotificationSettings> {
  const data = await callAdminRpc<unknown>("admin_get_or_create_notification_settings");
  return requireNotificationSettings(data, "Notification settings fetch");
}

export async function updateAdminNotificationSettings(
  updates: Partial<AdminNotificationSettings>
): Promise<void> {
  const sanitizedUpdates = Object.fromEntries(
    Object.entries(updates).filter(([key]) =>
      UPDATEABLE_NOTIFICATION_SETTING_KEYS.has(key as keyof AdminNotificationSettings)
    )
  ) as Record<string, NotificationSettingUpdateValue>;

  if (Object.keys(sanitizedUpdates).length === 0) {
    throw new Error("Nenhuma configuracao de notificacao fornecida");
  }

  const data = await callAdminRpc<unknown>("admin_update_notification_settings", {
    p_updates: sanitizedUpdates,
  });
  const settings = requireNotificationSettings(data, "Notification settings update");

  for (const [key, expected] of Object.entries(sanitizedUpdates)) {
    if (settings[key as keyof AdminNotificationSettings] !== expected) {
      throw new Error(`Notification settings update returned an unexpected ${key}`);
    }
  }
}

export async function sendAdminNotificationTest(): Promise<void> {
  const result = await callAdminRpc<unknown>("create_admin_notification", {
    p_type: "system_error",
    p_title: "Notificacao de teste",
    p_message: "Esta e uma notificacao de teste para verificar suas configuracoes.",
    p_priority: "medium",
    p_icon: "Bell",
  });

  requireAdminRpcUuid(result, "Admin test notification creation");
}
