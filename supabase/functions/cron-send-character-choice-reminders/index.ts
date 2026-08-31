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
const REMINDER_OFFSETS = [5, 2, 1] as const;
type ReminderOffset = (typeof REMINDER_OFFSETS)[number];

interface PendingChoiceRequest {
  id: string;
  user_id: string;
  order_id: string;
  order_type: "subscription_delivery" | "standalone_purchase";
  collection_id: string;
  choice_deadline: string;
  choice_reminders_sent: number;
  choice_last_reminder_at: string | null;
}

function bahiaDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BAHIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return { year: get("year"), month: get("month"), day: get("day") };
}

function bahiaDayKey(date: Date): string {
  const { year, month, day } = bahiaDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function targetBahiaRange(now: Date, daysAhead: ReminderOffset) {
  const current = bahiaDateParts(now);
  const target = new Date(Date.UTC(current.year, current.month - 1, current.day + daysAhead));
  const year = target.getUTCFullYear();
  const month = String(target.getUTCMonth() + 1).padStart(2, "0");
  const day = String(target.getUTCDate()).padStart(2, "0");
  const date = `${year}-${month}-${day}`;

  return {
    start: `${date}T00:00:00-03:00`,
    end: `${date}T23:59:59.999-03:00`,
  };
}

function reminderLabel(daysRemaining: ReminderOffset): string {
  if (daysRemaining === 1) return "Último dia para escolher";
  if (daysRemaining === 2) return "Prazo de escolha se aproximando";
  return "Escolha seu personagem";
}

function buildChoiceUrl(baseUrl: string, request: PendingChoiceRequest): string {
  const path = request.order_type === "subscription_delivery" ? "assinatura" : "compra-avulsa";
  return `${baseUrl}/${path}/${encodeURIComponent(request.order_id)}`;
}

async function sendReminder(params: {
  to: string;
  userName: string | null;
  collectionName: string;
  request: PendingChoiceRequest;
  daysRemaining: ReminderOffset;
}): Promise<void> {
  const baseUrl = getPublicBaseUrl(["FRONTEND_URL", "BASE_URL", "SITE_URL"]);
  const emailService = new EmailService(getEmailConfig({ baseUrl }));
  const userName = escapeHtml(params.userName || "Colecionador");
  const collectionName = escapeHtml(params.collectionName);
  const deadline = new Date(params.request.choice_deadline).toLocaleString("pt-BR", {
    timeZone: BAHIA_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const choiceUrl = buildChoiceUrl(baseUrl, params.request);
  const subject = sanitizeEmailSubject(
    `${reminderLabel(params.daysRemaining)} - ${params.collectionName}`,
  );

  const html = `
<!doctype html>
<html lang="pt-BR">
  <body style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
    <h1>${escapeHtml(reminderLabel(params.daysRemaining))}</h1>
    <p>Olá, ${userName}.</p>
    <p>
      Sua escolha da coleção <strong>${collectionName}</strong> ainda está pendente.
      ${params.daysRemaining === 1 ? "Resta 1 dia." : `Restam ${params.daysRemaining} dias.`}
    </p>
    <p><strong>Prazo configurado:</strong> ${escapeHtml(deadline)}</p>
    <p><a href="${choiceUrl}">Fazer minha escolha</a></p>
    <p style="font-size:12px;color:#6b7280">Este lembrete usa o prazo persistido no seu pedido.</p>
  </body>
</html>`.trim();

  await emailService.sendEmail({ to: params.to, subject, html });
}

Deno.serve(async (req) => {
  let logId: string | null = null;

  try {
    const forbidden = await requireRateLimitedSharedSecret(
      req,
      "CRON_SECRET",
      "x-cron-secret",
      "cron-send-character-choice-reminders",
    );
    if (forbidden) return forbidden;

    logId = await logCronStart("cron-send-character-choice-reminders");

    const supabase = getServiceClient();
    const now = new Date();
    const todayKey = bahiaDayKey(now);
    let totalRemindersSent = 0;
    const remindersByOffset: Record<string, number> = { "5": 0, "2": 0, "1": 0 };
    const errors: Array<{ queueId: string; error: string; daysRemaining: number }> = [];

    for (const daysRemaining of REMINDER_OFFSETS) {
      const range = targetBahiaRange(now, daysRemaining);
      const { data, error } = await supabase
        .from("production_queue")
        .select(
          "id, user_id, order_id, order_type, collection_id, choice_deadline, choice_reminders_sent, choice_last_reminder_at",
        )
        .eq("current_stage", "awaiting_choice")
        .eq("choice_status", "pending")
        .gte("choice_deadline", range.start)
        .lte("choice_deadline", range.end);

      if (error) {
        errors.push({
          queueId: "query",
          error: error.message,
          daysRemaining,
        });
        continue;
      }

      for (const request of (data || []) as PendingChoiceRequest[]) {
        try {
          if (
            !request.id ||
            !request.user_id ||
            !request.order_id ||
            !request.collection_id ||
            !request.choice_deadline ||
            !["subscription_delivery", "standalone_purchase"].includes(request.order_type)
          ) {
            throw new Error("Choice request is incomplete");
          }

          if (
            request.choice_last_reminder_at &&
            bahiaDayKey(new Date(request.choice_last_reminder_at)) === todayKey
          ) {
            continue;
          }

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

          await sendReminder({
            to: profile.email,
            userName: profile.full_name,
            collectionName: collection.name,
            request,
            daysRemaining,
          });

          const { error: updateError } = await supabase
            .from("production_queue")
            .update({
              choice_reminders_sent: Math.max(0, request.choice_reminders_sent || 0) + 1,
              choice_last_reminder_at: now.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq("id", request.id)
            .eq("choice_status", "pending");

          if (updateError) {
            throw new Error(`Reminder audit update failed: ${updateError.message}`);
          }

          totalRemindersSent += 1;
          remindersByOffset[String(daysRemaining)] += 1;
        } catch (error) {
          errors.push({
            queueId: request.id || "unknown",
            error: error instanceof Error ? error.message : String(error),
            daysRemaining,
          });
        }
      }
    }

    await logCronSuccess(logId, {
      totalRemindersSent,
      remindersByOffset,
      errors: errors.length > 0 ? errors : undefined,
      executedAt: now.toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        totalRemindersSent,
        remindersByOffset,
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
