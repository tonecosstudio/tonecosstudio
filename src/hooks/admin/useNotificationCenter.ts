import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type AdminNotification,
} from "@/services/admin/notification-center-service";

export type { AdminNotification };

export function useAdminNotifications(filter: "all" | "unread") {
  return useQuery({
    queryKey: ["admin-notifications", filter],
    queryFn: () => fetchAdminNotifications(filter),
    refetchInterval: 30000,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
  });
}
