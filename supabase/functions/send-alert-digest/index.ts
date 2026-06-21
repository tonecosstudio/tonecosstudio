import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { EmailService, getEmailConfig } from "../_shared/email.ts";
import { getPublicBaseUrl } from "../_shared/public-url.ts";
import { ADMIN_ACCESS_ROLES } from "../_shared/roles.ts";
import { requireRateLimitedSharedSecret } from "../_shared/secret-rate-limit.ts";
import { getServiceClient } from "../_shared/supabase.ts";

interface AlertDigestData {
  deadlineCritical: number;
  deadlineUrgent: number;
  blocked: number;
  overdue: number;
  totalItems: number;
  scheduledToday: number;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const forbidden = await requireRateLimitedSharedSecret(
      req,
      "CRON_SECRET",
      "x-cron-secret",
      "send-alert-digest",
    );
    if (forbidden) return forbidden;

    const supabaseClient = getServiceClient();

    const { data: metricsData, error: metricsError } = await supabaseClient.rpc(
      "get_production_metrics",
    );

    if (metricsError) {
      throw new Error(`Failed to fetch metrics: ${metricsError.message}`);
    }

    const metrics =
      typeof metricsData === "string" ? JSON.parse(metricsData) : metricsData;

    const alertData: AlertDigestData = {
      deadlineCritical: metrics?.urgent?.deadline_critical ?? 0,
      deadlineUrgent: metrics?.urgent?.deadline_urgent ?? 0,
      blocked: metrics?.urgent?.blocked ?? 0,
      overdue: metrics?.urgent?.overdue ?? 0,
      totalItems: metrics?.overall?.total_items ?? 0,
      scheduledToday: metrics?.scheduled?.today ?? 0,
    };

    const { data: settings, error: settingsError } = await supabaseClient
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
      return json({ message: "No subscribers found" }, corsHeaders);
    }

    const { data: profiles, error: profilesError } = await supabaseClient
      .from("profiles")
      .select("id, email")
      .in("id", userIds)
      .in("role", ADMIN_ACCESS_ROLES);

    if (profilesError) {
      throw new Error(`Failed to fetch admin emails: ${profilesError.message}`);
    }

    const subscribers = (profiles || []).filter((profile) =>
      Boolean(profile.email),
    );
    if (subscribers.length === 0) {
      return json({ message: "No subscribers found" }, corsHeaders);
    }

    const emailSubject = `Resumo diario de producao - ${new Date().toLocaleDateString("pt-BR")}`;
    const emailBody = generateEmailBody(
      alertData,
      getPublicBaseUrl(["SITE_URL", "BASE_URL"]),
    );
    const emailService = new EmailService(
      getEmailConfig({ fromName: "ORDAX Producao" }),
    );

    const results = await Promise.all(
      subscribers.map(async (subscriber) => {
        try {
          const result = await emailService.sendEmail({
            to: subscriber.email,
            subject: emailSubject,
            html: emailBody,
          });
          return { email: subscriber.email, success: true, emailId: result.id };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.error(
            `Failed to send alert digest to ${subscriber.email}:`,
            message,
          );
          return {
            email: subscriber.email,
            success: false,
            error: "Email delivery failed",
          };
        }
      }),
    );

    return json(
      {
        message: "Email digest sent",
        totalSubscribers: subscribers.length,
        successCount: results.filter((result) => result.success).length,
        failureCount: results.filter((result) => !result.success).length,
        results,
      },
      corsHeaders,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error in send-alert-digest function:", message);
    return json({ error: "Internal server error" }, corsHeaders, 500);
  }
});

function json(body: unknown, corsHeaders: HeadersInit, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function generateEmailBody(data: AlertDigestData, siteUrl: string): string {
  const hasUrgentAlerts =
    data.deadlineCritical > 0 ||
    data.deadlineUrgent > 0 ||
    data.blocked > 0 ||
    data.overdue > 0;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resumo diario de producao</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; background: #f3f4f6; margin: 0; padding: 24px; }
    .container { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 28px; }
    h1 { font-size: 24px; margin: 0 0 16px; color: #111827; }
    h2 { font-size: 18px; margin: 0 0 12px; color: #111827; }
    .section { margin: 20px 0; padding: 16px; border-radius: 6px; background: ${hasUrgentAlerts ? "#fff7ed" : "#ecfdf5"}; border-left: 4px solid ${hasUrgentAlerts ? "#f97316" : "#22c55e"}; }
    .stats { margin: 20px 0; padding: 16px; border-radius: 6px; background: #f9fafb; }
    .item { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .item:last-child { border-bottom: 0; }
    .value { font-weight: 700; }
    .button { display: inline-block; padding: 12px 18px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 700; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Resumo diario de producao</h1>
    <p>Resumo dos alertas e atividades de producao de ${new Date().toLocaleDateString("pt-BR")}.</p>

    <div class="section">
      <h2>${hasUrgentAlerts ? "Alertas urgentes" : "Tudo em ordem"}</h2>
      ${
        hasUrgentAlerts
          ? `
      <div class="item"><span>Prazo critico (&lt; 24h)</span><span class="value">${data.deadlineCritical}</span></div>
      <div class="item"><span>Escolhas pendentes</span><span class="value">${data.deadlineUrgent}</span></div>
      <div class="item"><span>Itens bloqueados</span><span class="value">${data.blocked}</span></div>
      <div class="item"><span>Tempo excedido</span><span class="value">${data.overdue}</span></div>`
          : "<p>Nao ha alertas urgentes no momento.</p>"
      }
    </div>

    <div class="stats">
      <h2>Estatisticas</h2>
      <div class="item"><span>Total de itens em producao</span><span class="value">${data.totalItems}</span></div>
      <div class="item"><span>Agendados para hoje</span><span class="value">${data.scheduledToday}</span></div>
    </div>

    <p><a href="${siteUrl}/admin/production" class="button">Ver dashboard de producao</a></p>

    <div class="footer">
      <p>Voce recebeu este email porque as notificacoes por email estao habilitadas nas configuracoes administrativas.</p>
    </div>
  </div>
</body>
</html>`;
}
