import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { getClaims, getServiceClient } from "../_shared/supabase.ts";
import { scheduleConsecutiveDeliveries } from "../_shared/delivery-scheduling.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rate-limit.ts";
import { checkContentLength, PAYLOAD_LIMITS } from "../_shared/payload-guard.ts";
import { validateOrReject, type Schema } from "../_shared/validation.ts";

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

const CREATE_SUB_V2_SCHEMA: Schema = {
  planId:        { type: "uuid", required: true },
  collectionId:  { type: "uuid", required: true },
  paymentMethod: { type: "string", required: true, maxLength: 20 },
  paymentId:     { type: "string", maxLength: 100 },
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
  capacity_current: number;
  capacity_max: number;
}

interface PlanData {
  id: string;
  plan_type: PlanType;
  deliveries_total: number;
  includes_bonus: boolean;
  price: number;
}

/**
 * Obtém ou cria o ciclo atual
 */
async function getCurrentCycle(service: any): Promise<CycleData> {
  const { data, error } = await service.rpc('get_or_create_current_cycle');
  if (error) throw new Error(`Erro ao obter ciclo atual: ${error.message}`);
  if (!data) throw new Error('Não foi possível obter ou criar o ciclo atual');
  return data as CycleData;
}

/**
 * Verifica capacidade do ciclo
 */
function checkCycleCapacity(cycle: CycleData): void {
  if (cycle.capacity_current >= cycle.capacity_max) {
    throw new Error(
      `Ciclo ${cycle.cycle_number} de ${cycle.month}/${cycle.year} está com capacidade máxima. ` +
      `Você será alocado no próximo ciclo disponível.`
    );
  }
}

/**
 * Calcula os ciclos que serão usados para as entregas
 */
function calculateDeliveryCycles(
  entryCycle: CycleData,
  deliveryCount: number
): Array<{ cycleNumber: 1 | 2; month: number; year: number }> {
  const cycles: Array<{ cycleNumber: 1 | 2; month: number; year: number }> = [];
  let currentCycleNumber = entryCycle.cycle_number;
  let currentMonth = entryCycle.month;
  let currentYear = entryCycle.year;

  for (let i = 0; i < deliveryCount; i++) {
    if (currentCycleNumber === 1) {
      currentCycleNumber = 2;
    } else {
      currentCycleNumber = 1;
      currentMonth = currentMonth + 1;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear = currentYear + 1;
      }
    }
    cycles.push({ cycleNumber: currentCycleNumber, month: currentMonth, year: currentYear });
  }
  return cycles;
}

async function checkAllDeliveryCyclesCapacity(
  service: any,
  entryCycle: CycleData,
  deliveryCount: number
): Promise<void> {
  const deliveryCycles = calculateDeliveryCycles(entryCycle, deliveryCount);
  for (let i = 0; i < deliveryCycles.length; i++) {
    const cycleInfo = deliveryCycles[i];
    const { data: existingCycle } = await service
      .from('cycles')
      .select('id, capacity_current, capacity_max, capacity_limit')
      .eq('cycle_number', cycleInfo.cycleNumber)
      .eq('month', cycleInfo.month)
      .eq('year', cycleInfo.year)
      .maybeSingle();

    if (existingCycle) {
      const { data: hasCapacity, error } = await service.rpc('check_capacity_available', {
        p_cycle_id: existingCycle.id,
        p_quantity: 1
      });
      if (error) throw new Error(`Erro ao verificar capacidade: ${error.message}`);
      if (!hasCapacity) {
        throw new Error(
          `Capacidade esgotada para o Ciclo ${cycleInfo.cycleNumber} de ` +
          `${cycleInfo.month}/${cycleInfo.year} (entrega ${i + 1} de ${deliveryCount}).`
        );
      }
    }
  }
}

async function reserveAllDeliveryCyclesCapacity(
  service: any,
  deliveries: any[],
  subscriptionId: string
): Promise<void> {
  for (const delivery of deliveries) {
    if (delivery.cycle_id) {
      const { error } = await service.rpc('reserve_capacity', {
        p_cycle_id: delivery.cycle_id,
        p_quantity: 1
      });
      if (error) {
        console.error(`Erro ao reservar capacidade para ciclo ${delivery.cycle_id}:`, error);
      }
    }
  }
}

async function scheduleDeliveries(
  service: any,
  subscriptionId: string,
  planType: PlanType,
  entryCycleId: string
): Promise<any[]> {
  return await scheduleConsecutiveDeliveries(service, subscriptionId, entryCycleId, planType);
}

async function createBonusPiece(
  service: any,
  subscriptionId: string,
  lastDeliveryId: string
): Promise<void> {
  const { error } = await service
    .from('bonus_pieces')
    .insert({
      subscription_id: subscriptionId,
      delivery_id: lastDeliveryId,
      status: 'pending',
      description: 'Peça bônus exclusiva do plano semestral'
    });
  if (error) throw new Error(`Erro ao criar peça bônus: ${error.message}`);
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
    const rateLimited = await checkRateLimit(req, "create-subscription-v2", RATE_LIMITS.PURCHASE, userId);
    if (rateLimited) return rateLimited;

    // Payload size guard (standard: 64 KB)
    const tooLarge = checkContentLength(req, PAYLOAD_LIMITS.STANDARD);
    if (tooLarge) return tooLarge;

    const service = getServiceClient();
    const rawBody = await req.json().catch(() => ({}));
    const validation = validateOrReject(rawBody, CREATE_SUB_V2_SCHEMA);
    if ("error" in validation) return validation.error;

    const { planId, collectionId, paymentMethod, paymentId } = validation.data as unknown as CreateSubscriptionV2Request;

    // Validate paymentMethod enum
    if (!["pix", "credit_card", "boleto"].includes(paymentMethod)) {
      return new Response(
        JSON.stringify({ error: "paymentMethod inválido. Use: pix, credit_card ou boleto" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
    if (collection.is_semestral_exclusive && plan.plan_type === 'trimestral') {
      return new Response(
        JSON.stringify({ error: "Esta coleção está disponível apenas para o plano semestral" }),
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
        JSON.stringify({ error: "Você já tem uma assinatura ativa no modelo Premium Club" }),
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

    // Calcular número de entregas baseado no plano
    const deliveryCount = plan.plan_type === 'trimestral' ? 3 : 6;
    
    // Verificar capacidade disponível para TODOS os ciclos de entrega
    // Isso garante que a assinatura só será criada se houver capacidade
    // para todas as entregas (Requirements 3.2, 9.9, 22.1)
    await checkAllDeliveryCyclesCapacity(service, currentCycle, deliveryCount);

    // Criar assinatura (Requirements 20.1, 20.2, 20.3, 20.4)
    // entry_cycle_id stores the cycle when subscription was created
    const { data: subscription, error: subscriptionError } = await service
      .from("subscriptions")
      .insert({
        user_id: userId,
        collection_id: collectionId,
        plan_type: plan.plan_type,
        status: "active",
        total_paid: plan.price,
        payment_method: paymentMethod,
        payment_id: paymentId || null,
        deliveries_total: plan.deliveries_total,
        entry_cycle_id: currentCycle.id, // Requirement 20.4: Store cycle association
        current_delivery_number: 1,
        is_legacy_model: false,
      })
      .select()
      .single();

    if (subscriptionError) throw subscriptionError;

    // Agendar entregas consecutivas (Requirements 20.5)
    const deliveries = await scheduleDeliveries(
      service,
      subscription.id,
      plan.plan_type,
      currentCycle.id
    );

    // Criar peça bônus se for plano semestral
    if (plan.includes_bonus && deliveries.length > 0) {
      const lastDelivery = deliveries[deliveries.length - 1];
      await createBonusPiece(service, subscription.id, lastDelivery.id);
    }

    // Reservar capacidade para todos os ciclos de entrega (Requirement 20.7)
    // This increments capacity_current for each cycle used
    await reserveAllDeliveryCyclesCapacity(service, deliveries, subscription.id);

    return new Response(
      JSON.stringify({
        success: true,
        subscription: {
          id: subscription.id,
          collection_name: collection.name,
          plan_type: plan.plan_type,
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
    console.error("Error creating subscription v2:", msg);
    const status = msg === "Unauthorized" ? 401 : msg.startsWith("Forbidden") ? 403 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
