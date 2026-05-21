import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  deleteUserNotification,
  listUserNotifications,
  markAllUserNotificationsAsRead,
  markUserNotificationAsRead,
  type UserNotificationFilter,
} from "@/services/notifications/notification-center-service";

export type {
  UserNotificationCenterItem,
  UserNotificationFilter,
} from "@/services/notifications/notification-center-service";

export function useUserNotificationCenterData(filter: UserNotificationFilter, searchQuery = "") {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ["user-notifications", filter, searchQuery],
    queryFn: () => listUserNotifications(filter, searchQuery),
    refetchInterval: 30000,
  });

  const invalidateNotifications = () => {
    queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
    queryClient.invalidateQueries({ queryKey: ["user-notifications-unread"] });
  };

  const markAsReadMutation = useMutation({
    mutationFn: markUserNotificationAsRead,
    onSuccess: invalidateNotifications,
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllUserNotificationsAsRead,
    onSuccess: (count) => {
      invalidateNotifications();
      toast({
        title: "Notificacoes marcadas como lidas",
        description: `${count} notificacoes foram marcadas como lidas.`,
      });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: deleteUserNotification,
    onSuccess: invalidateNotifications,
  });

  const notifications = notificationsQuery.data ?? [];

  return {
    notifications,
    unreadCount: notifications.filter((notification) => !notification.is_read).length,
    isLoading: notificationsQuery.isLoading,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}
