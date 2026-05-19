import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  playAudioNotification,
  requestBrowserNotificationPermission,
  showBrowserNotification,
} from "@/lib/notifications/browser-notifications";

interface UseGroupNotificationsOptions {
  groupId: string;
  userId: string;
  enabled?: boolean;
  playSound?: boolean;
  showToast?: boolean;
}

interface GroupMessageNotificationPayload {
  sender_id: string;
  message?: string | null;
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

    const channel = supabase
      .channel(`group-messages:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const newMessage = payload.new as GroupMessageNotificationPayload;
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
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["group-messages", groupId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, groupId, playSound, queryClient, showToast, userId]);

  return {
    requestNotificationPermission: requestBrowserNotificationPermission,
  };
}
