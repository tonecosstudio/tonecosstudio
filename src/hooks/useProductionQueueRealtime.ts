/**
 * useProductionQueueRealtime
 * 
 * Escuta mudanças em tempo real na tabela production_queue,
 * invalida queries do React Query e mostra notificações visuais/sonoras.
 */

import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { STAGE_LABELS } from "@/services/admin/production-service";

interface RealtimePayload {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

interface UseProductionQueueRealtimeOptions {
  enabled?: boolean;
  showNotifications?: boolean;
  playSound?: boolean;
}

// Som de notificação simples (beep curto)
const NOTIFICATION_SOUND_URL = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGk0NlyqzMy2e0tEaNPq8tCKZVZ06P/73J96aHP///7kt5t5d6X///PPsJGFnv//9tW4l4WRxv//4r+choqbz//1z7aJg4+i2P/vz7iNhIqYxe/h1LySlJKfz+vh1cCXl5Scx+Xe1r6Yl5SYvt3X1L2WlJOXt9jV0biSlJOVr9DP0LWPkpOTqMnKy7GNkZKSo8HGxq6Ki5CQn7rAwKqIio+OnLW6t6aGiI2Ml7CzsamEhoyKk6qsqaOChIqIkKSnpJ6AgoiHjaGgnpt/gYaGiZubmph9f4SEh5WVlJR8fYOChouPj45yeYGAhImLiohwd4B/g4eIh4VudX9+goWGhYNsc359gYOEg4FrcX18gIGCgYBqcHx7f4CAf35pcHt7fn9/fn1ob3p6fX5+fXxnbnt6fX1+fXtmbnl5fHx9fHpkbHl5e3x8e3ljbHh4e3t7e3libHd3enp6enhga3d2eXl5eXdfa3Z2eHh4eHZeand1d3d3d3Vdand1dnZ2dnRcaXV0dXV1dXNbaHR0dXR0dHJaZ3NzdHRzc3FZZXJ0c3NycnBYZXJycnJycW9XZHFxcXFxcG9WY3BwcHBwb25VYm9vb29vbm1UYW5ubm5ubWxTYW1tbW1tbWtSYGxtbGxsbGpRX2tram1sa2lQXmtqa2pqaWhPXmlpaWlpaGdOXWhpaWhpaGZNXGdnZ2doZ2ZLW2ZmZmZmZmVKW2VlZWVlZWRJWmRkZGRkZGNIWWNjY2NjY2JHWGJiYmJiYmFGV2FhYWFhYWBFV2BgYGBgYF9EVl9fX19fX14DVV5eXl5eXl0=";

export function useProductionQueueRealtime(options: UseProductionQueueRealtimeOptions | boolean = true) {
  const opts = typeof options === "boolean" 
    ? { enabled: options, showNotifications: true, playSound: true }
    : { enabled: true, showNotifications: true, playSound: true, ...options };

  const qc = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playNotificationSound = useCallback(() => {
    if (!opts.playSound) return;
    
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
        audioRef.current.volume = 0.3;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignore autoplay restrictions
      });
    } catch {
      // Ignore audio errors
    }
  }, [opts.playSound]);

  const showChangeNotification = useCallback((payload: RealtimePayload) => {
    if (!opts.showNotifications) return;

    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (eventType === "INSERT") {
      const customerName = newRecord.customer_name as string || "Novo pedido";
      toast.info("🆕 Novo item na fila", {
        description: customerName,
        duration: 4000,
      });
      playNotificationSound();
    } else if (eventType === "UPDATE") {
      const oldStage = oldRecord.current_stage as string;
      const newStage = newRecord.current_stage as string;
      const customerName = newRecord.customer_name as string || "Item";

      if (oldStage !== newStage) {
        const stageLabel = STAGE_LABELS[newStage as keyof typeof STAGE_LABELS] || newStage;
        toast.success("📦 Estágio atualizado", {
          description: `${customerName} → ${stageLabel}`,
          duration: 4000,
        });
        playNotificationSound();
      }
    } else if (eventType === "DELETE") {
      toast.warning("🗑️ Item removido da fila", {
        duration: 3000,
      });
    }
  }, [opts.showNotifications, playNotificationSound]);

  useEffect(() => {
    if (!opts.enabled) return;

    const channel = supabase
      .channel("production-queue-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "production_queue",
        },
        (payload) => {
          // Invalidar queries
          qc.invalidateQueries({ queryKey: ["production-queue"] });
          qc.invalidateQueries({ queryKey: ["production-metrics"] });

          // Mostrar notificação
          showChangeNotification(payload as unknown as RealtimePayload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [opts.enabled, qc, showChangeNotification]);
}
