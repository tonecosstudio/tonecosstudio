import {
  logCronError,
  logCronStart,
  logCronSuccess,
} from "../_shared/cron-logger.ts";
import { requireRateLimitedSharedSecret } from "../_shared/secret-rate-limit.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import {
  EmailService,
  escapeHtml,
  getEmailConfig,
  sanitizeEmailSubject,
} from "../_shared/email.ts";
import { getPublicBaseUrl } from "../_shared/public-url.ts";

const BAHIA_TIMEZONE = "America/Bahia";

interface ExpiredChoiceRequest {
  id: string;
  user_id: string;
  order_id: string;
  order_type: "subscription_delivery" | "standalone_purchase";
  collection_id: string;
  choice_deadline: string;
  internal_flags: string[] | null;
}

function requiredAdminEmail(): string {
  const email = Deno.env.get("ADMIN_EMAIL")?.trim();
  if (!email) throw new Error("ADMIN_EMAIL is not configured");
  return email;
}

function daysExpired(deadline: string, now: Date): number {
  const deadlineDate = new Date(deadline);
  if (Number.isNaN(deadlineDate.getTime())) {
    throw new Error("Persisted choice deadline is invalid");
  }

  return Math.max(
    0,
    Math.floor((now.getTime() - deadlineDate.getTime()) / (24 * 60 * 60 * 1000)),
  );
}

async function sendAdminExpirationNotification(params: {
  customerName: string | null;
  customerEmail: string;
  collectionName: string;
  request: ExpiredChoiceRequest;
  daysExpired: number;
}): Promise<void> {
  const baseUrl = getPublicBaseUrl(["FRONTEND_URL", "BASE_URL", "SITE_URL"]);
  const emailService = new EmailService(getEmailConfig({ baseUrl }));
  const deadline = new Date(params.request.choice_deadline).toLocaleString("pt-BR", {
    timeZone: BAHIA_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const subject = sanitizeEmailSubject(
    `Escolha de personagem expirada - ${params.collectionName}`,
  );
  const adminUrl = `${baseUrl}/admin/character-choices`;

  const html = `
<!doctype html>
<html lang="pt-BR">
  <body style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
    <h1>Escolha de personagem expirada</h1>
    <p>Um pedido ultrapassou o prazo configurado sem uma escolha válida.</p>
    <p><strong>Cliente:</strong> ${escapeHtml(params.customerName || "Não informado")}</p>
    <p><strong>E-mail:</strong> ${escapeHtml(params.customerEmail)}</p>
    <p><strong>Coleção:</strong> ${escapeHtml(params.collectionName)}</p>
    <p><strong>Pedido:</strong> ${escapeHtml(params.request.order_id)}</p>
    <p><strong>Prazo persistido:</strong> ${escapeHtml(deadline)}</p>
    <p><strong>Dias após o prazo:</strong> ${params.daysExpired}</p>
    <p>A atribuição manual deve ser feita somente após revisar o pedido e a disponibilidade real.</p>
    <p><a href="${adminUrl}">Abrir gerenciamento de escolhas</a></p>
  </body>
</html>`.trim();

  await emailService.sendEmail({
    to: requiredAdminEmail(),
    subject,
    html,
  });
}

Deno.serve(async (req) => {
  let logId: string | null = null;

  try {
    const forbidden = await requireRateLimitedSharedSecret(
      req,
      "CRON_SECRET",
      "x-cron-secret",
      "cron-expire-character-choices",
    );
    if (forbidden) return forbidden;

    logId = await logCronStart("cron-expire-character-choices");

    const supabase = getServiceClient();
    const now = new Date();
    const { data, error } = await supabase
      .from("production_queue")
      .select(
        "id, user_id, order_id, order_type, collection_id, choice_deadline, internal_flags",
      )
      .eq("current_stage", "awaiting_choice")
      .eq("choice_status", "pending")
      .lt("choice_deadline", now.toISOString());

    if (error) {
      throw new Error(`Failed to fetch expired choice requests: ${error.message}`);
    }

    let totalExpired = 0;
    const errors: Array<{ queueId: string; error: string }> = [];
    const expiredDetails: Array<{
      queueId: string;
      orderId: string;
      customerEmail: string | null;
      collectionName: string | null;
      daysExpired: number;
    }> = [];

    for (const request of (data || []) as ExpiredChoiceRequest[]) {
      try {
        if (
          !request.id ||
          !request.user_id ||
          !request.order_id ||
          !request.collection_id ||
          !request.choice_deadline ||
          !["subscription_delivery", "standalone_purchase"].includes(request.order_type)
        ) {
          throw new Error("Expired choice request is incomplete");
        }

        const elapsedDays = daysExpired(request.choice_deadline, now);
        const flags = [...new Set([...(request.internal_flags || []), "choice_expired"])];

        const { error: expireError } = await supabase
          .from("production_queue")
          .update({
            choice_status: "expired",
            internal_flags: flags,
            updated_at: now.toISOString(),
          })
          .eq("id", request.id)
          .eq("choice_status", "pending");

        if (expireError) {
          throw new Error(`Failed to expire choice request: ${expireError.message}`);
        }

        // Keep any legacy/pre-created pending character_choices row consistent,
        // but the production queue is the canonical pre-choice authority.
        const { error: legacyChoiceError } = await supabase
          .from("character_choices")
          .update({ status: "expired", updated_at: now.toISOString() })
          .eq("order_id", request.order_id)
          .eq("user_id", request.user_id)
          .eq("status", "pending");

        if (legacyChoiceError) {
          console.warn(
            `Failed to synchronize legacy pending choice for queue ${request.id}`,
            legacyChoiceError,
          );
        }

        let customerEmail: string | null = null;
        let collectionName: string | null = null;

        try {
          const [{ data: profile, error: profileError }, { data: collection, error: collectionError }] =
            await Promise.all([
              supabase
                .from("profiles")
                .select("email, full_name")
                .eq("id", request.user_id)
                .single(),
              supabase
                .from("collections")
                .select("name")
                .eq("id", request.collection_id)
                .single(),
            ]);

          if (profileError || !profile?.email) {
            throw new Error(`Customer profile/email unavailable: ${profileError?.message || "not found"}`);
          }
          if (collectionError || !collection?.name) {
            throw new Error(`Collection unavailable: ${collectionError?.message || "not found"}`);
          }

          customerEmail = profile.email;
          collectionName = collection.name;
          await sendAdminExpirationNotification({
            customerName: profile.full_name,
            customerEmail: profile.email,
            collectionName: collection.name,
            request,
            daysExpired: elapsedDays,
          });
        } catch (notificationError) {
          errors.push({
            queueId: request.id,
            error: `Choice expired, but admin notification failed: ${
              notificationError instanceof Error
                ? notificationError.message
                : String(notificationError)
            }`,
          });
        }

        totalExpired += 1;
        expiredDetails.push({
          queueId: request.id,
          orderId: request.order_id,
          customerEmail,
          collectionName,
          daysExpired: elapsedDays,
        });
      } catch (requestError) {
        errors.push({
          queueId: request.id || "unknown",
          error: requestError instanceof Error ? requestError.message : String(requestError),
        });
      }
    }

    await logCronSuccess(logId, {
      totalExpired,
      expiredDetails,
      errors: errors.length > 0 ? errors : undefined,
      executedAt: now.toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        totalExpired,
        expiredDetails,
        errors: errors.length > 0 ? errors : undefined,
        executedAt: now.toISOString(),
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    if (logId) {
      try {
        await logCronError(
          logId,
          error instanceof Error ? error : new Error(String(error)),
        );
      } catch (logError) {
        console.error("Failed to log cron error", logError);
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
