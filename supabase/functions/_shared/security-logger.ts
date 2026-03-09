/**
 * Centralized Security Event Logger
 * 
 * Logs security-relevant events to the security_events table
 * using the service role client (bypasses RLS).
 * 
 * Events are fire-and-forget to avoid impacting request latency.
 */

import { getServiceClient } from "./supabase.ts";

export type SecurityEventType =
  | "auth_attempt"
  | "auth_failure"
  | "permission_denied"
  | "rate_limit_exceeded"
  | "webhook_verification_failed"
  | "admin_action"
  | "ai_usage_spike"
  | "suspicious_input"
  | "file_upload_blocked";

export type SecuritySeverity = "info" | "warn" | "critical";

interface SecurityEvent {
  event_type: SecurityEventType;
  severity?: SecuritySeverity;
  source: string;
  user_id?: string;
  ip_address?: string;
  endpoint?: string;
  details?: Record<string, unknown>;
}

/**
 * Extract client IP from request headers
 */
function extractIP(req?: Request): string | undefined {
  if (!req) return undefined;
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    undefined
  );
}

/**
 * Log a security event (fire-and-forget, never throws)
 */
export function logSecurityEvent(event: SecurityEvent, req?: Request): void {
  // Fire and forget — don't await, don't block the request
  (async () => {
    try {
      const service = getServiceClient();
      await service.from("security_events").insert({
        event_type: event.event_type,
        severity: event.severity ?? "info",
        source: event.source,
        user_id: event.user_id ?? null,
        ip_address: event.ip_address ?? extractIP(req) ?? null,
        endpoint: event.endpoint ?? null,
        details: event.details ?? {},
      });
    } catch (err) {
      // Never let logging break the request
      console.error("[security-logger] Failed to log event:", (err as Error).message);
    }
  })();
}

/**
 * Convenience: log auth failure
 */
export function logAuthFailure(req: Request, endpoint: string, reason: string, userId?: string): void {
  logSecurityEvent({
    event_type: "auth_failure",
    severity: "warn",
    source: "edge-function",
    endpoint,
    user_id: userId,
    details: { reason },
  }, req);
}

/**
 * Convenience: log rate limit hit
 */
export function logRateLimitHit(req: Request, endpoint: string, key: string): void {
  logSecurityEvent({
    event_type: "rate_limit_exceeded",
    severity: "warn",
    source: "rate-limiter",
    endpoint,
    details: { key },
  }, req);
}

/**
 * Convenience: log permission denied
 */
export function logPermissionDenied(req: Request, endpoint: string, userId: string, reason: string): void {
  logSecurityEvent({
    event_type: "permission_denied",
    severity: "warn",
    source: "edge-function",
    endpoint,
    user_id: userId,
    details: { reason },
  }, req);
}

/**
 * Convenience: log admin action
 */
export function logAdminAction(req: Request, endpoint: string, userId: string, action: string, details?: Record<string, unknown>): void {
  logSecurityEvent({
    event_type: "admin_action",
    severity: "info",
    source: "edge-function",
    endpoint,
    user_id: userId,
    details: { action, ...details },
  }, req);
}

/**
 * Convenience: log AI usage spike
 */
export function logAIUsageSpike(req: Request, endpoint: string, userId: string, requestCount: number): void {
  logSecurityEvent({
    event_type: "ai_usage_spike",
    severity: "warn",
    source: "ai-gateway",
    endpoint,
    user_id: userId,
    details: { request_count: requestCount },
  }, req);
}
