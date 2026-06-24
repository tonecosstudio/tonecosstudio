import { supabase } from "@/integrations/supabase/client";
import { getCurrentAuthSession } from "@/services/auth/auth-session-service";
import {
  createRealtimeChannel,
  removeRealtimeChannel,
} from "@/services/supabase/realtime-client";

export interface UserNotification {
  id: string;
  user_id: string;
  type: string;
  priority: "low" | "medium" | "high" | "urgent";
  title: string;
  message: string;
  icon?: string;
  related_id?: string;
  related_type?: string;
  action_url?: string;
  action_label?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface AdminNotification {
  id: string;
  type: string;
  priority: "low" | "medium" | "high" | "urgent";
  title: string;
  message: string;
  icon?: string;
  related_id?: string;
  related_type?: string;
  action_url?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationSoundSettings {
  sound_enabled?: boolean | null;
  sound_volume?: number | null;
}

export async function listUnreadUserNotificationsForCurrentUser(): Promise<UserNotification[]> {
  const session = await getCurrentAuthSession();
  const user = session?.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_notifications")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_read", false)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as UserNotification[];
}

export async function getUserNotificationSettingsForCurrentUser(): Promise<NotificationSoundSettings | null> {
  const session = await getCurrentAuthSession();
  const user = session?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_notification_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data as NotificationSoundSettings | null;
}

export async function listUnreadAdminNotifications(): Promise<AdminNotification[]> {
  const { data, error } = await supabase
    .from("admin_notifications")
    .select("*")
    .eq("is_read", false)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as AdminNotification[];
}

export async function getAdminNotificationSettingsForCurrentUser(): Promise<NotificationSoundSettings | null> {
  const session = await getCurrentAuthSession();
  const user = session?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("admin_notification_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data as NotificationSoundSettings | null;
}

export async function subscribeToUserNotificationInserts(
  onInsert: (notification: UserNotification) => void,
): Promise<() => void> {
  const session = await getCurrentAuthSession();
  const user = session?.user;
  if (!user) return () => undefined;

  const channel = createRealtimeChannel("user-notifications-realtime")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "user_notifications",
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => onInsert(payload.new as UserNotification),
    )
    .subscribe();

  return () => {
    removeRealtimeChannel(channel);
  };
}

export async function subscribeToAdminNotificationInserts(
  onInsert: (notification: AdminNotification) => void,
): Promise<() => void> {
  const session = await getCurrentAuthSession();
  if (!session?.user) return () => undefined;

  const channel = createRealtimeChannel("admin-notifications-realtime")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "admin_notifications",
      },
      (payload) => onInsert(payload.new as AdminNotification),
    )
    .subscribe();

  return () => {
    removeRealtimeChannel(channel);
  };
}
