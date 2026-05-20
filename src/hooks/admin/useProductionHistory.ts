import { useQuery } from "@tanstack/react-query";
import {
  fetchProductionHistory,
  type ProductionHistoryEntry,
} from "@/services/admin/production-history-service";

export function useProductionHistory(productionQueueId: string, enabled: boolean) {
  return useQuery<ProductionHistoryEntry[]>({
    queryKey: ["production-history", productionQueueId],
    queryFn: () => fetchProductionHistory(productionQueueId),
    enabled,
  });
}
