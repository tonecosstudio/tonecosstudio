import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { getClaims, getServiceClient } from "../_shared/supabase.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rate-limit.ts";
import {
  checkContentLength,
  PAYLOAD_LIMITS,
} from "../_shared/payload-guard.ts";
import { validateOrReject, type Schema } from "../_shared/validation.ts";

const CANCEL_SCHEMA: Schema = {
  subscriptionId: { type: "uuid", required: true },
  reason: { type: "string", maxLength: 500, sanitize: true },
};

interface CancelSubscriptionRpcResult {
  deliveriesCompleted?: number;
  cancelledDeliveries?: number;
  capacityReleased?: number;
  beforeCutoff?: boolean;
}

function mapCancelSubscriptionError(message: string): { status: number; error: string } {
  if (message.includes("SUBSCRIPTION_NOT_FOUND")) {
    return { status: 404, error: "Assinatura nao encontrada" };
  }
  if (message.includes("FORBIDDEN")) {
    return { status: 403, error: "Voce nao tem permissao para cancelar esta assinatura" };
  }
  if (message.includes("ALREADY_CANCELLED")) {
    return { status: 400, error: "Assinatura ja esta cancelada" };
  }
  if (message.includes("SUBSCRIPTION_ID_REQUIRED") || message.includes("USER_ID_REQUIRED")) {
    return { status: 400, error: "Dados obrigatorios ausentes" };
  }
  return { status: 500, error: "Internal server error" };
}

function toCancelResult(value: unknown): CancelSubscriptionRpcResult {
  return value && typeof value === "object" ? value as CancelSubscriptionRpcResult : {};
}

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { claims } = await getClaims(req);
    const userId = String(claims.sub);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rateLimited = await checkRateLimit(
      req,
      "cancel-subscription",
      RATE_LIMITS.STANDARD,
      userId,
    );
    if (rateLimited) return rateLimited;

    const tooLarge = checkContentLength(req, PAYLOAD_LIMITS.MINIMAL);
    if (tooLarge) return tooLarge;

    const rawBody = await req.json().catch(() => ({}));
    const validation = validateOrReject(rawBody, CANCEL_SCHEMA);
    if ("error" in validation) return validation.error;

    const { subscriptionId, reason } = validation.data as {
      subscriptionId: string;
      reason?: string;
    };

    const service = getServiceClient();
    const { data: cancelData, error: cancelError } = await service.rpc(
      "cancel_subscription_atomic",
      {
        p_subscription_id: subscriptionId,
        p_user_id: userId,
        p_reason: reason ?? null,
      },
    );

    if (cancelError) {
      const mapped = mapCancelSubscriptionError(cancelError.message || "");
      return new Response(
        JSON.stringify({ error: mapped.error }),
        {
          status: mapped.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const cancelResult = toCancelResult(cancelData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Assinatura cancelada com sucesso",
        deliveries_completed: cancelResult.deliveriesCompleted ?? 0,
        cancelled_deliveries: cancelResult.cancelledDeliveries ?? 0,
        capacity_released: cancelResult.capacityReleased ?? 0,
        before_cutoff: Boolean(cancelResult.beforeCutoff),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("Error cancelling subscription:", msg);
    const status =
      msg === "Unauthorized" ? 401 : msg.startsWith("Forbidden") ? 403 : 500;
    return new Response(JSON.stringify({ error: status >= 500 ? "Internal server error" : msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
