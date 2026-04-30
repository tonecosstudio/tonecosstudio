// Edge Function: send-email
// Handles email notifications for chat messages with grouping and retry logic

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { nowInBahia, toUTC, addDays } from "../_shared/timezone.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  assertAdmin,
  errorToStatus,
  getServiceClient,
} from "../_shared/supabase.ts";

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
}

interface EmailServiceConfig {
  provider: "resend" | "sendgrid";
  apiKey: string;
  fromEmail: string;
  fromName: string;
  baseUrl: string;
}

// Email service abstraction
class EmailService {
  constructor(private config: EmailServiceConfig) {}

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<{ id: string }> {
    if (this.config.provider === "resend") {
      return this.sendViaResend(params);
    } else {
      return this.sendViaSendGrid(params);
    }
  }

  private async sendViaResend(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<{ id: string }> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const data = await response.json();
    return { id: data.id };
  }

  private async sendViaSendGrid(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<{ id: string }> {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: params.to }],
          },
        ],
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName,
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

    const messageId = response.headers.get("x-message-id") || "unknown";
    return { id: messageId };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isDirectEmailRequest(payload: unknown): payload is DirectEmailRequest {
  const data = payload as Partial<DirectEmailRequest>;
  return !!data?.to && !!data?.subject && !!data?.html;
}

function getEmailConfig(overrides?: {
  from?: string;
  fromName?: string;
}): EmailServiceConfig {
  const emailProvider = Deno.env.get("EMAIL_PROVIDER") || "resend";
  const emailApiKey = Deno.env.get("EMAIL_API_KEY");
  const emailFrom =
    overrides?.from || Deno.env.get("EMAIL_FROM") || "suporte@ordax.com.br";
  const emailFromName =
    overrides?.fromName || Deno.env.get("EMAIL_FROM_NAME") || "Ordax Suporte";
  const baseUrl =
    Deno.env.get("BASE_URL") ||
    Deno.env.get("SITE_URL") ||
    "https://ordax.com.br";

  if (!emailApiKey) {
    throw new Error("EMAIL_API_KEY not configured");
  }

  return {
    provider: emailProvider as "resend" | "sendgrid",
    apiKey: emailApiKey,
    fromEmail: emailFrom,
    fromName: emailFromName,
    baseUrl,
  };
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

    await assertAdmin(req);

    // Parse request
    const payload = await req.json();

    if (isDirectEmailRequest(payload)) {
      const emailService = new EmailService(
        getEmailConfig({
          from: payload.from,
          fromName: payload.fromName,
        }),
      );
      const result = await emailService.sendEmail({
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      });

      return new Response(
        JSON.stringify({ success: true, emailId: result.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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

    // Initialize Supabase client
    const supabase = getServiceClient();

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
      await supabase.from("email_notifications").insert({
        conversation_id: notificationPayload.conversationId,
        message_id: notificationPayload.messageId,
        recipient_user_id: notificationPayload.recipientUserId,
        status: "failed",
        error_message: "no_email",
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
    await supabase.from("email_notifications").insert({
      conversation_id: notificationPayload.conversationId,
      message_id: notificationPayload.messageId,
      recipient_user_id: notificationPayload.recipientUserId,
      status: notificationStatus,
      sent_at: emailId ? toUTC(nowInBahia()).toISOString() : null,
      error_message: lastError,
      retry_count: emailId ? 0 : maxRetries,
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
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: errorToStatus(message),
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
