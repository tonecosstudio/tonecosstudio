import { getCorsHeaders, handleOptions } from "../_shared/cors.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rate-limit.ts";
import { logAdminAction } from "../_shared/security-logger.ts";
import { assertAdmin, errorToStatus, getServiceClient } from "../_shared/supabase.ts";

type JsonObject = Record<string, unknown>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ADMIN_RPC_ALLOWLIST = new Set([
  "create_admin_notification",
  "sync_all_automatic_groups",
  "close_monthly_sales",
  "reopen_monthly_sales",
  "admin_add_chat_group_member",
  "admin_add_chat_group_members",
  "admin_add_coins_to_user",
  "admin_add_holiday",
  "admin_adjust_subscription_credit_credits",
  "admin_approve_character_choice",
  "admin_approve_manual_payment_with_notification",
  "admin_approve_standalone_payment_voucher",
  "admin_assign_collection_to_tier",
  "admin_assign_collections_to_tier",
  "admin_assign_delivery_to_cycle",
  "admin_assign_production",
  "admin_block_production",
  "admin_bulk_assign_collections_to_tier",
  "admin_bulk_create_photo_metadata",
  "admin_bulk_update_character_price_multipliers",
  "admin_cancel_conversation_reminder",
  "admin_cancel_standalone_purchase",
  "admin_close_subscription_credit_production_cycle",
  "admin_complete_production_stage",
  "admin_create_bonus_piece",
  "admin_delete_chat_group_message",
  "admin_create_collection",
  "admin_create_conversation_reminder",
  "admin_create_photo_metadata",
  "admin_create_subscription_credit_character",
  "admin_create_subscription_credit_production_cycle",
  "admin_deactivate_subscription_credit_character",
  "admin_delete_catalog_character",
  "admin_delete_notification",
  "admin_delete_group_message_template",
  "admin_delete_collection",
  "admin_delete_collection_character",
  "admin_delete_collection_type",
  "admin_delete_holiday",
  "admin_delete_internal_support_note",
  "admin_delete_payment_file_record",
  "admin_delete_photo_metadata",
  "admin_delete_price_category",
  "admin_delete_pricing_tier",
  "admin_delete_quick_reply",
  "admin_delete_support_message",
  "admin_delete_support_attachment_record",
  "admin_edit_chat_group_message",
  "admin_edit_internal_support_note",
  "admin_extend_character_choice_deadline",
  "admin_get_collections_for_bulk_assign",
  "admin_get_or_create_delivery_cycle",
  "admin_get_or_create_notification_settings",
  "admin_get_pricing_tiers_snapshot",
  "admin_insert_collection_character",
  "admin_insert_collection_characters",
  "add_quote_production_photo",
  "admin_link_bonus_piece_to_delivery",
  "admin_log_stage_transition",
  "admin_mark_standalone_production_complete",
  "admin_mark_subscription_delivery_delivered_from_tracking",
  "admin_publish_catalog_import_item",
  "admin_process_subscription_payment",
  "admin_verify_subscription_payment_voucher",
  "admin_remove_chat_group_member",
  "admin_register_chat_group_attachment",
  "admin_record_order_status_history",
  "admin_register_preorder_manual_payment",
  "admin_reject_character_choice",
  "admin_reject_manual_payment_with_notification",
  "admin_reject_standalone_payment_voucher",
  "admin_release_preorder_final_payment",
  "admin_reorder_quick_replies",
  "admin_request_manual_payment_info",
  "admin_save_group_message_template",
  "admin_save_collection_type",
  "admin_save_pricing_tier_plan",
  "admin_save_quick_reply",
  "admin_save_subscription_plan_configuration",
  "admin_schedule_group_message",
  "admin_schedule_subscription_deliveries",
  "admin_send_chat_group_message",
  "admin_send_payment_link",
  "admin_set_quick_reply_active",
  "admin_soft_delete_chat_group",
  "admin_transition_delivery_cycle_status",
  "admin_unassign_collection_from_tier",
  "admin_unblock_production",
  "ensure_quote_production",
  "admin_update_bonus_piece_status",
  "admin_update_character_price_multiplier",
  "admin_update_collection",
  "admin_update_collection_base_price",
  "admin_update_collection_base_prices",
  "admin_update_collection_character",
  "admin_update_delivery_status_legacy",
  "admin_update_holiday",
  "admin_update_manual_payment_status",
  "admin_update_notification_settings",
  "admin_update_payment_setting",
  "admin_update_photo_metadata",
  "admin_update_pricing_context_multipliers",
  "admin_update_production_estimated_completion",
  "admin_update_production_notes",
  "admin_update_production_schedule",
  "admin_update_production_setting",
  "admin_update_production_stage",
  "admin_update_production_stage_notes",
  "admin_update_purchase_mode",
  "admin_update_quote_status",
  "admin_update_quote_tracking_code",
  "admin_update_support_conversation",
  "admin_update_standalone_fulfillment_status",
  "admin_update_standalone_pricing",
  "admin_update_standalone_tracking_code",
  "admin_update_subscription_credit_character",
  "admin_update_subscription_delivery_dates",
  "admin_update_subscription_plan_collection_limit",
  "admin_create_chat_group",
  "set_quote_production_stage",
  "admin_upsert_catalog_character",
  "admin_upsert_price_category",
  "admin_upsert_system_settings",
]);

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function asObject(value: unknown, fieldName: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object`);
  }

  return value as JsonObject;
}

function parseRequestBody(value: unknown): {
  functionName: string;
  args: JsonObject;
} {
  const body = asObject(value, "request body");
  const functionName = typeof body.functionName === "string"
    ? body.functionName.trim()
    : "";

  if (!/^[a-z0-9_]+$/.test(functionName)) {
    throw new Error("Invalid admin RPC function name");
  }

  if (!ADMIN_RPC_ALLOWLIST.has(functionName)) {
    throw new Error("Admin RPC function is not allowed");
  }

  const args = body.args === undefined ? {} : asObject(body.args, "args");

  return { functionName, args };
}

function mapRpcError(message: string): { status: number; error: string } {
  if (
    message.includes("Forbidden") ||
    message.includes("FORBIDDEN") ||
    message.includes("admin")
  ) {
    return { status: 403, error: "Forbidden" };
  }

  if (
    message.includes("invalid") ||
    message.includes("Invalid") ||
    message.includes("INVALID") ||
    message.includes("required") ||
    message.includes("must be")
  ) {
    return { status: 400, error: message };
  }

  if (
    message.includes("not found") ||
    message.includes("Not found") ||
    message.includes("NOT_FOUND")
  ) {
    return { status: 404, error: message };
  }

  return { status: 500, error: "Internal server error" };
}

function mapHandlerError(message: string): { status: number; error: string } {
  const authStatus = errorToStatus(message);
  if (authStatus !== 500) {
    return {
      status: authStatus,
      error: authStatus >= 500 ? "Internal server error" : message,
    };
  }

  return mapRpcError(message);
}

async function updateCollectionBasePrice(
  service: ReturnType<typeof getServiceClient>,
  args: JsonObject,
): Promise<JsonObject> {
  const collectionTypeId = typeof args.p_collection_type_id === "string"
    ? args.p_collection_type_id.trim()
    : "";
  const newBasePrice = args.p_new_base_price_coins;

  if (!UUID_PATTERN.test(collectionTypeId)) {
    throw new Error("Invalid collection type id");
  }

  if (!Number.isInteger(newBasePrice) || (newBasePrice as number) <= 0) {
    throw new Error("Invalid collection base price");
  }

  const { data: current, error: readError } = await service
    .from("collection_base_pricing")
    .select("collection_type_id, base_price_coins")
    .eq("collection_type_id", collectionTypeId)
    .maybeSingle();

  if (readError) throw readError;
  if (!current) throw new Error("Collection base price not found");

  const oldPrice = current.base_price_coins;
  const { data: updated, error: updateError } = await service
    .from("collection_base_pricing")
    .update({ base_price_coins: newBasePrice as number, updated_at: new Date().toISOString() })
    .eq("collection_type_id", collectionTypeId)
    .select("collection_type_id, base_price_coins")
    .single();

  if (updateError) throw updateError;
  if (!updated || updated.base_price_coins !== newBasePrice) {
    throw new Error("Collection base price update returned invalid data");
  }

  return {
    success: true,
    collection_type_id: collectionTypeId,
    old_price: oldPrice,
    new_price: updated.base_price_coins,
    message: "Preco base atualizado com sucesso",
  };
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    if (req.method !== "POST") {
      return json(req, { ok: false, error: "method not allowed" }, 405);
    }

    const admin = await assertAdmin(req);

    const { functionName, args } = parseRequestBody(
      await req.json().catch(() => ({})),
    );

    const rateLimited = await checkRateLimit(
      req,
      `admin-rpc:${functionName}`,
      RATE_LIMITS.ADMIN,
      admin.userId,
    );
    if (rateLimited) return rateLimited;

    const service = getServiceClient();

    if (functionName === "admin_update_collection_base_price") {
      const data = await updateCollectionBasePrice(service, args);
      logAdminAction(
        req,
        new URL(req.url).pathname,
        admin.userId,
        "update_collection_base_price",
        {
          collection_type_id: data.collection_type_id,
          old_price: data.old_price,
          new_price: data.new_price,
        },
      );
      return json(req, { ok: true, data });
    }

    const { data, error } = await service.rpc(functionName, args);

    if (error) {
      const mapped = mapRpcError(error.message || "");
      return json(req, { ok: false, error: mapped.error }, mapped.status);
    }

    return json(req, { ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const mapped = mapHandlerError(message);
    return json(req, { ok: false, error: mapped.error }, mapped.status);
  }
});
