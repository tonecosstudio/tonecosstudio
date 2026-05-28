import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  playAudioNotification,
  requestBrowserNotificationPermission,
  showBrowserNotification,
} from "@/lib/notifications/browser-notifications";

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

interface NotificationSettings {
  sound_enabled?: boolean | null;
  sound_volume?: number | null;
}

interface UseUserNotificationsOptions {
  enableSound?: boolean;
  enableToast?: boolean;
  refetchInterval?: number;
}

export function useUserNotifications(options: UseUserNotificationsOptions = {}) {
  const { enableSound = true, enableToast = true, refetchInterval = 30000 } = options;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [soundEnabled, setSoundEnabled] = useState(enableSound);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["user-notifications-unread"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as UserNotification[];
    },
    refetchInterval,
  });

  const { data: settings } = useQuery<NotificationSettings | null>({
    queryKey: ["user-notification-settings"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_notification_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as NotificationSettings | null;
    },
  });

  useEffect(() => {
    if (settings) {
      setSoundEnabled(settings.sound_enabled ?? true);
    }
  }, [settings]);

  const playNotificationSound = useCallback(() => {
    playAudioNotification({
      enabled: soundEnabled,
      volume: Math.min(1, Math.max(0, settings?.sound_volume ?? 0.5)),
      context: "user-notifications",
    });
  }, [settings?.sound_volume, soundEnabled]);

  useEffect(() => {
    let channelRef: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;

    async function setupRealtimeNotifications() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const channel = supabase
        .channel("user-notifications-realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "user_notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as UserNotification;

            queryClient.invalidateQueries({ queryKey: ["user-notifications-unread"] });
            queryClient.invalidateQueries({ queryKey: ["user-notifications"] });

            playNotificationSound();

            if (enableToast) {
              toast({
                title: newNotification.title,
                description: newNotification.message,
                variant: newNotification.priority === "urgent" ? "destructive" : "default",
              });
            }

            showBrowserNotification({
              title: newNotification.title,
              body: newNotification.message,
              tag: newNotification.id,
            });
          }
        )
        .subscribe();

      if (cancelled) {
        supabase.removeChannel(channel);
        return;
      }

      channelRef = channel;
    }

    setupRealtimeNotifications();

    return () => {
      cancelled = true;
      if (channelRef) supabase.removeChannel(channelRef);
    };
  }, [enableToast, playNotificationSound, queryClient, toast]);

  return {
    notifications,
    unreadCount: notifications.length,
    isLoading,
    settings,
    soundEnabled,
    setSoundEnabled,
    requestNotificationPermission: requestBrowserNotificationPermission,
  };
}
