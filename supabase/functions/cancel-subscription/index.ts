import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { getClaims, getServiceClient } from "../_shared/supabase.ts";

interface CancelSubscriptionRequest {
  subscriptionId: string;
  reason?: string;
}

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { userId } = await getClaims(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = getServiceClient();
    const body = (await req.json().catch(() => ({}))) as CancelSubscriptionRequest;

    const { subscriptionId, reason } = body;

    if (!subscriptionId) {
      return new Response(
        JSON.stringify({ error: "subscriptionId é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

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
        cancelled_at: new Date().toISOString(),
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
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
