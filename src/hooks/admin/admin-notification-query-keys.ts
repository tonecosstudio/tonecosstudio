import type { NotificationFilter } from "@/services/admin/support/admin-notifications-service";

export const adminNotificationQueryKeys = {
  all: () => ["admin-notifications"] as const,
  list: (filter?: NotificationFilter) =>
    filter ? (["admin-notifications", filter] as const) : (["admin-notifications"] as const),
  settings: () => ["admin-notification-settings"] as const,
};
