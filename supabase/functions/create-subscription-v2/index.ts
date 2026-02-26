import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { getClaims, getServiceClient } from "../_shared/supabase.ts";

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
  // Chamar função do banco de dados que implementa a lógica de ciclo
  const { data, error } = await service.rpc('get_or_create_current_cycle');
  
  if (error) {
    throw new Error(`Erro ao obter ciclo atual: ${error.message}`);
  }
  
  if (!data) {
    throw new Error('Não foi possível obter ou criar o ciclo atual');
  }
  
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
 * Agenda entregas consecutivas
 */
async function scheduleDeliveries(
  service: any,
  subscriptionId: string,
  planType: PlanType,
  entryCycleId: string
): Promise<any[]> {
  const deliveryCount = planType === 'trimestral' ? 3 : 6;
  
  // Chamar função do banco de dados para agendar entregas
  const { data, error } = await service.rpc('schedule_consecutive_deliveries', {
    p_subscription_id: subscriptionId,
    p_plan_type: planType,
    p_entry_cycle_id: entryCycleId,
    p_delivery_count: deliveryCount
  });
  
  if (error) {
    throw new Error(`Erro ao agendar entregas: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Cria peça bônus para plano semestral
 */
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
  
  if (error) {
    throw new Error(`Erro ao criar peça bônus: ${error.message}`);
  }
}

/**
 * Incrementa capacidade do ciclo
 */
async function incrementCycleCapacity(service: any, cycleId: string): Promise<void> {
  const { error } = await service.rpc('increment_cycle_capacity', {
    cycle_id: cycleId
  });
  
  if (error) {
    // Fallback: incrementar manualmente
    const { data: cycle } = await service
      .from('cycles')
      .select('capacity_current')
      .eq('id', cycleId)
      .single();
    
    if (cycle) {
      await service
        .from('cycles')
        .update({ capacity_current: cycle.capacity_current + 1 })
        .eq('id', cycleId);
    }
  }
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

    const service = getServiceClient();
    const body = (await req.json().catch(() => ({}))) as CreateSubscriptionV2Request;

    const { planId, collectionId, paymentMethod, paymentId } = body;

    // Validar entrada
    if (!planId || !collectionId || !paymentMethod) {
      return new Response(
        JSON.stringify({ error: "planId, collectionId e paymentMethod são obrigatórios" }),
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
    
    // Verificar capacidade
    checkCycleCapacity(currentCycle);

    // Criar assinatura
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
        entry_cycle_id: currentCycle.id,
        current_delivery_number: 1,
        is_legacy_model: false,
      })
      .select()
      .single();

    if (subscriptionError) throw subscriptionError;

    // Agendar entregas consecutivas
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

    // Incrementar capacidade do ciclo
    await incrementCycleCapacity(service, currentCycle.id);

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
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
