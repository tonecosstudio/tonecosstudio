import { useEffect, useMemo, useRef } from "react";

export type RealtimePostgresEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export interface ReconnectionConfig {
  maxRetries: number;
  baseDelayMs: number;
  backoffFactor: number;
  maxDelayMs: number;
}

export const DEFAULT_RECONNECTION_CONFIG: ReconnectionConfig = {
  maxRetries: 10,
  baseDelayMs: 1000,
  backoffFactor: 2,
  maxDelayMs: 30000,
};

export const DEFAULT_REALTIME_EVENTS: readonly RealtimePostgresEvent[] = [
  "INSERT",
  "UPDATE",
  "DELETE",
];

export const REALTIME_INSERT_EVENTS: readonly RealtimePostgresEvent[] = ["INSERT"];
export const REALTIME_UPDATE_EVENTS: readonly RealtimePostgresEvent[] = ["UPDATE"];

export function normalizeRealtimeEvents(
  events: readonly RealtimePostgresEvent[]
): RealtimePostgresEvent[] {
  if (events.includes("*")) return ["*"];
  return Array.from(new Set(events));
}

export function getRealtimeEventsKey(events: readonly RealtimePostgresEvent[]): string {
  return normalizeRealtimeEvents(events).join("|");
}

export function getRealtimeEventsFromKey(key: string): RealtimePostgresEvent[] {
  if (key === "*") return ["*"];
  return key.split("|").filter(Boolean) as RealtimePostgresEvent[];
}

export function getRealtimeRetryDelay(config: ReconnectionConfig, retryIndex: number): number {
  const delay = config.baseDelayMs * Math.pow(config.backoffFactor, retryIndex);
  return Math.min(delay, config.maxDelayMs);
}

export function useLatestRef<T>(value: T) {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
}

export function useRealtimeReconnectionConfig(
  userConfig?: Partial<ReconnectionConfig>
): ReconnectionConfig {
  return useMemo(
    () => ({
      maxRetries: userConfig?.maxRetries ?? DEFAULT_RECONNECTION_CONFIG.maxRetries,
      baseDelayMs: userConfig?.baseDelayMs ?? DEFAULT_RECONNECTION_CONFIG.baseDelayMs,
      backoffFactor: userConfig?.backoffFactor ?? DEFAULT_RECONNECTION_CONFIG.backoffFactor,
      maxDelayMs: userConfig?.maxDelayMs ?? DEFAULT_RECONNECTION_CONFIG.maxDelayMs,
    }),
    [
      userConfig?.maxRetries,
      userConfig?.baseDelayMs,
      userConfig?.backoffFactor,
      userConfig?.maxDelayMs,
    ]
  );
}
