import { useQuery } from "@tanstack/react-query";
import { adminNotificationQueryKeys } from "@/hooks/admin/admin-notification-query-keys";
import {
  fetchAdminNotifications,
  type AdminNotification,
} from "@/services/admin/support/admin-notifications-service";

export type { AdminNotification };

export function useAdminNotifications(filter: "all" | "unread") {
  return useQuery({
    queryKey: adminNotificationQueryKeys.list(filter),
    queryFn: () => fetchAdminNotifications(filter),
    refetchInterval: 30000,
  });
}
