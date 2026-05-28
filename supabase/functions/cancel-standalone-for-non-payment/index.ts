/**
 * Edge Function: Cancel Standalone Purchase for Non-Payment
 *
 * Cancels a standalone purchase only after the balance deadline has passed.
 * The database RPC performs the status update and capacity release atomically.
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { requireSharedSecret } from "../_shared/secrets.ts";

interface CancelRequest {
  purchaseId: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function rpcErrorStatus(message: string): number {
  if (message.includes("PURCHASE_NOT_FOUND")) return 404;
  if (
    message.includes("INVALID_STATUS") ||
    message.includes("BALANCE_DUE_DATE_REQUIRED") ||
    message.includes("BALANCE_DEADLINE_NOT_PASSED") ||
    message.includes("PURCHASE_ID_REQUIRED")
  ) {
    return 400;
  }
  return 500;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const forbidden = requireSharedSecret(req, "CRON_SECRET", "x-cron-secret");
    if (forbidden) return forbidden;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: CancelRequest = await req.json().catch(() => ({ purchaseId: "" }));
    const { purchaseId } = body;

    if (!purchaseId) {
      return jsonResponse({ error: "purchaseId is required" }, 400);
    }

    console.log(`Cancelling standalone purchase for non-payment: ${purchaseId}`);

    const { data: result, error } = await supabase.rpc(
      "cancel_standalone_purchase_for_non_payment",
      { p_purchase_id: purchaseId },
    );

    if (error) {
      const message = error.message || "Cancellation failed";
      const status = rpcErrorStatus(message);
      return jsonResponse(
        { success: false, error: status >= 500 ? "Internal server error" : message },
        status,
      );
    }

    console.log(`Purchase ${purchaseId} cancelled successfully`);
    return jsonResponse((result as Record<string, unknown>) ?? { success: true });
  } catch (error) {
    console.error("Error cancelling standalone purchase:", error);

    return jsonResponse(
      {
        success: false,
        error: "Internal server error",
      },
      500,
    );
  }
});
