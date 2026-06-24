import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { log } from "@/lib/logger";
import { subscribeToConversationChanges } from "@/services/realtime/realtime-service";
import type { RealtimeConnectionState } from "./use-payment-realtime";
import {
  DEFAULT_REALTIME_EVENTS,
  getRealtimeEventsFromKey,
  getRealtimeEventsKey,
  getRealtimeRetryDelay,
  REALTIME_INSERT_EVENTS,
  REALTIME_UPDATE_EVENTS,
  useLatestRef,
  useRealtimeReconnectionConfig,
} from "./realtime-helpers";
import type { ReconnectionConfig, RealtimePostgresEvent } from "./realtime-helpers";

export type { ReconnectionConfig, RealtimePostgresEvent } from "./realtime-helpers";

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

export interface UseConversationRealtimeOptions {
  conversationId?: string;
  userId?: string;
  paymentId?: string;
  events?: readonly RealtimePostgresEvent[];
  subscribeToMessages?: boolean;
  subscribeToConversations?: boolean;
  reconnectionConfig?: Partial<ReconnectionConfig>;
  onNewMessage?: (message: SupportMessage) => void;
  onMessageUpdate?: (message: SupportMessage, oldMessage: SupportMessage | null) => void;
  onConversationUpdate?: (
    conversation: SupportConversation,
    oldConversation: SupportConversation | null,
  ) => void;
  onConnected?: () => void;
  onDisconnected?: (error?: Error) => void;
}

function buildMessageFilter(conversationId?: string): string | undefined {
  return conversationId ? `conversation_id=eq.${conversationId}` : undefined;
}

function buildConversationFilter(
  conversationId?: string,
  userId?: string,
  paymentId?: string,
): string | undefined {
  const filters: string[] = [];

  if (conversationId) filters.push(`id=eq.${conversationId}`);
  if (userId) filters.push(`user_id=eq.${userId}`);
  if (paymentId) filters.push(`payment_id=eq.${paymentId}`);

  return filters.length > 0 ? filters.join(",") : undefined;
}

export function useConversationRealtime(options: UseConversationRealtimeOptions = {}) {
  const {
    conversationId,
    userId,
    paymentId,
    events = DEFAULT_REALTIME_EVENTS,
    subscribeToMessages = true,
    subscribeToConversations = false,
    reconnectionConfig: userReconnectionConfig,
    onNewMessage,
    onMessageUpdate,
    onConversationUpdate,
    onConnected,
    onDisconnected,
  } = options;

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);
  const connectRef = useRef<() => void>(() => {});
  const onNewMessageRef = useLatestRef(onNewMessage);
  const onMessageUpdateRef = useLatestRef(onMessageUpdate);
  const onConversationUpdateRef = useLatestRef(onConversationUpdate);
  const onConnectedRef = useLatestRef(onConnected);
  const onDisconnectedRef = useLatestRef(onDisconnected);

  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>({
    isConnected: false,
    isReconnecting: false,
    retryCount: 0,
    error: null,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
  });

  const reconnectionConfig = useRealtimeReconnectionConfig(userReconnectionConfig);
  const eventsKey = getRealtimeEventsKey(events);
  const normalizedEvents = useMemo(() => getRealtimeEventsFromKey(eventsKey), [eventsKey]);
  const messageFilter = useMemo(() => buildMessageFilter(conversationId), [conversationId]);
  const conversationFilter = useMemo(
    () => buildConversationFilter(conversationId, userId, paymentId),
    [conversationId, userId, paymentId],
  );

  const scheduleReconnect = useCallback(() => {
    if (!isMountedRef.current) return;

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    const nextRetryCount = retryCountRef.current + 1;
    const delay = getRealtimeRetryDelay(reconnectionConfig, nextRetryCount - 1);
    retryCountRef.current = nextRetryCount;

    setConnectionState((prev) => ({
      ...prev,
      isReconnecting: true,
      retryCount: retryCountRef.current,
    }));

    retryTimeoutRef.current = setTimeout(() => {
      connectRef.current();
    }, delay);
  }, [reconnectionConfig]);

  const disconnect = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (isMountedRef.current) {
      setConnectionState((prev) => ({
        ...prev,
        isConnected: false,
        isReconnecting: false,
        lastDisconnectedAt: new Date(),
      }));
    }
  }, []);

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;

    unsubscribeRef.current?.();
    unsubscribeRef.current = null;

    try {
      setConnectionState((prev) => ({
        ...prev,
        isReconnecting: true,
        error: null,
      }));

      let subscribedChannels = 0;

      const markConnected = (totalChannels: number) => {
        if (subscribedChannels !== totalChannels) return;

        retryCountRef.current = 0;
        setConnectionState((prev) => ({
          ...prev,
          isConnected: true,
          isReconnecting: false,
          retryCount: 0,
          lastConnectedAt: new Date(),
          error: null,
        }));
        onConnectedRef.current?.();
      };

      const handleChannelError = (channelName: string, error: Error) => {
        log.error("Conversation realtime channel failed", { channelName, error });

        if (!isMountedRef.current) return;

        setConnectionState((prev) => ({
          ...prev,
          isConnected: false,
          isReconnecting: false,
          lastDisconnectedAt: new Date(),
          error,
        }));

        onDisconnectedRef.current?.(error);

        if (retryCountRef.current < reconnectionConfig.maxRetries) {
          scheduleReconnect();
        }
      };

      const subscription = subscribeToConversationChanges({
        events: normalizedEvents,
        messageFilter,
        conversationFilter,
        subscribeToMessages,
        subscribeToConversations,
        conversationId,
        onMessageChange: (payload) => {
          if (!isMountedRef.current) return;

          if (payload.event === "INSERT") {
            onNewMessageRef.current?.(payload.new);
          }

          if (payload.event === "UPDATE") {
            onMessageUpdateRef.current?.(payload.new, payload.old);
          }
        },
        onConversationChange: (payload) => {
          if (!isMountedRef.current || !onConversationUpdateRef.current) return;
          if (payload.event !== "UPDATE") return;

          onConversationUpdateRef.current(payload.new, payload.old);
        },
        onChannelStatus: (channelName, status, error) => {
          if (!isMountedRef.current) return;

          if (status === "SUBSCRIBED") {
            subscribedChannels += 1;
            markConnected(subscription.totalChannels);
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            handleChannelError(channelName, error || new Error(`Falha na conexao: ${status}`));
          }
        },
      });

      if (subscription.totalChannels === 0) {
        setConnectionState((prev) => ({
          ...prev,
          isConnected: true,
          isReconnecting: false,
          lastConnectedAt: new Date(),
          error: null,
        }));
        onConnectedRef.current?.();
      }

      unsubscribeRef.current = subscription.unsubscribe;
    } catch (error) {
      log.error("Failed to create conversation realtime channels", { error });
      setConnectionState((prev) => ({
        ...prev,
        isConnected: false,
        isReconnecting: false,
        error: error as Error,
        lastDisconnectedAt: new Date(),
      }));

      onDisconnectedRef.current?.(error as Error);

      if (retryCountRef.current < reconnectionConfig.maxRetries) {
        scheduleReconnect();
      }
    }
  }, [
    conversationId,
    normalizedEvents,
    messageFilter,
    conversationFilter,
    subscribeToMessages,
    subscribeToConversations,
    onNewMessageRef,
    onMessageUpdateRef,
    onConversationUpdateRef,
    onConnectedRef,
    onDisconnectedRef,
    reconnectionConfig.maxRetries,
    scheduleReconnect,
  ]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const reconnect = useCallback(() => {
    disconnect();
    retryCountRef.current = 0;
    connect();
  }, [disconnect, connect]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    ...connectionState,
    disconnect,
    reconnect,
  };
}

export function useConversationMessagesRealtime(
  conversationId: string,
  onNewMessage?: (message: SupportMessage) => void,
) {
  const { isConnected, isReconnecting, error, ...rest } = useConversationRealtime({
    conversationId,
    events: REALTIME_INSERT_EVENTS,
    subscribeToMessages: true,
    subscribeToConversations: false,
    onNewMessage,
  });

  return {
    isConnected,
    isReconnecting,
    error,
    ...rest,
  };
}

export function useMessageReadRealtime(
  conversationId?: string,
  onMessageRead?: (
    message: SupportMessage,
    wasReadByCustomer: boolean,
    wasReadByAdmin: boolean,
  ) => void,
) {
  const { isConnected, isReconnecting, error, ...rest } = useConversationRealtime({
    conversationId,
    events: REALTIME_UPDATE_EVENTS,
    subscribeToMessages: true,
    subscribeToConversations: false,
    onMessageUpdate: (message, oldMessage) => {
      if (!onMessageRead || !oldMessage) return;

      const wasReadByCustomer = !oldMessage.read_by_customer && message.read_by_customer;
      const wasReadByAdmin = !oldMessage.read_by_admin && message.read_by_admin;

      if (wasReadByCustomer || wasReadByAdmin) {
        onMessageRead(message, wasReadByCustomer, wasReadByAdmin);
      }
    },
  });

  return {
    isConnected,
    isReconnecting,
    error,
    ...rest,
  };
}

export function usePaymentConversationRealtime(
  paymentId: string,
  onConversationUpdate?: (
    conversation: SupportConversation,
    oldConversation: SupportConversation | null,
  ) => void,
) {
  const { isConnected, isReconnecting, error, ...rest } = useConversationRealtime({
    paymentId,
    events: REALTIME_UPDATE_EVENTS,
    subscribeToMessages: false,
    subscribeToConversations: true,
    onConversationUpdate,
  });

  return {
    isConnected,
    isReconnecting,
    error,
    ...rest,
  };
}
