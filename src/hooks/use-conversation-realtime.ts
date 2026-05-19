import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import type { RealtimeConnectionState, ReconnectionConfig } from "./use-payment-realtime";

type RealtimePostgresEvent = "INSERT" | "UPDATE" | "DELETE" | "*";
type ConversationChangeEvent = "INSERT" | "UPDATE" | "DELETE";

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
  events?: RealtimePostgresEvent[];
  subscribeToMessages?: boolean;
  subscribeToConversations?: boolean;
  reconnectionConfig?: Partial<ReconnectionConfig>;
  onNewMessage?: (message: SupportMessage) => void;
  onMessageUpdate?: (message: SupportMessage, oldMessage: SupportMessage | null) => void;
  onConversationUpdate?: (
    conversation: SupportConversation,
    oldConversation: SupportConversation | null
  ) => void;
  onConnected?: () => void;
  onDisconnected?: (error?: Error) => void;
}

const DEFAULT_RECONNECTION_CONFIG: ReconnectionConfig = {
  maxRetries: 10,
  baseDelayMs: 1000,
  backoffFactor: 2,
  maxDelayMs: 30000,
};

function normalizeEvents(events: RealtimePostgresEvent[]): RealtimePostgresEvent[] {
  return events.includes("*") ? ["*"] : events;
}

function buildMessageFilter(conversationId?: string): string | undefined {
  return conversationId ? `conversation_id=eq.${conversationId}` : undefined;
}

function buildConversationFilter(
  conversationId?: string,
  userId?: string,
  paymentId?: string
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
    events = ["INSERT", "UPDATE", "DELETE"],
    subscribeToMessages = true,
    subscribeToConversations = false,
    reconnectionConfig: userReconnectionConfig,
    onNewMessage,
    onMessageUpdate,
    onConversationUpdate,
    onConnected,
    onDisconnected,
  } = options;

  const channelsRef = useRef<RealtimeChannel[]>([]);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);
  const connectRef = useRef<() => void>(() => {});

  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>({
    isConnected: false,
    isReconnecting: false,
    retryCount: 0,
    error: null,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
  });

  const reconnectionConfig = useMemo(
    () => ({
      ...DEFAULT_RECONNECTION_CONFIG,
      ...userReconnectionConfig,
    }),
    [userReconnectionConfig]
  );

  const calculateRetryDelay = useCallback(
    (attempt: number): number => {
      const delay =
        reconnectionConfig.baseDelayMs * Math.pow(reconnectionConfig.backoffFactor, attempt);
      return Math.min(delay, reconnectionConfig.maxDelayMs);
    },
    [reconnectionConfig]
  );

  const scheduleReconnect = useCallback(() => {
    if (!isMountedRef.current) return;

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    retryCountRef.current += 1;
    const delay = calculateRetryDelay(retryCountRef.current);

    setConnectionState((prev) => ({
      ...prev,
      isReconnecting: true,
      retryCount: retryCountRef.current,
    }));

    retryTimeoutRef.current = setTimeout(() => {
      connectRef.current();
    }, delay);
  }, [calculateRetryDelay]);

  const disconnect = useCallback(() => {
    channelsRef.current.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    setConnectionState((prev) => ({
      ...prev,
      isConnected: false,
      isReconnecting: false,
      lastDisconnectedAt: new Date(),
    }));
  }, []);

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;

    channelsRef.current.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    try {
      setConnectionState((prev) => ({
        ...prev,
        isReconnecting: true,
        error: null,
      }));

      const channels: RealtimeChannel[] = [];
      let subscribedChannels = 0;
      let totalChannels = 0;

      const markConnected = () => {
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
        onConnected?.();
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

        onDisconnected?.(error);

        if (retryCountRef.current < reconnectionConfig.maxRetries) {
          scheduleReconnect();
        }
      };

      if (subscribeToMessages) {
        totalChannels += 1;
        const channelName = `conversation-messages-${conversationId || "all"}-${Date.now()}`;
        let channel = supabase.channel(channelName);

        normalizeEvents(events).forEach((event) => {
          channel = channel.on(
            "postgres_changes",
            {
              event,
              schema: "public",
              table: "support_messages",
              filter: buildMessageFilter(conversationId),
            },
            (payload) => {
              if (!isMountedRef.current) return;

              const eventType = payload.eventType as ConversationChangeEvent;
              const message = payload.new as SupportMessage;
              const oldMessage = payload.old as SupportMessage | null;

              if (eventType === "INSERT") onNewMessage?.(message);
              if (eventType === "UPDATE") onMessageUpdate?.(message, oldMessage);
            }
          );
        });

        channel.subscribe((status, error) => {
          if (!isMountedRef.current) return;

          if (status === "SUBSCRIBED") {
            subscribedChannels += 1;
            markConnected();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            handleChannelError(channelName, error || new Error(`Falha na conexao: ${status}`));
          }
        });

        channels.push(channel);
      }

      if (subscribeToConversations) {
        totalChannels += 1;
        const channelName = `conversation-conversations-${conversationId || "all"}-${Date.now()}`;
        let channel = supabase.channel(channelName);

        normalizeEvents(events).forEach((event) => {
          channel = channel.on(
            "postgres_changes",
            {
              event,
              schema: "public",
              table: "support_conversations",
              filter: buildConversationFilter(conversationId, userId, paymentId),
            },
            (payload) => {
              if (!isMountedRef.current || !onConversationUpdate) return;

              const eventType = payload.eventType as ConversationChangeEvent;
              if (eventType !== "UPDATE") return;

              onConversationUpdate(
                payload.new as SupportConversation,
                payload.old as SupportConversation | null
              );
            }
          );
        });

        channel.subscribe((status, error) => {
          if (!isMountedRef.current) return;

          if (status === "SUBSCRIBED") {
            subscribedChannels += 1;
            markConnected();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            handleChannelError(channelName, error || new Error(`Falha na conexao: ${status}`));
          }
        });

        channels.push(channel);
      }

      if (totalChannels === 0) {
        setConnectionState((prev) => ({
          ...prev,
          isConnected: true,
          isReconnecting: false,
          lastConnectedAt: new Date(),
          error: null,
        }));
        onConnected?.();
      }

      channelsRef.current = channels;
    } catch (error) {
      log.error("Failed to create conversation realtime channels", { error });
      setConnectionState((prev) => ({
        ...prev,
        isConnected: false,
        isReconnecting: false,
        error: error as Error,
        lastDisconnectedAt: new Date(),
      }));

      onDisconnected?.(error as Error);

      if (retryCountRef.current < reconnectionConfig.maxRetries) {
        scheduleReconnect();
      }
    }
  }, [
    conversationId,
    userId,
    paymentId,
    events,
    subscribeToMessages,
    subscribeToConversations,
    onNewMessage,
    onMessageUpdate,
    onConversationUpdate,
    onConnected,
    onDisconnected,
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

  useEffect(() => {
    if (isMountedRef.current && channelsRef.current.length > 0) {
      reconnect();
    }
  }, [
    conversationId,
    userId,
    paymentId,
    events,
    subscribeToMessages,
    subscribeToConversations,
    reconnect,
  ]);

  return {
    ...connectionState,
    disconnect,
    reconnect,
  };
}

export function useConversationMessagesRealtime(
  conversationId: string,
  onNewMessage?: (message: SupportMessage) => void
) {
  const { isConnected, isReconnecting, error, ...rest } = useConversationRealtime({
    conversationId,
    events: ["INSERT"],
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
    wasReadByAdmin: boolean
  ) => void
) {
  const { isConnected, isReconnecting, error, ...rest } = useConversationRealtime({
    conversationId,
    events: ["UPDATE"],
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
