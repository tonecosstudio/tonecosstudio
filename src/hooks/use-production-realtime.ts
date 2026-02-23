import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function useProductionRealtime(quoteId: string | null, enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled || !quoteId) return;

    const channel = supabase
      .channel(`prod:${quoteId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quote_production", filter: `quote_id=eq.${quoteId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["production", quoteId] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quote_production_updates", filter: `quote_id=eq.${quoteId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["production", quoteId] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quote_production_photos", filter: `quote_id=eq.${quoteId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["production", quoteId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, quoteId, qc]);
}
