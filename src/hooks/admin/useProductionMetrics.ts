import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchProductionMetrics } from "@/services/admin/production-service";
export type { ProductionMetrics } from "@/services/admin/production-service";

interface UseProductionMetricsOptions {
  refetchInterval?: number;
  enableRealtime?: boolean;
}

export function useProductionMetrics(options: UseProductionMetricsOptions = {}) {
  const { refetchInterval = 60000, enableRealtime = true } = options;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["production-metrics"],
    queryFn: fetchProductionMetrics,
    refetchInterval,
  });

  useEffect(() => {
    if (!enableRealtime) {
      return;
    }

    const channel = supabase
      .channel("production-metrics-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "production_queue",
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["production-metrics"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "production_stages",
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["production-metrics"] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enableRealtime, queryClient]);

  return query;
}
