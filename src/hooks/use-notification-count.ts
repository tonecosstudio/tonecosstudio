import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { useCurrentUserIsAdmin } from "@/lib/roles";
import { log } from "@/lib/logger";
import {
  getCurrentAuthSession,
  subscribeToAuthSessionChanges,
} from "@/services/auth/auth-session-service";
import {
  EMPTY_CUSTOMER_NOTIFICATION_COUNT,
  fetchNotificationCount,
  subscribeToNotificationCountChanges,
} from "@/services/notifications/notification-count-service";

export interface NotificationCount {
  total: number;
  pendingPayments: number;
  underReviewPayments: number;
  requiresInfoPayments: number;
  unreadMessages: number;
  isAdmin: boolean;
  isLoading: boolean;
  error: Error | null;
}

export function useNotificationCount(): NotificationCount {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const { data: isAdminData, isLoading: isAdminLoading } =
    useCurrentUserIsAdmin({
      currentUserId: user?.id,
      enabled: isAuthReady,
    });
  const queryClient = useQueryClient();
  const [realTimeCount, setRealTimeCount] = useState<NotificationCount | null>(
    null,
  );

  useEffect(() => {
    const getUser = async () => {
      try {
        const session = await getCurrentAuthSession();
        setUser(session?.user ?? null);
      } finally {
        setIsAuthReady(true);
      }
    };

    getUser();

    const unsubscribe = subscribeToAuthSessionChanges((session) => {
      setUser(session?.user ?? null);
      setIsAuthReady(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const isAdmin = isAdminData || false;
  const isLoadingAuth = !isAuthReady || (!!user?.id && isAdminLoading);

  const {
    data: initialCount,
    isLoading: isLoadingCount,
    error,
  } = useQuery({
    queryKey: ["notification-count", user?.id, isAdmin],
    queryFn: async () => {
      if (!user?.id) return EMPTY_CUSTOMER_NOTIFICATION_COUNT;
      return fetchNotificationCount({ userId: user.id, isAdmin });
    },
    enabled: !!user?.id && !isAdminLoading,
    refetchOnWindowFocus: false,
  });

  const updateCount = useCallback(async () => {
    if (!user?.id) return;

    try {
      const newCount = await fetchNotificationCount({
        userId: user.id,
        isAdmin,
      });

      setRealTimeCount({
        ...newCount,
        isLoading: false,
        error: null,
      });

      queryClient.invalidateQueries({
        queryKey: ["notification-count", user.id, isAdmin],
      });
    } catch (err) {
      log.error("Failed to refresh realtime notification count", {
        error: err,
        userId: user.id,
      });
      setRealTimeCount((prev) =>
        prev
          ? {
              ...prev,
              isLoading: false,
              error: err as Error,
            }
          : null,
      );
    }
  }, [user?.id, isAdmin, queryClient]);

  useEffect(() => {
    if (!user?.id) return;

    return subscribeToNotificationCountChanges({
      userId: user.id,
      isAdmin,
      onChange: updateCount,
    });
  }, [user?.id, isAdmin, updateCount]);

  const isLoading = isLoadingAuth || isLoadingCount;

  return (
    realTimeCount ||
    (initialCount
      ? {
          ...initialCount,
          isLoading,
          error: error as Error | null,
        }
      : {
          ...EMPTY_CUSTOMER_NOTIFICATION_COUNT,
          isLoading,
          error: error as Error | null,
        })
  );
}

export function useFormattedNotificationCount() {
  const notificationCount = useNotificationCount();

  const formattedTotal =
    notificationCount.total > 99 ? "99+" : notificationCount.total.toString();
  const hasNotifications = notificationCount.total > 0;

  return {
    ...notificationCount,
    formattedTotal,
    hasNotifications,
  };
}
