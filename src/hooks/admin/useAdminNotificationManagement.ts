import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminNotificationQueryKeys } from "@/hooks/admin/admin-notification-query-keys";
import {
  fetchAdminNotificationSettings,
  fetchAdminNotificationsHistory,
  sendAdminNotificationTest,
  updateAdminNotificationSettings,
} from "@/services/admin/support/admin-notifications-service";
import type {
  AdminNotification,
  AdminNotificationSettings,
  NotificationFilter,
  NotificationPriority,
  NotificationType,
} from "@/services/admin/support/admin-notifications-service";

export type {
  AdminNotification,
  AdminNotificationSettings,
  NotificationFilter,
  NotificationPriority,
  NotificationType,
};

export function useAdminNotificationSettings() {
  return useQuery({
    queryKey: adminNotificationQueryKeys.settings(),
    queryFn: fetchAdminNotificationSettings,
  });
}

export function useUpdateAdminNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<AdminNotificationSettings>) =>
      updateAdminNotificationSettings(updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminNotificationQueryKeys.settings(),
      });
    },
  });
}

export function useSendAdminNotificationTest() {
  return useMutation({
    mutationFn: sendAdminNotificationTest,
  });
}

export function useAdminNotificationHistory(filter: NotificationFilter) {
  return useQuery({
    queryKey: adminNotificationQueryKeys.list(filter),
    queryFn: () => fetchAdminNotificationsHistory(filter),
  });
}
