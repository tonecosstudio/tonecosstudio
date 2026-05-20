import { useQuery } from "@tanstack/react-query";
import { fetchProductionMetrics } from "@/services/admin/production-service";

export function useProductionMetrics() {
  return useQuery({
    queryKey: ["production-metrics"],
    queryFn: fetchProductionMetrics,
    refetchInterval: 60000,
  });
}
