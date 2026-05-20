import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onPaymentUpdate, userId]);
}
