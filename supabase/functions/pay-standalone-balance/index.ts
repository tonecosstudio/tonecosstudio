/**
 * Pay Standalone Balance Edge Function
 * 
 * Handles balance payment for standalone purchases.
 * Validates purchase status and deadline before processing payment.
 * 
 * Requirements: 4.5
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PayBalanceRequest {
  purchaseId: string;
  balanceVoucherUrl: string;
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
    const body: PayBalanceRequest = await req.json();
    const { purchaseId, balanceVoucherUrl } = body;

    // Validate required fields
    if (!purchaseId || !balanceVoucherUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: purchaseId, balanceVoucherUrl' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 1. Get the purchase and verify ownership
    const { data: purchase, error: purchaseError } = await supabaseClient
      .from('standalone_purchases')
      .select('*')
      .eq('id', purchaseId)
      .eq('user_id', user.id)
      .single();

    if (purchaseError || !purchase) {
      return new Response(
        JSON.stringify({
          error: `Failed to get standalone purchase: ${purchaseError?.message || 'Purchase not found'}`,
          code: 'PURCHASE_NOT_FOUND'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Verify status is 'awaiting_balance' (Requirement 4.5)
    if (purchase.status !== 'awaiting_balance') {
      return new Response(
        JSON.stringify({
          error: `Cannot process balance payment - purchase status is ${purchase.status}. Expected 'awaiting_balance'.`,
          code: 'INVALID_STATUS'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Verify balance_due_date has not passed (Requirement 4.5)
    if (purchase.balance_due_date) {
      const dueDate = new Date(purchase.balance_due_date);
      const now = new Date();
      
      if (now > dueDate) {
        return new Response(
          JSON.stringify({
            error: 'Cannot process balance payment - payment deadline has passed.',
            code: 'DEADLINE_PASSED'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // 4. Generate tracking code (Requirement 4.9)
    // Format: SP-YYYYMMDD-XXXXX (SP = Standalone Purchase)
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const trackingCode = `SP-${timestamp}-${randomSuffix}`;

    // 5. Update purchase with balance payment info (Requirement 4.5, 4.9)
    const { data: updatedPurchase, error: updateError } = await supabaseClient
      .from('standalone_purchases')
      .update({
        status: 'balance_paid',
        balance_paid_at: new Date().toISOString(),
        payment_voucher_balance_url: balanceVoucherUrl,
        tracking_code: trackingCode
      })
      .eq('id', purchaseId)
      .select()
      .single();

    if (updateError || !updatedPurchase) {
      throw new Error(`Failed to update standalone purchase: ${updateError?.message || 'Unknown error'}`);
    }

    // Return success response with updated purchase
    return new Response(
      JSON.stringify({
        success: true,
        purchase: updatedPurchase,
        message: 'Balance payment processed successfully',
        trackingCode: trackingCode
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error processing balance payment:', error);
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
