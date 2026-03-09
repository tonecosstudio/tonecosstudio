/**
 * Payload Size Guard Middleware for Edge Functions
 *
 * Enforces maximum request body sizes to prevent abuse from oversized payloads.
 * Different limits apply based on endpoint type.
 */

import { corsHeaders } from "./cors.ts";

/**
 * Preset payload size limits (in bytes)
 */
export const PAYLOAD_LIMITS = {
  /** Standard JSON endpoints: 64 KB */
  STANDARD: 64 * 1024,
  /** AI prompts / text: 32 KB */
  AI_TEXT: 32 * 1024,
  /** File references (URLs, metadata): 128 KB */
  FILE_REF: 128 * 1024,
  /** Minimal endpoints (login, simple actions): 8 KB */
  MINIMAL: 8 * 1024,
  /** Search / filter: 16 KB */
  SEARCH: 16 * 1024,
} as const;

/**
 * Check if request Content-Length exceeds the allowed limit.
 * Also reads the body and rejects if the actual size exceeds the limit.
 *
 * @returns null if allowed, a 413 Response if payload is too large,
 *          or the parsed JSON body if `parseBody` is true.
 */
export async function checkPayloadSize(
  req: Request,
  maxBytes: number,
): Promise<{ error: Response } | { body: unknown }> {
  // Fast-path: check Content-Length header first
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return { error: payloadTooLargeResponse(maxBytes) };
  }

  // For GET/DELETE/HEAD requests, no body to check
  if (["GET", "DELETE", "HEAD"].includes(req.method)) {
    return { body: null };
  }

  // Read body with size enforcement
  try {
    const rawBody = await req.text();

    if (rawBody.length > maxBytes) {
      return { error: payloadTooLargeResponse(maxBytes) };
    }

    // Try to parse as JSON
    if (rawBody.length === 0) {
      return { body: {} };
    }

    try {
      const parsed = JSON.parse(rawBody);
      return { body: parsed };
    } catch {
      return { body: rawBody };
    }
  } catch {
    // If we can't read the body, allow the request to proceed
    return { body: null };
  }
}

/**
 * Simple size check that returns a 413 response or null.
 * Use this when you want to check size but parse the body yourself.
 */
export function checkContentLength(
  req: Request,
  maxBytes: number,
): Response | null {
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return payloadTooLargeResponse(maxBytes);
  }
  return null;
}

function payloadTooLargeResponse(maxBytes: number): Response {
  const maxKB = Math.round(maxBytes / 1024);
  return new Response(
    JSON.stringify({
      error: `Payload too large. Maximum allowed size is ${maxKB} KB.`,
      code: "PAYLOAD_TOO_LARGE",
      maxBytes,
    }),
    {
      status: 413,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  );
}
