import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { getClaims } from "../_shared/supabase.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rate-limit.ts";

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

    // Busca assinaturas do usuário com dados da coleção
    const { data: subscriptions, error: subscriptionsError } = await client
      .from("subscriptions")
      .select(`
        id,
        plan_type,
        status,
        total_paid,
        payment_method,
        started_at,
        next_delivery_at,
        cancelled_at,
        completed_at,
        deliveries_completed,
        deliveries_total,
        notes,
        collections (
          id,
          name,
          slug,
          description,
          cover_image_url
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (subscriptionsError) throw subscriptionsError;

    // Para cada assinatura, busca as entregas
    const subscriptionsWithDeliveries = await Promise.all(
      (subscriptions || []).map(async (sub) => {
        const { data: deliveries, error: deliveriesError } = await client
          .from("subscription_deliveries")
          .select(`
            id,
            delivery_order,
            status,
            reveal_date,
            production_start_date,
            shipping_date,
            delivered_date,
            tracking_code,
            shipping_carrier,
            progress_photos,
            collection_characters (
              id,
              name,
              description,
              image_urls
            )
          `)
          .eq("subscription_id", sub.id)
          .order("delivery_order", { ascending: true });

        if (deliveriesError) {
          console.error("Error fetching deliveries:", deliveriesError);
          return { ...sub, deliveries: [] };
        }

        return {
          ...sub,
          deliveries: deliveries || [],
        };
      }),
    );

    return new Response(
      JSON.stringify({
        subscriptions: subscriptionsWithDeliveries,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("Error fetching subscriptions:", msg);
    const status = msg === "Unauthorized" ? 401 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
