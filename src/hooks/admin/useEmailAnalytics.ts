import { useQuery } from "@tanstack/react-query";
import {
  fetchEmailLogs,
  fetchEmailStats,
  type EmailLogFilters,
} from "@/services/admin/analytics/email-analytics-service";

export function useEmailStats(timeRange: string) {
  return useQuery({
    queryKey: ["email-stats", timeRange],
    queryFn: () => fetchEmailStats(timeRange),
  });
}

export function useEmailLogs(filters: EmailLogFilters) {
  return useQuery({
    queryKey: [
      "email-logs",
      filters.searchEmail,
      filters.filterType,
      filters.filterStatus,
      filters.timeRange,
    ],
    queryFn: () => fetchEmailLogs(filters),
  });
}

