/// <reference lib="deno.window" />
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { getClaims, getServiceClient } from "../_shared/supabase.ts";
import { nowInBahia, isBeforeCutoff } from "../_shared/timezone.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rate-limit.ts";
import { checkContentLength, PAYLOAD_LIMITS } from "../_shared/payload-guard.ts";
import { validateOrReject, type Schema } from "../_shared/validation.ts";

const PAUSE_SCHEMA: Schema = {
  subscriptionId: { type: "uuid", required: true },
};

interface PauseSubscriptionResponse {
  success: boolean;
  message: string;
  subscription: {
    id: string;
    pause_count: number;
    pauses_remaining: number;
  };
  delivery_schedule: Array<{
    id: string;
    delivery_number: number;
    expected_delivery_date: string | null;
    status: string;
  }>;
}

serve(async (req: Request) => {
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

    // Rate limit: standard operations
    const rateLimited = await checkRateLimit(req, "pause-subscription", RATE_LIMITS.STANDARD, userId);
    if (rateLimited) return rateLimited;

    // Payload size guard
    const tooLarge = checkContentLength(req, PAYLOAD_LIMITS.MINIMAL);
    if (tooLarge) return tooLarge;

    const service = getServiceClient();
    const rawBody = await req.json().catch(() => ({}));
    const validation = validateOrReject(rawBody, PAUSE_SCHEMA);
    if ("error" in validation) return validation.error;

    const { subscriptionId } = validation.data as { subscriptionId: string };

    // Fetch subscription details
    const { data: subscription, error: subscriptionError } = await service
      .from("subscriptions")
      .select("id, user_id, status, pause_count")
      .eq("id", subscriptionId)
      .maybeSingle();

    if (subscriptionError) throw subscriptionError;

    if (!subscription) {
      return new Response(JSON.stringify({ error: "Assinatura não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user owns the subscription
    if (subscription.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Você não tem permissão para pausar esta assinatura" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verify subscription is active
    if (subscription.status !== "active") {
      return new Response(
        JSON.stringify({ error: "Apenas assinaturas ativas podem ser pausadas" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Requirement 23.1: Validate current time is before cutoff
    const currentTime = nowInBahia();
    if (!isBeforeCutoff(currentTime)) {
      return new Response(
        JSON.stringify({
          error: "CUTOFF_PASSED",
          message: "Não é possível pausar após o prazo limite (dia 15 às 23:59:59)",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Requirement 23.6: Verify pause_count < 2
    const pauseCount = subscription.pause_count ?? 0;
    if (pauseCount >= 2) {
      return new Response(
        JSON.stringify({
          error: "PAUSE_LIMIT_EXCEEDED",
          message: "Máximo de 2 pausas permitidas por assinatura",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get next delivery (first delivery with status 'scheduled' or 'pending_choice')
    const { data: nextDelivery, error: deliveryError } = await service
      .from("subscription_deliveries")
      .select("id, delivery_number, cycle_id, status")
      .eq("subscription_id", subscriptionId)
      .in("status", ["scheduled", "pending_choice"])
      .order("delivery_number", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (deliveryError) throw deliveryError;

    if (!nextDelivery) {
      return new Response(
        JSON.stringify({
          error: "NO_UPCOMING_DELIVERY",
          message: "Nenhuma entrega futura encontrada para pausar",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Requirement 23.4: Release capacity for paused delivery
    // CRITICAL: Must succeed before proceeding with pause
    if (nextDelivery.cycle_id) {
      const { error: releaseError } = await service
        .rpc("release_capacity", {
          p_cycle_id: nextDelivery.cycle_id,
          p_quantity: 1,
        });

      if (releaseError) {
        console.error(`Failed to release capacity for paused delivery:`, releaseError);
        return new Response(
          JSON.stringify({
            error: "CAPACITY_RELEASE_FAILED",
            message: "Falha ao liberar capacidade. Por favor, tente novamente ou contate o suporte.",
            details: releaseError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      
      console.log(`Released capacity for delivery ${nextDelivery.id} in cycle ${nextDelivery.cycle_id}`);
    }

    // Requirement 23.3: Shift all subsequent deliveries by one month
    const { data: subsequentDeliveries, error: subsequentError } = await service
      .from("subscription_deliveries")
      .select("id, expected_delivery_date, cycle_id")
      .eq("subscription_id", subscriptionId)
      .gt("delivery_number", nextDelivery.delivery_number)
      .order("delivery_number", { ascending: true });

    if (subsequentError) throw subsequentError;

    // Shift each subsequent delivery by one month
    if (subsequentDeliveries && subsequentDeliveries.length > 0) {
      for (const delivery of subsequentDeliveries) {
        if (delivery.expected_delivery_date) {
          const currentDate = new Date(delivery.expected_delivery_date);
          // Add one month
          const newDate = new Date(currentDate);
          newDate.setMonth(newDate.getMonth() + 1);

          const { error: shiftError } = await service
            .from("subscription_deliveries")
            .update({
              expected_delivery_date: newDate.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", delivery.id);

          if (shiftError) {
            console.error(`Failed to shift delivery ${delivery.id}:`, shiftError);
            // Continue with other deliveries
          } else {
            console.log(`Shifted delivery ${delivery.id} by one month`);
          }
        }
      }
    }

    // Requirement 23.2: Mark next delivery as paused (delete it)
    const { error: deleteDeliveryError } = await service
      .from("subscription_deliveries")
      .delete()
      .eq("id", nextDelivery.id);

    if (deleteDeliveryError) throw deleteDeliveryError;

    console.log(`Deleted paused delivery ${nextDelivery.id}`);

    // Requirement 23.6: Increment pause_count
    const { error: incrementError } = await service
      .from("subscriptions")
      .update({
        pause_count: pauseCount + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriptionId);

    if (incrementError) throw incrementError;

    console.log(`Incremented pause count for subscription ${subscriptionId} to ${pauseCount + 1}`);

    // Fetch updated delivery schedule
    const { data: updatedDeliveries, error: updatedDeliveriesError } = await service
      .from("subscription_deliveries")
      .select("id, delivery_number, expected_delivery_date, status")
      .eq("subscription_id", subscriptionId)
      .order("delivery_number", { ascending: true });

    if (updatedDeliveriesError) throw updatedDeliveriesError;

    // Fetch user email for confirmation email
    const { data: user, error: userError } = await service
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      console.error("Failed to fetch user for email:", userError);
    }

    // Requirement 23.5: Send confirmation email
    if (user && user.email) {
      try {
        await sendPauseConfirmationEmail(
          user.email,
          user.full_name || "Cliente",
          pauseCount + 1,
          updatedDeliveries || []
        );
        console.log(`Pause confirmation email sent to ${user.email}`);
      } catch (emailError) {
        console.error("Failed to send pause confirmation email:", emailError);
        // Don't fail the operation if email fails
      }
    }

    const response: PauseSubscriptionResponse = {
      success: true,
      message: "Assinatura pausada com sucesso",
      subscription: {
        id: subscriptionId,
        pause_count: pauseCount + 1,
        pauses_remaining: 2 - (pauseCount + 1),
      },
      delivery_schedule: updatedDeliveries || [],
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("Error pausing subscription:", msg);
    const status = msg === "Unauthorized" ? 401 : msg.startsWith("Forbidden") ? 403 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Send pause confirmation email to subscriber
 * Requirement 23.5: Send confirmation email with updated delivery schedule
 */
async function sendPauseConfirmationEmail(
  email: string,
  userName: string,
  pauseCount: number,
  deliveries: Array<{
    delivery_number: number;
    expected_delivery_date: string | null;
  }>
): Promise<void> {
  const pausesRemaining = 2 - pauseCount;

  // Format delivery schedule for email
  const deliveryScheduleHtml = deliveries
    .map((delivery) => {
      const date = delivery.expected_delivery_date
        ? new Date(delivery.expected_delivery_date).toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          })
        : "A definir";
      return `<li>Entrega ${delivery.delivery_number}: ${date}</li>`;
    })
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assinatura Pausada - ORDAX</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #2c3e50; margin-top: 0;">✅ Assinatura Pausada</h1>
    <p>Olá, <strong>${userName}</strong>!</p>
    <p>Sua solicitação de pausa foi processada com sucesso.</p>
  </div>

  <div style="background-color: #fff; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">📋 Detalhes da Pausa</h2>
    <p><strong>Pausas utilizadas:</strong> ${pauseCount} de 2</p>
    <p><strong>Pausas restantes:</strong> ${pausesRemaining}</p>
    <p style="color: #666; font-size: 14px; margin-top: 10px;">
      ${pausesRemaining > 0 
        ? `Você ainda pode pausar sua assinatura ${pausesRemaining} ${pausesRemaining === 1 ? 'vez' : 'vezes'}.`
        : 'Você atingiu o limite de pausas para esta assinatura.'}
    </p>
  </div>

  <div style="background-color: #fff; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">📅 Cronograma Atualizado</h2>
    <p>Suas próximas entregas foram reagendadas:</p>
    <ul style="list-style-type: none; padding-left: 0;">
      ${deliveryScheduleHtml}
    </ul>
  </div>

  <div style="background-color: #e8f4f8; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <p style="margin: 0; font-size: 14px;">
      <strong>💡 Importante:</strong> Todas as suas entregas foram deslocadas em um mês. 
      Você não receberá uma entrega no próximo mês, mas continuará recebendo suas peças nos meses seguintes.
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
    <p style="color: #666; font-size: 14px;">
      Dúvidas? Entre em contato conosco em 
      <a href="mailto:${Deno.env.get("SUPPORT_EMAIL") || "suporte@ordax.com.br"}" style="color: #3498db;">
        ${Deno.env.get("SUPPORT_EMAIL") || "suporte@ordax.com.br"}
      </a>
    </p>
    <p style="color: #999; font-size: 12px; margin-top: 20px;">
      © ${new Date().getFullYear()} ORDAX. Todos os direitos reservados.
    </p>
  </div>
</body>
</html>
  `;

  // Call the send-email edge function
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase configuration for email sending");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      to: email,
      subject: "✅ Sua assinatura ORDAX foi pausada",
      html,
      emailType: "pause_confirmation",
      metadata: {
        pause_count: pauseCount,
        pauses_remaining: pausesRemaining,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send email: ${response.status} - ${errorText}`);
  }
}
