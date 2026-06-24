import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import {
  createRealtimeChannel,
  removeRealtimeChannel,
} from "@/services/supabase/realtime-client";

export interface NotificationCountData {
  total: number;
  pendingPayments: number;
  underReviewPayments: number;
  requiresInfoPayments: number;
  unreadMessages: number;
  isAdmin: boolean;
}

type ConversationIdRow = { id: string };
type SupportMessageReadRow = {
  read_by_customer?: boolean;
  read_by_admin?: boolean;
};

export const EMPTY_CUSTOMER_NOTIFICATION_COUNT: NotificationCountData = {
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

export async function fetchAdminNotificationCount(
  adminId: string,
): Promise<NotificationCountData> {
  const { data: pendingPayments, error: pendingError } = await supabase
    .from("manual_payments")
    .select("id, status")
    .in("status", ["pending", "under_review"]);

  if (pendingError) {
    log.error("Failed to fetch pending manual payments for notification count", {
      error: pendingError,
      adminId,
    });
    throw pendingError;
  }

  const pendingCount = pendingPayments?.filter((payment) => payment.status === "pending").length || 0;
  const underReviewCount =
    pendingPayments?.filter((payment) => payment.status === "under_review").length || 0;

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

export async function fetchCustomerNotificationCount(
  customerId: string,
): Promise<NotificationCountData> {
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
    throw paymentsError;
  }

  const requiresInfoCount = requiresInfoPayments?.length || 0;

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
      customerConversations.some((conversation) => conversation.id === message.conversation_id),
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

export function fetchNotificationCount(params: {
  userId: string;
  isAdmin: boolean;
}): Promise<NotificationCountData> {
  return params.isAdmin
    ? fetchAdminNotificationCount(params.userId)
    : fetchCustomerNotificationCount(params.userId);
}

function supportMessageReadChanged(
  payload: RealtimePostgresChangesPayload<SupportMessageReadRow>,
): boolean {
  const newRow = payload.new as SupportMessageReadRow;
  const oldRow = payload.old as Partial<SupportMessageReadRow> | null;

  return (
    newRow.read_by_customer !== oldRow?.read_by_customer ||
    newRow.read_by_admin !== oldRow?.read_by_admin
  );
}

export function subscribeToNotificationCountChanges(params: {
  userId: string;
  isAdmin: boolean;
  onChange: () => void;
}): () => void {
  const channels: RealtimeChannel[] = [];

  try {
    const paymentChannel = createRealtimeChannel(`notification-payments-${params.userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "manual_payments",
          filter: params.isAdmin ? undefined : `user_id=eq.${params.userId}`,
        },
        params.onChange,
      )
      .subscribe();

    channels.push(paymentChannel);
  } catch (error) {
    log.warn("Could not create manual payment notification realtime channel", {
      error,
      userId: params.userId,
    });
  }

  const messageChannel = createRealtimeChannel(`notification-messages-${params.userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
      },
      params.onChange,
    )
    .subscribe();

  channels.push(messageChannel);

  const messageReadChannel = createRealtimeChannel(`notification-messages-read-${params.userId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "support_messages",
      },
      (payload) => {
        if (supportMessageReadChanged(payload)) {
          params.onChange();
        }
      },
    )
    .subscribe();

  channels.push(messageReadChannel);

  return () => {
    channels.forEach((channel) => {
      removeRealtimeChannel(channel);
    });
  };
}
