// Edge Function: send-group-emails-batch
// Sends batch email notifications for group messages
// V1 Simple Approach: Always send email to all members (respecting notification preferences)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Types
interface GroupEmailBatchRequest {
  groupId: string;
  messageId: string;
}

interface GroupMember {
  user_id: string;
  email: string;
  full_name: string;
  email_notifications_enabled: boolean;
}

interface GroupMessageDetails {
  id: string;
  message: string;
  sender_id: string;
  sender_name: string;
  group_id: string;
  group_name: string;
  created_at: string;
}

interface EmailServiceConfig {
  provider: 'resend' | 'sendgrid';
  apiKey: string;
  fromEmail: string;
  fromName: string;
  baseUrl: string;
}

// Email service abstraction (reuse from send-email)
class EmailService {
  constructor(private config: EmailServiceConfig) {}

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<{ id: string }> {
    if (this.config.provider === 'resend') {
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
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
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
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: params.to }],
        }],
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName,
        },
        subject: params.subject,
        content: [{
          type: 'text/html',
          value: params.html,
        }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SendGrid API error: ${error}`);
    }

    const messageId = response.headers.get('x-message-id') || 'unknown';
    return { id: messageId };
  }
}

// Generate email HTML template for group messages
function generateGroupEmailHTML(data: {
  recipientName: string;
  groupName: string;
  senderName: string;
  messagePreview: string;
  groupUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nova mensagem no grupo</title>
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
      background-color: #7c3aed;
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
    .group-badge {
      display: inline-block;
      background-color: #ede9fe;
      color: #7c3aed;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .message-box {
      background-color: #f8fafc;
      border-left: 4px solid #7c3aed;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .message-sender {
      font-weight: 600;
      color: #7c3aed;
      margin-bottom: 8px;
    }
    .message-content {
      color: #475569;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .cta-button {
      display: inline-block;
      background-color: #7c3aed;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 32px;
      border-radius: 6px;
      font-weight: 600;
      margin: 24px 0;
    }
    .cta-button:hover {
      background-color: #6d28d9;
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
      .group-badge {
        background-color: #2e1065;
        color: #c4b5fd;
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
      <h1>📢 Nova Mensagem no Grupo</h1>
    </div>
    <div class="content">
      <p class="greeting">Olá ${data.recipientName},</p>
      <p>Você recebeu uma nova mensagem no grupo:</p>
      <div class="group-badge">${data.groupName}</div>
      
      <div class="message-box">
        <div class="message-sender">${data.senderName}</div>
        <div class="message-content">${data.messagePreview}</div>
      </div>
      
      <center>
        <a href="${data.groupUrl}" class="cta-button">Ver Mensagem Completa</a>
      </center>
      
      <p style="margin-top: 24px; font-size: 14px; color: #64748b;">
        Clique no botão acima para visualizar a mensagem completa e o histórico do grupo.
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

// Get group message details with sender and group info
async function getGroupMessageDetails(
  supabase: any,
  messageId: string
): Promise<GroupMessageDetails | null> {
  const { data: message, error: messageError } = await supabase
    .from('chat_group_messages')
    .select(`
      id,
      message,
      sender_id,
      group_id,
      created_at,
      chat_groups!inner (
        name
      )
    `)
    .eq('id', messageId)
    .single();

  if (messageError || !message) {
    console.error('Error fetching message details:', messageError);
    return null;
  }

  // Get sender name
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', message.sender_id)
    .single();

  return {
    id: message.id,
    message: message.message,
    sender_id: message.sender_id,
    sender_name: senderProfile?.full_name || 'Admin',
    group_id: message.group_id,
    group_name: message.chat_groups.name,
    created_at: message.created_at,
  };
}

// Get group members with email preferences
async function getGroupMembers(
  supabase: any,
  groupId: string
): Promise<GroupMember[]> {
  const { data: members, error } = await supabase
    .from('chat_group_members')
    .select(`
      user_id,
      profiles!inner (
        email,
        full_name,
        email_notifications_enabled
      )
    `)
    .eq('group_id', groupId);

  if (error) {
    console.error('Error fetching group members:', error);
    return [];
  }

  return members.map((m: any) => ({
    user_id: m.user_id,
    email: m.profiles.email,
    full_name: m.profiles.full_name,
    email_notifications_enabled: m.profiles.email_notifications_enabled ?? true,
  }));
}

// Send email with retry logic (up to 3 attempts with exponential backoff)
async function sendEmailWithRetry(
  emailService: EmailService,
  params: {
    to: string;
    subject: string;
    html: string;
  },
  maxRetries: number = 3
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const retryDelays = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await emailService.sendEmail(params);
      console.log(`Email sent successfully on attempt ${attempt + 1}:`, result.id);
      return { success: true, emailId: result.id };
    } catch (error) {
      console.error(`Email send attempt ${attempt + 1} failed:`, (error as Error)r as Error)r as Error)r as Error).message);
      
      if (attempt < maxRetries - 1) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
      } else {
        // Final attempt failed
       (error as Error)rn { s(error as Error)s: fal(error as Error)rror: error.message };
      }
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

// Main handler
serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  try {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Methods': 'POST',
        },
      });
    }

    // Parse request
    const payload: GroupEmailBatchRequest = await req.json();
    console.log('Group email batch request:', payload);

    // Validate payload
    if (!payload.groupId || !payload.messageId) {
      throw new Error('Missing required fields: groupId and messageId');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get message details
    const messageDetails = await getGroupMessageDetails(supabase, payload.messageId);
    if (!messageDetails) {
      throw new Error('Message not found');
    }

    // Get group members
    const members = await getGroupMembers(supabase, payload.groupId);
    console.log(`Found ${members.length} members in group`);

    // Filter members with email notifications enabled
    const membersToNotify = members.filter(m => m.email_notifications_enabled);
    console.log(`${membersToNotify.length} members have email notifications enabled`);

    if (membersToNotify.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          skipped: members.length,
          reason: 'no_members_with_notifications_enabled',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Configure email service
    const emailProvider = Deno.env.get('EMAIL_PROVIDER') || 'resend';
    const emailApiKey = Deno.env.get('EMAIL_API_KEY');
    const emailFrom = Deno.env.get('EMAIL_FROM') || 'suporte@ordax.com.br';
    const emailFromName = Deno.env.get('EMAIL_FROM_NAME') || 'Ordax';
    const baseUrl = Deno.env.get('BASE_URL') || 'http://localhost:8080';

    if (!emailApiKey) {
      throw new Error('EMAIL_API_KEY not configured');
    }

    const emailConfig: EmailServiceConfig = {
      provider: emailProvider as 'resend' | 'sendgrid',
      apiKey: emailApiKey,
      fromEmail: emailFrom,
      fromName: emailFromName,
      baseUrl: baseUrl,
    };

    const emailService = new EmailService(emailConfig);

    // Generate message preview (first 200 chars)
    const messagePreview = messageDetails.message.length > 200
      ? messageDetails.message.substring(0, 200) + '...'
      : messageDetails.message;

    // Send emails to all members (with retry logic)
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const member of membersToNotify) {
      try {
        // Generate group URL
        const groupUrl = `${baseUrl}/groups/${payload.groupId}`;

        // Generate email HTML
        const emailHTML = generateGroupEmailHTML({
          recipientName: member.full_name || 'Membro',
          groupName: messageDetails.group_name,
          senderName: messageDetails.sender_name,
          messagePreview,
          groupUrl,
        });

        // Send email with retry logic
        const result = await sendEmailWithRetry(emailService, {
          to: member.email,
          subject: `Nova mensagem em ${messageDetails.group_name}`,
          html: emailHTML,
        });

        if (result.success) {
          results.sent++;
          console.log(`Email sent to ${member.email}: ${result.emailId}`);
        } else {
          results.failed++;
          results.errors.push(`${member.email}: ${result.error}`);
          console.error(`Failed to send email to ${member.email}:`, result.error);
        }
      } catch (error) {
        results.failed++;
    (error as Error)esults.errors.pus(error as Error)member.email}: ${error.message}`);
        console.error(`Error sending email to ${member.email}:`, error);
      }
    }

    console.log('Batch email results:', results);

    return new Response(
      JSON.stringify({
        success: true,
        sent: results.sent,
        failed: results.failed,
        total: membersToNotify.length,
        errors: results.errors.length > 0 ? results.errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-group-emails-batch function:', error);
    return new Response(
      JSON.st(error as Error)fy({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
