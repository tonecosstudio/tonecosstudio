import { assertCurrentUserId } from "@/services/auth/current-user";
import type { ChoiceStatus, ProductionStage } from "@/services/admin/production/production-service";
import {
  createRealtimeChannel,
  hasRealtimeChannelSupport,
  removeRealtimeChannel,
} from "@/services/supabase/realtime-client";
import type { ManualPayment } from "@/types/manual-payment";
import type { EnrichedGroupMessage } from "@/types/groups";

export type RealtimePostgresEvent = "INSERT" | "UPDATE" | "DELETE" | "*";
export type PaymentChangeEvent = "INSERT" | "UPDATE" | "DELETE";

export interface ManualPaymentChangePayload {
  event: PaymentChangeEvent;
  old: ManualPayment | null;
  new: ManualPayment | null;
}

export interface SubscribeToManualPaymentChangesOptions {
  channelName: string;
  events: readonly RealtimePostgresEvent[];
  filter?: string;
  onPaymentChange?: (payload: ManualPaymentChangePayload) => void;
  onStatusChange?: (status: string, error?: Error) => void;
}

export type ConversationChangeEvent = "INSERT" | "UPDATE" | "DELETE";

export interface SupportMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  is_internal: boolean;
  attachments: string[];
  read_by_customer: boolean;
  read_by_admin: boolean;
  created_at: string;
}

export interface SupportConversation {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  payment_id?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface SubscribeToConversationChangesOptions {
  events: readonly RealtimePostgresEvent[];
  messageFilter?: string;
  conversationFilter?: string;
  subscribeToMessages: boolean;
  subscribeToConversations: boolean;
  conversationId?: string;
  onMessageChange: (payload: {
    event: ConversationChangeEvent;
    new: SupportMessage;
    old: SupportMessage | null;
  }) => void;
  onConversationChange: (payload: {
    event: ConversationChangeEvent;
    new: SupportConversation;
    old: SupportConversation | null;
  }) => void;
  onChannelStatus: (channelName: string, status: string, error?: Error) => void;
}

export interface ConversationRealtimeSubscription {
  totalChannels: number;
  unsubscribe: () => void;
}

export interface SupportMessageThreadPayload {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: unknown;
  old: unknown;
}

export interface GroupMessagePayload {
  message: EnrichedGroupMessage;
}

export interface GroupMessageNotificationPayload {
  sender_id: string;
  message?: string | null;
}

export interface RealtimeRecordPayload {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

export interface ProductionQueueUpdate {
  id: string;
  order_id: string;
  order_type: string;
  current_stage: ProductionStage;
  production_status: string;
  choice_status: ChoiceStatus;
  character_id: string | null;
  character_name: string | null;
  tracking_code: string | null;
  estimated_completion_date: string | null;
}

export interface CharacterChoiceUpdate {
  id: string;
  order_id: string;
  order_type: string;
  status: ChoiceStatus;
  character_id: string | null;
  character_name: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
}

export type TypingAction = "start" | "stop";

export interface TypingEventPayload {
  userId: string;
  userName: string;
  action: TypingAction;
}

export interface TypingIndicatorSubscription {
  sendTypingEvent: (payload: TypingEventPayload) => void;
  unsubscribe: () => void;
}

export function isRealtimeAvailable(): boolean {
  try {
    return hasRealtimeChannelSupport();
  } catch {
    return false;
  }
}

export function subscribeToQuoteProductionChanges(
  quoteId: string,
  onChange: () => void,
): () => void {
  const channel = createRealtimeChannel(`prod:${quoteId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "quote_production",
        filter: `quote_id=eq.${quoteId}`,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "quote_production_updates",
        filter: `quote_id=eq.${quoteId}`,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "quote_production_photos",
        filter: `quote_id=eq.${quoteId}`,
      },
      onChange,
    )
    .subscribe();

  return () => {
    void removeRealtimeChannel(channel);
  };
}

export function subscribeToProductionQueueChanges(
  onChange: (payload: RealtimeRecordPayload) => void,
): () => void {
  const channel = createRealtimeChannel("production-queue-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "production_queue",
      },
      (payload) => {
        onChange(payload as unknown as RealtimeRecordPayload);
      },
    )
    .subscribe();

  return () => {
    void removeRealtimeChannel(channel);
  };
}

export function subscribeToManualPaymentChanges({
  channelName,
  events,
  filter,
  onPaymentChange,
  onStatusChange,
}: SubscribeToManualPaymentChangesOptions): () => void {
  let channel = createRealtimeChannel(channelName);

  events.forEach((event) => {
    channel = channel.on(
      "postgres_changes",
      {
        event,
        schema: "public",
        table: "manual_payments",
        filter,
      },
      (payload) => {
        onPaymentChange?.({
          event: payload.eventType as PaymentChangeEvent,
          old: payload.old as ManualPayment | null,
          new: payload.new as ManualPayment | null,
        });
      },
    );
  });

  channel.subscribe((status, error) => {
    onStatusChange?.(status, error);
  });

  return () => {
    void removeRealtimeChannel(channel);
  };
}

export function subscribeToConversationChanges({
  events,
  messageFilter,
  conversationFilter,
  subscribeToMessages,
  subscribeToConversations,
  conversationId,
  onMessageChange,
  onConversationChange,
  onChannelStatus,
}: SubscribeToConversationChangesOptions): ConversationRealtimeSubscription {
  const unsubscribeCallbacks: Array<() => void> = [];
  let totalChannels = 0;

  if (subscribeToMessages) {
    totalChannels += 1;
    const channelName = `conversation-messages-${conversationId || "all"}-${Date.now()}`;
    let channel = createRealtimeChannel(channelName);

    events.forEach((event) => {
      channel = channel.on(
        "postgres_changes",
        {
          event,
          schema: "public",
          table: "support_messages",
          filter: messageFilter,
        },
        (payload) => {
          onMessageChange({
            event: payload.eventType as ConversationChangeEvent,
            new: payload.new as SupportMessage,
            old: payload.old as SupportMessage | null,
          });
        },
      );
    });

    channel.subscribe((status, error) => {
      onChannelStatus(channelName, status, error);
    });

    unsubscribeCallbacks.push(() => {
      void removeRealtimeChannel(channel);
    });
  }

  if (subscribeToConversations) {
    totalChannels += 1;
    const channelName = `conversation-conversations-${conversationId || "all"}-${Date.now()}`;
    let channel = createRealtimeChannel(channelName);

    events.forEach((event) => {
      channel = channel.on(
        "postgres_changes",
        {
          event,
          schema: "public",
          table: "support_conversations",
          filter: conversationFilter,
        },
        (payload) => {
          onConversationChange({
            event: payload.eventType as ConversationChangeEvent,
            new: payload.new as SupportConversation,
            old: payload.old as SupportConversation | null,
          });
        },
      );
    });

    channel.subscribe((status, error) => {
      onChannelStatus(channelName, status, error);
    });

    unsubscribeCallbacks.push(() => {
      void removeRealtimeChannel(channel);
    });
  }

  return {
    totalChannels,
    unsubscribe: () => {
      unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
    },
  };
}

export function subscribeToSupportConversationListChanges(
  onChange: (eventType: string) => void,
): () => void {
  const channel = createRealtimeChannel("support_conversations_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "support_conversations",
      },
      (payload) => {
        onChange(payload.eventType);
      },
    )
    .subscribe();

  return () => {
    void removeRealtimeChannel(channel);
  };
}

export function subscribeToSupportMessageThreadChanges(options: {
  conversationId: string;
  onMessageChange: (payload: SupportMessageThreadPayload) => void;
  onAttachmentInsert: (payload: unknown) => void;
  onMessageStatusChange?: (status: string) => void;
  onAttachmentStatusChange?: (status: string) => void;
}): () => void {
  const {
    conversationId,
    onMessageChange,
    onAttachmentInsert,
    onMessageStatusChange,
    onAttachmentStatusChange,
  } = options;

  const messagesChannel = createRealtimeChannel(`messages_${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "support_messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onMessageChange({
          eventType: payload.eventType as SupportMessageThreadPayload["eventType"],
          new: payload.new,
          old: payload.old,
        });
      },
    )
    .subscribe((status) => {
      onMessageStatusChange?.(status);
    });

  const attachmentsChannel = createRealtimeChannel(`attachments_${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "support_attachments",
      },
      (payload) => {
        onAttachmentInsert(payload.new);
      },
    )
    .subscribe((status) => {
      onAttachmentStatusChange?.(status);
    });

  return () => {
    void removeRealtimeChannel(messagesChannel);
    void removeRealtimeChannel(attachmentsChannel);
  };
}

export function subscribeToGroupBroadcastMessages(options: {
  groupId: string;
  onNewMessage: (payload: unknown) => void;
  onStatusChange?: (status: string) => void;
}): () => void {
  const { groupId, onNewMessage, onStatusChange } = options;

  const channel = createRealtimeChannel(`group:${groupId}`, {
    config: {
      broadcast: {
        self: false,
        ack: false,
      },
    },
  });

  channel
    .on("broadcast", { event: "new_message" }, ({ payload }) => {
      onNewMessage(payload);
    })
    .subscribe((status) => {
      onStatusChange?.(status);
    });

  return () => {
    void removeRealtimeChannel(channel);
  };
}

export function subscribeToGroupMessageNotifications(options: {
  groupId: string;
  onInsert: (message: GroupMessageNotificationPayload) => void;
  onUpdate: () => void;
}): () => void {
  const { groupId, onInsert, onUpdate } = options;

  const channel = createRealtimeChannel(`group-messages:${groupId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_group_messages",
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => {
        onInsert(payload.new as GroupMessageNotificationPayload);
      },
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "chat_group_messages",
        filter: `group_id=eq.${groupId}`,
      },
      onUpdate,
    )
    .subscribe();

  return () => {
    void removeRealtimeChannel(channel);
  };
}

export async function subscribeToCurrentUserPaymentUpdates(
  userId: string,
  onPaymentUpdate: () => void,
): Promise<() => void> {
  await assertCurrentUserId(userId);

  const channel = createRealtimeChannel("payments-arcade")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "manual_payments",
        filter: `user_id=eq.${userId}`,
      },
      onPaymentUpdate,
    )
    .subscribe();

  return () => {
    void removeRealtimeChannel(channel);
  };
}

export function subscribeToOrderProgressChanges(options: {
  orderId: string;
  orderType: "subscription_delivery" | "standalone_purchase";
  onProductionUpdate: (update: ProductionQueueUpdate) => void;
  onCharacterChoiceUpdate: (update: CharacterChoiceUpdate) => void;
  onCharacterChoiceInsert: (update: CharacterChoiceUpdate) => void;
  onProductionStatusChange?: (status: string, error?: Error) => void;
  onChoiceStatusChange?: (status: string, error?: Error) => void;
}): () => void {
  const {
    orderId,
    orderType,
    onProductionUpdate,
    onCharacterChoiceUpdate,
    onCharacterChoiceInsert,
    onProductionStatusChange,
    onChoiceStatusChange,
  } = options;

  const productionChannel = createRealtimeChannel(`production-queue:${orderId}:${orderType}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "production_queue",
        filter: `order_id=eq.${orderId}`,
      },
      (payload) => {
        const update = payload.new as ProductionQueueUpdate;
        if (update.order_type === orderType) {
          onProductionUpdate(update);
        }
      },
    )
    .subscribe((status, error) => {
      onProductionStatusChange?.(status, error);
    });

  const choiceChannel = createRealtimeChannel(`character-choices:${orderId}:${orderType}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "character_choices",
        filter: `order_id=eq.${orderId}`,
      },
      (payload) => {
        const update = payload.new as CharacterChoiceUpdate;
        if (update.order_type === orderType) {
          onCharacterChoiceUpdate(update);
        }
      },
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "character_choices",
        filter: `order_id=eq.${orderId}`,
      },
      (payload) => {
        const update = payload.new as CharacterChoiceUpdate;
        if (update.order_type === orderType) {
          onCharacterChoiceInsert(update);
        }
      },
    )
    .subscribe((status, error) => {
      onChoiceStatusChange?.(status, error);
    });

  return () => {
    void removeRealtimeChannel(productionChannel);
    void removeRealtimeChannel(choiceChannel);
  };
}

export function subscribeToTypingIndicator(options: {
  conversationId: string;
  onTypingEvent: (payload: TypingEventPayload) => void;
  onStatusChange?: (status: string) => void;
}): TypingIndicatorSubscription {
  const { conversationId, onTypingEvent, onStatusChange } = options;

  const channel = createRealtimeChannel(`typing:${conversationId}`, {
    config: {
      broadcast: {
        self: false,
        ack: false,
      },
    },
  });

  channel
    .on("broadcast", { event: "typing" }, ({ payload }) => {
      onTypingEvent(payload as TypingEventPayload);
    })
    .subscribe((status) => {
      onStatusChange?.(status);
    });

  return {
    sendTypingEvent: (payload) => {
      void channel.send({
        type: "broadcast",
        event: "typing",
        payload,
      });
    },
    unsubscribe: () => {
      void removeRealtimeChannel(channel);
    },
  };
}
