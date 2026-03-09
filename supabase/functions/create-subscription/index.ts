import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { getClaims, getServiceClient } from "../_shared/supabase.ts";
import { nowInBahia, addDays, toUTC } from "../_shared/timezone.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rate-limit.ts";
import { checkContentLength, PAYLOAD_LIMITS } from "../_shared/payload-guard.ts";
import { validateOrReject, type Schema } from "../_shared/validation.ts";

type PlanType = "trimestral" | "semestral" | "anual";

const CREATE_SUB_SCHEMA: Schema = {
  collectionIds: { type: "array", required: true, maxItems: 20, itemType: "uuid" },
  planType:      { type: "string", required: true, maxLength: 20 },
  paymentMethod: { type: "string", required: true, maxLength: 20 },
  paymentId:     { type: "string", maxLength: 100 },
};

interface CreateSubscriptionRequest {
  collectionIds: string[];
  planType: PlanType;
  paymentMethod: "pix" | "credit_card" | "boleto";
  paymentId?: string;
}

function getRequiredCollections(planType: PlanType, totalCollections: number): number {
  switch (planType) {
    case "trimestral":
      return 2;
    case "semestral":
      return 3;
    case "anual":
      return totalCollections;
    default:
      return 1;
  }
}

function getDeliveriesTotal(planType: PlanType): number {
  switch (planType) {
    case "trimestral":
      return 3;
    case "semestral":
      return 7;
    case "anual":
      return 12;
    default:
      return 3;
  }
}

function calculateTotalPrice(
  planType: PlanType,
  priceBimonthly: number,
  priceYearly: number,
): number {
  switch (planType) {
    case "trimestral":
      return priceBimonthly * 1.5;
    case "semestral":
      return priceBimonthly * 3;
    case "anual":
      return priceYearly;
    default:
      return priceBimonthly * 1.5;
  }
}

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { claims, client } = await getClaims(req);
    const userId = String(claims.sub);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: purchase operations
    const rateLimited = await checkRateLimit(req, "create-subscription", RATE_LIMITS.PURCHASE, userId);
    if (rateLimited) return rateLimited;

    // Payload size guard (standard: 64 KB)
    const tooLarge = checkContentLength(req, PAYLOAD_LIMITS.STANDARD);
    if (tooLarge) return tooLarge;

    const service = getServiceClient();
    const rawBody = await req.json().catch(() => ({}));
    const validation = validateOrReject(rawBody, CREATE_SUB_SCHEMA);
    if ("error" in validation) return validation.error;

    const body = validation.data as unknown as CreateSubscriptionRequest;
    const { collectionIds, planType, paymentMethod, paymentId } = body;

    // Validate planType enum
    if (!["trimestral", "semestral", "anual"].includes(planType)) {
      return new Response(
        JSON.stringify({ error: "planType inválido. Use: trimestral, semestral ou anual" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate paymentMethod enum
    if (!["pix", "credit_card", "boleto"].includes(paymentMethod)) {
      return new Response(
        JSON.stringify({ error: "paymentMethod inválido. Use: pix, credit_card ou boleto" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Buscar total de coleções ativas para validar plano anual
    const { count: totalCollections } = await service
      .from("collections")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    // Validar número de coleções por plano
    const requiredCollections = getRequiredCollections(planType, totalCollections || 0);
    if (collectionIds.length !== requiredCollections) {
      return new Response(
        JSON.stringify({ 
          error: `Plano ${planType} requer exatamente ${requiredCollections} ${requiredCollections === 1 ? 'coleção' : 'coleções'}` 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Buscar primeira coleção (será a inicial)
    const firstCollectionId = collectionIds[0];
    const { data: collection, error: collectionError } = await service
      .from("collections")
      .select("id, name, price_bimonthly, price_yearly")
      .eq("id", firstCollectionId)
      .eq("is_active", true)
      .maybeSingle();

    if (collectionError) throw collectionError;
    if (!collection) {
      return new Response(JSON.stringify({ error: "Coleção não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar se todas as coleções existem e estão ativas
    const { data: allCollections, error: allCollectionsError } = await service
      .from("collections")
      .select("id, name")
      .in("id", collectionIds)
      .eq("is_active", true);

    if (allCollectionsError) throw allCollectionsError;
    if (!allCollections || allCollections.length !== collectionIds.length) {
      return new Response(
        JSON.stringify({ error: "Uma ou mais coleções não foram encontradas ou estão inativas" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verifica se usuário já tem assinatura ativa
    const { data: existingSubscription } = await service
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (existingSubscription) {
      return new Response(
        JSON.stringify({ error: "Você já tem uma assinatura ativa" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const deliveriesTotal = getDeliveriesTotal(planType);
    const totalPaid = calculateTotalPrice(
      planType,
      Number(collection.price_bimonthly),
      Number(collection.price_yearly),
    );

    // Cria assinatura
    const { data: subscription, error: subscriptionError } = await service
      .from("subscriptions")
      .insert({
        user_id: userId,
        collection_id: firstCollectionId, // Primeira coleção como inicial
        plan_type: planType,
        status: "active",
        total_paid: totalPaid,
        payment_method: paymentMethod,
        payment_id: paymentId || null,
        deliveries_total: deliveriesTotal,
        next_delivery_at: toUTC(addDays(nowInBahia(), 30)).toISOString(), // +30 dias em horário da Bahia
      })
      .select()
      .single();

    if (subscriptionError) throw subscriptionError;

    // Criar registros em subscription_collections para cada coleção
    const subscriptionCollections = collectionIds.map(collectionId => ({
      subscription_id: subscription.id,
      collection_id: collectionId,
    }));

    const { error: subscriptionCollectionsError } = await service
      .from("subscription_collections")
      .insert(subscriptionCollections);

    if (subscriptionCollectionsError) {
      // Rollback: deleta assinatura se falhar
      await service.from("subscriptions").delete().eq("id", subscription.id);
      throw subscriptionCollectionsError;
    }

    // Busca personagens da coleção inicial em ordem
    const { data: characters, error: charactersError } = await service
      .from("collection_characters")
      .select("id, name, release_order")
      .eq("collection_id", firstCollectionId)
      .order("release_order", { ascending: true })
      .limit(deliveriesTotal);

    if (charactersError) throw charactersError;

    if (!characters || characters.length < deliveriesTotal) {
      // Rollback: deleta assinatura se não tem personagens suficientes
      await service.from("subscriptions").delete().eq("id", subscription.id);
      return new Response(
        JSON.stringify({ error: "Coleção não tem personagens suficientes" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Cria entregas programadas
    const deliveries = characters.map((char, index) => ({
      subscription_id: subscription.id,
      character_id: char.id,
      delivery_order: index + 1,
      status: "scheduled" as const,
      reveal_date: index === 0
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Primeira revelação em 30 dias
        : null,
    }));

    const { error: deliveriesError } = await service
      .from("subscription_deliveries")
      .insert(deliveries);

    if (deliveriesError) {
      // Rollback: deleta assinatura se falhar ao criar entregas
      await service.from("subscriptions").delete().eq("id", subscription.id);
      throw deliveriesError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscription: {
          id: subscription.id,
          collection_name: collection.name,
          collections_count: collectionIds.length,
          plan_type: planType,
          deliveries_total: deliveriesTotal,
          total_paid: totalPaid,
          next_delivery_at: subscription.next_delivery_at,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("Error creating subscription:", msg);
    const status = msg === "Unauthorized" ? 401 : msg.startsWith("Forbidden") ? 403 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
