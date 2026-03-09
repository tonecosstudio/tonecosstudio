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
import { getClaims, getServiceClient, assertOwnership, errorToStatus } from "../_shared/supabase.ts";
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

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    // Authenticate user via shared middleware
    const { claims } = await getClaims(req);
    const userId = String(claims.sub);

    // Rate limit: purchase operations
    const rateLimited = await checkRateLimit(req, "pay-standalone-balance", RATE_LIMITS.PURCHASE, userId);
    if (rateLimited) return rateLimited;

    // Payload size guard (standard: 64 KB)
    const tooLarge = checkContentLength(req, PAYLOAD_LIMITS.STANDARD);
    if (tooLarge) return tooLarge;

    const service = getServiceClient();

    // Parse and validate request body
    const rawBody = await req.json().catch(() => ({}));
    const validation = validateOrReject(rawBody, PAY_BALANCE_SCHEMA);
    if ("error" in validation) return validation.error;

    const { purchaseId, balanceVoucherUrl } = validation.data as unknown as PayBalanceRequest;

    // 1. Verify ownership - prevents IDOR attacks
    const purchase = await assertOwnership(
      service,
      'standalone_purchases',
      purchaseId,
      userId,
    );

    // 2. Verify status is 'awaiting_balance'
    if (purchase.status !== 'awaiting_balance') {
      return new Response(
        JSON.stringify({
          error: `Cannot process balance payment - purchase status is ${purchase.status}. Expected 'awaiting_balance'.`,
          code: 'INVALID_STATUS'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verify balance_due_date has not passed
    if (purchase.balance_due_date) {
      const dueDate = new Date(purchase.balance_due_date);
      if (new Date() > dueDate) {
        return new Response(
          JSON.stringify({ error: 'Payment deadline has passed.', code: 'DEADLINE_PASSED' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 4. Generate tracking code
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const trackingCode = `SP-${timestamp}-${randomSuffix}`;

    // 5. Update purchase with balance payment info
    const { data: updatedPurchase, error: updateError } = await service
      .from('standalone_purchases')
      .update({
        status: 'balance_paid',
        balance_paid_at: new Date().toISOString(),
        payment_voucher_balance_url: balanceVoucherUrl,
        tracking_code: trackingCode
      })
      .eq('id', purchaseId)
      .eq('user_id', userId) // Double-check ownership at DB level
      .select()
      .single();

    if (updateError || !updatedPurchase) {
      throw new Error(`Failed to update purchase: ${updateError?.message || 'Unknown error'}`);
    }

    return new Response(
      JSON.stringify({ success: true, purchase: updatedPurchase, trackingCode }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const msg = (error as Error).message || 'Internal server error';
    console.error('Error processing balance payment:', msg);
    return new Response(
      JSON.stringify({ error: msg, code: 'INTERNAL_ERROR' }),
      { status: errorToStatus(msg), headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
