# get-my-subscriptions — deploy scope and rollback

Snapshot prepared on 2026-09-17 for Supabase project `pdytjhtjlxvbbeuxgnms`.

## Scope

The live function is `ACTIVE`, version `5`, with `verify_jwt=true`.

The next deployment is intentionally restricted to `get-my-subscriptions` and fixes only the delivery read contract. It must:

- preserve `verify_jwt=true`;
- preserve the live shared `cors.ts`, `supabase.ts`, `security-logger.ts` and `rate-limit.ts` bundle;
- replace only the function entrypoint with the Git version;
- read existing `subscription_deliveries` columns (`delivery_number`, `delivery_order`, `reveal_date`, `expected_delivery_date`, `actual_delivery_date`, `shipping_date`, `delivered_date`, `tracking_code`);
- use the explicit `subscription_deliveries_collection_character_id_fkey` relationship;
- keep retired response keys `production_start_date`, `shipping_carrier` and `progress_photos` as explicit `null` compatibility values instead of querying nonexistent columns.

No database migration is part of this Edge Function deployment.

## Verification after deploy

1. `get_edge_function` must report a new active version and `verify_jwt=true`.
2. The deployed entrypoint must match `supabase/functions/get-my-subscriptions/index.ts` in Git.
3. An unauthenticated request must continue to be rejected by the platform JWT boundary.
4. Authenticated smoke must confirm that a signed-in user can read only their own subscriptions/deliveries through the RLS-scoped client.
5. If any regression is found, redeploy the version-5 entrypoint below with the same captured shared dependency bundle.

## Exact version-5 entrypoint for rollback

```ts
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

    // Rate limit: standard read operations
    const rateLimited = await checkRateLimit(req, "get-my-subscriptions", RATE_LIMITS.STANDARD, userId);
    if (rateLimited) return rateLimited;

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
```
