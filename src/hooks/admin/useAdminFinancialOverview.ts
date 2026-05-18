import { useQuery } from "@tanstack/react-query";
import { fetchAdminFinancialOverview } from "@/services/admin/admin-financial-overview-service";

export function useAdminFinancialOverview(dateRange: { from: Date; to: Date }) {
  return useQuery({
    queryKey: ["financial-overview", dateRange],
    queryFn: () => fetchAdminFinancialOverview(dateRange),
  });
}
