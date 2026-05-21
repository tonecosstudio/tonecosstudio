import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteAdminNotification,
  fetchAdminNotificationSettings,
  fetchAdminNotificationsHistory,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  sendAdminNotificationTest,
  updateAdminNotificationSettings,
} from "@/services/admin/admin-notifications-service";
import type {
  AdminNotification,
  AdminNotificationSettings,
  NotificationFilter,
  NotificationPriority,
  NotificationType,
} from "@/services/admin/admin-notifications-service";

export type {
  AdminNotification,
  AdminNotificationSettings,
  NotificationFilter,
  NotificationPriority,
  NotificationType,
};

export const adminNotificationManagementKeys = {
  settings: () => ["admin-notification-settings"] as const,
  history: (filter?: NotificationFilter) =>
    filter
      ? (["admin-notifications-history", filter] as const)
      : (["admin-notifications-history"] as const),
};

export function useAdminNotificationSettings() {
  return useQuery({
    queryKey: adminNotificationManagementKeys.settings(),
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
        queryKey: adminNotificationManagementKeys.settings(),
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
    queryKey: adminNotificationManagementKeys.history(filter),
    queryFn: () => fetchAdminNotificationsHistory(filter),
  });
}

export function useMarkAdminNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAdminNotificationRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminNotificationManagementKeys.history(),
      });
    },
  });
}

export function useMarkAllAdminNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllAdminNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminNotificationManagementKeys.history(),
      });
    },
  });
}

export function useDeleteAdminNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAdminNotification,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminNotificationManagementKeys.history(),
      });
    },
  });
}
