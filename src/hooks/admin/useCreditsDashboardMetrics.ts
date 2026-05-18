import { useQuery } from "@tanstack/react-query";
import { fetchCreditsDashboardMetrics } from "@/services/admin/credits-dashboard-service";

export function useCreditsDashboardMetrics() {
  return useQuery({
    queryKey: ["credits-dashboard-metrics"],
    queryFn: fetchCreditsDashboardMetrics,
  });
}
