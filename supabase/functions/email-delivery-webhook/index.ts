// Email Delivery Status Webhook Handler
// Provider webhooks do not use user JWT; access is protected by EMAIL_WEBHOOK_SECRET.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireRateLimitedSharedSecret } from "../_shared/secret-rate-limit.ts";
import { getServiceClient } from "../_shared/supabase.ts";

interface SendGridEvent {
  email?: string;
  event?: string;
  timestamp?: number;
  "smtp-id"?: string;
  sg_message_id?: string;
  reason?: string;
  status?: string;
}

interface SESEvent {
  eventType?: "Delivery" | "Bounce" | "Complaint" | "Open" | "Click";
  mail?: {
    timestamp?: string;
    messageId?: string;
    destination?: string[];
  };
  bounce?: { bounceType?: string };
  delivery?: { timestamp?: string };
}

type EmailProvider = "sendgrid" | "ses";
type EmailDeliveryLogUpdate = {
  provider_message_id?: string;
  status?: "sent" | "bounced" | "opened" | "clicked";
  sent_at?: string;
  bounced_at?: string;
  opened_at?: string;
  clicked_at?: string;
  error_message?: string;
};

function isEmailProvider(provider: string): provider is EmailProvider {
  return provider === "sendgrid" || provider === "ses";
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requireIsoFromUnixSeconds(value: number | undefined): string {
  if (!Number.isFinite(value) || Number(value) <= 0) {
    throw new Error("Invalid provider event timestamp");
  }
  const date = new Date(Number(value) * 1000);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid provider event timestamp");
  return date.toISOString();
}

function requireIsoDate(value: string | undefined): string {
  if (!value) throw new Error("Missing provider event timestamp");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid provider event timestamp");
  return date.toISOString();
}

async function findDeliveryLogByProviderMessageId(
  supabase: any,
  messageId: string,
): Promise<{ id: string; status: string } | null> {
  const { data, error } = await supabase
    .from("email_delivery_logs")
    .select("id, status")
    .eq("provider_message_id", messageId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to find email delivery log: ${error.message}`);
  }

  return data?.[0] ?? null;
}

async function updateEmailDeliveryLog(
  supabase: any,
  logId: string,
  updates: EmailDeliveryLogUpdate,
): Promise<void> {
  const { error } = await supabase.rpc("update_email_delivery_log", {
    p_log_id: logId,
    p_updates: updates,
  });
  if (error) {
    throw new Error(`Failed to update email delivery log: ${error.message}`);
  }
}

async function handleSendGridWebhook(
  supabase: any,
  events: SendGridEvent[],
): Promise<{ processed: number; ignored: number }> {
  let processed = 0;
  let ignored = 0;

  for (const event of events) {
    const messageId = event.sg_message_id || event["smtp-id"];
    if (!messageId || typeof messageId !== "string") {
      ignored += 1;
      continue;
    }

    const log = await findDeliveryLogByProviderMessageId(supabase, messageId);
    if (!log) {
      // Never guess by recipient address: one recipient may have many messages.
      ignored += 1;
      continue;
    }

    const updates: EmailDeliveryLogUpdate = { provider_message_id: messageId };

    switch (event.event) {
      case "delivered":
        updates.status = "sent";
        updates.sent_at = requireIsoFromUnixSeconds(event.timestamp);
        break;
      case "bounce":
      case "dropped":
        updates.status = "bounced";
        updates.bounced_at = requireIsoFromUnixSeconds(event.timestamp);
        updates.error_message = event.reason || event.status || "Email bounced";
        break;
      case "open":
        updates.status = "opened";
        updates.opened_at = requireIsoFromUnixSeconds(event.timestamp);
        break;
      case "click":
        updates.status = "clicked";
        updates.clicked_at = requireIsoFromUnixSeconds(event.timestamp);
        break;
      case "processed":
        if (log.status !== "pending") {
          ignored += 1;
          continue;
        }
        updates.status = "sent";
        updates.sent_at = requireIsoFromUnixSeconds(event.timestamp);
        break;
      case "deferred":
        ignored += 1;
        continue;
      default:
        ignored += 1;
        continue;
    }

    await updateEmailDeliveryLog(supabase, log.id, updates);
    processed += 1;
  }

  return { processed, ignored };
}

function unwrapSesEvent(notification: unknown): SESEvent {
  if (!notification || typeof notification !== "object" || Array.isArray(notification)) {
    throw new Error("Invalid SES payload");
  }

  const wrapper = notification as { Message?: unknown };
  if (typeof wrapper.Message === "string") {
    const parsed = JSON.parse(wrapper.Message);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid SES message payload");
    }
    return parsed as SESEvent;
  }

  if (wrapper.Message && typeof wrapper.Message === "object") {
    return wrapper.Message as SESEvent;
  }

  return notification as SESEvent;
}

async function handleSESWebhook(
  supabase: any,
  notification: unknown,
): Promise<{ processed: number; ignored: number }> {
  const event = unwrapSesEvent(notification);
  const messageId = event.mail?.messageId;
  if (!messageId) return { processed: 0, ignored: 1 };

  const log = await findDeliveryLogByProviderMessageId(supabase, messageId);
  if (!log) return { processed: 0, ignored: 1 };

  const updates: EmailDeliveryLogUpdate = { provider_message_id: messageId };
  switch (event.eventType) {
    case "Delivery":
      updates.status = "sent";
      updates.sent_at = requireIsoDate(event.delivery?.timestamp || event.mail?.timestamp);
      break;
    case "Bounce":
      updates.status = "bounced";
      updates.bounced_at = requireIsoDate(event.mail?.timestamp);
      updates.error_message = event.bounce?.bounceType
        ? `Bounce type: ${event.bounce.bounceType}`
        : "Email bounced";
      break;
    case "Complaint":
      updates.status = "bounced";
      updates.bounced_at = requireIsoDate(event.mail?.timestamp);
      updates.error_message = "Recipient marked as spam";
      break;
    case "Open":
      updates.status = "opened";
      updates.opened_at = requireIsoDate(event.mail?.timestamp);
      break;
    case "Click":
      updates.status = "clicked";
      updates.clicked_at = requireIsoDate(event.mail?.timestamp);
      break;
    default:
      return { processed: 0, ignored: 1 };
  }

  await updateEmailDeliveryLog(supabase, log.id, updates);
  return { processed: 1, ignored: 0 };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { ...corsHeaders, "Access-Control-Allow-Methods": "POST" },
    });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
    }

    const forbidden = await requireRateLimitedSharedSecret(
      req,
      "EMAIL_WEBHOOK_SECRET",
      "x-webhook-secret",
      "email-delivery-webhook",
    );
    if (forbidden) return forbidden;

    const provider = new URL(req.url).searchParams.get("provider") || "sendgrid";
    if (!isEmailProvider(provider)) {
      return jsonResponse({ error: "Unsupported provider" }, 400, corsHeaders);
    }

    const body = await req.json().catch(() => null);
    if (body === null) {
      return jsonResponse({ error: "Invalid JSON payload" }, 400, corsHeaders);
    }

    const supabase = getServiceClient();
    const result = provider === "sendgrid"
      ? Array.isArray(body)
        ? await handleSendGridWebhook(supabase, body)
        : (() => {
            throw new Error("SendGrid payload must be an array");
          })()
      : await handleSESWebhook(supabase, body);

    return jsonResponse({ success: true, ...result }, 200, corsHeaders);
  } catch (error) {
    console.error("Webhook processing error:", error);
    const message = error instanceof Error ? error.message : String(error);
    const status =
      message.includes("payload") ||
      message.includes("timestamp") ||
      message.includes("JSON")
        ? 400
        : 500;
    return jsonResponse(
      { error: status === 400 ? "Invalid webhook payload" : "Webhook processing failed" },
      status,
      corsHeaders,
    );
  }
});
