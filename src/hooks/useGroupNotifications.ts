import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  playAudioNotification,
  requestBrowserNotificationPermission,
  showBrowserNotification,
} from "@/lib/notifications/browser-notifications";
import { subscribeToGroupMessageNotifications } from "@/services/realtime/realtime-service";

interface UseGroupNotificationsOptions {
  groupId: string;
  userId: string;
  enabled?: boolean;
  playSound?: boolean;
  showToast?: boolean;
}

export function useGroupNotifications({
  groupId,
  userId,
  enabled = true,
  playSound = true,
  showToast = true,
}: UseGroupNotificationsOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !groupId || !userId) return;

    requestBrowserNotificationPermission();

    return subscribeToGroupMessageNotifications({
      groupId,
      onInsert: (newMessage) => {
          if (newMessage.sender_id === userId) return;

          queryClient.invalidateQueries({ queryKey: ["group-messages", groupId] });

          if (showToast) {
            toast.info("Nova mensagem no grupo", {
              description: `${newMessage.message?.substring(0, 50) ?? "Nova mensagem"}...`,
              duration: 3000,
            });
          }

          playAudioNotification({
            enabled: playSound,
            context: "group-notifications",
          });

          showBrowserNotification({
            title: "Nova mensagem no grupo",
            body: newMessage.message?.substring(0, 100) || "Nova mensagem",
            tag: `group-${groupId}`,
          });
      },
      onUpdate: () => {
        queryClient.invalidateQueries({ queryKey: ["group-messages", groupId] });
      },
    });
  }, [enabled, groupId, playSound, queryClient, showToast, userId]);

  return {
    requestNotificationPermission: requestBrowserNotificationPermission,
  };
}
