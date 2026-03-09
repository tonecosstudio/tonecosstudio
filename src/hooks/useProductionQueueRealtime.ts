/**
 * useProductionQueueRealtime
 * 
 * Escuta mudanças em tempo real na tabela production_queue
 * e invalida as queries do React Query automaticamente.
 */

import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function useProductionQueueRealtime(enabled = true) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel("production-queue-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "production_queue",
        },
        () => {
          qc.invalidateQueries({ queryKey: ["production-queue"] });
          qc.invalidateQueries({ queryKey: ["production-metrics"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, qc]);
}
