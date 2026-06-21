// Edge Function: send-email
// Handles email notifications for chat messages with grouping and retry logic

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { nowInBahia, toUTC, addDays } from "../_shared/timezone.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { assertRateLimitedAdmin } from "../_shared/admin-rate-limit.ts";
import { errorToStatus, getServiceClient } from "../_shared/supabase.ts";
import { EmailService, escapeHtml, getEmailConfig } from "../_shared/email.ts";
import { isUUID } from "../_shared/validation.ts";

// Types
interface EmailNotificationRequest {
  conversationId: string;
  messageId: string;
  recipientUserId: string;
  messageContent: string;
}

interface DirectEmailRequest {
  to: string;
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
  userId?: string;
  emailType?: string;
  metadata?: Record<string, unknown>;
}

function isDirectEmailRequest(payload: unknown): payload is DirectEmailRequest {
  const data = payload as Partial<DirectEmailRequest>;
  return !!data?.to && !!data?.subject && !!data?.html;
}

function normalizeEmailLogMetadata(value: unknown): Record<string, unknown> {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("metadata must be an object");
  }
  return value as Record<string, unknown>;
}

function normalizeEmailType(value: unknown): string {
  if (value === undefined || value === null || value === "") return "other";
  if (typeof value !== "string") throw new Error("emailType must be a string");

  const clean = value.trim();
  if (!clean || clean.length > 80) throw new Error("emailType is invalid");
  return clean;
}

function normalizeUserId(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !isUUID(value)) {
    throw new Error("userId must be a valid UUID");
  }
  return value;
}

async function createEmailDeliveryLog(
  service: ReturnType<typeof getServiceClient>,
  payload: DirectEmailRequest,
): Promise<string | null> {
  const { data, error } = await service.rpc("create_email_delivery_log", {
    p_user_id: normalizeUserId(payload.userId),
    p_recipient_email: payload.to,
    p_email_type: normalizeEmailType(payload.emailType),
    p_subject: payload.subject,
    p_status: "pending",
    p_provider: "edge-function",
    p_metadata: normalizeEmailLogMetadata(payload.metadata),
  });

  if (error) {
    console.error("Error creating email delivery log:", error.message);
    return null;
  }

  return typeof data === "string" ? data : null;
}

async function updateEmailDeliveryLog(
  service: ReturnType<typeof getServiceClient>,
  logId: string | null,
  updates: Record<string, unknown>,
): Promise<void> {
  if (!logId) return;

  const { error } = await service.rpc("update_email_delivery_log", {
    p_log_id: logId,
    p_updates: updates,
  });

  if (error) {
    console.error("Error updating email delivery log:", error.message);
  }
}

// Check if user is online (activity within last 5 minutes)
async function isUserOnline(supabase: any, userId: string): Promise<boolean> {
  const fiveMinutesAgo = toUTC(
    addDays(nowInBahia(), -5 / (24 * 60)),
  ).toISOString(); // 5 minutes ago in Bahia time

  const { data, error } = await supabase
    .from("support_messages")
    .select("created_at")
    .eq("sender_id", userId)
    .gte("created_at", fiveMinutesAgo)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error checking user online status:", error);
    return false;
  }

  return data && data.length > 0;
}

async function recordEmailNotification(
  supabase: any,
  input: {
    conversationId: string;
    messageId: string;
    recipientUserId: string;
    status: "sent" | "failed" | "skipped";
    sentAt?: string | null;
    errorMessage?: string | null;
    retryCount?: number;
  },
): Promise<void> {
  const { error } = await supabase.rpc("record_email_notification_event", {
    p_conversation_id: input.conversationId,
    p_message_id: input.messageId,
    p_recipient_user_id: input.recipientUserId,
    p_status: input.status,
    p_sent_at: input.sentAt ?? null,
    p_error_message: input.errorMessage ?? null,
    p_retry_count: input.retryCount ?? 0,
  });

  if (error) {
    console.error("Error recording email notification event:", error);
  }
}

// Generate email HTML template
function generateEmailHTML(data: {
  recipientName: string;
  conversationSubject: string;
  senderName: string;
  messageContent: string;
  conversationUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nova mensagem no chat</title>
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
      background-color: #2563eb;
      color: #ffffff;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 32px 24px;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 16px;
    }
    .message-box {
      background-color: #f8fafc;
      border-left: 4px solid #2563eb;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .message-sender {
      font-weight: 600;
      color: #2563eb;
      margin-bottom: 8px;
    }
    .message-content {
      color: #475569;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .cta-button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 32px;
      border-radius: 6px;
      font-weight: 600;
      margin: 24px 0;
    }
    .cta-button:hover {
      background-color: #1d4ed8;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px;
      text-align: center;
      font-size: 14px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #0f172a;
      }
      .container {
        background-color: #1e293b;
      }
      .content {
        color: #e2e8f0;
      }
      .message-box {
        background-color: #334155;
      }
      .message-content {
        color: #cbd5e1;
      }
      .footer {
        background-color: #0f172a;
        color: #94a3b8;
        border-top-color: #334155;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💬 Nova Mensagem</h1>
    </div>
    <div class="content">
      <p class="greeting">Olá ${data.recipientName},</p>
      <p>Você recebeu uma nova mensagem no chat sobre: <strong>${data.conversationSubject}</strong></p>

      <div class="message-box">
        <div class="message-sender">${data.senderName}</div>
        <div class="message-content">${data.messageContent}</div>
      </div>

      <center>
        <a href="${data.conversationUrl}" class="cta-button">Ver Conversa</a>
      </center>

      <p style="margin-top: 24px; font-size: 14px; color: #64748b;">
        Clique no botão acima para responder diretamente no chat.
      </p>
    </div>
    <div class="footer">
      <p>Este é um email automático. Por favor, não responda diretamente.</p>
      <p>&copy; ${new Date().getFullYear()} Ordax. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Main handler
serve(async (req) => {
  // CORS headers helper
  const corsHeaders = getCorsHeaders(req);

  try {
    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          ...corsHeaders,
          "Access-Control-Allow-Methods": "POST",
        },
      });
    }

    const admin = await assertRateLimitedAdmin(req, "send-email");
    if (admin.rateLimited) return admin.rateLimited;

    // Parse request
    const payload = await req.json();
    const supabase = getServiceClient();

    if (isDirectEmailRequest(payload)) {
      const logId = await createEmailDeliveryLog(supabase, payload);
      const emailService = new EmailService(
        getEmailConfig({
          from: payload.from,
          fromName: payload.fromName,
        }),
      );
      try {
        const result = await emailService.sendEmail({
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
        });

        await updateEmailDeliveryLog(supabase, logId, {
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_message_id: result.id,
        });

        return new Response(
          JSON.stringify({ success: true, emailId: result.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await updateEmailDeliveryLog(supabase, logId, {
          status: "failed",
          error_message: message,
        });
        throw error;
      }
    }

    const notificationPayload = payload as EmailNotificationRequest;

    // Validate payload
    if (
      !notificationPayload.conversationId ||
      !notificationPayload.messageId ||
      !notificationPayload.recipientUserId
    ) {
      throw new Error("Missing required fields");
    }

    // Check if user is online
    const userOnline = await isUserOnline(
      supabase,
      notificationPayload.recipientUserId,
    );
    if (userOnline) {
      console.log("User is online, skipping email notification");
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "user_online" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", notificationPayload.recipientUserId)
      .single();

    if (profileError || !profile?.email) {
      console.error("User email not found:", profileError);

      // Log failed notification
      await recordEmailNotification(supabase, {
        conversationId: notificationPayload.conversationId,
        messageId: notificationPayload.messageId,
        recipientUserId: notificationPayload.recipientUserId,
        status: "failed",
        errorMessage: "no_email",
      });

      return new Response(
        JSON.stringify({ success: false, error: "User email not found" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get conversation details
    const { data: conversation } = await supabase
      .from("support_conversations")
      .select("subject")
      .eq("id", notificationPayload.conversationId)
      .single();

    // Get sender name (admin)
    const { data: message } = await supabase
      .from("support_messages")
      .select("sender_id")
      .eq("id", notificationPayload.messageId)
      .single();

    let senderName = "Suporte";
    if (message?.sender_id) {
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", message.sender_id)
        .single();

      if (senderProfile?.full_name) {
        senderName = senderProfile.full_name;
      }
    }

    // Configure email service
    const emailConfig = getEmailConfig();
    const emailService = new EmailService(emailConfig);

    // Generate email HTML
    const conversationUrl = `${emailConfig.baseUrl}/chat?conversation=${notificationPayload.conversationId}`;
    const emailHTML = generateEmailHTML({
      recipientName: escapeHtml(profile.full_name || "Cliente"),
      conversationSubject: escapeHtml(conversation?.subject || "Atendimento"),
      senderName: escapeHtml(senderName),
      messageContent: escapeHtml(notificationPayload.messageContent),
      conversationUrl,
    });

    // Send email with retry logic
    let emailId: string | null = null;
    let lastError: string | null = null;
    const maxRetries = 3;
    const retryDelays = [1000, 2000, 4000]; // Exponential backoff

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await emailService.sendEmail({
          to: profile.email,
          subject: `Nova mensagem: ${conversation?.subject || "Atendimento"}`,
          html: emailHTML,
        });

        emailId = result.id;
        console.log(
          `Email sent successfully on attempt ${attempt + 1}:`,
          emailId,
        );
        break;
      } catch (error) {
        lastError = (error as Error).message;
        console.error(`Email send attempt ${attempt + 1} failed:`, error);

        if (attempt < maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelays[attempt]),
          );
        }
      }
    }

    // Log notification result
    const notificationStatus = emailId ? "sent" : "failed";
    await recordEmailNotification(supabase, {
      conversationId: notificationPayload.conversationId,
      messageId: notificationPayload.messageId,
      recipientUserId: notificationPayload.recipientUserId,
      status: notificationStatus,
      sentAt: emailId ? toUTC(nowInBahia()).toISOString() : null,
      errorMessage: lastError,
      retryCount: emailId ? 0 : maxRetries,
    });

    if (!emailId) {
      throw new Error(
        `Failed to send email after ${maxRetries} attempts: ${lastError}`,
      );
    }

    return new Response(JSON.stringify({ success: true, emailId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-email function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = errorToStatus(message);
    return new Response(
      JSON.stringify({
        success: false,
        error: status >= 500 ? "Internal server error" : message,
      }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
