import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { log } from "@/lib/logger";
import {
  subscribeToManualPaymentChanges,
  type PaymentChangeEvent,
} from "@/services/realtime/realtime-service";
import type { ManualPayment, PaymentStatus } from "@/types/manual-payment";
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
  events?: readonly RealtimePostgresEvent[];
  reconnectionConfig?: Partial<ReconnectionConfig>;
  onPaymentChange?: (payload: {
    event: PaymentChangeEvent;
    old: ManualPayment | null;
    new: ManualPayment | null;
  }) => void;
  onConnected?: () => void;
  onDisconnected?: (error?: Error) => void;
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

function getPaymentStatusKey(status?: PaymentStatus | PaymentStatus[]): string {
  return Array.isArray(status) ? status.join("|") : status ?? "";
}

function getPaymentStatusFromKey(statusKey: string): PaymentStatus | PaymentStatus[] | undefined {
  if (!statusKey) return undefined;

  const statuses = statusKey.split("|") as PaymentStatus[];
  return statuses.length === 1 ? statuses[0] : statuses;
}

export function usePaymentRealtime(options: UsePaymentRealtimeOptions = {}) {
  const {
    paymentId,
    userId,
    status,
    events = DEFAULT_REALTIME_EVENTS,
    reconnectionConfig: userReconnectionConfig,
    onPaymentChange,
    onConnected,
    onDisconnected,
  } = options;

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);
  const connectRef = useRef<() => void>(() => {});
  const onPaymentChangeRef = useLatestRef(onPaymentChange);
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
  const statusKey = getPaymentStatusKey(status);
  const normalizedStatus = useMemo(() => getPaymentStatusFromKey(statusKey), [statusKey]);
  const paymentFilter = useMemo(
    () => buildPaymentFilter(paymentId, userId, normalizedStatus),
    [paymentId, userId, normalizedStatus]
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
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

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

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    const channelName = `payment-realtime-${paymentId || "all"}-${userId || "all"}-${Date.now()}`;
    try {
      setConnectionState((prev) => ({
        ...prev,
        isReconnecting: true,
        error: null,
      }));

      unsubscribeRef.current = subscribeToManualPaymentChanges({
        channelName,
        events: normalizedEvents,
        filter: paymentFilter,
        onPaymentChange: (payload) => {
          onPaymentChangeRef.current?.(payload);
        },
        onStatusChange: (realtimeStatus, error) => {
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
            onConnectedRef.current?.();
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

            onDisconnectedRef.current?.(errorObj);

            if (retryCountRef.current < reconnectionConfig.maxRetries) {
              scheduleReconnect();
            }
          }
        },
      });
    } catch (error) {
      log.error("Failed to create payment realtime channel", { error });
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
    paymentId,
    userId,
    paymentFilter,
    normalizedEvents,
    onPaymentChangeRef,
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
    events: REALTIME_UPDATE_EVENTS,
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
    events: REALTIME_INSERT_EVENTS,
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
