import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { getClaims } from "../_shared/supabase.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rate-limit.ts";

/**
 * Standalone purchase creation is intentionally fail-closed.
 *
 * The current database RPC `create_standalone_purchase_atomic` marks a new
 * reservation as `deposit_paid` and sets `deposit_paid_at` immediately, even
 * when no deposit voucher or verified payment exists. Until a versioned
 * database migration changes the initial transition to an unpaid/pending state
 * and preserves admin/payment-provider approval as the only authority for
 * `deposit_paid`, this endpoint must not create financial records.
 *
 * The Supabase project is currently inactive, so the database migration cannot
 * be applied and verified safely from this environment. Do not re-enable this
 * handler by calling the legacy RPC.
 */
serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { claims } = await getClaims(req);
    const userId = String(claims.sub);

    const rateLimited = await checkRateLimit(
      req,
      "create-standalone-purchase",
      RATE_LIMITS.PURCHASE,
      userId,
    );
    if (rateLimited) return rateLimited;

    return new Response(
      JSON.stringify({
        success: false,
        error: "Standalone purchase reservations are temporarily unavailable",
        code: "PAYMENT_FLOW_UNAVAILABLE",
      }),
      {
        status: 503,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message === "Unauthorized" ? 401 : 403;

    return new Response(
      JSON.stringify({
        success: false,
        error: status === 401 ? "Unauthorized" : "Forbidden",
        code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
      }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
