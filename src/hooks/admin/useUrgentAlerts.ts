import { useEffect, useRef } from "react";
import {
  checkAndNotifyAlerts,
  getNotificationPreferences,
} from "@/services/notifications/alert-notification-service";
import {
  useProductionMetrics,
  type ProductionMetrics,
} from "@/hooks/admin/useProductionMetrics";

export function useUrgentAlerts() {
  const previousMetricsRef = useRef<ProductionMetrics | null>(null);
  const query = useProductionMetrics({
    refetchInterval: 30000,
    enableRealtime: true,
  });

  useEffect(() => {
    if (query.data && previousMetricsRef.current) {
      const preferences = getNotificationPreferences();
      checkAndNotifyAlerts(query.data, previousMetricsRef.current, preferences);
    }

    if (query.data) {
      previousMetricsRef.current = query.data;
    }
  }, [query.data]);

  return query;
}
