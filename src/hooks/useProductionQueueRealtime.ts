import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PRODUCTION_STAGE_LABELS } from "@/config/production-stages";
import { DEFAULT_NOTIFICATION_SOUND_URL } from "@/lib/notifications/assets";
import {
  subscribeToProductionQueueChanges,
  type RealtimeRecordPayload,
} from "@/services/realtime/realtime-service";

interface UseProductionQueueRealtimeOptions {
  enabled?: boolean;
  showNotifications?: boolean;
  playSound?: boolean;
}

export function useProductionQueueRealtime(options: UseProductionQueueRealtimeOptions | boolean = true) {
  const opts =
    typeof options === "boolean"
      ? { enabled: options, showNotifications: true, playSound: true }
      : { enabled: true, showNotifications: true, playSound: true, ...options };

  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playNotificationSound = useCallback(() => {
    if (!opts.playSound) {
      return;
    }

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(DEFAULT_NOTIFICATION_SOUND_URL);
        audioRef.current.volume = 0.3;
      }

      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignore autoplay restrictions.
      });
    } catch {
      // Ignore audio errors.
    }
  }, [opts.playSound]);

  const showChangeNotification = useCallback(
    (payload: RealtimeRecordPayload) => {
      if (!opts.showNotifications) {
        return;
      }

      const { eventType, new: newRecord, old: oldRecord } = payload;

      if (eventType === "INSERT") {
        const customerName = (newRecord.customer_name as string) || "Novo pedido";
        toast.info("Novo item na fila", {
          description: customerName,
          duration: 4000,
        });
        playNotificationSound();
        return;
      }

      if (eventType === "UPDATE") {
        const oldStage = oldRecord.current_stage as string;
        const newStage = newRecord.current_stage as string;
        const customerName = (newRecord.customer_name as string) || "Item";

        if (oldStage !== newStage) {
          const stageLabel =
            PRODUCTION_STAGE_LABELS[newStage as keyof typeof PRODUCTION_STAGE_LABELS] || newStage;

          toast.success("Estagio atualizado", {
            description: `${customerName} -> ${stageLabel}`,
            duration: 4000,
          });
          playNotificationSound();
        }

        return;
      }

      toast.warning("Item removido da fila", {
        duration: 3000,
      });
    },
    [opts.showNotifications, playNotificationSound]
  );

  useEffect(() => {
    if (!opts.enabled) {
      return;
    }

    return subscribeToProductionQueueChanges((payload) => {
      void queryClient.invalidateQueries({ queryKey: ["production-queue"] });
      void queryClient.invalidateQueries({ queryKey: ["production-metrics"] });
      showChangeNotification(payload);
    });
  }, [opts.enabled, queryClient, showChangeNotification]);
}
