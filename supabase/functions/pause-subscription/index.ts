/// <reference lib="deno.window" />
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import {
  callServiceRoleFunction,
  getClaims,
  getServiceClient,
} from "../_shared/supabase.ts";
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

interface DeliveryScheduleItem {
  id?: string;
  delivery_number: number;
  expected_delivery_date: string | null;
  status?: string;
}

interface PauseRpcResult {
  pauseCount?: number;
  pausesRemaining?: number;
  deliverySchedule?: DeliveryScheduleItem[];
}

function getSupportEmail(): string {
  const email = Deno.env.get("SUPPORT_EMAIL") || Deno.env.get("EMAIL_FROM");
  if (!email) {
    throw new Error("SUPPORT_EMAIL or EMAIL_FROM must be configured");
  }
  return email;
}

function asPauseResult(value: unknown): PauseRpcResult {
  return value && typeof value === "object" ? (value as PauseRpcResult) : {};
}

function pauseErrorToStatus(message: string): number {
  if (message.includes("SUBSCRIPTION_NOT_FOUND")) return 404;
  if (message.includes("FORBIDDEN")) return 403;
  if (
    message.includes("CUTOFF_PASSED") ||
    message.includes("SUBSCRIPTION_NOT_ACTIVE") ||
    message.includes("PAUSE_LIMIT_EXCEEDED") ||
    message.includes("NO_UPCOMING_DELIVERY")
  ) {
    return 400;
  }
  return 500;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { claims } = await getClaims(req);
    const userId = String(claims.sub || "");
    if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

    const rateLimited = await checkRateLimit(
      req,
      "pause-subscription",
      RATE_LIMITS.STANDARD,
      userId,
    );
    if (rateLimited) return rateLimited;

    const tooLarge = checkContentLength(req, PAYLOAD_LIMITS.MINIMAL);
    if (tooLarge) return tooLarge;

    const rawBody = await req.json().catch(() => ({}));
    const validation = validateOrReject(rawBody, PAUSE_SCHEMA);
    if ("error" in validation) return validation.error;

    const { subscriptionId } = validation.data as { subscriptionId: string };
    const service = getServiceClient();
    const currentInstant = new Date().toISOString();

    // The database RPC is the single authority for ownership, status, pause limit,
    // cutoff evaluation, capacity release and schedule mutation.
    const { data: pauseData, error: pauseError } = await service.rpc(
      "pause_subscription_atomic",
      {
        p_subscription_id: subscriptionId,
        p_user_id: userId,
        p_now: currentInstant,
      },
    );

    if (pauseError) {
      const status = pauseErrorToStatus(pauseError.message || "PAUSE_FAILED");
      return jsonResponse(
        {
          error: status >= 500 ? "Internal server error" : pauseError.message,
          message: status >= 500 ? "Não foi possível pausar a assinatura." : pauseError.message,
        },
        status,
      );
    }

    const pauseResult = asPauseResult(pauseData);
    const pauseCount = Number(pauseResult.pauseCount);
    const pausesRemaining = Number(pauseResult.pausesRemaining);

    if (
      !Number.isInteger(pauseCount) ||
      pauseCount < 0 ||
      !Number.isInteger(pausesRemaining) ||
      pausesRemaining < 0 ||
      !Array.isArray(pauseResult.deliverySchedule)
    ) {
      throw new Error("Invalid pause transaction response");
    }

    const deliverySchedule = pauseResult.deliverySchedule;
    const { data: user, error: userError } = await service
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      console.error("Failed to fetch user for pause confirmation", userError);
    } else if (user?.email) {
      try {
        await sendPauseConfirmationEmail({
          email: user.email,
          userName: user.full_name || "Cliente",
          pauseCount,
          pausesRemaining,
          deliveries: deliverySchedule,
        });
      } catch (emailError) {
        console.error("Failed to send pause confirmation email", emailError);
      }
    }

    return jsonResponse({
      success: true,
      message: "Assinatura pausada com sucesso",
      subscription: {
        id: subscriptionId,
        pause_count: pauseCount,
        pauses_remaining: pausesRemaining,
      },
      delivery_schedule: deliverySchedule,
    });
  } catch (error) {
    console.error("Error pausing subscription", error);
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse(
      { error: "Internal server error", details: message },
      500,
    );
  }
});

async function sendPauseConfirmationEmail(params: {
  email: string;
  userName: string;
  pauseCount: number;
  pausesRemaining: number;
  deliveries: DeliveryScheduleItem[];
}): Promise<void> {
  const supportEmail = getSupportEmail();
  const safeUserName = escapeHtml(params.userName);
  const safeSupportEmail = escapeHtml(supportEmail);
  const supportMailto = `mailto:${encodeURIComponent(supportEmail)}`;
  const deliveryScheduleHtml = params.deliveries.length > 0
    ? params.deliveries
        .map((delivery) => {
          const date = delivery.expected_delivery_date
            ? new Date(delivery.expected_delivery_date).toLocaleDateString("pt-BR", {
                timeZone: "America/Bahia",
                month: "long",
                year: "numeric",
              })
            : "A definir";
          return `<li>Entrega ${delivery.delivery_number}: ${escapeHtml(date)}</li>`;
        })
        .join("")
    : "<li>Nenhuma entrega futura está agendada no momento.</li>";

  const html = `
<!doctype html>
<html lang="pt-BR">
  <body style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
    <h1>Assinatura pausada</h1>
    <p>Olá, <strong>${safeUserName}</strong>.</p>
    <p>Sua solicitação foi processada com sucesso.</p>
    <p><strong>Pausas utilizadas:</strong> ${params.pauseCount}</p>
    <p><strong>Pausas restantes:</strong> ${params.pausesRemaining}</p>
    <h2>Cronograma atual</h2>
    <ul>${deliveryScheduleHtml}</ul>
    <p>
      Em caso de dúvida, escreva para
      <a href="${supportMailto}">${safeSupportEmail}</a>.
    </p>
    <p style="font-size:12px;color:#6b7280">
      O cronograma acima é o estado retornado pela transação que processou a pausa.
    </p>
  </body>
</html>`.trim();

  const response = await callServiceRoleFunction("send-email", {
    to: params.email,
    subject: sanitizeEmailSubject("Sua assinatura ORDAX foi pausada"),
    html,
    emailType: "pause_confirmation",
    metadata: {
      pause_count: params.pauseCount,
      pauses_remaining: params.pausesRemaining,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send email: ${response.status} - ${errorText}`);
  }
}
