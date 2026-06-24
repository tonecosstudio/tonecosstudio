import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchProductionMetrics,
  subscribeToProductionMetricsChanges,
} from "@/services/admin/production/production-service";
export type { ProductionMetrics } from "@/services/admin/production/production-service";

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

    return subscribeToProductionMetricsChanges(() => {
      void queryClient.invalidateQueries({ queryKey: ["production-metrics"] });
    });
  }, [enableRealtime, queryClient]);

  return query;
}
