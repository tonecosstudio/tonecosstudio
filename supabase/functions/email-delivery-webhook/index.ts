// Email Delivery Status Webhook Handler
// Handles webhooks from email providers (SendGrid, AWS SES) to track delivery status

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireSharedSecret } from '../_shared/secrets.ts';
import { getServiceClient } from '../_shared/supabase.ts';

interface SendGridEvent {
  email: string;
  event: 'delivered' | 'bounce' | 'open' | 'click' | 'dropped' | 'deferred' | 'processed';
  timestamp: number;
  'smtp-id'?: string;
  sg_message_id?: string;
  reason?: string;
  status?: string;
}

interface SESEvent {
  eventType: 'Delivery' | 'Bounce' | 'Complaint' | 'Open' | 'Click';
  mail: {
    timestamp: string;
    messageId: string;
    destination: string[];
  };
  bounce?: {
    bounceType: string;
    bouncedRecipients: Array<{ emailAddress: string; status: string }>;
  };
  delivery?: {
    timestamp: string;
    recipients: string[];
  };
}

type EmailProvider = 'sendgrid' | 'ses';

interface EmailDeliveryLog {
  id: string;
  status: string;
}

type EmailDeliveryLogUpdate = {
  provider_message_id?: string;
  status?: 'sent' | 'bounced' | 'opened' | 'clicked';
  sent_at?: string;
  bounced_at?: string;
  opened_at?: string;
  clicked_at?: string;
  error_message?: string;
};

function isEmailProvider(provider: string): provider is EmailProvider {
  return provider === 'sendgrid' || provider === 'ses';
}

function jsonResponse(body: Record<string, unknown>, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function updateEmailDeliveryLog(
  supabaseClient: any,
  logId: string,
  updates: EmailDeliveryLogUpdate,
): Promise<boolean> {
  const { error } = await supabaseClient.rpc('update_email_delivery_log', {
    p_log_id: logId,
    p_updates: updates,
  });

  if (error) {
    console.error('Error updating log entry:', error);
    return false;
  }

  return true;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    const forbidden = requireSharedSecret(req, 'EMAIL_WEBHOOK_SECRET', 'x-webhook-secret');
    if (forbidden) {
      return new Response(forbidden.body, {
        status: forbidden.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = getServiceClient();

    // Determine provider from path or header
    const url = new URL(req.url);
    const provider = url.searchParams.get('provider') || 'sendgrid';
    if (!isEmailProvider(provider)) {
      return jsonResponse({ error: 'Unsupported provider' }, 400, corsHeaders);
    }

    const body = await req.json().catch(() => null);
    if (body === null) {
      return jsonResponse({ error: 'Invalid JSON payload' }, 400, corsHeaders);
    }

    if (provider === 'sendgrid') {
      if (!Array.isArray(body)) {
        return jsonResponse({ error: 'SendGrid payload must be an array' }, 400, corsHeaders);
      }
      await handleSendGridWebhook(supabaseClient, body);
    } else {
      await handleSESWebhook(supabaseClient, body);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function findDeliveryLogForSendGridEvent(
  supabaseClient: any,
  messageId: string,
  recipientEmail: string,
): Promise<EmailDeliveryLog | null> {
  const { data: byMessageId, error: messageError } = await supabaseClient
    .from('email_delivery_logs')
    .select('id, status')
    .eq('provider_message_id', messageId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (messageError) {
    console.error('Error finding log entry by provider message ID:', messageError);
    return null;
  }

  if (byMessageId?.length) {
    return byMessageId[0] as EmailDeliveryLog;
  }

  const { data: byRecipient, error: recipientError } = await supabaseClient
    .from('email_delivery_logs')
    .select('id, status')
    .eq('recipient_email', recipientEmail)
    .order('created_at', { ascending: false })
    .limit(1);

  if (recipientError) {
    console.error('Error finding log entry by recipient email:', recipientError);
    return null;
  }

  return byRecipient?.[0] as EmailDeliveryLog | null;
}

async function handleSendGridWebhook(supabaseClient: any, events: SendGridEvent[]) {
  for (const event of events) {
    try {
      const messageId = event.sg_message_id || event['smtp-id'];

      if (!messageId) {
        console.warn('SendGrid event ignored because it has no message ID');
        continue;
      }

      const log = await findDeliveryLogForSendGridEvent(supabaseClient, messageId, event.email);
      if (!log) {
        console.warn('No log entry found for message:', messageId);
        continue;
      }

      const updates: EmailDeliveryLogUpdate = {
        provider_message_id: messageId,
      };

      // Map SendGrid events to our status
      switch (event.event) {
        case 'delivered':
          updates.status = 'sent'; // Already sent, now delivered
          updates.sent_at = new Date(event.timestamp * 1000).toISOString();
          break;
        case 'bounce':
        case 'dropped':
          updates.status = 'bounced';
          updates.bounced_at = new Date(event.timestamp * 1000).toISOString();
          updates.error_message = event.reason || event.status || 'Email bounced';
          break;
        case 'open':
          updates.status = 'opened';
          updates.opened_at = new Date(event.timestamp * 1000).toISOString();
          break;
        case 'click':
          updates.status = 'clicked';
          updates.clicked_at = new Date(event.timestamp * 1000).toISOString();
          break;
        case 'processed':
          // Email accepted by SendGrid, keep as sent
          if (log.status === 'pending') {
            updates.status = 'sent';
            updates.sent_at = new Date(event.timestamp * 1000).toISOString();
          }
          break;
        case 'deferred':
          // Temporary failure, don't update status
          console.log('Email deferred:', messageId);
          continue;
      }

      if (await updateEmailDeliveryLog(supabaseClient, log.id, updates)) {
        console.log(`Updated log ${log.id} with event ${event.event}`);
      }
    } catch (error) {
      console.error('Error processing SendGrid event:', error);
    }
  }
}

async function handleSESWebhook(supabaseClient: any, notification: any) {
  try {
    // SES sends notifications wrapped in SNS
    const message = typeof notification.Message === 'string'
      ? JSON.parse(notification.Message)
      : notification.Message;

    const event: SESEvent = message;
    const messageId = event?.mail?.messageId;

    if (!messageId) {
      console.warn('SES event ignored because it has no message ID');
      return;
    }

    // Find log entry by provider message ID
    const { data: logs, error: findError } = await supabaseClient
      .from('email_delivery_logs')
      .select('id, status')
      .eq('provider_message_id', messageId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (findError) {
      console.error('Error finding log entry:', findError);
      return;
    }

    if (!logs || logs.length === 0) {
      console.warn('No log entry found for message:', messageId);
      return;
    }

    const log = logs[0];
    const updates: EmailDeliveryLogUpdate = {
      provider_message_id: messageId,
    };

    // Map SES events to our status
    switch (event.eventType) {
      case 'Delivery':
        updates.status = 'sent';
        if (event.delivery) {
          updates.sent_at = event.delivery.timestamp;
        }
        break;
      case 'Bounce':
        updates.status = 'bounced';
        updates.bounced_at = new Date().toISOString();
        if (event.bounce) {
          updates.error_message = `Bounce type: ${event.bounce.bounceType}`;
        }
        break;
      case 'Complaint':
        updates.status = 'bounced';
        updates.error_message = 'Recipient marked as spam';
        break;
      case 'Open':
        updates.status = 'opened';
        updates.opened_at = new Date().toISOString();
        break;
      case 'Click':
        updates.status = 'clicked';
        updates.clicked_at = new Date().toISOString();
        break;
    }

    if (await updateEmailDeliveryLog(supabaseClient, log.id, updates)) {
      console.log(`Updated log ${log.id} with event ${event.eventType}`);
    }
  } catch (error) {
    console.error('Error processing SES event:', error);
  }
}
