/**
 * Edge Function: Cancel Standalone Purchase for Non-Payment
 *
 * Cancels a standalone purchase when balance payment is not received within deadline.
 * This function is called by the cron job that checks balance deadlines.
 *
 * Requirements:
 * - 4.6: Cancel order and retain deposit if balance not paid by deadline
 * - 4.7: Release production capacity when order is cancelled
 * - 4.8: Record cancellation reason in order history
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { requireSharedSecret } from "../_shared/secrets.ts";

interface CancelRequest {
  purchaseId: string;
}

Deno.serve(async (req) => {
  try {
    const forbidden = requireSharedSecret(req, "CRON_SECRET", "x-cron-secret");
    if (forbidden) return forbidden;

    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const body: CancelRequest = await req.json();
    const { purchaseId } = body;

    if (!purchaseId) {
      return new Response(JSON.stringify({ error: "purchaseId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(
      `Cancelling standalone purchase for non-payment: ${purchaseId}`,
    );

    // 1. Get the purchase
    const { data: purchase, error: purchaseError } = await supabase
      .from("standalone_purchases")
      .select("id, cycle_id, status, user_id")
      .eq("id", purchaseId)
      .single();

    if (purchaseError || !purchase) {
      return new Response(
        JSON.stringify({
          error: `Failed to get standalone purchase: ${purchaseError?.message || "Purchase not found"}`,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    // 2. Verify status is 'awaiting_balance'
    if (purchase.status !== "awaiting_balance") {
      return new Response(
        JSON.stringify({
          error: `Cannot cancel for non-payment - purchase status is ${purchase.status}. Expected 'awaiting_balance'.`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // 3. Update purchase status to cancelled (Requirement 4.6, 4.8)
    const cancelledAt = new Date();
    const cancellationReason =
      "Balance payment not received within deadline (Arras Confirmatórias)";

    const { error: updateError } = await supabase
      .from("standalone_purchases")
      .update({
        status: "cancelled",
        cancelled_at: cancelledAt.toISOString(),
        cancellation_reason: cancellationReason,
      })
      .eq("id", purchaseId);

    if (updateError) {
      return new Response(
        JSON.stringify({
          error: `Failed to cancel standalone purchase: ${updateError.message}`,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    console.log(`Purchase ${purchaseId} cancelled successfully`);

    // 4. Release capacity (Requirement 4.7)
    let capacityReleased = false;
    if (purchase.cycle_id) {
      try {
        const { error: releaseError } = await supabase.rpc("release_capacity", {
          p_cycle_id: purchase.cycle_id,
          p_quantity: 1,
        });

        if (releaseError) {
          console.error(
            `Error releasing capacity for purchase ${purchaseId}:`,
            releaseError,
          );
          // Log but don't fail the cancellation
        } else {
          console.log(
            `Released capacity for cancelled standalone purchase ${purchaseId} in cycle ${purchase.cycle_id}`,
          );
          capacityReleased = true;
        }
      } catch (error) {
        console.error(
          `Exception releasing capacity for purchase ${purchaseId}:`,
          error,
        );
        // Don't fail the cancellation if capacity release fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        purchaseId,
        status: "cancelled",
        cancellationReason,
        capacityReleased,
        cancelledAt: cancelledAt.toISOString(),
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error cancelling standalone purchase:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
