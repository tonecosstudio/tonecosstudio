/**
 * Cron Job: Character Choice Expiration Handler
 *
 * Runs hourly to handle character choices with expired deadlines.
 *
 * Actions performed:
 * 1. Query choices with expired deadline and status = 'pending'
 * 2. Send notification to admin for each expired choice
 * 3. Update choice status to 'expired'
 * 4. Add to urgent alerts (via production_queue update)
 * 5. Log the expiration
 *
 * Requirements:
 * - 2.2.4: Deadline Management - After deadline expires, admin is notified to manually assign character
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  logCronStart,
  logCronSuccess,
  logCronError,
} from "../_shared/cron-logger.ts";
import { nowInBahia } from "../_shared/timezone.ts";
import { requireSharedSecret } from "../_shared/secrets.ts";
import { EmailService, getEmailConfig } from "../_shared/email.ts";
import { getPublicBaseUrl } from "../_shared/public-url.ts";

interface ExpiredChoice {
  id: string;
  user_id: string;
  order_id: string;
  order_type: string;
  collection_id: string;
  deadline: string;
  created_at: string;
}

/**
 * Sends admin notification email about expired character choice
 */
async function sendAdminExpirationNotification(params: {
  customerName: string | null;
  customerEmail: string;
  collectionName: string;
  deadline: string;
  orderId: string;
  orderType: string;
  daysExpired: number;
}): Promise<void> {
  const adminEmail = getRequiredAdminEmail();
  const baseUrl = getPublicBaseUrl(["FRONTEND_URL", "BASE_URL", "SITE_URL"]);
  const emailService = new EmailService(getEmailConfig({ baseUrl }));

  const subject = `⚠️ Escolha de Personagem Expirada - ${params.collectionName}`;
  const htmlContent = generateAdminNotificationHTML({ ...params, baseUrl });

  try {
    await emailService.sendEmail({
      to: adminEmail,
      subject,
      html: htmlContent,
    });

    console.log(
      `Admin notification sent for expired choice: ${params.orderId}`,
    );
  } catch (error) {
    console.error(
      `Failed to send admin notification for ${params.orderId}:`,
      error,
    );
    throw error;
  }
}

function getRequiredAdminEmail(): string {
  const adminEmail = Deno.env.get("ADMIN_EMAIL");
  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL is not configured");
  }
  return adminEmail;
}

/**
 * Generates HTML content for the admin notification email
 */
function generateAdminNotificationHTML(params: {
  customerName: string | null;
  customerEmail: string;
  collectionName: string;
  deadline: string;
  orderId: string;
  orderType: string;
  daysExpired: number;
  baseUrl: string;
}): string {
  const formattedDeadline = new Date(params.deadline).toLocaleDateString(
    "pt-BR",
    {
      timeZone: "America/Bahia",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  const adminUrl = `${params.baseUrl}/admin/character-choices`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Escolha de Personagem Expirada</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 700;
    }
    .header p {
      margin: 0;
      font-size: 16px;
      opacity: 0.95;
    }
    .content {
      padding: 32px 24px;
    }
    .alert-box {
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      border-left: 4px solid #dc2626;
      padding: 24px;
      margin: 24px 0;
      border-radius: 8px;
    }
    .alert-box h2 {
      margin: 0 0 16px 0;
      font-size: 20px;
      color: #991b1b;
    }
    .info-row {
      margin: 12px 0;
      font-size: 16px;
    }
    .info-label {
      font-weight: 600;
      color: #374151;
      display: inline-block;
      min-width: 140px;
    }
    .info-value {
      color: #6b7280;
    }
    .action-required {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
      font-size: 14px;
      color: #92400e;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin: 24px 0;
      transition: transform 0.2s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px;
      text-align: center;
      font-size: 14px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Escolha de Personagem Expirada</h1>
      <p>Ação Necessária</p>
    </div>
    <div class="content">
      <p style="font-size: 18px; margin-bottom: 24px; color: #374151;">
        <strong>Alerta:</strong> Um cliente não escolheu seu personagem dentro do prazo.
      </p>

      <div class="alert-box">
        <h2>📋 Detalhes do Pedido</h2>
        <div class="info-row">
          <span class="info-label">Cliente:</span>
          <span class="info-value">${params.customerName || "Não informado"}</span>
        </div>
        <div class="info-row">
          <span class="info-label">E-mail:</span>
          <span class="info-value">${params.customerEmail}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Coleção:</span>
          <span class="info-value">${params.collectionName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Pedido:</span>
          <span class="info-value">#${params.orderId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Tipo:</span>
          <span class="info-value">${params.orderType === "subscription_delivery" ? "Assinatura" : "Compra Avulsa"}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Prazo Expirado:</span>
          <span class="info-value">${formattedDeadline}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Dias Expirado:</span>
          <span class="info-value" style="color: #dc2626; font-weight: 600;">${params.daysExpired} ${params.daysExpired === 1 ? "dia" : "dias"}</span>
        </div>
      </div>

      <div class="action-required">
        <strong>⚠️ Ação Necessária:</strong> O cliente não escolheu seu personagem dentro do prazo de 7 dias.
        Por favor, acesse o painel de administração e atribua manualmente um personagem disponível para este pedido.
      </div>

      <p style="margin-top: 24px;">
        <strong>Próximos Passos:</strong>
      </p>
      <ol style="color: #374151; line-height: 1.8;">
        <li>Acesse o painel de gerenciamento de escolhas</li>
        <li>Revise os personagens disponíveis da coleção ${params.collectionName}</li>
        <li>Atribua um personagem ao pedido #${params.orderId}</li>
        <li>Notifique o cliente sobre a escolha atribuída (opcional)</li>
      </ol>

      <div style="text-align: center;">
        <a href="${adminUrl}" class="cta-button">
          Gerenciar Escolhas
        </a>
      </div>

      <p style="margin-top: 32px; font-size: 14px; color: #64748b;">
        Este é um alerta automático do sistema de gerenciamento de produção.
        A escolha foi marcada como "expirada" e adicionada aos alertas urgentes do dashboard.
      </p>
    </div>
    <div class="footer">
      <p>Este é um e-mail automático da plataforma ORDAX.</p>
      <p>&copy; ${new Date().getFullYear()} ORDAX. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

Deno.serve(async (req) => {
  let logId: string | null = null;

  try {
    const forbidden = requireSharedSecret(req, "CRON_SECRET", "x-cron-secret");
    if (forbidden) return forbidden;

    // Start logging
    logId = await logCronStart("cron-expire-character-choices");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current Bahia time
    const bahiaTime = nowInBahia();
    console.log(`Cron job running at ${bahiaTime.toISOString()} (Bahia time)`);

    // Find character choices with expired deadline and status = 'pending'
    const { data: expiredChoices, error: choicesError } = await supabase
      .from("character_choices")
      .select(
        "id, user_id, order_id, order_type, collection_id, deadline, created_at",
      )
      .eq("status", "pending")
      .lt("deadline", bahiaTime.toISOString());

    if (choicesError) {
      console.error("Failed to fetch expired choices:", choicesError);
      throw new Error(
        `Failed to fetch expired choices: ${choicesError.message}`,
      );
    }

    console.log(`Found ${expiredChoices?.length || 0} expired choice(s)`);

    if (!expiredChoices || expiredChoices.length === 0) {
      await logCronSuccess(logId, {
        totalExpired: 0,
        executedAt: bahiaTime.toISOString(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          totalExpired: 0,
          executedAt: bahiaTime.toISOString(),
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    let totalExpired = 0;
    const errors: Array<{ choiceId: string; error: string }> = [];
    const expiredDetails: Array<{
      choiceId: string;
      orderId: string;
      customerEmail: string;
      collectionName: string;
      daysExpired: number;
    }> = [];

    // Process each expired choice
    for (const choice of expiredChoices as ExpiredChoice[]) {
      try {
        console.log(`Processing expired choice: ${choice.id}`);

        // Calculate days expired
        const deadlineDate = new Date(choice.deadline);
        const daysExpired = Math.floor(
          (bahiaTime.getTime() - deadlineDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        // Get user profile for email
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .eq("id", choice.user_id)
          .single();

        if (profileError || !profile || !profile.email) {
          console.error(
            `Failed to get profile for user ${choice.user_id}:`,
            profileError,
          );
          errors.push({
            choiceId: choice.id,
            error: `Failed to get user profile or email: ${profileError?.message || "Not found"}`,
          });
          continue;
        }

        // Get collection name
        const { data: collection, error: collectionError } = await supabase
          .from("collections")
          .select("id, name")
          .eq("id", choice.collection_id)
          .single();

        if (collectionError || !collection) {
          console.error(
            `Failed to get collection ${choice.collection_id}:`,
            collectionError,
          );
          errors.push({
            choiceId: choice.id,
            error: `Failed to get collection: ${collectionError?.message || "Not found"}`,
          });
          continue;
        }

        // Send admin notification
        await sendAdminExpirationNotification({
          customerName: profile.full_name,
          customerEmail: profile.email,
          collectionName: collection.name,
          deadline: choice.deadline,
          orderId: choice.order_id,
          orderType: choice.order_type,
          daysExpired,
        });

        // Update character_choices status to 'expired'
        const { error: updateChoiceError } = await supabase
          .from("character_choices")
          .update({
            status: "expired",
            updated_at: bahiaTime.toISOString(),
          })
          .eq("id", choice.id);

        if (updateChoiceError) {
          console.error(
            `Failed to update choice status for ${choice.id}:`,
            updateChoiceError,
          );
          errors.push({
            choiceId: choice.id,
            error: `Failed to update choice status: ${updateChoiceError.message}`,
          });
          continue;
        }

        // Update production_queue to add to urgent alerts
        // Find the production queue item for this order
        const { data: queueItem, error: queueFindError } = await supabase
          .from("production_queue")
          .select("id, internal_flags")
          .eq("order_id", choice.order_id)
          .eq("order_type", choice.order_type)
          .single();

        if (queueFindError || !queueItem) {
          console.warn(
            `Production queue item not found for order ${choice.order_id}:`,
            queueFindError,
          );
          // Not a critical error - choice is still marked as expired
        } else {
          // Add 'choice_expired' flag to internal_flags
          const currentFlags = queueItem.internal_flags || [];
          const updatedFlags = [
            ...new Set([...currentFlags, "choice_expired"]),
          ];

          const { error: updateQueueError } = await supabase
            .from("production_queue")
            .update({
              internal_flags: updatedFlags,
              updated_at: bahiaTime.toISOString(),
            })
            .eq("id", queueItem.id);

          if (updateQueueError) {
            console.error(
              `Failed to update production queue for ${queueItem.id}:`,
              updateQueueError,
            );
            // Not a critical error - choice is still marked as expired
          }
        }

        console.log(`Successfully processed expired choice ${choice.id}`);
        totalExpired++;
        expiredDetails.push({
          choiceId: choice.id,
          orderId: choice.order_id,
          customerEmail: profile.email,
          collectionName: collection.name,
          daysExpired,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`Error processing expired choice ${choice.id}:`, error);
        errors.push({
          choiceId: choice.id,
          error: errorMessage,
        });
      }
    }

    // Log success with details
    await logCronSuccess(logId, {
      totalExpired,
      expiredDetails,
      errors: errors.length > 0 ? errors : undefined,
      executedAt: bahiaTime.toISOString(),
    });

    console.log(
      `Cron job completed: ${totalExpired} expired choice(s) processed`,
    );
    if (errors.length > 0) {
      console.warn(`${errors.length} error(s) occurred during processing`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalExpired,
        expiredDetails,
        errors: errors.length > 0 ? errors : undefined,
        executedAt: bahiaTime.toISOString(),
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Cron job failed:", error);

    // Log error if we have a log ID
    if (logId) {
      try {
        await logCronError(
          logId,
          error instanceof Error ? error : new Error(String(error)),
        );
      } catch (logError) {
        console.error("Failed to log error:", logError);
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
