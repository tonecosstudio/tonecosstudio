/**
 * Rate Limiting Middleware for Edge Functions
 *
 * Uses database-backed rate limiting with configurable windows and limits.
 * Supports IP-based (anonymous) and user-based (authenticated) limiting.
 */

import { getServiceClient } from "./supabase.ts";
import { getCorsHeaders } from "./cors.ts";
import { logRateLimitHit } from "./security-logger.ts";
import { createEdgeLogger } from "./edge-logger.ts";

const log = createEdgeLogger("rate-limit");

/**
 * Rate limit configuration presets
 */
export const RATE_LIMITS = {
  // Auth endpoints: 5 requests per minute
  AUTH: { maxRequests: 5, windowSeconds: 60 },
  // Admin/API mutations: authenticated, sensitive operations
  ADMIN: { maxRequests: 20, windowSeconds: 60 },
  // Standard API: 30 requests per minute
  STANDARD: { maxRequests: 30, windowSeconds: 60 },
  // AI endpoints: 10 requests per minute (expensive operations)
  AI: { maxRequests: 10, windowSeconds: 60 },
  // AI strict: 5 requests per minute (very expensive, e.g. vision)
  AI_STRICT: { maxRequests: 5, windowSeconds: 60 },
  // Public/search: 20 requests per minute
  PUBLIC: { maxRequests: 20, windowSeconds: 60 },
  // Purchase operations: 10 per minute
  PURCHASE: { maxRequests: 10, windowSeconds: 60 },
} as const;

/**
 * Extract client IP from request headers
 */
function getClientIP(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function unavailableResponse(req: Request): Response {
  return new Response(
    JSON.stringify({
      error: "Rate limit check unavailable. Please try again later.",
      code: "RATE_LIMIT_UNAVAILABLE",
      retryAfter: 60,
    }),
    {
      status: 503,
      headers: {
        ...getCorsHeaders(req),
        "Content-Type": "application/json",
        "Retry-After": "60",
      },
    },
  );
}

/**
 * Build a rate limit key based on context
 * - Authenticated: "user:{userId}"
 * - Anonymous: "ip:{clientIP}"
 */
export function buildRateLimitKey(req: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  return `ip:${getClientIP(req)}`;
}

/**
 * Check rate limit and return 429 response if exceeded
 *
 * @param req - The incoming request
 * @param endpoint - Endpoint identifier (e.g. "create-standalone-purchase")
 * @param config - Rate limit configuration { maxRequests, windowSeconds }
 * @param userId - Optional authenticated user ID (uses IP if not provided)
 * @returns null if allowed, Response(429) if limited, Response(503) if the check is unavailable
 */
export async function checkRateLimit(
  req: Request,
  endpoint: string,
  config: { maxRequests: number; windowSeconds: number },
  userId?: string,
): Promise<Response | null> {
  try {
    const service = getServiceClient();
    const key = buildRateLimitKey(req, userId);

    const { data: allowed, error } = await service.rpc("check_rate_limit", {
      p_key: key,
      p_endpoint: endpoint,
      p_max_requests: config.maxRequests,
      p_window_seconds: config.windowSeconds,
    });

    if (error) {
      log.error("rate_limit_check_failed", { error, endpoint });
      return unavailableResponse(req);
    }

    if (!allowed) {
      log.warn("rate_limit_exceeded", {
        endpoint,
        keyType: userId ? "user" : "ip",
        windowSeconds: config.windowSeconds,
        maxRequests: config.maxRequests,
      });
      logRateLimitHit(req, endpoint, key);
      return new Response(
        JSON.stringify({
          error: "Too many requests. Please try again later.",
          code: "RATE_LIMITED",
          retryAfter: config.windowSeconds,
        }),
        {
          status: 429,
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
            "Retry-After": String(config.windowSeconds),
          },
        },
      );
    }

    return null; // Request allowed
  } catch (err) {
    log.error("rate_limit_unexpected_error", { error: err, endpoint });
    return unavailableResponse(req);
  }
}
