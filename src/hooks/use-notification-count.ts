import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/roles";
import { log } from "@/lib/logger";

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

type NotificationCountData = Omit<NotificationCount, "isLoading" | "error">;
type ConversationIdRow = { id: string };

const EMPTY_CUSTOMER_COUNT: NotificationCountData = {
  total: 0,
  pendingPayments: 0,
  underReviewPayments: 0,
  requiresInfoPayments: 0,
  unreadMessages: 0,
  isAdmin: false,
};

async function getCustomerConversations(customerId: string): Promise<ConversationIdRow[]> {
  const { data, error } = await supabase
    .from("support_conversations")
    .select("id")
    .eq("user_id", customerId);

  if (error) {
    log.error("Failed to fetch customer support conversations", { error, customerId });
    return [];
  }

  return data || [];
}

async function fetchAdminNotificationCount(adminId: string): Promise<NotificationCountData> {
  let pendingCount = 0;
  let underReviewCount = 0;

  try {
    const { data: pendingPayments, error: pendingError } = await supabase
      .from("manual_payments")
      .select("id, status")
      .in("status", ["pending", "under_review"]);

    if (pendingError) {
      log.error("Failed to fetch pending manual payments for notification count", {
        error: pendingError,
        adminId,
      });

      if (
        pendingError.code === "PGRST205" ||
        pendingError.message?.includes("Could not find the table")
      ) {
        log.warn("manual_payments table unavailable while counting admin notifications", {
          adminId,
        });
      } else {
        throw pendingError;
      }
    } else {
      pendingCount = pendingPayments?.filter((payment) => payment.status === "pending").length || 0;
      underReviewCount =
        pendingPayments?.filter((payment) => payment.status === "under_review").length || 0;
    }
  } catch (error) {
    log.error("Unexpected failure while counting admin manual payments", { error, adminId });
  }

  const { data: unreadMessages, error: messagesError } = await supabase
    .from("support_messages")
    .select("id, read_by_admin")
    .eq("read_by_admin", false);

  if (messagesError) {
    log.error("Failed to fetch unread admin support messages", {
      error: messagesError,
      adminId,
    });
    throw messagesError;
  }

  const unreadMessagesCount = unreadMessages?.length || 0;

  return {
    total: pendingCount + underReviewCount + unreadMessagesCount,
    pendingPayments: pendingCount,
    underReviewPayments: underReviewCount,
    requiresInfoPayments: 0,
    unreadMessages: unreadMessagesCount,
    isAdmin: true,
  };
}

async function fetchCustomerNotificationCount(customerId: string): Promise<NotificationCountData> {
  let requiresInfoCount = 0;

  try {
    const { data: requiresInfoPayments, error: paymentsError } = await supabase
      .from("manual_payments")
      .select("id, status")
      .eq("user_id", customerId)
      .eq("status", "requires_info");

    if (paymentsError) {
      log.error("Failed to fetch customer manual payments requiring information", {
        error: paymentsError,
        customerId,
      });

      if (
        paymentsError.code === "PGRST205" ||
        paymentsError.message?.includes("Could not find the table")
      ) {
        log.warn("manual_payments table unavailable while counting customer notifications", {
          customerId,
        });
      } else {
        throw paymentsError;
      }
    } else {
      requiresInfoCount = requiresInfoPayments?.length || 0;
    }
  } catch (error) {
    log.error("Unexpected failure while counting customer manual payments", {
      error,
      customerId,
    });
  }

  const { data: unreadMessages, error: messagesError } = await supabase
    .from("support_messages")
    .select("id, conversation_id")
    .eq("read_by_customer", false);

  if (messagesError) {
    log.error("Failed to fetch unread customer support messages", {
      error: messagesError,
      customerId,
    });
    throw messagesError;
  }

  const customerConversations = await getCustomerConversations(customerId);
  const unreadMessagesCount =
    unreadMessages?.filter((message) =>
      customerConversations.some((conversation) => conversation.id === message.conversation_id)
    ).length || 0;

  return {
    total: requiresInfoCount + unreadMessagesCount,
    pendingPayments: 0,
    underReviewPayments: 0,
    requiresInfoPayments: requiresInfoCount,
    unreadMessages: unreadMessagesCount,
    isAdmin: false,
  };
}

export function useNotificationCount(): NotificationCount {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const { data: isAdminData, isLoading: isAdminLoading } = useIsAdmin(user?.id);
  const queryClient = useQueryClient();
  const [realTimeCount, setRealTimeCount] = useState<NotificationCount | null>(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        setUser(currentUser);
      } finally {
        setIsAuthReady(true);
      }
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setIsAuthReady(true);
    });

    return () => {
      subscription.unsubscribe();
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
      if (!user?.id) return EMPTY_CUSTOMER_COUNT;
      return isAdmin
        ? fetchAdminNotificationCount(user.id)
        : fetchCustomerNotificationCount(user.id);
    },
    enabled: !!user?.id && !isAdminLoading,
    refetchOnWindowFocus: false,
  });

  const updateCount = useCallback(async () => {
    if (!user?.id) return;

    try {
      const newCount = isAdmin
        ? await fetchAdminNotificationCount(user.id)
        : await fetchCustomerNotificationCount(user.id);

      setRealTimeCount({
        ...newCount,
        isLoading: false,
        error: null,
      });

      queryClient.invalidateQueries({ queryKey: ["notification-count", user.id, isAdmin] });
    } catch (err) {
      log.error("Failed to refresh realtime notification count", { error: err, userId: user.id });
      setRealTimeCount((prev) =>
        prev
          ? {
              ...prev,
              isLoading: false,
              error: err as Error,
            }
          : null
      );
    }
  }, [user?.id, isAdmin, queryClient]);

  useEffect(() => {
    if (!user?.id) return;

    const channels: RealtimeChannel[] = [];

    try {
      const paymentChannel = supabase
        .channel(`notification-payments-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "manual_payments",
            filter: isAdmin ? undefined : `user_id=eq.${user.id}`,
          },
          () => {
            updateCount();
          }
        )
        .subscribe();

      channels.push(paymentChannel);
    } catch (error) {
      log.warn("Could not create manual payment notification realtime channel", {
        error,
        userId: user.id,
      });
    }

    const messageChannel = supabase
      .channel(`notification-messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
        },
        () => {
          updateCount();
        }
      )
      .subscribe();

    channels.push(messageChannel);

    const messageReadChannel = supabase
      .channel(`notification-messages-read-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "support_messages",
        },
        (payload) => {
          if (
            payload.new.read_by_customer !== payload.old?.read_by_customer ||
            payload.new.read_by_admin !== payload.old?.read_by_admin
          ) {
            updateCount();
          }
        }
      )
      .subscribe();

    channels.push(messageReadChannel);

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
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
          ...EMPTY_CUSTOMER_COUNT,
          isLoading,
          error: error as Error | null,
        })
  );
}

export function useFormattedNotificationCount() {
  const notificationCount = useNotificationCount();

  const formattedTotal = notificationCount.total > 99 ? "99+" : notificationCount.total.toString();
  const hasNotifications = notificationCount.total > 0;

  return {
    ...notificationCount,
    formattedTotal,
    hasNotifications,
  };
}
