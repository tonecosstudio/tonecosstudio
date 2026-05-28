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
import { getClaims, getServiceClient } from "../_shared/supabase.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rate-limit.ts";
import { checkContentLength, PAYLOAD_LIMITS } from "../_shared/payload-guard.ts";
import { validateOrReject, type Schema } from "../_shared/validation.ts";

const CREATE_PURCHASE_SCHEMA: Schema = {
  collectionId: { type: "uuid", required: true },
  cycleId: { type: "uuid", required: true },
  characterId: { type: "uuid", required: true },
  depositVoucherUrl: { type: "url" },
};

interface CreatePurchaseRequest {
  collectionId: string;
  cycleId: string;
  characterId: string;
  depositVoucherUrl?: string;
}

interface CreateStandalonePurchaseRpcResult {
  purchase?: unknown;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function mapCreatePurchaseError(message: string): { status: number; error: string; code: string } {
  if (message.includes("CUTOFF_PASSED")) {
    return {
      status: 403,
      error: "Cannot create standalone purchase - cutoff has passed.",
      code: "CUTOFF_PASSED",
    };
  }
  if (message.includes("CYCLE_NOT_FOUND")) {
    return { status: 404, error: "Cycle not found", code: "CYCLE_NOT_FOUND" };
  }
  if (message.includes("CYCLE_NOT_OPEN")) {
    const cycleStatus = message.split("CYCLE_NOT_OPEN:")[1]?.trim() || "not open";
    return {
      status: 403,
      error: `Cannot create standalone purchase - cycle is ${cycleStatus}.`,
      code: "CYCLE_NOT_OPEN",
    };
  }
  if (message.includes("COLLECTION_NOT_FOUND")) {
    return { status: 404, error: "Collection not found", code: "COLLECTION_NOT_FOUND" };
  }
  if (message.includes("COLLECTION_INACTIVE")) {
    return { status: 400, error: "Collection is not active", code: "COLLECTION_INACTIVE" };
  }
  if (message.includes("CHARACTER_NOT_FOUND")) {
    return { status: 404, error: "Character not found in collection", code: "CHARACTER_NOT_FOUND" };
  }
  if (message.includes("CAPACITY_EXCEEDED")) {
    return { status: 409, error: "Capacity limit exceeded.", code: "CAPACITY_EXCEEDED" };
  }
  if (message.includes("PRICING_NOT_CONFIGURED") || message.includes("INVALID_PRICING")) {
    return { status: 500, error: "Internal server error", code: "PRICING_NOT_CONFIGURED" };
  }
  if (message.includes("INVALID_DEPOSIT_VOUCHER_URL")) {
    return { status: 400, error: "depositVoucherUrl must be a valid HTTPS URL", code: "INVALID_VOUCHER_URL" };
  }
  if (
    message.includes("USER_ID_REQUIRED") ||
    message.includes("COLLECTION_ID_REQUIRED") ||
    message.includes("CYCLE_ID_REQUIRED") ||
    message.includes("CHARACTER_ID_REQUIRED")
  ) {
    return { status: 400, error: "Missing required purchase data", code: "VALIDATION_ERROR" };
  }
  if (message.includes("Current month sales are closed")) {
    return { status: 403, error: "Current month sales are closed", code: "MONTHLY_SALES_CLOSED" };
  }
  return { status: 500, error: "Internal server error", code: "INTERNAL_ERROR" };
}

function toCreateResult(value: unknown): CreateStandalonePurchaseRpcResult {
  return value && typeof value === "object" ? value as CreateStandalonePurchaseRpcResult : {};
}

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { claims } = await getClaims(req);
    const userId = String(claims.sub);

    const rateLimited = await checkRateLimit(req, "create-standalone-purchase", RATE_LIMITS.PURCHASE, userId);
    if (rateLimited) return rateLimited;

    const tooLarge = checkContentLength(req, PAYLOAD_LIMITS.STANDARD);
    if (tooLarge) return tooLarge;

    const rawBody = await req.json().catch(() => ({}));
    const validation = validateOrReject(rawBody, CREATE_PURCHASE_SCHEMA);
    if ("error" in validation) return validation.error;

    const { collectionId, cycleId, characterId, depositVoucherUrl } =
      validation.data as unknown as CreatePurchaseRequest;

    if (depositVoucherUrl && !isHttpsUrl(depositVoucherUrl)) {
      return new Response(
        JSON.stringify({ error: "depositVoucherUrl must be a valid HTTPS URL", code: "INVALID_VOUCHER_URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const service = getServiceClient();
    const { data, error } = await service.rpc("create_standalone_purchase_atomic", {
      p_user_id: userId,
      p_collection_id: collectionId,
      p_cycle_id: cycleId,
      p_character_id: characterId,
      p_deposit_voucher_url: depositVoucherUrl ?? null,
    });

    if (error) {
      const mapped = mapCreatePurchaseError(error.message || "");
      return new Response(
        JSON.stringify({ error: mapped.error, code: mapped.code }),
        { status: mapped.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = toCreateResult(data);

    return new Response(
      JSON.stringify({
        success: true,
        purchase: result.purchase ?? null,
        message: "Standalone purchase created successfully",
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = (error as Error).message || "Internal server error";
    const status = msg === "Unauthorized" ? 401 : msg.startsWith("Forbidden") ? 403 : 500;
    console.error("Error creating standalone purchase:", msg);
    return new Response(
      JSON.stringify({ error: status >= 500 ? "Internal server error" : msg, code: "INTERNAL_ERROR" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
