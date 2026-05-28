/**
 * Pay Standalone Balance Edge Function
 * 
 * Handles balance payment for standalone purchases.
 * Validates purchase ownership, status and deadline before processing.
 * 
 * Requirements: 4.5
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { getClaims } from "../_shared/supabase.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rate-limit.ts";
import { checkContentLength, PAYLOAD_LIMITS } from "../_shared/payload-guard.ts";
import { validateOrReject, type Schema } from "../_shared/validation.ts";

const PAY_BALANCE_SCHEMA: Schema = {
  purchaseId:       { type: "uuid", required: true },
  balanceVoucherUrl: { type: "url", required: true },
};

interface PayBalanceRequest {
  purchaseId: string;
  balanceVoucherUrl: string;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function mapSubmitBalanceError(message: string): { status: number; error: string; code: string } {
  if (message.includes("PURCHASE_NOT_FOUND")) {
    return { status: 404, error: "Purchase not found.", code: "PURCHASE_NOT_FOUND" };
  }
  if (message.includes("FORBIDDEN")) {
    return { status: 403, error: "Forbidden: you do not own this resource", code: "FORBIDDEN" };
  }
  if (message.includes("INVALID_STATUS")) {
    const currentStatus = message.split("INVALID_STATUS:")[1]?.trim() || "unknown";
    return {
      status: 400,
      error: `Cannot process balance payment - purchase status is ${currentStatus}. Expected 'awaiting_balance'.`,
      code: "INVALID_STATUS",
    };
  }
  if (message.includes("BALANCE_DEADLINE_PASSED")) {
    return { status: 400, error: "Payment deadline has passed.", code: "DEADLINE_PASSED" };
  }
  if (message.includes("INVALID_BALANCE_VOUCHER_URL")) {
    return { status: 400, error: "balanceVoucherUrl must be a valid HTTPS URL", code: "INVALID_VOUCHER_URL" };
  }
  if (message.includes("PURCHASE_ID_REQUIRED")) {
    return { status: 400, error: "purchaseId is required", code: "VALIDATION_ERROR" };
  }
  if (message.includes("USER_ID_REQUIRED")) {
    return { status: 401, error: "Unauthorized", code: "UNAUTHORIZED" };
  }
  return { status: 500, error: "Internal server error", code: "INTERNAL_ERROR" };
}

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    // Authenticate user via shared middleware
    const { client, claims } = await getClaims(req);
    const userId = String(claims.sub);

    // Rate limit: purchase operations
    const rateLimited = await checkRateLimit(req, "pay-standalone-balance", RATE_LIMITS.PURCHASE, userId);
    if (rateLimited) return rateLimited;

    // Payload size guard (standard: 64 KB)
    const tooLarge = checkContentLength(req, PAYLOAD_LIMITS.STANDARD);
    if (tooLarge) return tooLarge;
    // Parse and validate request body
    const rawBody = await req.json().catch(() => ({}));
    const validation = validateOrReject(rawBody, PAY_BALANCE_SCHEMA);
    if ("error" in validation) return validation.error;

    const { purchaseId, balanceVoucherUrl } = validation.data as unknown as PayBalanceRequest;

    if (!isHttpsUrl(balanceVoucherUrl)) {
      return new Response(
        JSON.stringify({ error: 'balanceVoucherUrl must be a valid HTTPS URL', code: 'INVALID_VOUCHER_URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data, error } = await client.rpc("submit_standalone_balance_voucher", {
      p_purchase_id: purchaseId,
      p_balance_voucher_url: balanceVoucherUrl,
    });

    if (error) {
      const mapped = mapSubmitBalanceError(error.message || "");
      return new Response(
        JSON.stringify({ error: mapped.error, code: mapped.code }),
        { status: mapped.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        purchase: (data as { purchase?: unknown } | null)?.purchase ?? null,
        requiresAdminApproval: true,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const msg = (error as Error).message || 'Internal server error';
    const status = msg === "Unauthorized" ? 401 : msg.startsWith("Forbidden") ? 403 : 500;
    console.error('Error processing balance payment:', msg);
    return new Response(
      JSON.stringify({ error: status >= 500 ? 'Internal server error' : msg, code: 'INTERNAL_ERROR' }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
