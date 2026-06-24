import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminNotificationQueryKeys } from "@/hooks/admin/admin-notification-query-keys";
import {
  fetchAdminNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
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

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminNotificationQueryKeys.all() });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminNotificationQueryKeys.all() });
    },
  });
}
