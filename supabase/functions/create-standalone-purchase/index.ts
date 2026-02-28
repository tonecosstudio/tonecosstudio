/**
 * Create Standalone Purchase Edge Function
 * 
 * Handles creation of standalone purchases with deposit model.
 * Enforces cutoff rules and capacity limits.
 * 
 * Requirements: 3.3, 4.1, 4.2, 7.6, 22.1
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePurchaseRequest {
  collectionId: string;
  cycleId: string;
  depositVoucherUrl?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body: CreatePurchaseRequest = await req.json();
    const { collectionId, cycleId, depositVoucherUrl } = body;

    // Validate required fields
    if (!collectionId || !cycleId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: collectionId, cycleId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 1. Check if before cutoff (Requirement 7.6)
    const { data: beforeCutoff, error: cutoffError } = await supabaseClient
      .rpc('is_before_cutoff');

    if (cutoffError) {
      throw new Error(`Failed to check cutoff: ${cutoffError.message}`);
    }

    if (!beforeCutoff) {
      return new Response(
        JSON.stringify({
          error: 'Cannot create standalone purchase - cutoff has passed. Production has started.',
          code: 'CUTOFF_PASSED'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Check if cycle is still open (Requirement 7.6)
    const { data: cycle, error: cycleError } = await supabaseClient
      .from('cycles')
      .select('status, capacity_max, capacity_current')
      .eq('id', cycleId)
      .single();

    if (cycleError || !cycle) {
      return new Response(
        JSON.stringify({
          error: `Failed to get cycle: ${cycleError?.message || 'Cycle not found'}`,
          code: 'CYCLE_NOT_FOUND'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (cycle.status !== 'open') {
      return new Response(
        JSON.stringify({
          error: `Cannot create standalone purchase - cycle is ${cycle.status}. Only open cycles accept new purchases.`,
          code: 'CYCLE_NOT_OPEN'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Get collection details
    const { data: collection, error: collectionError } = await supabaseClient
      .from('collections')
      .select('price, name, is_active')
      .eq('id', collectionId)
      .single();

    if (collectionError || !collection) {
      return new Response(
        JSON.stringify({
          error: `Failed to get collection: ${collectionError?.message || 'Collection not found'}`,
          code: 'COLLECTION_NOT_FOUND'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!collection.is_active) {
      return new Response(
        JSON.stringify({
          error: 'Collection is not active',
          code: 'COLLECTION_INACTIVE'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Check capacity availability (Requirements 3.3, 22.1)
    const { data: capacityAvailable, error: capacityError } = await supabaseClient
      .rpc('check_capacity_available', {
        p_cycle_id: cycleId,
        p_quantity: 1
      });

    if (capacityError) {
      throw new Error(`Failed to check capacity: ${capacityError.message}`);
    }

    if (!capacityAvailable) {
      return new Response(
        JSON.stringify({
          error: 'Capacity limit exceeded for this cycle. Cannot create standalone purchase.',
          code: 'CAPACITY_EXCEEDED'
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 5. Calculate amounts (Requirement 4.1, 4.3)
    const depositAmount = 100.00; // Fixed deposit amount
    const balanceAmount = collection.price - depositAmount;
    const totalAmount = collection.price;

    // 6. Create standalone purchase record
    const { data: purchase, error: createError } = await supabaseClient
      .from('standalone_purchases')
      .insert({
        user_id: user.id,
        collection_id: collectionId,
        cycle_id: cycleId,
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

    // 7. Reserve capacity (Requirements 3.3, 22.1)
    const { error: reserveError } = await supabaseClient
      .rpc('reserve_capacity', {
        p_cycle_id: cycleId,
        p_quantity: 1
      });

    if (reserveError) {
      // Rollback: delete the purchase if capacity reservation fails
      await supabaseClient
        .from('standalone_purchases')
        .delete()
        .eq('id', purchase.id);
      
      throw new Error(`Failed to reserve capacity: ${reserveError.message}`);
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        purchase: purchase,
        message: 'Standalone purchase created successfully'
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error creating standalone purchase:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        code: 'INTERNAL_ERROR'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
