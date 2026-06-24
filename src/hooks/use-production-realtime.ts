import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { subscribeToQuoteProductionChanges } from "@/services/realtime/realtime-service";

export function useProductionRealtime(quoteId: string | null, enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled || !quoteId) return;

    return subscribeToQuoteProductionChanges(quoteId, () => {
      qc.invalidateQueries({ queryKey: ["production", quoteId] });
    });
  }, [enabled, quoteId, qc]);
}
