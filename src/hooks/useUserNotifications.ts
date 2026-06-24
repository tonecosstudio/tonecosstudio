import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  playAudioNotification,
  requestBrowserNotificationPermission,
  showBrowserNotification,
} from "@/lib/notifications/browser-notifications";
import {
  getUserNotificationSettingsForCurrentUser,
  listUnreadUserNotificationsForCurrentUser,
  subscribeToUserNotificationInserts,
} from "@/services/notifications/live-notifications-service";
import type { NotificationSoundSettings } from "@/services/notifications/live-notifications-service";

export type { UserNotification } from "@/services/notifications/live-notifications-service";

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
    queryFn: listUnreadUserNotificationsForCurrentUser,
    refetchInterval,
  });

  const { data: settings } = useQuery<NotificationSoundSettings | null>({
    queryKey: ["user-notification-settings"],
    queryFn: getUserNotificationSettingsForCurrentUser,
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
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function setupRealtimeNotifications() {
      unsubscribe = await subscribeToUserNotificationInserts((newNotification) => {
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
