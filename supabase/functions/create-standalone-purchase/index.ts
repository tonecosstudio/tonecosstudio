/**
 * Create Standalone Purchase Edge Function
 * 
 * Handles creation of standalone purchases with deposit model.
 * Enforces cutoff rules, capacity limits, and authenticated ownership.
 * 
 * Requirements: 3.3, 4.1, 4.2, 7.6, 22.1
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { getClaims, getServiceClient, errorToStatus } from "../_shared/supabase.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rate-limit.ts";
import { checkContentLength, PAYLOAD_LIMITS } from "../_shared/payload-guard.ts";
import { validateOrReject, type Schema } from "../_shared/validation.ts";

const CREATE_PURCHASE_SCHEMA: Schema = {
  collectionId:      { type: "uuid", required: true },
  cycleId:           { type: "uuid", required: true },
  characterId:       { type: "uuid" },
  depositVoucherUrl: { type: "url" },
};

interface CreatePurchaseRequest {
  collectionId: string;
  cycleId: string;
  characterId?: string;
  depositVoucherUrl?: string;
}

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    // Authenticate user via shared middleware
    const { claims } = await getClaims(req);
    const userId = String(claims.sub);

    // Rate limit: purchase operations
    const rateLimited = await checkRateLimit(req, "create-standalone-purchase", RATE_LIMITS.PURCHASE, userId);
    if (rateLimited) return rateLimited;

    // Payload size guard (standard: 64 KB)
    const tooLarge = checkContentLength(req, PAYLOAD_LIMITS.STANDARD);
    if (tooLarge) return tooLarge;

    const service = getServiceClient();

    // Parse and validate request body
    const rawBody = await req.json().catch(() => ({}));
    const validation = validateOrReject(rawBody, CREATE_PURCHASE_SCHEMA);
    if ("error" in validation) return validation.error;

    const { collectionId, cycleId, characterId, depositVoucherUrl } = validation.data as unknown as CreatePurchaseRequest;

    // 1. Check if before cutoff (Requirement 7.6)
    const { data: beforeCutoff, error: cutoffError } = await service
      .rpc('is_before_cutoff');

    if (cutoffError) {
      throw new Error(`Failed to check cutoff: ${cutoffError.message}`);
    }

    if (!beforeCutoff) {
      return new Response(
        JSON.stringify({
          error: 'Cannot create standalone purchase - cutoff has passed.',
          code: 'CUTOFF_PASSED'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check if cycle is still open
    const { data: cycle, error: cycleError } = await service
      .from('cycles')
      .select('status, capacity, used_capacity')
      .eq('id', cycleId)
      .single();

    if (cycleError || !cycle) {
      return new Response(
        JSON.stringify({ error: 'Cycle not found', code: 'CYCLE_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (cycle.status !== 'active' && cycle.status !== 'open') {
      return new Response(
        JSON.stringify({
          error: `Cannot create standalone purchase - cycle is ${cycle.status}.`,
          code: 'CYCLE_NOT_OPEN'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Get collection details and pricing
    const { data: collection, error: collectionError } = await service
      .from('collections')
      .select('name, is_active')
      .eq('id', collectionId)
      .single();

    if (collectionError || !collection) {
      return new Response(
        JSON.stringify({ error: 'Collection not found', code: 'COLLECTION_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!collection.is_active) {
      return new Response(
        JSON.stringify({ error: 'Collection is not active', code: 'COLLECTION_INACTIVE' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get pricing from tier
    const { data: pricing, error: pricingError } = await service
      .rpc('get_collection_pricing', { p_collection_id: collectionId });

    if (pricingError) {
      throw new Error(`Failed to get pricing: ${pricingError.message}`);
    }

    const priceRow = Array.isArray(pricing) ? pricing[0] : pricing;
    const totalAmount = priceRow?.price_full ?? 350;
    const depositAmount = priceRow?.deposit_amount ?? 50;
    const balanceAmount = totalAmount - depositAmount;

    // 4. Check capacity
    const currentUsed = cycle.used_capacity ?? 0;
    const maxCapacity = cycle.capacity ?? 100;
    if (currentUsed >= maxCapacity) {
      return new Response(
        JSON.stringify({ error: 'Capacity limit exceeded.', code: 'CAPACITY_EXCEEDED' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Create standalone purchase - user_id is ALWAYS set to authenticated user
    const { data: purchase, error: createError } = await service
      .from('standalone_purchases')
      .insert({
        user_id: userId, // Server-enforced: always the authenticated user
        collection_id: collectionId,
        cycle_id: cycleId,
        character_id: characterId || null,
        status: 'deposit_paid',
        deposit_amount: depositAmount,
        balance_amount: balanceAmount,
        total_amount: totalAmount,
        deposit_paid_at: new Date().toISOString(),
        payment_voucher_deposit_url: depositVoucherUrl || null
      })
      .select()
      .single();

    if (createError || !purchase) {
      throw new Error(`Failed to create standalone purchase: ${createError?.message || 'Unknown error'}`);
    }

    // 6. Increment capacity
    const { error: incrementError } = await service
      .rpc('increment_monthly_sales', { quantity: 1 });

    if (incrementError) {
      // Rollback: delete the purchase if capacity increment fails
      await service.from('standalone_purchases').delete().eq('id', purchase.id);
      throw new Error(`Failed to increment capacity: ${incrementError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, purchase, message: 'Standalone purchase created successfully' }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const msg = (error as Error).message || 'Internal server error';
    console.error('Error creating standalone purchase:', msg);
    return new Response(
      JSON.stringify({ error: msg, code: 'INTERNAL_ERROR' }),
      { status: errorToStatus(msg), headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
