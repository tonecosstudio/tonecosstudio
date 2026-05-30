import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import {
  errorToStatus,
  getClaims,
  getServiceClient,
} from "../_shared/supabase.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rate-limit.ts";
import {
  checkContentLength,
  PAYLOAD_LIMITS,
} from "../_shared/payload-guard.ts";
import { validateOrReject, type Schema } from "../_shared/validation.ts";
import { createEdgeLogger } from "../_shared/edge-logger.ts";

/**
 * Edge Function: create-subscription-v2
 *
 * Cria uma assinatura no novo modelo Premium Club v2.0 com:
 * - Preço fixo por plano (não por coleção)
 * - Entregas consecutivas automáticas
 * - Peça bônus para plano semestral
 * - Vinculação ao ciclo atual
 *
 * Feature: premium-club-fixed-price-model
 * Task: 3.9
 */

type PlanType = "trimestral" | "semestral";

const log = createEdgeLogger("create-subscription-v2");

const CREATE_SUB_V2_SCHEMA: Schema = {
  planId: { type: "uuid", required: true },
  collectionId: { type: "uuid", required: true },
  paymentMethod: { type: "string", required: true, maxLength: 20 },
  paymentId: { type: "string", maxLength: 100 },
};

interface CreateSubscriptionV2Request {
  planId: string;
  collectionId: string;
  paymentMethod: "pix" | "credit_card" | "boleto";
  paymentId?: string;
}

interface CycleData {
  id: string;
  cycle_number: 1 | 2;
  month: number;
  year: number;
  shipping_date: string;
  status: string;
  capacity?: number;
  used_capacity?: number;
}

/**
 * Obtém ou cria o ciclo atual
 */
async function getCurrentCycle(service: any): Promise<CycleData> {
  const { data, error } = await service.rpc("get_or_create_current_cycle");
  if (error) throw new Error(`Erro ao obter ciclo atual: ${error.message}`);
  const cycle = Array.isArray(data) ? data[0] : data;
  if (!cycle?.id) throw new Error("Current cycle could not be resolved");
  return cycle as CycleData;
}

/**
 * Verifica capacidade do ciclo
 */
function checkCycleCapacity(cycle: CycleData): void {
  const capacity = Number(cycle.capacity);
  const usedCapacity = Number(cycle.used_capacity);

  if (!Number.isFinite(capacity) || capacity < 1) {
    throw new Error("Invalid current cycle capacity");
  }

  if (!Number.isFinite(usedCapacity) || usedCapacity < 0) {
    throw new Error("Invalid current cycle used capacity");
  }

  if (usedCapacity >= capacity) {
    throw new Error(
      `Ciclo ${cycle.cycle_number} de ${cycle.month}/${cycle.year} está com capacidade máxima. ` +
        `Você será alocado no próximo ciclo disponível.`,
    );
  }
}

async function cleanupSubscriptionDraft(
  service: any,
  subscriptionId: string,
): Promise<void> {
  const cleanupSteps = [
    service.from("bonus_pieces").delete().eq("subscription_id", subscriptionId),
    service
      .from("subscription_deliveries")
      .delete()
      .eq("subscription_id", subscriptionId),
    service.from("subscriptions").delete().eq("id", subscriptionId),
  ];

  for (const step of cleanupSteps) {
    const { error } = await step;
    if (error) {
      log.error("subscription_draft_cleanup_failed", {
        error,
        subscriptionId,
      });
    }
  }
}

async function scheduleDeliveries(
  service: any,
  subscriptionId: string,
  planType: PlanType,
  entryCycleId: string,
): Promise<any[]> {
  const { data, error } = await service.rpc(
    "admin_schedule_subscription_deliveries",
    {
      p_subscription_id: subscriptionId,
      p_plan_type: planType,
      p_entry_cycle_id: entryCycleId,
    },
  );

  if (error) {
    throw new Error(`Erro ao agendar entregas: ${error.message}`);
  }

  const result = data as { deliveries?: any[] } | null;
  return Array.isArray(result?.deliveries) ? result.deliveries : [];
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

    // Rate limit: purchase operations
    const rateLimited = await checkRateLimit(
      req,
      "create-subscription-v2",
      RATE_LIMITS.PURCHASE,
      userId,
    );
    if (rateLimited) return rateLimited;

    // Payload size guard (standard: 64 KB)
    const tooLarge = checkContentLength(req, PAYLOAD_LIMITS.STANDARD);
    if (tooLarge) return tooLarge;

    const service = getServiceClient();
    const rawBody = await req.json().catch(() => ({}));
    const validation = validateOrReject(rawBody, CREATE_SUB_V2_SCHEMA);
    if ("error" in validation) return validation.error;

    const { planId, collectionId, paymentMethod, paymentId } =
      validation.data as unknown as CreateSubscriptionV2Request;

    // Validate paymentMethod enum
    if (!["pix", "credit_card", "boleto"].includes(paymentMethod)) {
      return new Response(
        JSON.stringify({
          error: "paymentMethod inválido. Use: pix, credit_card ou boleto",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Buscar plano
    const { data: plan, error: planError } = await service
      .from("subscription_plans")
      .select("id, plan_type, deliveries_total, includes_bonus, price")
      .eq("id", planId)
      .eq("is_active", true)
      .maybeSingle();

    if (planError) throw planError;
    if (!plan) {
      return new Response(JSON.stringify({ error: "Plano não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const planType = plan.plan_type as PlanType;
    if (planType !== "trimestral" && planType !== "semestral") {
      throw new Error("Invalid subscription plan type");
    }

    // Buscar coleção
    const { data: collection, error: collectionError } = await service
      .from("collections")
      .select("id, name, is_semestral_exclusive")
      .eq("id", collectionId)
      .eq("is_active", true)
      .maybeSingle();

    if (collectionError) throw collectionError;
    if (!collection) {
      return new Response(JSON.stringify({ error: "Coleção não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validar disponibilidade da coleção para o plano
    if (collection.is_semestral_exclusive && planType === "trimestral") {
      return new Response(
        JSON.stringify({
          error: "Esta coleção está disponível apenas para o plano semestral",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verificar se usuário já tem assinatura ativa
    const { data: existingSubscription } = await service
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .eq("is_legacy_model", false)
      .maybeSingle();

    if (existingSubscription) {
      return new Response(
        JSON.stringify({
          error: "Você já tem uma assinatura ativa no modelo Premium Club",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Obter ciclo atual
    const currentCycle = await getCurrentCycle(service);

    // Verificar capacidade do ciclo de entrada
    checkCycleCapacity(currentCycle);

    const { data: subscription, error: subscriptionError } = await service
      .from("subscriptions")
      .insert({
        user_id: userId,
        collection_id: collectionId,
        plan_type: planType,
        status: "active",
        total_paid: plan.price,
        payment_method: paymentMethod,
        payment_id: paymentId || null,
        deliveries_total: plan.deliveries_total,
        entry_cycle_id: currentCycle.id,
        current_delivery_number: 1,
        is_legacy_model: false,
      })
      .select()
      .single();

    if (subscriptionError) throw subscriptionError;

    let deliveries: any[] = [];

    try {
      deliveries = await scheduleDeliveries(
        service,
        subscription.id,
        planType,
        currentCycle.id,
      );
    } catch (error) {
      await cleanupSubscriptionDraft(service, subscription.id);
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscription: {
          id: subscription.id,
          collection_name: collection.name,
          plan_type: planType,
          deliveries_total: plan.deliveries_total,
          total_paid: plan.price,
          entry_cycle: {
            cycle_number: currentCycle.cycle_number,
            month: currentCycle.month,
            year: currentCycle.year,
            shipping_date: currentCycle.shipping_date,
          },
          deliveries_scheduled: deliveries.length,
          includes_bonus: plan.includes_bonus,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    log.error("create_subscription_v2_failed", { error: e });
    const status = errorToStatus(msg);
    return new Response(
      JSON.stringify({ error: status >= 500 ? "Internal server error" : msg }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
