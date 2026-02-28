// Email Delivery Status Webhook Handler
// Handles webhooks from email providers (SendGrid, AWS SES) to track delivery status

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Determine provider from path or header
    const url = new URL(req.url);
    const provider = url.searchParams.get('provider') || 'sendgrid';

    const body = await req.json();

    if (provider === 'sendgrid') {
      await handleSendGridWebhook(supabaseClient, body);
    } else if (provider === 'ses') {
      await handleSESWebhook(supabaseClient, body);
    } else {
      return new Response(
        JSON.stringify({ error: 'Unsupported provider' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleSendGridWebhook(supabaseClient: any, events: SendGridEvent[]) {
  for (const event of events) {
    try {
      const messageId = event.sg_message_id || event['smtp-id'];
      
      if (!messageId) {
        console.warn('No message ID in SendGrid event:', event);
        continue;
      }

      // Find log entry by provider message ID or email
      const { data: logs, error: findError } = await supabaseClient
        .from('email_delivery_logs')
        .select('id, status')
        .or(`provider_message_id.eq.${messageId},recipient_email.eq.${event.email}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (findError) {
        console.error('Error finding log entry:', findError);
        continue;
      }

      if (!logs || logs.length === 0) {
        console.warn('No log entry found for message:', messageId);
        continue;
      }

      const log = logs[0];
      const updates: any = {
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

      // Update log entry
      const { error: updateError } = await supabaseClient
        .from('email_delivery_logs')
        .update(updates)
        .eq('id', log.id);

      if (updateError) {
        console.error('Error updating log entry:', updateError);
      } else {
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
    const messageId = event.mail.messageId;

    if (!messageId) {
      console.warn('No message ID in SES event:', event);
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
    const updates: any = {
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

    // Update log entry
    const { error: updateError } = await supabaseClient
      .from('email_delivery_logs')
      .update(updates)
      .eq('id', log.id);

    if (updateError) {
      console.error('Error updating log entry:', updateError);
    } else {
      console.log(`Updated log ${log.id} with event ${event.eventType}`);
    }
  } catch (error) {
    console.error('Error processing SES event:', error);
  }
}
