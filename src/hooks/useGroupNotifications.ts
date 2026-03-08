import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseGroupNotificationsOptions {
  groupId: string;
  userId: string;
  enabled?: boolean;
  playSound?: boolean;
  showToast?: boolean;
}

/**
 * useGroupNotifications - Hook para notificações em tempo real de grupos
 *
 * Funcionalidades:
 * - Escuta novas mensagens via Supabase Realtime
 * - Atualiza cache do React Query automaticamente
 * - Mostra notificações toast
 * - Toca som de notificação (opcional)
 * - Solicita permissão para notificações do browser
 *
 * @example
 * useGroupNotifications({
 *   groupId: "123",
 *   userId: "456",
 *   enabled: true,
 *   playSound: true,
 *   showToast: true,
 * });
 */
export function useGroupNotifications({
  groupId,
  userId,
  enabled = true,
  playSound = true,
  showToast = true,
}: UseGroupNotificationsOptions) {
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!enabled || !groupId || !userId) {
      return;
    }

    // Solicitar permissão para notificações do browser
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Criar elemento de áudio para notificações
    if (playSound && !audioRef.current) {
      audioRef.current = new Audio("/notification.mp3");
      audioRef.current.volume = 0.5;
    }

    // Subscrever ao canal de mensagens do grupo
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
          const newMessage = payload.new as any;

          // Não notificar se a mensagem é do próprio usuário
          if (newMessage.sender_id === userId) {
            return;
          }

          // Invalidar cache para atualizar lista de mensagens
          queryClient.invalidateQueries({ queryKey: ["group-messages", groupId] });

          // Mostrar toast
          if (showToast) {
            toast.info("Nova mensagem no grupo", {
              description: newMessage.message?.substring(0, 50) + "...",
              duration: 3000,
            });
          }

          // Tocar som
          if (playSound && audioRef.current) {
            audioRef.current.play().catch((error) => {
              console.warn("Erro ao tocar som de notificação:", error);
            });
          }

          // Mostrar notificação do browser
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Nova mensagem no grupo", {
              body: newMessage.message?.substring(0, 100) || "Nova mensagem",
              icon: "/logo.png",
              badge: "/logo.png",
              tag: `group-${groupId}`,
            });
          }
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
          // Atualizar cache quando mensagem é editada
          queryClient.invalidateQueries({ queryKey: ["group-messages", groupId] });
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, userId, enabled, playSound, showToast, queryClient]);

  return {
    // Pode retornar métodos úteis se necessário
    requestNotificationPermission: () => {
      if ("Notification" in window) {
        return Notification.requestPermission();
      }
      return Promise.resolve("denied");
    },
  };
}
