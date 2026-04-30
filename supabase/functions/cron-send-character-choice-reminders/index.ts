/**
 * Cron Job: Character Choice Reminder Sender
 *
 * Runs daily at 09:00 Bahia Time to send character choice reminders to customers.
 *
 * Actions performed:
 * 1. Find choices with deadline in 5 days → send first reminder
 * 2. Find choices with deadline in 2 days → send second reminder
 * 3. Find choices with deadline in 1 day → send final reminder
 * 4. Log reminder sent with timestamp
 *
 * Requirements:
 * - 2.2.4: Deadline Management - Send reminders at 5, 2, and 1 day before deadline
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  logCronStart,
  logCronSuccess,
  logCronError,
} from "../_shared/cron-logger.ts";
import { nowInBahia } from "../_shared/timezone.ts";
import { requireSharedSecret } from "../_shared/secrets.ts";

interface CharacterChoice {
  id: string;
  user_id: string;
  order_id: string;
  order_type: string;
  collection_id: string;
  deadline: string;
  reminders_sent: number;
  last_reminder_at: string | null;
}

/**
 * Reminder types based on days until deadline
 */
type ReminderType = "first" | "second" | "final";

/**
 * Gets the reminder type based on days until deadline
 */
function getReminderType(daysUntilDeadline: number): ReminderType | null {
  if (daysUntilDeadline === 5) return "first";
  if (daysUntilDeadline === 2) return "second";
  if (daysUntilDeadline === 1) return "final";
  return null;
}

/**
 * Sends character choice reminder email
 */
async function sendCharacterChoiceReminder(params: {
  to: string;
  userName: string | null;
  collectionName: string;
  deadline: string;
  orderId: string;
  orderType: string;
  reminderType: ReminderType;
}): Promise<void> {
  const emailProvider = Deno.env.get("EMAIL_PROVIDER") || "resend";
  const emailApiKey = Deno.env.get("EMAIL_API_KEY");
  const emailFrom = Deno.env.get("EMAIL_FROM") || "noreply@ordax.com.br";
  const emailFromName = Deno.env.get("EMAIL_FROM_NAME") || "ORDAX";

  if (!emailApiKey) {
    console.warn("EMAIL_API_KEY not configured, skipping reminder email");
    return;
  }

  const subject = getEmailSubject(params.reminderType, params.collectionName);
  const htmlContent = generateReminderEmailHTML({
    userName: params.userName || "Colecionador",
    collectionName: params.collectionName,
    deadline: params.deadline,
    orderId: params.orderId,
    orderType: params.orderType,
    reminderType: params.reminderType,
  });

  try {
    await sendEmail({
      provider: emailProvider as "resend" | "sendgrid",
      apiKey: emailApiKey,
      from: emailFrom,
      fromName: emailFromName,
      to: params.to,
      subject,
      html: htmlContent,
    });

    console.log(`${params.reminderType} reminder sent to: ${params.to}`);
  } catch (error) {
    console.error(
      `Failed to send ${params.reminderType} reminder to ${params.to}:`,
      error,
    );
    throw error;
  }
}

/**
 * Gets email subject based on reminder type
 */
function getEmailSubject(
  reminderType: ReminderType,
  collectionName: string,
): string {
  switch (reminderType) {
    case "first":
      return `Escolha seu Personagem - ${collectionName}`;
    case "second":
      return `⏰ Lembrete: Escolha seu Personagem - ${collectionName}`;
    case "final":
      return `🚨 URGENTE: Último Dia para Escolher - ${collectionName}`;
  }
}

/**
 * Generates HTML content for the reminder email
 */
function generateReminderEmailHTML(params: {
  userName: string;
  collectionName: string;
  deadline: string;
  orderId: string;
  orderType: string;
  reminderType: ReminderType;
}): string {
  const formattedDate = new Date(params.deadline).toLocaleDateString("pt-BR", {
    timeZone: "America/Bahia",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const daysRemaining =
    params.reminderType === "first"
      ? 5
      : params.reminderType === "second"
        ? 2
        : 1;
  const urgencyLevel =
    params.reminderType === "final"
      ? "high"
      : params.reminderType === "second"
        ? "medium"
        : "low";

  const orderPath =
    params.orderType === "subscription_delivery"
      ? "assinatura"
      : "compra-avulsa";
  const choiceUrl = `${Deno.env.get("FRONTEND_URL") || "https://ordax.com.br"}/${orderPath}/${params.orderId}`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Escolha seu Personagem</title>
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
      background: ${urgencyLevel === "high" ? "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" : urgencyLevel === "medium" ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"};
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
    .greeting {
      font-size: 18px;
      margin-bottom: 24px;
      color: #374151;
    }
    .info-box {
      background: ${urgencyLevel === "high" ? "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)" : urgencyLevel === "medium" ? "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)" : "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)"};
      border-left: 4px solid ${urgencyLevel === "high" ? "#dc2626" : urgencyLevel === "medium" ? "#f59e0b" : "#3b82f6"};
      padding: 24px;
      margin: 24px 0;
      border-radius: 8px;
    }
    .info-box h2 {
      margin: 0 0 16px 0;
      font-size: 20px;
      color: ${urgencyLevel === "high" ? "#991b1b" : urgencyLevel === "medium" ? "#92400e" : "#1e40af"};
    }
    .info-row {
      margin: 12px 0;
      font-size: 16px;
    }
    .info-label {
      font-weight: 600;
      color: #374151;
    }
    .info-value {
      color: #6b7280;
    }
    .countdown {
      font-size: 48px;
      font-weight: 700;
      color: ${urgencyLevel === "high" ? "#dc2626" : urgencyLevel === "medium" ? "#f59e0b" : "#3b82f6"};
      text-align: center;
      margin: 24px 0;
    }
    .countdown-label {
      font-size: 16px;
      color: #6b7280;
      text-align: center;
      margin-top: -16px;
    }
    .cta-button {
      display: inline-block;
      background: ${urgencyLevel === "high" ? "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" : urgencyLevel === "medium" ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"};
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
      <h1>${params.reminderType === "final" ? "🚨 Último Dia!" : params.reminderType === "second" ? "⏰ Lembrete" : "✨ Escolha seu Personagem"}</h1>
      <p>${params.collectionName}</p>
    </div>
    <div class="content">
      <p class="greeting">Olá, ${params.userName}!</p>

      ${
        params.reminderType === "first"
          ? `
      <p>
        Sua peça exclusiva da coleção <strong>${params.collectionName}</strong> está quase pronta
        para entrar em produção! Agora é hora de escolher qual personagem você deseja receber.
      </p>
      `
          : params.reminderType === "second"
            ? `
      <p>
        Este é um lembrete importante: você ainda não escolheu seu personagem da coleção
        <strong>${params.collectionName}</strong>. O prazo está se aproximando!
      </p>
      `
            : `
      <p>
        <strong>Atenção!</strong> Este é o último dia para escolher seu personagem da coleção
        <strong>${params.collectionName}</strong>. Após o prazo, um personagem será atribuído
        automaticamente pela nossa equipe.
      </p>
      `
      }

      <div class="info-box">
        <h2>${params.reminderType === "final" ? "⏰ Prazo Final" : params.reminderType === "second" ? "📅 Prazo se Aproximando" : "📅 Prazo para Escolha"}</h2>
        <div class="countdown">${daysRemaining}</div>
        <div class="countdown-label">${daysRemaining === 1 ? "dia restante" : "dias restantes"}</div>
        <div class="info-row" style="margin-top: 24px;">
          <span class="info-label">Prazo Final:</span>
          <span class="info-value">${formattedDate}</span>
        </div>
      </div>

      ${
        params.reminderType === "final"
          ? `
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px; font-size: 14px; color: #92400e;">
        <strong>⚠️ Importante:</strong> Se você não escolher seu personagem até o final do dia,
        nossa equipe selecionará um personagem disponível para você. Faça sua escolha agora para
        garantir que você receba exatamente o personagem que deseja!
      </div>
      `
          : ""
      }

      <p style="margin-top: 24px;">
        Acesse sua área de pedidos e escolha entre os personagens disponíveis da coleção.
        É rápido e fácil!
      </p>

      <div style="text-align: center;">
        <a href="${choiceUrl}" class="cta-button">
          ${params.reminderType === "final" ? "Escolher Agora!" : "Fazer Minha Escolha"}
        </a>
      </div>

      <p style="margin-top: 32px; font-size: 14px; color: #64748b;">
        Após fazer sua escolha, ela será revisada pela nossa equipe e, uma vez aprovada,
        sua peça entrará em produção imediatamente.
      </p>

      <p style="margin-top: 16px; font-size: 14px; color: #64748b;">
        Dúvidas? Entre em contato conosco através do chat no site ou responda este e-mail.
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

/**
 * Sends an email using the configured email provider
 */
async function sendEmail(params: {
  provider: "resend" | "sendgrid";
  apiKey: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (params.provider === "resend") {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${params.fromName} <${params.from}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }
  } else {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: params.to }],
          },
        ],
        from: {
          email: params.from,
          name: params.fromName,
        },
        subject: params.subject,
        content: [
          {
            type: "text/html",
            value: params.html,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SendGrid API error: ${error}`);
    }
  }
}

Deno.serve(async (req) => {
  let logId: string | null = null;

  try {
    const forbidden = requireSharedSecret(req, "CRON_SECRET", "x-cron-secret");
    if (forbidden) return forbidden;

    // Start logging
    logId = await logCronStart("cron-send-character-choice-reminders");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current Bahia time
    const bahiaTime = nowInBahia();
    console.log(`Cron job running at ${bahiaTime.toISOString()} (Bahia time)`);

    // Calculate target dates for reminders (5, 2, and 1 day before deadline)
    const targetDates = [5, 2, 1].map((days) => {
      const targetDate = new Date(bahiaTime);
      targetDate.setDate(targetDate.getDate() + days);
      // Set to start of day
      const startOfDay = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
      );
      // Set to end of day
      const endOfDay = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        23,
        59,
        59,
        999,
      );
      return { days, startOfDay, endOfDay };
    });

    let totalRemindersSent = 0;
    const errors: Array<{
      choiceId: string;
      error: string;
      reminderType: string;
    }> = [];
    const remindersByType: Record<ReminderType, number> = {
      first: 0,
      second: 0,
      final: 0,
    };

    // Process each reminder type
    for (const { days, startOfDay, endOfDay } of targetDates) {
      const reminderType = getReminderType(days);
      if (!reminderType) continue;

      console.log(
        `Checking for ${reminderType} reminders (${days} days until deadline)`,
      );
      console.log(
        `Date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`,
      );

      // Find choices with deadline in the target range
      const { data: choices, error: choicesError } = await supabase
        .from("character_choices")
        .select(
          "id, user_id, order_id, order_type, collection_id, deadline, reminders_sent, last_reminder_at",
        )
        .eq("status", "pending")
        .gte("deadline", startOfDay.toISOString())
        .lte("deadline", endOfDay.toISOString());

      if (choicesError) {
        console.error(
          `Failed to fetch choices for ${reminderType} reminder:`,
          choicesError,
        );
        errors.push({
          choiceId: "query",
          error: `Failed to fetch choices: ${choicesError.message}`,
          reminderType,
        });
        continue;
      }

      console.log(
        `Found ${choices?.length || 0} choice(s) for ${reminderType} reminder`,
      );

      if (!choices || choices.length === 0) continue;

      // Process each choice
      for (const choice of choices as CharacterChoice[]) {
        try {
          console.log(
            `Processing ${reminderType} reminder for choice: ${choice.id}`,
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
              reminderType,
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
              reminderType,
            });
            continue;
          }

          // Send reminder email
          await sendCharacterChoiceReminder({
            to: profile.email,
            userName: profile.full_name,
            collectionName: collection.name,
            deadline: choice.deadline,
            orderId: choice.order_id,
            orderType: choice.order_type,
            reminderType,
          });

          // Update character_choices record with reminder info
          const { error: updateError } = await supabase
            .from("character_choices")
            .update({
              reminders_sent: choice.reminders_sent + 1,
              last_reminder_at: bahiaTime.toISOString(),
            })
            .eq("id", choice.id);

          if (updateError) {
            console.error(
              `Failed to update reminder count for choice ${choice.id}:`,
              updateError,
            );
            // Don't add to errors - reminder was sent successfully
          }

          console.log(`Sent ${reminderType} reminder for choice ${choice.id}`);
          totalRemindersSent++;
          remindersByType[reminderType]++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(
            `Error processing ${reminderType} reminder for choice ${choice.id}:`,
            error,
          );
          errors.push({
            choiceId: choice.id,
            error: errorMessage,
            reminderType,
          });
        }
      }
    }

    // Log success with details
    await logCronSuccess(logId, {
      totalRemindersSent,
      firstReminders: remindersByType.first,
      secondReminders: remindersByType.second,
      finalReminders: remindersByType.final,
      errors: errors.length > 0 ? errors : undefined,
      executedAt: bahiaTime.toISOString(),
    });

    console.log(`Cron job completed: ${totalRemindersSent} reminder(s) sent`);
    console.log(`  - First reminders (5 days): ${remindersByType.first}`);
    console.log(`  - Second reminders (2 days): ${remindersByType.second}`);
    console.log(`  - Final reminders (1 day): ${remindersByType.final}`);
    if (errors.length > 0) {
      console.warn(`${errors.length} error(s) occurred during processing`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalRemindersSent,
        remindersByType,
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
