/// <reference lib="deno.window" />
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import {
  callServiceRoleFunction,
  getClaims,
  getServiceClient,
} from "../_shared/supabase.ts";
import { nowInBahia, isBeforeCutoff } from "../_shared/timezone.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rate-limit.ts";
import {
  checkContentLength,
  PAYLOAD_LIMITS,
} from "../_shared/payload-guard.ts";
import { validateOrReject, type Schema } from "../_shared/validation.ts";
import { escapeHtml, sanitizeEmailSubject } from "../_shared/email.ts";

const PAUSE_SCHEMA: Schema = {
  subscriptionId: { type: "uuid", required: true },
};

function getSupportEmail(): string {
  const email = Deno.env.get("SUPPORT_EMAIL") || Deno.env.get("EMAIL_FROM");
  if (!email) {
    throw new Error("SUPPORT_EMAIL or EMAIL_FROM must be configured");
  }
  return email;
}

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

interface PauseRpcResult {
  pauseCount?: number;
  pausesRemaining?: number;
  deliverySchedule?: PauseSubscriptionResponse["delivery_schedule"];
}

function toPauseRpcResult(value: unknown): PauseRpcResult {
  return value && typeof value === "object" ? (value as PauseRpcResult) : {};
}

function pauseErrorToStatus(message: string): number {
  if (message === "SUBSCRIPTION_NOT_FOUND") return 404;
  if (message === "FORBIDDEN") return 403;
  if (
    message === "CUTOFF_PASSED" ||
    message === "SUBSCRIPTION_NOT_ACTIVE" ||
    message === "PAUSE_LIMIT_EXCEEDED" ||
    message === "NO_UPCOMING_DELIVERY"
  ) {
    return 400;
  }
  return 500;
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
    const rateLimited = await checkRateLimit(
      req,
      "pause-subscription",
      RATE_LIMITS.STANDARD,
      userId,
    );
    if (rateLimited) return rateLimited;

    // Payload size guard
    const tooLarge = checkContentLength(req, PAYLOAD_LIMITS.MINIMAL);
    if (tooLarge) return tooLarge;

    const service = getServiceClient();
    const rawBody = await req.json().catch(() => ({}));
    const validation = validateOrReject(rawBody, PAUSE_SCHEMA);
    if ("error" in validation) return validation.error;

    const { subscriptionId } = validation.data as { subscriptionId: string };

    // Requirement 23.1: Validate current time is before cutoff before invoking the transaction.
    const currentTime = nowInBahia();
    if (!isBeforeCutoff(currentTime)) {
      return new Response(
        JSON.stringify({
          error: "CUTOFF_PASSED",
          message:
            "Nao e possivel pausar apos o prazo limite (dia 15 as 23:59:59)",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: pauseData, error: pauseError } = await service.rpc(
      "pause_subscription_atomic",
      {
        p_subscription_id: subscriptionId,
        p_user_id: userId,
        p_now: currentTime.toISOString(),
      },
    );

    if (pauseError) {
      const status = pauseErrorToStatus(pauseError.message);
      return new Response(
        JSON.stringify({
          error: pauseError.message,
          message: pauseError.message,
        }),
        {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const pauseResult = toPauseRpcResult(pauseData);
    const pauseCount =
      typeof pauseResult.pauseCount === "number" ? pauseResult.pauseCount : 0;
    const pausesRemaining =
      typeof pauseResult.pausesRemaining === "number"
        ? pauseResult.pausesRemaining
        : Math.max(2 - pauseCount, 0);
    const updatedDeliveries = Array.isArray(pauseResult.deliverySchedule)
      ? pauseResult.deliverySchedule
      : [];
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
          pauseCount,
          updatedDeliveries || [],
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
        pause_count: pauseCount,
        pauses_remaining: pausesRemaining,
      },
      delivery_schedule: updatedDeliveries || [],
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("Error pausing subscription:", msg);
    const status =
      msg === "Unauthorized" ? 401 : msg.startsWith("Forbidden") ? 403 : 500;
    return new Response(
      JSON.stringify({ error: status >= 500 ? "Internal server error" : msg }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
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
  }>,
): Promise<void> {
  const pausesRemaining = 2 - pauseCount;
  const supportEmail = getSupportEmail();
  const safeUserName = escapeHtml(userName);
  const safeSupportEmail = escapeHtml(supportEmail);
  const supportMailto = `mailto:${encodeURIComponent(supportEmail)}`;

  // Format delivery schedule for email
  const deliveryScheduleHtml = deliveries
    .map((delivery) => {
      const date = delivery.expected_delivery_date
        ? new Date(delivery.expected_delivery_date).toLocaleDateString(
            "pt-BR",
            {
              month: "long",
              year: "numeric",
            },
          )
        : "A definir";
      return `<li>Entrega ${delivery.delivery_number}: ${escapeHtml(date)}</li>`;
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
    <p>Olá, <strong>${safeUserName}</strong>!</p>
    <p>Sua solicitação de pausa foi processada com sucesso.</p>
  </div>

  <div style="background-color: #fff; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">📋 Detalhes da Pausa</h2>
    <p><strong>Pausas utilizadas:</strong> ${pauseCount} de 2</p>
    <p><strong>Pausas restantes:</strong> ${pausesRemaining}</p>
    <p style="color: #666; font-size: 14px; margin-top: 10px;">
      ${
        pausesRemaining > 0
          ? `Você ainda pode pausar sua assinatura ${pausesRemaining} ${pausesRemaining === 1 ? "vez" : "vezes"}.`
          : "Você atingiu o limite de pausas para esta assinatura."
      }
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
      <a href="${supportMailto}" style="color: #3498db;">
        ${safeSupportEmail}
      </a>
    </p>
    <p style="color: #999; font-size: 12px; margin-top: 20px;">
      © ${new Date().getFullYear()} ORDAX. Todos os direitos reservados.
    </p>
  </div>
</body>
</html>
  `;

  const emailPayload = {
    to: email,
    subject: sanitizeEmailSubject("Sua assinatura ORDAX foi pausada"),
    html,
    emailType: "pause_confirmation",
    metadata: {
      pause_count: pauseCount,
      pauses_remaining: pausesRemaining,
    },
  };

  const response = await callServiceRoleFunction("send-email", emailPayload);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send email: ${response.status} - ${errorText}`);
  }
}
