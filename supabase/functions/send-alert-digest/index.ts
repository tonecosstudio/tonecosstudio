// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireSharedSecret } from "../_shared/secrets.ts";

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

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const forbidden = requireSharedSecret(req, "CRON_SECRET", "x-cron-secret");
    if (forbidden) {
      return new Response(forbidden.body, {
        status: forbidden.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Get production metrics
    const { data: metricsData, error: metricsError } = await supabaseClient.rpc(
      "get_production_metrics",
    );

    if (metricsError) {
      throw new Error(`Failed to fetch metrics: ${metricsError.message}`);
    }

    const metrics =
      typeof metricsData === "string" ? JSON.parse(metricsData) : metricsData;

    const alertData: AlertDigestData = {
      deadlineCritical: metrics.urgent?.deadline_critical || 0,
      deadlineUrgent: metrics.urgent?.deadline_urgent || 0,
      blocked: metrics.urgent?.blocked || 0,
      overdue: metrics.urgent?.overdue || 0,
      totalItems: metrics.overall?.total_items || 0,
      scheduledToday: metrics.scheduled?.today || 0,
    };

    // Get all admins subscribed to email digest
    const { data: subscribers, error: subscribersError } = await supabaseClient
      .from("admin_notification_preferences")
      .select("email, user_id")
      .eq("email_digest_enabled", true);

    if (subscribersError) {
      throw new Error(
        `Failed to fetch subscribers: ${subscribersError.message}`,
      );
    }

    if (!subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ message: "No subscribers found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Generate email content
    const emailSubject = `📊 Resumo Diário de Produção - ${new Date().toLocaleDateString("pt-BR")}`;
    const emailBody = generateEmailBody(alertData);

    // Send emails to all subscribers
    const emailPromises = subscribers.map(async (subscriber) => {
      try {
        // In a real implementation, you would use a service like SendGrid, Resend, or AWS SES
        // For now, we'll just log the email
        console.log(`Sending email to ${subscriber.email}:`, emailSubject, {
          htmlBytes: emailBody.length,
        });

        // TODO: Integrate with actual email service
        // Example with Resend:
        // const response = await fetch('https://api.resend.com/emails', {
        //   method: 'POST',
        //   headers: {
        //     'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        //     'Content-Type': 'application/json',
        //   },
        //   body: JSON.stringify({
        //     from: 'producao@seusite.com',
        //     to: subscriber.email,
        //     subject: emailSubject,
        //     html: emailBody,
        //   }),
        // });

        return { email: subscriber.email, success: true };
      } catch (error) {
        console.error(`Failed to send email to ${subscriber.email}:`, error);
        return {
          email: subscriber.email,
          success: false,
          error: (error as Error).message,
        };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        message: "Email digest sent",
        totalSubscribers: subscribers.length,
        successCount,
        failureCount,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error in send-alert-digest function:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function generateEmailBody(data: AlertDigestData): string {
  const hasUrgentAlerts =
    data.deadlineCritical > 0 ||
    data.deadlineUrgent > 0 ||
    data.blocked > 0 ||
    data.overdue > 0;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resumo Diário de Produção</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1a1a1a;
      margin-top: 0;
      font-size: 24px;
    }
    .alert-section {
      margin: 20px 0;
      padding: 15px;
      border-radius: 6px;
      background-color: ${hasUrgentAlerts ? "#fff3cd" : "#d1f2eb"};
      border-left: 4px solid ${hasUrgentAlerts ? "#ffc107" : "#28a745"};
    }
    .alert-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .alert-item:last-child {
      border-bottom: none;
    }
    .alert-label {
      font-weight: 500;
      color: #555;
    }
    .alert-value {
      font-weight: bold;
      font-size: 18px;
    }
    .critical { color: #dc3545; }
    .warning { color: #ffc107; }
    .info { color: #17a2b8; }
    .success { color: #28a745; }
    .stats-section {
      margin: 20px 0;
      padding: 15px;
      background-color: #f8f9fa;
      border-radius: 6px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #007bff;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 20px;
      font-weight: 500;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #777;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Resumo Diário de Produção</h1>
    <p>Olá! Aqui está o resumo dos alertas e atividades de produção de hoje, ${new Date().toLocaleDateString("pt-BR")}.</p>

    ${
      hasUrgentAlerts
        ? `
    <div class="alert-section">
      <h2 style="margin-top: 0; font-size: 18px;">⚠️ Alertas Urgentes</h2>

      ${
        data.deadlineCritical > 0
          ? `
      <div class="alert-item">
        <span class="alert-label">🔴 Prazo Crítico (&lt; 24h)</span>
        <span class="alert-value critical">${data.deadlineCritical}</span>
      </div>
      `
          : ""
      }

      ${
        data.deadlineUrgent > 0
          ? `
      <div class="alert-item">
        <span class="alert-label">🟡 Escolhas Pendentes</span>
        <span class="alert-value warning">${data.deadlineUrgent}</span>
      </div>
      `
          : ""
      }

      ${
        data.blocked > 0
          ? `
      <div class="alert-item">
        <span class="alert-label">🔵 Itens Bloqueados</span>
        <span class="alert-value info">${data.blocked}</span>
      </div>
      `
          : ""
      }

      ${
        data.overdue > 0
          ? `
      <div class="alert-item">
        <span class="alert-label">🟠 Tempo Excedido</span>
        <span class="alert-value warning">${data.overdue}</span>
      </div>
      `
          : ""
      }
    </div>
    `
        : `
    <div class="alert-section">
      <h2 style="margin-top: 0; font-size: 18px;">✅ Tudo em Ordem</h2>
      <p style="margin: 0;">Não há alertas urgentes no momento. Continue o ótimo trabalho!</p>
    </div>
    `
    }

    <div class="stats-section">
      <h2 style="margin-top: 0; font-size: 18px;">📈 Estatísticas</h2>
      <div class="alert-item">
        <span class="alert-label">Total de Itens em Produção</span>
        <span class="alert-value">${data.totalItems}</span>
      </div>
      <div class="alert-item">
        <span class="alert-label">Agendados para Hoje</span>
        <span class="alert-value">${data.scheduledToday}</span>
      </div>
    </div>

    <a href="${Deno.env.get("SITE_URL") || "http://localhost:5173"}/admin/production" class="button">
      Ver Dashboard de Produção
    </a>

    <div class="footer">
      <p>Você está recebendo este email porque está inscrito no resumo diário de alertas de produção.</p>
      <p>Para alterar suas preferências de notificação, acesse o Dashboard de Produção.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-alert-digest' \
    --header 'Authorization: Bearer YOUR_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"type":"daily"}'

*/
