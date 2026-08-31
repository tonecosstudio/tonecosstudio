import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { assertRateLimitedAdmin } from "../_shared/admin-rate-limit.ts";
import {
  EmailService,
  escapeHtml,
  getEmailConfig,
  sanitizeEmailSubject,
} from "../_shared/email.ts";
import { getPublicBaseUrl } from "../_shared/public-url.ts";
import { ADMIN_ACCESS_ROLES } from "../_shared/roles.ts";
import { requireRateLimitedSharedSecret } from "../_shared/secret-rate-limit.ts";
import { getServiceClient } from "../_shared/supabase.ts";

const BAHIA_TIMEZONE = "America/Bahia";
const BAHIA_OFFSET = "-03:00";
const PRODUCTION_STATUSES = new Set([
  "awaiting_choice",
  "ready_for_production",
  "in_production",
  "completed",
  "on_hold",
  "cancelled",
]);
const CHOICE_STATUSES = new Set([
  "pending",
  "submitted",
  "approved",
  "rejected",
  "locked",
  "expired",
]);

interface QueueRow {
  id: string;
  production_status: string;
  choice_status: string | null;
  choice_deadline: string | null;
  estimated_completion_date: string | null;
  scheduled_production_date: string | null;
}

interface AlertDigestData {
  deadlineCritical: number;
  deadlineUrgent: number;
  blocked: number;
  overdue: number;
  totalItems: number;
  scheduledToday: number;
}

function json(
  body: unknown,
  corsHeaders: HeadersInit,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function parseOptionalDate(
  value: string | null,
  label: string,
  itemId: string,
): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${label} for production item ${itemId}`);
  }
  return parsed;
}

function getBahiaDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BAHIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const read = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value;
  const year = read("year");
  const month = read("month");
  const day = read("day");
  if (!year || !month || !day) {
    throw new Error("Unable to resolve Bahia calendar date");
  }
  return `${year}-${month}-${day}`;
}

function getBahiaDayRange(date: Date) {
  const key = getBahiaDateKey(date);
  return {
    key,
    start: new Date(`${key}T00:00:00${BAHIA_OFFSET}`),
    end: new Date(`${key}T23:59:59.999${BAHIA_OFFSET}`),
  };
}

function calculateDigestData(rows: QueueRow[], now: Date): AlertDigestData {
  const today = getBahiaDayRange(now);
  let deadlineCritical = 0;
  let deadlineUrgent = 0;
  let blocked = 0;
  let overdue = 0;
  let scheduledToday = 0;

  for (const row of rows) {
    if (!row.id) throw new Error("Production item without id");
    if (!PRODUCTION_STATUSES.has(row.production_status)) {
      throw new Error(`Invalid production_status for production item ${row.id}`);
    }
    if (row.choice_status && !CHOICE_STATUSES.has(row.choice_status)) {
      throw new Error(`Invalid choice_status for production item ${row.id}`);
    }

    const choiceDeadline = parseOptionalDate(
      row.choice_deadline,
      "choice_deadline",
      row.id,
    );
    if (choiceDeadline) {
      const hoursUntilDeadline =
        (choiceDeadline.getTime() - now.getTime()) / 3_600_000;
      if (
        row.choice_status === "pending" &&
        hoursUntilDeadline > 0 &&
        hoursUntilDeadline < 24
      ) {
        deadlineCritical += 1;
      } else if (
        row.choice_status === "pending" &&
        hoursUntilDeadline >= 24 &&
        hoursUntilDeadline < 72
      ) {
        deadlineUrgent += 1;
      }
    }

    if (row.production_status === "on_hold") blocked += 1;

    const estimatedCompletion = parseOptionalDate(
      row.estimated_completion_date,
      "estimated_completion_date",
      row.id,
    );
    if (
      estimatedCompletion &&
      estimatedCompletion < now &&
      row.production_status !== "completed" &&
      row.production_status !== "cancelled"
    ) {
      overdue += 1;
    }

    const scheduledDate = parseOptionalDate(
      row.scheduled_production_date,
      "scheduled_production_date",
      row.id,
    );
    if (scheduledDate && scheduledDate >= today.start && scheduledDate <= today.end) {
      scheduledToday += 1;
    }
  }

  return {
    deadlineCritical,
    deadlineUrgent,
    blocked,
    overdue,
    totalItems: rows.length,
    scheduledToday,
  };
}

async function authorize(req: Request): Promise<Response | null> {
  if (req.headers.has("x-cron-secret")) {
    return await requireRateLimitedSharedSecret(
      req,
      "CRON_SECRET",
      "x-cron-secret",
      "send-alert-digest",
    );
  }

  const admin = await assertRateLimitedAdmin(req, "send-alert-digest-manual");
  return admin.rateLimited ?? null;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": "POST",
      },
    });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, corsHeaders, 405);
    }

    const forbidden = await authorize(req);
    if (forbidden) return forbidden;

    const supabase = getServiceClient();
    const now = new Date();

    const { data: queueRows, error: queueError } = await supabase
      .from("production_queue")
      .select(
        "id, production_status, choice_status, choice_deadline, estimated_completion_date, scheduled_production_date",
      );

    if (queueError) {
      throw new Error(`Failed to fetch production queue: ${queueError.message}`);
    }

    const alertData = calculateDigestData((queueRows || []) as QueueRow[], now);

    const { data: settings, error: settingsError } = await supabase
      .from("admin_notification_settings")
      .select("user_id")
      .eq("email_enabled", true);

    if (settingsError) {
      throw new Error(
        `Failed to fetch admin notification settings: ${settingsError.message}`,
      );
    }

    const userIds = [
      ...new Set((settings || []).map((row) => row.user_id).filter(Boolean)),
    ];
    if (userIds.length === 0) {
      return json({ success: true, message: "No subscribers found" }, corsHeaders);
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", userIds)
      .in("role", ADMIN_ACCESS_ROLES);

    if (profilesError) {
      throw new Error(`Failed to fetch admin emails: ${profilesError.message}`);
    }

    const subscribers = (profiles || []).filter(
      (profile) => typeof profile.email === "string" && profile.email.trim(),
    );
    if (subscribers.length === 0) {
      return json({ success: true, message: "No subscribers found" }, corsHeaders);
    }

    const bahiaDate = now.toLocaleDateString("pt-BR", {
      timeZone: BAHIA_TIMEZONE,
    });
    const siteUrl = getPublicBaseUrl(["SITE_URL", "BASE_URL"]);
    const emailBody = generateEmailBody(alertData, siteUrl, bahiaDate);
    const emailService = new EmailService(
      getEmailConfig({ fromName: "ORDAX Produção" }),
    );
    const subject = sanitizeEmailSubject(
      `Resumo diário de produção - ${bahiaDate}`,
    );

    const results = await Promise.all(
      subscribers.map(async (subscriber) => {
        try {
          const result = await emailService.sendEmail({
            to: subscriber.email,
            subject,
            html: emailBody,
          });
          return { userId: subscriber.id, success: true, emailId: result.id };
        } catch (error) {
          console.error(
            `Failed to send alert digest to admin ${subscriber.id}`,
            error,
          );
          return { userId: subscriber.id, success: false };
        }
      }),
    );

    const failureCount = results.filter((result) => !result.success).length;
    return json(
      {
        success: failureCount === 0,
        totalSubscribers: subscribers.length,
        successCount: results.length - failureCount,
        failureCount,
        generatedAt: now.toISOString(),
      },
      corsHeaders,
      failureCount === 0 ? 200 : 207,
    );
  } catch (error) {
    console.error("Error in send-alert-digest function:", error);
    return json({ success: false, error: "Internal server error" }, corsHeaders, 500);
  }
});

function generateEmailBody(
  data: AlertDigestData,
  siteUrl: string,
  bahiaDate: string,
): string {
  const hasUrgentAlerts =
    data.deadlineCritical > 0 ||
    data.deadlineUrgent > 0 ||
    data.blocked > 0 ||
    data.overdue > 0;
  const dashboardUrl = new URL("/admin/production", siteUrl).toString();

  return `<!doctype html>
<html lang="pt-BR">
  <body style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
    <h1>Resumo diário de produção</h1>
    <p>Data operacional: ${escapeHtml(bahiaDate)}.</p>
    <h2>${hasUrgentAlerts ? "Alertas urgentes" : "Tudo em ordem"}</h2>
    <ul>
      <li>Prazo crítico (&lt; 24h): <strong>${data.deadlineCritical}</strong></li>
      <li>Escolhas pendentes (24–72h): <strong>${data.deadlineUrgent}</strong></li>
      <li>Itens bloqueados: <strong>${data.blocked}</strong></li>
      <li>Previsão excedida: <strong>${data.overdue}</strong></li>
    </ul>
    <h2>Operação</h2>
    <ul>
      <li>Total na fila: <strong>${data.totalItems}</strong></li>
      <li>Agendados hoje: <strong>${data.scheduledToday}</strong></li>
    </ul>
    <p><a href="${escapeHtml(dashboardUrl)}">Ver dashboard de produção</a></p>
  </body>
</html>`;
}
