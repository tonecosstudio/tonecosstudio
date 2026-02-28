/**
 * Cron Job: Balance Deadline Checker
 * 
 * Runs daily at 10:00 Bahia Time to check standalone purchase balance payment deadlines.
 * 
 * Actions performed:
 * 1. Find standalone purchases with status 'awaiting_balance' AND balance_due_date < today
 * 2. For each overdue purchase, call cancelForNonPayment
 * 3. Find purchases due in 1 day, send urgent reminder
 * 4. Log all actions
 * 
 * Requirements:
 * - 4.6: Cancel order and retain deposit if balance not paid by deadline
 * - 17.7: Send balance payment reminder when production complete
 * - 17.8: Send urgent payment reminder 1 day before deadline
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { logCronStart, logCronSuccess, logCronError } from "../_shared/cron-logger.ts";
import { nowInBahia } from "../_shared/timezone.ts";

interface StandalonePurchase {
  id: string;
  user_id: string;
  collection_id: string;
  status: string;
  balance_due_date: string;
  balance_amount: number;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
}

interface Collection {
  id: string;
  name: string;
}

/**
 * Sends urgent balance payment reminder email
 */
async function sendUrgentBalanceReminder(params: {
  to: string;
  userName: string | null;
  collectionName: string;
  balanceAmount: number;
  dueDate: string;
  purchaseId: string;
}): Promise<void> {
  const emailProvider = Deno.env.get('EMAIL_PROVIDER') || 'resend';
  const emailApiKey = Deno.env.get('EMAIL_API_KEY');
  const emailFrom = Deno.env.get('EMAIL_FROM') || 'noreply@ordax.com.br';
  const emailFromName = Deno.env.get('EMAIL_FROM_NAME') || 'ORDAX';

  if (!emailApiKey) {
    console.warn('EMAIL_API_KEY not configured, skipping reminder email');
    return;
  }

  const subject = `⚠️ URGENTE: Pagamento do Saldo Vence Amanhã - ${params.collectionName}`;
  const htmlContent = generateUrgentReminderEmailHTML({
    userName: params.userName || 'Colecionador',
    collectionName: params.collectionName,
    balanceAmount: params.balanceAmount,
    dueDate: params.dueDate,
    purchaseId: params.purchaseId,
  });

  try {
    await sendEmail({
      provider: emailProvider as 'resend' | 'sendgrid',
      apiKey: emailApiKey,
      from: emailFrom,
      fromName: emailFromName,
      to: params.to,
      subject,
      html: htmlContent,
    });

    console.log(`Urgent balance reminder sent to: ${params.to}`);
  } catch (error) {
    console.error(`Failed to send urgent reminder to ${params.to}:`, error);
    throw error;
  }
}

/**
 * Generates HTML content for the urgent balance reminder email
 */
function generateUrgentReminderEmailHTML(params: {
  userName: string;
  collectionName: string;
  balanceAmount: number;
  dueDate: string;
  purchaseId: string;
}): string {
  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(params.balanceAmount);

  const formattedDate = new Date(params.dueDate).toLocaleDateString('pt-BR', {
    timeZone: 'America/Bahia',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pagamento Urgente</title>
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
    .greeting {
      font-size: 18px;
      margin-bottom: 24px;
      color: #374151;
    }
    .urgent-box {
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      border-left: 4px solid #dc2626;
      padding: 24px;
      margin: 24px 0;
      border-radius: 8px;
    }
    .urgent-box h2 {
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
    }
    .info-value {
      color: #6b7280;
    }
    .amount {
      font-size: 32px;
      font-weight: 700;
      color: #dc2626;
      text-align: center;
      margin: 24px 0;
    }
    .warning-text {
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
      <h1>⚠️ Pagamento Urgente!</h1>
      <p>Prazo vence amanhã</p>
    </div>
    <div class="content">
      <p class="greeting">Olá, ${params.userName}!</p>
      
      <div class="urgent-box">
        <h2>⏰ Atenção: Prazo Final Amanhã</h2>
        <div class="info-row">
          <span class="info-label">Coleção:</span>
          <span class="info-value">${params.collectionName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Prazo Final:</span>
          <span class="info-value">${formattedDate}</span>
        </div>
      </div>
      
      <p style="text-align: center; font-size: 18px; color: #374151; margin: 24px 0;">
        Valor do Saldo:
      </p>
      <div class="amount">${formattedAmount}</div>
      
      <div class="warning-text">
        <strong>⚠️ Importante:</strong> Este é o último dia para realizar o pagamento do saldo. 
        Se o pagamento não for confirmado até amanhã, seu pedido será cancelado automaticamente 
        e o depósito de R$ 100,00 será retido como Arras Confirmatórias (depósito não reembolsável), 
        conforme os termos de compra.
      </div>
      
      <p style="margin-top: 24px;">
        Sua peça exclusiva da coleção <strong>${params.collectionName}</strong> já está pronta 
        e aguardando apenas a confirmação do pagamento do saldo para ser enviada.
      </p>
      
      <div style="text-align: center;">
        <a href="${Deno.env.get('FRONTEND_URL') || 'https://ordax.com.br'}/compra-avulsa/${params.purchaseId}" class="cta-button">
          Pagar Saldo Agora
        </a>
      </div>
      
      <p style="margin-top: 32px; font-size: 14px; color: #64748b;">
        Após a confirmação do pagamento, sua peça será enviada imediatamente e você receberá 
        o código de rastreamento por e-mail.
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
 * Sends cancellation notice email
 */
async function sendCancellationNotice(params: {
  to: string;
  userName: string | null;
  collectionName: string;
  purchaseId: string;
}): Promise<void> {
  const emailProvider = Deno.env.get('EMAIL_PROVIDER') || 'resend';
  const emailApiKey = Deno.env.get('EMAIL_API_KEY');
  const emailFrom = Deno.env.get('EMAIL_FROM') || 'noreply@ordax.com.br';
  const emailFromName = Deno.env.get('EMAIL_FROM_NAME') || 'ORDAX';

  if (!emailApiKey) {
    console.warn('EMAIL_API_KEY not configured, skipping cancellation email');
    return;
  }

  const subject = `Pedido Cancelado - ${params.collectionName}`;
  const htmlContent = generateCancellationEmailHTML({
    userName: params.userName || 'Colecionador',
    collectionName: params.collectionName,
    purchaseId: params.purchaseId,
  });

  try {
    await sendEmail({
      provider: emailProvider as 'resend' | 'sendgrid',
      apiKey: emailApiKey,
      from: emailFrom,
      fromName: emailFromName,
      to: params.to,
      subject,
      html: htmlContent,
    });

    console.log(`Cancellation notice sent to: ${params.to}`);
  } catch (error) {
    console.error(`Failed to send cancellation notice to ${params.to}:`, error);
    throw error;
  }
}

/**
 * Generates HTML content for the cancellation notice email
 */
function generateCancellationEmailHTML(params: {
  userName: string;
  collectionName: string;
  purchaseId: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pedido Cancelado</title>
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
      background-color: #6b7280;
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 600;
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
      background-color: #f3f4f6;
      border-left: 4px solid #6b7280;
      padding: 20px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .info-box h2 {
      margin: 0 0 12px 0;
      font-size: 18px;
      color: #374151;
    }
    .info-row {
      margin: 8px 0;
      font-size: 14px;
    }
    .info-label {
      font-weight: 600;
      color: #374151;
    }
    .info-value {
      color: #6b7280;
    }
    .explanation-box {
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
      font-size: 14px;
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
      <h1>Pedido Cancelado</h1>
    </div>
    <div class="content">
      <p class="greeting">Olá, ${params.userName},</p>
      
      <p>
        Informamos que seu pedido da coleção <strong>${params.collectionName}</strong> 
        foi cancelado devido ao não recebimento do pagamento do saldo dentro do prazo estabelecido.
      </p>
      
      <div class="info-box">
        <h2>Detalhes do Pedido</h2>
        <div class="info-row">
          <span class="info-label">Coleção:</span>
          <span class="info-value">${params.collectionName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">ID do Pedido:</span>
          <span class="info-value">${params.purchaseId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Status:</span>
          <span class="info-value">Cancelado</span>
        </div>
      </div>
      
      <div class="explanation-box">
        <strong>Sobre o Depósito:</strong><br>
        Conforme os termos de compra, o depósito de R$ 100,00 foi retido como 
        <strong>Arras Confirmatórias</strong> (depósito não reembolsável). Este valor 
        foi utilizado para reservar sua peça e iniciar a produção, e não pode ser 
        devolvido quando o pagamento do saldo não é concluído dentro do prazo.
      </div>
      
      <p style="margin-top: 24px;">
        Entendemos que imprevistos acontecem. Se você ainda tem interesse em adquirir 
        peças da ORDAX, ficaremos felizes em atendê-lo em uma nova compra.
      </p>
      
      <p style="margin-top: 16px; font-size: 14px; color: #64748b;">
        Caso tenha dúvidas ou precise de esclarecimentos, entre em contato conosco 
        através do chat no site ou respondendo este e-mail.
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
  provider: 'resend' | 'sendgrid';
  apiKey: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (params.provider === 'resend') {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
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
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: params.to }],
        }],
        from: {
          email: params.from,
          name: params.fromName,
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
  }
}

Deno.serve(async (req) => {
  let logId: string | null = null;

  try {
    // Start logging
    logId = await logCronStart('cron-check-balance-deadlines');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current Bahia time
    const bahiaTime = nowInBahia();
    const currentDate = bahiaTime.toISOString();

    console.log(`Cron job running at ${bahiaTime.toISOString()} (Bahia time)`);
    console.log(`Checking for balance deadlines on or before: ${currentDate}`);

    // Calculate tomorrow's date for urgent reminders (1 day before deadline)
    const tomorrow = new Date(bahiaTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    const tomorrowEnd = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59, 999);

    console.log(`Tomorrow range: ${tomorrowStart.toISOString()} to ${tomorrowEnd.toISOString()}`);

    // 1. Find overdue purchases (balance_due_date < today)
    const { data: overduePurchases, error: overdueError } = await supabase
      .from('standalone_purchases')
      .select('id, user_id, collection_id, status, balance_due_date, balance_amount')
      .eq('status', 'awaiting_balance')
      .not('balance_due_date', 'is', null)
      .lt('balance_due_date', currentDate);

    if (overdueError) {
      throw new Error(`Failed to fetch overdue purchases: ${overdueError.message}`);
    }

    console.log(`Found ${overduePurchases?.length || 0} overdue purchase(s)`);

    // 2. Find purchases due tomorrow (for urgent reminders)
    const { data: dueTomorrowPurchases, error: dueTomorrowError } = await supabase
      .from('standalone_purchases')
      .select('id, user_id, collection_id, status, balance_due_date, balance_amount')
      .eq('status', 'awaiting_balance')
      .not('balance_due_date', 'is', null)
      .gte('balance_due_date', tomorrowStart.toISOString())
      .lte('balance_due_date', tomorrowEnd.toISOString());

    if (dueTomorrowError) {
      throw new Error(`Failed to fetch purchases due tomorrow: ${dueTomorrowError.message}`);
    }

    console.log(`Found ${dueTomorrowPurchases?.length || 0} purchase(s) due tomorrow`);

    let purchasesCancelled = 0;
    let remindersSent = 0;
    const errors: Array<{ purchaseId: string; error: string; action: string }> = [];

    // 3. Process overdue purchases - cancel and send notice
    if (overduePurchases && overduePurchases.length > 0) {
      for (const purchase of overduePurchases as StandalonePurchase[]) {
        try {
          console.log(`Processing overdue purchase: ${purchase.id}`);

          // Get user profile for email
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('id', purchase.user_id)
            .single();

          if (profileError || !profile) {
            console.error(`Failed to get profile for user ${purchase.user_id}:`, profileError);
            errors.push({
              purchaseId: purchase.id,
              error: `Failed to get user profile: ${profileError?.message || 'Not found'}`,
              action: 'cancel',
            });
            continue;
          }

          // Get collection name
          const { data: collection, error: collectionError } = await supabase
            .from('collections')
            .select('id, name')
            .eq('id', purchase.collection_id)
            .single();

          if (collectionError || !collection) {
            console.error(`Failed to get collection ${purchase.collection_id}:`, collectionError);
            errors.push({
              purchaseId: purchase.id,
              error: `Failed to get collection: ${collectionError?.message || 'Not found'}`,
              action: 'cancel',
            });
            continue;
          }

          // Cancel the purchase using Edge Function
          const { error: cancelError } = await supabase.functions.invoke('cancel-standalone-for-non-payment', {
            body: { purchaseId: purchase.id },
          });

          if (cancelError) {
            console.error(`Failed to cancel purchase ${purchase.id}:`, cancelError);
            errors.push({
              purchaseId: purchase.id,
              error: `Failed to cancel: ${cancelError.message}`,
              action: 'cancel',
            });
            continue;
          }

          console.log(`Cancelled purchase ${purchase.id} for non-payment`);
          purchasesCancelled++;

          // Send cancellation notice email
          if (profile.email) {
            try {
              await sendCancellationNotice({
                to: profile.email,
                userName: profile.full_name,
                collectionName: collection.name,
                purchaseId: purchase.id,
              });
            } catch (emailError) {
              console.error(`Failed to send cancellation email for purchase ${purchase.id}:`, emailError);
              // Don't add to errors - cancellation was successful
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`Error processing overdue purchase ${purchase.id}:`, error);
          errors.push({
            purchaseId: purchase.id,
            error: errorMessage,
            action: 'cancel',
          });
        }
      }
    }

    // 4. Process purchases due tomorrow - send urgent reminders
    if (dueTomorrowPurchases && dueTomorrowPurchases.length > 0) {
      for (const purchase of dueTomorrowPurchases as StandalonePurchase[]) {
        try {
          console.log(`Sending urgent reminder for purchase: ${purchase.id}`);

          // Get user profile for email
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('id', purchase.user_id)
            .single();

          if (profileError || !profile || !profile.email) {
            console.error(`Failed to get profile for user ${purchase.user_id}:`, profileError);
            errors.push({
              purchaseId: purchase.id,
              error: `Failed to get user profile or email: ${profileError?.message || 'Not found'}`,
              action: 'reminder',
            });
            continue;
          }

          // Get collection name
          const { data: collection, error: collectionError } = await supabase
            .from('collections')
            .select('id, name')
            .eq('id', purchase.collection_id)
            .single();

          if (collectionError || !collection) {
            console.error(`Failed to get collection ${purchase.collection_id}:`, collectionError);
            errors.push({
              purchaseId: purchase.id,
              error: `Failed to get collection: ${collectionError?.message || 'Not found'}`,
              action: 'reminder',
            });
            continue;
          }

          // Send urgent reminder email
          await sendUrgentBalanceReminder({
            to: profile.email,
            userName: profile.full_name,
            collectionName: collection.name,
            balanceAmount: purchase.balance_amount,
            dueDate: purchase.balance_due_date,
            purchaseId: purchase.id,
          });

          console.log(`Sent urgent reminder for purchase ${purchase.id}`);
          remindersSent++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`Error sending reminder for purchase ${purchase.id}:`, error);
          errors.push({
            purchaseId: purchase.id,
            error: errorMessage,
            action: 'reminder',
          });
        }
      }
    }

    // Log success with details
    await logCronSuccess(logId, {
      purchasesCancelled,
      remindersSent,
      overdueCount: overduePurchases?.length || 0,
      dueTomorrowCount: dueTomorrowPurchases?.length || 0,
      errors: errors.length > 0 ? errors : undefined,
      currentDate,
    });

    console.log(`Cron job completed: ${purchasesCancelled} purchase(s) cancelled, ${remindersSent} reminder(s) sent`);
    if (errors.length > 0) {
      console.warn(`${errors.length} error(s) occurred during processing`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        purchasesCancelled,
        remindersSent,
        overdueCount: overduePurchases?.length || 0,
        dueTomorrowCount: dueTomorrowPurchases?.length || 0,
        errors: errors.length > 0 ? errors : undefined,
        currentDate,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Cron job failed:', error);

    // Log error if we have a log ID
    if (logId) {
      try {
        await logCronError(logId, error instanceof Error ? error : new Error(String(error)));
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
