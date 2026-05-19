import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import type { ManualPayment, PaymentStatus } from "@/types/manual-payment";

type RealtimePostgresEvent = "INSERT" | "UPDATE" | "DELETE" | "*";
type PaymentChangeEvent = "INSERT" | "UPDATE" | "DELETE";

export interface ReconnectionConfig {
  maxRetries: number;
  baseDelayMs: number;
  backoffFactor: number;
  maxDelayMs: number;
}

export interface RealtimeConnectionState {
  isConnected: boolean;
  isReconnecting: boolean;
  retryCount: number;
  error: Error | null;
  lastConnectedAt: Date | null;
  lastDisconnectedAt: Date | null;
}

export interface UsePaymentRealtimeOptions {
  paymentId?: string;
  userId?: string;
  status?: PaymentStatus | PaymentStatus[];
  events?: RealtimePostgresEvent[];
  reconnectionConfig?: Partial<ReconnectionConfig>;
  onPaymentChange?: (payload: {
    event: PaymentChangeEvent;
    old: ManualPayment | null;
    new: ManualPayment | null;
  }) => void;
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

function buildPaymentFilter(
  paymentId?: string,
  userId?: string,
  status?: PaymentStatus | PaymentStatus[]
): string | undefined {
  const filters: string[] = [];

  if (paymentId) filters.push(`id=eq.${paymentId}`);
  if (userId) filters.push(`user_id=eq.${userId}`);

  if (status) {
    const statuses = Array.isArray(status) ? status : [status];
    if (statuses.length === 1) {
      filters.push(`status=eq.${statuses[0]}`);
    } else {
      filters.push(`or(${statuses.map((value) => `status=eq.${value}`).join(",")})`);
    }
  }

  return filters.length > 0 ? filters.join(",") : undefined;
}

export function usePaymentRealtime(options: UsePaymentRealtimeOptions = {}) {
  const {
    paymentId,
    userId,
    status,
    events = ["INSERT", "UPDATE", "DELETE"],
    reconnectionConfig: userReconnectionConfig,
    onPaymentChange,
    onConnected,
    onDisconnected,
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
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
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

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

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `payment-realtime-${paymentId || "all"}-${userId || "all"}-${Date.now()}`;
    const filter = buildPaymentFilter(paymentId, userId, status);

    try {
      setConnectionState((prev) => ({
        ...prev,
        isReconnecting: true,
        error: null,
      }));

      let channel = supabase.channel(channelName);
      normalizeEvents(events).forEach((event) => {
        channel = channel.on(
          "postgres_changes",
          {
            event,
            schema: "public",
            table: "manual_payments",
            filter,
          },
          (payload) => {
            if (!onPaymentChange) return;

            onPaymentChange({
              event: payload.eventType as PaymentChangeEvent,
              old: payload.old as ManualPayment | null,
              new: payload.new as ManualPayment | null,
            });
          }
        );
      });

      channel.subscribe((realtimeStatus, error) => {
        if (!isMountedRef.current) return;

        if (realtimeStatus === "SUBSCRIBED") {
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
          return;
        }

        if (realtimeStatus === "CHANNEL_ERROR" || realtimeStatus === "TIMED_OUT") {
          const errorObj = error || new Error(`Falha na conexao: ${realtimeStatus}`);
          setConnectionState((prev) => ({
            ...prev,
            isConnected: false,
            isReconnecting: false,
            lastDisconnectedAt: new Date(),
            error: errorObj,
          }));

          onDisconnected?.(errorObj);

          if (retryCountRef.current < reconnectionConfig.maxRetries) {
            scheduleReconnect();
          }
        }
      });

      channelRef.current = channel;
    } catch (error) {
      log.error("Failed to create payment realtime channel", { error });
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
    paymentId,
    userId,
    status,
    events,
    onPaymentChange,
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
    if (isMountedRef.current && channelRef.current) {
      reconnect();
    }
  }, [paymentId, userId, status, events, reconnect]);

  return {
    ...connectionState,
    disconnect,
    reconnect,
  };
}

export function usePaymentStatusRealtime(
  paymentId: string,
  onStatusChange?: (
    newStatus: PaymentStatus,
    oldStatus: PaymentStatus | null,
    payment: ManualPayment
  ) => void
) {
  const { isConnected, isReconnecting, error, ...rest } = usePaymentRealtime({
    paymentId,
    events: ["UPDATE"],
    onPaymentChange: (payload) => {
      if (payload.event !== "UPDATE" || !payload.new || !onStatusChange) return;

      const oldStatus = payload.old?.status as PaymentStatus | null;
      const newStatus = payload.new.status as PaymentStatus;

      if (oldStatus !== newStatus) {
        onStatusChange(newStatus, oldStatus, payload.new);
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

export function useNewPaymentsRealtime(
  userId?: string,
  onNewPayment?: (payment: ManualPayment) => void
) {
  const { isConnected, isReconnecting, error, ...rest } = usePaymentRealtime({
    userId,
    events: ["INSERT"],
    onPaymentChange: (payload) => {
      if (payload.event === "INSERT" && payload.new && onNewPayment) {
        onNewPayment(payload.new);
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
