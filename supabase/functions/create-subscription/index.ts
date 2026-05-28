import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { getClaims, getServiceClient } from "../_shared/supabase.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rate-limit.ts";
import {
  checkContentLength,
  PAYLOAD_LIMITS,
} from "../_shared/payload-guard.ts";
import { validateOrReject, type Schema } from "../_shared/validation.ts";

type PlanType = "trimestral" | "semestral" | "anual";

const CREATE_SUB_SCHEMA: Schema = {
  collectionIds: {
    type: "array",
    required: true,
    minItems: 1,
    maxItems: 20,
    uniqueItems: true,
    itemType: "uuid",
  },
  planType: { type: "string", required: true, maxLength: 20, trim: true },
  paymentMethod: { type: "string", required: true, maxLength: 20, trim: true },
  paymentId: { type: "string", maxLength: 100, trim: true, rejectHtml: true },
};

interface CreateSubscriptionRequest {
  collectionIds: string[];
  planType: PlanType;
  paymentMethod: "pix" | "credit_card" | "boleto";
  paymentId?: string;
}

function mapCreateSubscriptionError(message: string): { status: number; error: string } {
  if (message.includes("INVALID_PLAN_TYPE")) {
    return { status: 400, error: "planType invalido. Use: trimestral, semestral ou anual" };
  }
  if (message.includes("INVALID_PAYMENT_METHOD")) {
    return { status: 400, error: "paymentMethod invalido. Use: pix, credit_card ou boleto" };
  }
  if (message.includes("INVALID_COLLECTION_COUNT")) {
    const required = message.split("INVALID_COLLECTION_COUNT:")[1]?.trim() || "o numero correto de";
    return { status: 400, error: `Plano selecionado requer exatamente ${required} colecoes` };
  }
  if (message.includes("COLLECTION_NOT_FOUND")) {
    return { status: 404, error: "Colecao nao encontrada" };
  }
  if (message.includes("COLLECTIONS_INACTIVE_OR_NOT_FOUND")) {
    return { status: 400, error: "Uma ou mais colecoes nao foram encontradas ou estao inativas" };
  }
  if (message.includes("ACTIVE_SUBSCRIPTION_EXISTS")) {
    return { status: 400, error: "Voce ja tem uma assinatura ativa" };
  }
  if (message.includes("INSUFFICIENT_CHARACTERS")) {
    return { status: 400, error: "Colecao nao tem personagens suficientes" };
  }
  if (message.includes("PRICING_NOT_CONFIGURED")) {
    return { status: 500, error: "Internal server error" };
  }
  if (
    message.includes("USER_ID_REQUIRED") ||
    message.includes("COLLECTION_IDS_REQUIRED") ||
    message.includes("DUPLICATE_COLLECTION_IDS")
  ) {
    return { status: 400, error: "Dados obrigatorios invalidos" };
  }
  if (message.includes("FORBIDDEN")) {
    return { status: 403, error: "Forbidden" };
  }
  return { status: 500, error: "Internal server error" };
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
      "create-subscription",
      RATE_LIMITS.PURCHASE,
      userId,
    );
    if (rateLimited) return rateLimited;

    const tooLarge = checkContentLength(req, PAYLOAD_LIMITS.STANDARD);
    if (tooLarge) return tooLarge;

    const rawBody = await req.json().catch(() => ({}));
    const validation = validateOrReject(rawBody, CREATE_SUB_SCHEMA);
    if ("error" in validation) return validation.error;

    const { collectionIds, planType, paymentMethod, paymentId } =
      validation.data as unknown as CreateSubscriptionRequest;

    const service = getServiceClient();
    const { data, error } = await service.rpc("create_subscription_atomic", {
      p_user_id: userId,
      p_collection_ids: collectionIds,
      p_plan_type: planType,
      p_payment_method: paymentMethod,
      p_payment_id: paymentId ?? null,
    });

    if (error) {
      const mapped = mapCreateSubscriptionError(error.message || "");
      return new Response(JSON.stringify({ error: mapped.error }), {
        status: mapped.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = data && typeof data === "object" ? data as { subscription?: unknown } : {};

    return new Response(
      JSON.stringify({
        success: true,
        subscription: result.subscription ?? null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("Error creating subscription:", msg);
    const status =
      msg === "Unauthorized" ? 401 : msg.startsWith("Forbidden") ? 403 : 500;
    return new Response(JSON.stringify({ error: status >= 500 ? "Internal server error" : msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
