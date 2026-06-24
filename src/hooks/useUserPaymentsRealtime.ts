import { useEffect } from "react";
import { log } from "@/lib/logger";
import { subscribeToCurrentUserPaymentUpdates } from "@/services/realtime/realtime-service";

interface UseUserPaymentsRealtimeOptions {
  userId?: string;
  onPaymentUpdate: () => void;
}

export function useUserPaymentsRealtime({
  userId,
  onPaymentUpdate,
}: UseUserPaymentsRealtimeOptions): void {
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    const subscribe = async () => {
      try {
        unsubscribe = await subscribeToCurrentUserPaymentUpdates(userId, onPaymentUpdate);
      } catch (error) {
        log.warn("Blocked payment realtime subscription for non-current user", { error, userId });
        return;
      }

      if (cancelled) {
        unsubscribe();
        unsubscribe = null;
      }
    };

    void subscribe();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [onPaymentUpdate, userId]);
}
