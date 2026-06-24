import { useQuery } from "@tanstack/react-query";
import {
  fetchAdminAnalyticsCollectionsStats,
  fetchAdminAnalyticsRecentOrders,
  fetchAdminAnalyticsRecentUsers,
  fetchAdminAnalyticsStats,
  fetchAdminAnalyticsTopCollectors,
} from "@/services/admin/analytics/admin-analytics-service";

export function useAdminAnalyticsData() {
  const statsQuery = useQuery({
    queryKey: ["admin-analytics-stats"],
    queryFn: fetchAdminAnalyticsStats,
  });

  const recentUsersQuery = useQuery({
    queryKey: ["admin-analytics-recent-users"],
    queryFn: fetchAdminAnalyticsRecentUsers,
  });

  const recentOrdersQuery = useQuery({
    queryKey: ["admin-analytics-recent-orders"],
    queryFn: fetchAdminAnalyticsRecentOrders,
  });

  const topCollectorsQuery = useQuery({
    queryKey: ["admin-analytics-top-collectors"],
    queryFn: fetchAdminAnalyticsTopCollectors,
  });

  const collectionsStatsQuery = useQuery({
    queryKey: ["admin-analytics-collections"],
    queryFn: fetchAdminAnalyticsCollectionsStats,
  });

  return {
    statsQuery,
    recentUsersQuery,
    recentOrdersQuery,
    topCollectorsQuery,
    collectionsStatsQuery,
  };
}

