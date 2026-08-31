// Edge Function: send-email
// Supports trusted service-to-service email delivery and admin-triggered chat notifications.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { assertRateLimitedAdmin } from "../_shared/admin-rate-limit.ts";
import { errorToStatus, getServiceClient } from "../_shared/supabase.ts";
import {
  EmailService,
  escapeHtml,
  getEmailConfig,
  sanitizeEmailSubject,
} from "../_shared/email.ts";
import { isUUID } from "../_shared/validation.ts";

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
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const data = payload as Partial<DirectEmailRequest>;
  return (
    typeof data.to === "string" &&
    data.to.trim().length > 0 &&
    typeof data.subject === "string" &&
    data.subject.trim().length > 0 &&
    typeof data.html === "string" &&
    data.html.trim().length > 0
  );
}

function isServiceRoleRequest(req: Request): boolean {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization");
  return Boolean(serviceRoleKey && authorization === `Bearer ${serviceRoleKey}`);
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
  if (!clean || clean.length > 80 || !/^[a-z0-9_-]+$/i.test(clean)) {
    throw new Error("emailType is invalid");
  }
  return clean;
}

function normalizeUserId(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !isUUID(value)) {
    throw new Error("userId must be a valid UUID");
  }
  return value;
}

function validateNotificationPayload(value: unknown): EmailNotificationRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid notification payload");
  }
  const payload = value as Partial<EmailNotificationRequest>;
  if (
    typeof payload.conversationId !== "string" ||
    !isUUID(payload.conversationId) ||
    typeof payload.messageId !== "string" ||
    !isUUID(payload.messageId) ||
    typeof payload.recipientUserId !== "string" ||
    !isUUID(payload.recipientUserId) ||
    typeof payload.messageContent !== "string" ||
    !payload.messageContent.trim() ||
    payload.messageContent.length > 5000
  ) {
    throw new Error("Invalid notification payload");
  }
  return payload as EmailNotificationRequest;
}

async function createEmailDeliveryLog(
  service: ReturnType<typeof getServiceClient>,
  payload: DirectEmailRequest,
): Promise<string | null> {
  const { data, error } = await service.rpc("create_email_delivery_log", {
    p_user_id: normalizeUserId(payload.userId),
    p_recipient_email: payload.to,
    p_email_type: normalizeEmailType(payload.emailType),
    p_subject: sanitizeEmailSubject(payload.subject),
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
  if (error) console.error("Error updating email delivery log:", error.message);
}

async function isUserOnline(supabase: any, userId: string): Promise<boolean> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("support_messages")
    .select("created_at")
    .eq("sender_id", userId)
    .gte("created_at", fiveMinutesAgo)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error checking user online status:", error.message);
    return false;
  }
  return Boolean(data?.length);
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
  if (error) console.error("Error recording email notification event:", error.message);
}

function generateEmailHTML(data: {
  recipientName: string;
  conversationSubject: string;
  senderName: string;
  messageContent: string;
  conversationUrl: string;
}): string {
  const recipientName = escapeHtml(data.recipientName);
  const conversationSubject = escapeHtml(data.conversationSubject);
  const senderName = escapeHtml(data.senderName);
  const messageContent = escapeHtml(data.messageContent);
  const conversationUrl = escapeHtml(data.conversationUrl);

  return `
<!doctype html>
<html lang="pt-BR">
  <body style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
    <h1>Nova mensagem</h1>
    <p>Olá, ${recipientName}.</p>
    <p>Você recebeu uma nova mensagem sobre <strong>${conversationSubject}</strong>.</p>
    <div style="background:#f8fafc;border-left:4px solid #2563eb;padding:16px;margin:24px 0">
      <strong>${senderName}</strong>
      <p style="white-space:pre-wrap">${messageContent}</p>
    </div>
    <p><a href="${conversationUrl}">Ver conversa</a></p>
  </body>
</html>`.trim();
}

async function authorizeDirectRequest(req: Request): Promise<void> {
  if (isServiceRoleRequest(req)) return;
  await assertRateLimitedAdmin(req, "send-email-direct");
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          ...corsHeaders,
          "Access-Control-Allow-Methods": "POST",
        },
      });
    }
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json().catch(() => {
      throw new Error("Invalid JSON payload");
    });
    const supabase = getServiceClient();

    if (isDirectEmailRequest(payload)) {
      await authorizeDirectRequest(req);
      const logId = await createEmailDeliveryLog(supabase, payload);
      const emailService = new EmailService(
        getEmailConfig({ from: payload.from, fromName: payload.fromName }),
      );

      try {
        const result = await emailService.sendEmail({
          to: payload.to,
          subject: sanitizeEmailSubject(payload.subject),
          html: payload.html,
        });
        await updateEmailDeliveryLog(supabase, logId, {
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_message_id: result.id,
        });
        return new Response(JSON.stringify({ success: true, emailId: result.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await updateEmailDeliveryLog(supabase, logId, {
          status: "failed",
          error_message: message,
        });
        throw error;
      }
    }

    await assertRateLimitedAdmin(req, "send-email-chat");
    const notification = validateNotificationPayload(payload);

    if (await isUserOnline(supabase, notification.recipientUserId)) {
      await recordEmailNotification(supabase, {
        conversationId: notification.conversationId,
        messageId: notification.messageId,
        recipientUserId: notification.recipientUserId,
        status: "skipped",
        errorMessage: "user_online",
      });
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "user_online" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const [{ data: profile, error: profileError }, { data: conversation, error: conversationError }, { data: message, error: messageError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", notification.recipientUserId)
          .single(),
        supabase
          .from("support_conversations")
          .select("subject")
          .eq("id", notification.conversationId)
          .single(),
        supabase
          .from("support_messages")
          .select("sender_id")
          .eq("id", notification.messageId)
          .single(),
      ]);

    if (profileError || !profile?.email) {
      await recordEmailNotification(supabase, {
        conversationId: notification.conversationId,
        messageId: notification.messageId,
        recipientUserId: notification.recipientUserId,
        status: "failed",
        errorMessage: "no_email",
      });
      throw new Error("User email not found");
    }
    if (conversationError || !conversation) throw new Error("Conversation not found");
    if (messageError || !message) throw new Error("Message not found");

    let senderName = "Suporte";
    if (message.sender_id) {
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", message.sender_id)
        .maybeSingle();
      if (senderProfile?.full_name) senderName = senderProfile.full_name;
    }

    const emailConfig = getEmailConfig();
    const conversationUrl = `${emailConfig.baseUrl}/chat?conversation=${encodeURIComponent(notification.conversationId)}`;
    const emailHTML = generateEmailHTML({
      recipientName: profile.full_name || "Cliente",
      conversationSubject: conversation.subject || "Atendimento",
      senderName,
      messageContent: notification.messageContent,
      conversationUrl,
    });
    const emailService = new EmailService(emailConfig);

    let emailId: string | null = null;
    let lastError: string | null = null;
    let attemptsUsed = 0;
    const retryDelays = [1000, 2000, 4000];

    for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
      attemptsUsed = attempt + 1;
      try {
        const result = await emailService.sendEmail({
          to: profile.email,
          subject: sanitizeEmailSubject(
            `Nova mensagem: ${conversation.subject || "Atendimento"}`,
          ),
          html: emailHTML,
        });
        emailId = result.id;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        if (attempt < retryDelays.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
        }
      }
    }

    await recordEmailNotification(supabase, {
      conversationId: notification.conversationId,
      messageId: notification.messageId,
      recipientUserId: notification.recipientUserId,
      status: emailId ? "sent" : "failed",
      sentAt: emailId ? new Date().toISOString() : null,
      errorMessage: lastError,
      retryCount: Math.max(attemptsUsed - 1, 0),
    });

    if (!emailId) {
      throw new Error(`Failed to send email after ${attemptsUsed} attempts`);
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
