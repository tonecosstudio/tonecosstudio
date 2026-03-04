// @ts-nocheck
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AdminNotification {
  id: string;
  type: string;
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  icon?: string;
  related_id?: string;
  related_type?: string;
  action_url?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

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

  // Buscar notificações não lidas
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["admin-notifications-unread"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .eq("is_read", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AdminNotification[];
    },
    refetchInterval,
  });

  // Contar notificações não lidas
  const unreadCount = notifications.length;

  // Buscar configurações de notificação do usuário
  const { data: settings } = useQuery({
    queryKey: ["admin-notification-settings"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("admin_notification_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  // Atualizar estado de som baseado nas configurações
  useEffect(() => {
    if (settings) {
      setSoundEnabled(settings.sound_enabled ?? true);
    }
  }, [settings]);

  // Tocar som de notificação
  const playNotificationSound = () => {
    if (!soundEnabled) return;

    try {
      const audio = new Audio("/notification.mp3");
      audio.volume = (settings?.sound_volume ?? 50) / 100;
      audio.play().catch((error) => {
        console.error("Erro ao tocar som de notificação:", error);
      });
    } catch (error) {
      console.error("Erro ao criar áudio:", error);
    }
  };

  // Subscrever a notificações em tempo real
  useEffect(() => {
    const {
      data: { user },
    } = supabase.auth.getUser();

    if (!user) return;

    const channel = supabase
      .channel("admin-notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_notifications",
          filter: `recipient_user_id=eq.${user.then((u) => u.user?.id)}`,
        },
        (payload) => {
          const newNotification = payload.new as AdminNotification;

          // Invalidar query para atualizar lista
          queryClient.invalidateQueries({ queryKey: ["admin-notifications-unread"] });
          queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });

          // Tocar som
          playNotificationSound();

          // Mostrar toast
          if (enableToast) {
            toast({
              title: newNotification.title,
              description: newNotification.message,
              variant: newNotification.priority === "critical" ? "destructive" : "default",
            });
          }

          // Notificação do navegador (se permitido)
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(newNotification.title, {
              body: newNotification.message,
              icon: "/logo.png",
              badge: "/logo.png",
              tag: newNotification.id,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, enableToast, soundEnabled, settings, toast]);

  // Solicitar permissão para notificações do navegador
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      console.warn("Este navegador não suporta notificações");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    settings,
    soundEnabled,
    setSoundEnabled,
    requestNotificationPermission,
  };
}
