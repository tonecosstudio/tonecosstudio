import { useQuery } from "@tanstack/react-query";
import {
  getCustomerDashboardStats,
  listCustomerDashboardNotifications,
} from "@/services/customer/customer-dashboard-service";

export function useCustomerDashboardData(userId: string | undefined) {
  const statsQuery = useQuery({
    queryKey: ["dashboard-stats", userId ?? null],
    enabled: Boolean(userId),
    queryFn: () => getCustomerDashboardStats(userId as string),
  });

  const notificationsQuery = useQuery({
    queryKey: ["dashboard-notifications", userId ?? null],
    enabled: Boolean(userId),
    queryFn: () => listCustomerDashboardNotifications(userId as string),
  });

  return {
    stats: statsQuery.data,
    notifications: notificationsQuery.data ?? [],
    isLoading: statsQuery.isLoading || notificationsQuery.isLoading,
  };
}
