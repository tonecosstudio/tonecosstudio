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

    const rateLimited = await checkRateLimit(
      req,
      "get-my-subscriptions",
      RATE_LIMITS.STANDARD,
      userId,
    );
    if (rateLimited) return rateLimited;

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

    const subscriptionsWithDeliveries = await Promise.all(
      (subscriptions || []).map(async (sub) => {
        const { data: deliveries, error: deliveriesError } = await client
          .from("subscription_deliveries")
          .select(`
            id,
            delivery_number,
            delivery_order,
            status,
            reveal_date,
            expected_delivery_date,
            actual_delivery_date,
            shipping_date,
            delivered_date,
            tracking_code,
            collection_characters:collection_characters!subscription_deliveries_collection_character_id_fkey (
              id,
              name,
              description,
              image_urls
            )
          `)
          .eq("subscription_id", sub.id)
          .order("delivery_order", { ascending: true, nullsFirst: false });

        if (deliveriesError) {
          console.error("Error fetching deliveries:", deliveriesError.message);
          return { ...sub, deliveries: [] };
        }

        const normalizedDeliveries = (deliveries || []).map((delivery) => ({
          ...delivery,
          // These retired fields no longer have a canonical source. Keep them explicit
          // rather than querying columns that do not exist or fabricating values.
          production_start_date: null,
          shipping_carrier: null,
          progress_photos: null,
        }));

        return {
          ...sub,
          deliveries: normalizedDeliveries,
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
    return new Response(
      JSON.stringify({ error: status >= 500 ? "Internal server error" : msg }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
