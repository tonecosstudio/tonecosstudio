import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import { assertCurrentUserId } from "@/services/auth/current-user";

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
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = async () => {
      try {
        await assertCurrentUserId(userId);
      } catch (error) {
        log.warn("Blocked payment realtime subscription for non-current user", { error, userId });
        return;
      }

      if (cancelled) return;

      channel = supabase
        .channel("payments-arcade")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "manual_payments",
            filter: `user_id=eq.${userId}`,
          },
          onPaymentUpdate
        )
        .subscribe();
    };

    void subscribe();

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [onPaymentUpdate, userId]);
}
