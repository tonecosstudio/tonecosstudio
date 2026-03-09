import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { getClaims, getServiceClient } from "../_shared/supabase.ts";
import { nowInBahia, toUTC } from "../_shared/timezone.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rate-limit.ts";
import { checkContentLength, PAYLOAD_LIMITS } from "../_shared/payload-guard.ts";
import { validateOrReject, type Schema } from "../_shared/validation.ts";

const CANCEL_SCHEMA: Schema = {
  subscriptionId: { type: "uuid", required: true },
  reason:         { type: "string", maxLength: 500, sanitize: true },
};

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

    // Rate limit: standard operations
    const rateLimited = await checkRateLimit(req, "cancel-subscription", RATE_LIMITS.STANDARD, userId);
    if (rateLimited) return rateLimited;

    // Payload size guard
    const tooLarge = checkContentLength(req, PAYLOAD_LIMITS.MINIMAL);
    if (tooLarge) return tooLarge;

    const service = getServiceClient();
    const rawBody = await req.json().catch(() => ({}));
    const validation = validateOrReject(rawBody, CANCEL_SCHEMA);
    if ("error" in validation) return validation.error;

    const { subscriptionId, reason } = validation.data as { subscriptionId: string; reason?: string };

    // Busca assinatura
    const { data: subscription, error: subscriptionError } = await service
      .from("subscriptions")
      .select("id, user_id, status, deliveries_completed")
      .eq("id", subscriptionId)
      .maybeSingle();

    if (subscriptionError) throw subscriptionError;

    if (!subscription) {
      return new Response(JSON.stringify({ error: "Assinatura não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifica se é o dono da assinatura
    if (subscription.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Você não tem permissão para cancelar esta assinatura" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verifica se já está cancelada
    if (subscription.status === "cancelled") {
      return new Response(
        JSON.stringify({ error: "Assinatura já está cancelada" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Cancela assinatura
    const { error: updateError } = await service
      .from("subscriptions")
      .update({
        status: "cancelled",
        cancelled_at: toUTC(nowInBahia()).toISOString(),
        notes: reason ? `Motivo do cancelamento: ${reason}` : null,
      })
      .eq("id", subscriptionId);

    if (updateError) throw updateError;

    // Cancela entregas futuras (que ainda não foram reveladas)
    const { error: deliveriesError } = await service
      .from("subscription_deliveries")
      .update({ status: "cancelled" })
      .eq("subscription_id", subscriptionId)
      .eq("status", "scheduled");

    if (deliveriesError) {
      console.error("Error cancelling deliveries:", deliveriesError);
      // Não falha a operação se não conseguir cancelar entregas
    }

    // Release capacity for future deliveries (before cutoff only)
    // Get all future deliveries that haven't started production
    const { data: futureDeliveries, error: futureDeliveriesError } = await service
      .from("subscription_deliveries")
      .select("id, cycle_id, status")
      .eq("subscription_id", subscriptionId)
      .in("status", ["scheduled", "pending_choice"]);

    if (futureDeliveriesError) {
      console.error("Error fetching future deliveries:", futureDeliveriesError);
    } else if (futureDeliveries && futureDeliveries.length > 0) {
      // Check if before cutoff
      const { data: beforeCutoff, error: cutoffError } = await service
        .rpc("is_before_cutoff");

      if (cutoffError) {
        console.error("Error checking cutoff:", cutoffError);
      } else if (beforeCutoff) {
        // Release capacity for each delivery that has a cycle_id
        for (const delivery of futureDeliveries) {
          if (delivery.cycle_id) {
            try {
              const { error: releaseError } = await service
                .rpc("release_capacity", {
                  p_cycle_id: delivery.cycle_id,
                  p_quantity: 1,
                });

              if (releaseError) {
                console.error(
                  `Error releasing capacity for delivery ${delivery.id}:`,
                  releaseError,
                );
              } else {
                console.log(
                  `Released capacity for delivery ${delivery.id} in cycle ${delivery.cycle_id}`,
                );
              }
            } catch (error) {
              console.error(
                `Exception releasing capacity for delivery ${delivery.id}:`,
                error,
              );
            }
          }
        }
      } else {
        console.log(
          "Cutoff has passed - capacity not released for cancelled deliveries",
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Assinatura cancelada com sucesso",
        deliveries_completed: subscription.deliveries_completed,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("Error cancelling subscription:", msg);
    const status = msg === "Unauthorized" ? 401 : msg.startsWith("Forbidden") ? 403 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
