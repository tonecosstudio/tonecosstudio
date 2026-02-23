// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

export type NotificationType =
  | "order_update"
  | "quote_response"
  | "new_model"
  | "wishlist_available"
  | "badge_earned"
  | "level_up"
  | "system"
  | "promotion";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  read_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
  expires_at?: string;
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw error;
  return count || 0;
}

export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_notification_as_read", {
    notification_id: notificationId,
  });

  if (error) throw error;
}

export async function markAllAsRead(): Promise<void> {
  const { error } = await supabase.rpc("mark_all_notifications_as_read");

  if (error) throw error;
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  options?: {
    link?: string;
    metadata?: Record<string, any>;
    expiresAt?: string;
  }
): Promise<void> {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    message,
    link: options?.link,
    metadata: options?.metadata,
    expires_at: options?.expiresAt,
  });

  if (error) throw error;
}
