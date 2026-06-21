import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { assertRateLimitedAdmin } from "../_shared/admin-rate-limit.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import {
  isDeliveryStatus,
  type DeliveryStatus,
  VALID_DELIVERY_STATUSES,
} from "../_shared/delivery-status.ts";
import { validateOrReject, type Schema } from "../_shared/validation.ts";

/**
 * Edge Function: bulk-update-delivery-status
 *
 * Atualiza o status de múltiplas entregas em uma única operação.
 * Retorna contagem de sucessos e falhas para feedback ao admin.
 *
 * Requirements: 15.9
 * Task: 21.7
 */

interface BulkUpdateRequest {
  deliveryIds: string[];
  newStatus: string;
  notes?: string;
}

const BULK_UPDATE_DELIVERY_STATUS_SCHEMA: Schema = {
  deliveryIds: {
    type: "array",
    required: true,
    itemType: "uuid",
    minItems: 1,
    maxItems: 100,
    uniqueItems: true,
  },
  newStatus: { type: "string", required: true, maxLength: 20, trim: true },
  notes: { type: "string", maxLength: 1000, trim: true, rejectHtml: true },
};

interface BulkUpdateResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  results: Array<{
    deliveryId: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Atualiza o status de uma única entrega (usado internamente pelo bulk update)
 */
async function updateSingleDelivery(
  service: any,
  deliveryId: string,
  newStatus: DeliveryStatus,
  adminUserId: string,
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await service.rpc(
      "admin_update_subscription_delivery_status",
      {
        p_delivery_id: deliveryId,
        p_status: newStatus,
        p_tracking_code: null,
        p_notes: notes ?? null,
        p_action_type: "bulk_status_update",
        p_allow_same_status: false,
        p_admin_user_id: adminUserId,
      },
    );

    if (error) {
      const message = error.message || "Falha ao atualizar entrega";
      console.error("Erro ao atualizar entrega:", message);
      if (message.includes("DELIVERY_NOT_FOUND"))
        return { success: false, error: "Entrega nao encontrada" };
      if (message.includes("INVALID_STATUS_TRANSITION"))
        return { success: false, error: "Transicao invalida" };
      return { success: false, error: "Falha ao atualizar entrega" };
    }

    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("Erro inesperado ao atualizar entrega:", msg);
    return { success: false, error: "Falha ao atualizar entrega" };
  }
}

/**
 * Processa atualização em massa de entregas
 */
async function bulkUpdateDeliveryStatus(
  service: any,
  deliveryIds: string[],
  newStatus: DeliveryStatus,
  adminUserId: string,
  notes?: string,
): Promise<BulkUpdateResult> {
  const results: Array<{
    deliveryId: string;
    success: boolean;
    error?: string;
  }> = [];

  let successCount = 0;
  let failureCount = 0;

  // Processar cada entrega
  for (const deliveryId of deliveryIds) {
    const result = await updateSingleDelivery(
      service,
      deliveryId,
      newStatus,
      adminUserId,
      notes,
    );

    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }

    results.push({
      deliveryId,
      success: result.success,
      error: result.error,
    });
  }

  return {
    success: failureCount === 0,
    successCount,
    failureCount,
    results,
  };
}

serve(async (req: Request) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    // Verificar se é admin e obter user ID
    const adminUser = await assertRateLimitedAdmin(
      req,
      "bulk-update-delivery-status",
    );
    if (adminUser.rateLimited) return adminUser.rateLimited;

    const adminUserId = adminUser.userId;

    const service = getServiceClient();
    const rawBody = await req.json().catch(() => ({}));
    const validation = validateOrReject(
      rawBody,
      BULK_UPDATE_DELIVERY_STATUS_SCHEMA,
    );
    if ("error" in validation) return validation.error;

    const { deliveryIds, newStatus, notes } =
      validation.data as unknown as BulkUpdateRequest;

    // Validar status
    if (!isDeliveryStatus(newStatus)) {
      return new Response(
        JSON.stringify({
          error: `Status inválido. Status válidos: ${VALID_DELIVERY_STATUSES.join(", ")}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Processar atualização em massa
    const result = await bulkUpdateDeliveryStatus(
      service,
      deliveryIds,
      newStatus,
      adminUserId,
      notes,
    );

    return new Response(
      JSON.stringify({
        success: result.success,
        message: `Atualização concluída: ${result.successCount} sucesso(s), ${result.failureCount} falha(s)`,
        successCount: result.successCount,
        failureCount: result.failureCount,
        results: result.results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("Error in bulk-update-delivery-status:", msg);
    const status =
      msg === "Unauthorized" ? 401 : msg.startsWith("Forbidden") ? 403 : 500;
    return new Response(
      JSON.stringify({ error: status >= 500 ? "Internal server error" : msg }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
