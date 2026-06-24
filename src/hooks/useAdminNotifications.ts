import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  playAudioNotification,
  requestBrowserNotificationPermission,
  showBrowserNotification,
} from "@/lib/notifications/browser-notifications";
import {
  getAdminNotificationSettingsForCurrentUser,
  listUnreadAdminNotifications,
  subscribeToAdminNotificationInserts,
} from "@/services/notifications/live-notifications-service";
import type { NotificationSoundSettings } from "@/services/notifications/live-notifications-service";

export type { AdminNotification } from "@/services/notifications/live-notifications-service";

interface UseAdminNotificationsOptions {
  enableSound?: boolean;
  enableToast?: boolean;
  refetchInterval?: number;
}

export function useAdminNotifications(options: UseAdminNotificationsOptions = {}) {
  const { enableSound = true, enableToast = true, refetchInterval = 30000 } = options;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [soundEnabled, setSoundEnabled] = useState(enableSound);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["admin-notifications-unread"],
    queryFn: listUnreadAdminNotifications,
    refetchInterval,
  });

  const { data: settings } = useQuery<NotificationSoundSettings | null>({
    queryKey: ["admin-notification-settings"],
    queryFn: getAdminNotificationSettingsForCurrentUser,
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
      context: "admin-notifications",
    });
  }, [settings?.sound_volume, soundEnabled]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function setupRealtimeNotifications() {
      unsubscribe = await subscribeToAdminNotificationInserts((newNotification) => {
        queryClient.invalidateQueries({ queryKey: ["admin-notifications-unread"] });
        queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });

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
      });

      if (cancelled) {
        unsubscribe();
      }
    }

    setupRealtimeNotifications();

    return () => {
      cancelled = true;
      unsubscribe?.();
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
