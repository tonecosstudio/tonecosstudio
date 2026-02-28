/**
 * Cron Job: Automatic Delivery Creation
 * 
 * Runs daily at 00:01 Bahia Time to create delivery records for subscriptions
 * scheduled for the current month.
 * 
 * Requirements:
 * - 10.1: Execute cron job daily at 00:01 Bahia Time
 * - 10.2: Identify all subscriptions with deliveries scheduled for current month
 * - 10.3: Create delivery record with status 'pending_choice'
 * - 10.4: Apply automatic maintenance if subscriber hasn't made collection choice
 * - 10.6: Log all automatic delivery creation actions
 * - 10.7: Send alert notification to administrator if cron job fails
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { logCronStart, logCronSuccess, logCronError } from "../_shared/cron-logger.ts";
import { nowInBahia } from "../_shared/timezone.ts";

interface Subscription {
  id: string;
  user_id: string;
  plan_type: 'trimestral' | 'semestral';
  status: string;
  deliveries_total: number;
  deliveries_completed: number;
  created_at: string;
}

interface Delivery {
  id: string;
  subscription_id: string;
  delivery_number: number;
  status: string;
  expected_delivery_date: string | null;
}

/**
 * Sends an alert email to admins when some subscriptions fail to process
 * but the overall cron job completes successfully
 */
async function sendPartialFailureAlert(
  logId: string,
  errors: Array<{ subscriptionId: string; error: string }>,
  subscriptionsProcessed: number,
  deliveriesCreated: number
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get admin email addresses for alerts
  const { data: adminUsers, error: adminError } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');

  if (adminError || !adminUsers || adminUsers.length === 0) {
    console.warn('No admin users found to send alert to');
    return;
  }

  const adminUserIds = adminUsers.map((u) => u.user_id);

  // Get admin profiles with emails
  const { data: adminProfiles, error: profileError } = await supabase
    .from('profiles')
    .select('email, full_name')
    .in('id', adminUserIds);

  if (profileError || !adminProfiles || adminProfiles.length === 0) {
    console.warn('No admin profiles found with emails');
    return;
  }

  // Prepare email content
  const subject = `⚠️ Delivery Creation: Partial Failures (${errors.length} subscription${errors.length > 1 ? 's' : ''})`;
  const htmlContent = generatePartialFailureEmailHTML({
    logId,
    errors,
    subscriptionsProcessed,
    deliveriesCreated,
    timestamp: new Date().toLocaleString('pt-BR', { timeZone: 'America/Bahia' }),
  });

  // Send email to each admin
  const emailProvider = Deno.env.get('EMAIL_PROVIDER') || 'resend';
  const emailApiKey = Deno.env.get('EMAIL_API_KEY');
  const emailFrom = Deno.env.get('EMAIL_FROM') || 'alerts@ordax.com.br';
  const emailFromName = Deno.env.get('EMAIL_FROM_NAME') || 'ORDAX Alerts';

  if (!emailApiKey) {
    console.warn('EMAIL_API_KEY not configured, skipping alert email');
    return;
  }

  for (const admin of adminProfiles) {
    if (!admin.email) continue;

    try {
      await sendEmail({
        provider: emailProvider as 'resend' | 'sendgrid',
        apiKey: emailApiKey,
        from: emailFrom,
        fromName: emailFromName,
        to: admin.email,
        subject,
        html: htmlContent,
      });

      console.log(`Partial failure alert sent to admin: ${admin.email}`);
    } catch (emailError) {
      console.error(`Failed to send alert email to ${admin.email}:`, emailError);
      // Continue sending to other admins
    }
  }
}

/**
 * Generates HTML content for the partial failure alert email
 */
function generatePartialFailureEmailHTML(params: {
  logId: string;
  errors: Array<{ subscriptionId: string; error: string }>;
  subscriptionsProcessed: number;
  deliveriesCreated: number;
  timestamp: string;
}): string {
  const errorRows = params.errors
    .map(
      (e) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #e5e7eb; font-family: 'Courier New', monospace; font-size: 12px;">${e.subscriptionId}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb; color: #dc2626; font-size: 13px;">${e.error}</td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Delivery Creation Partial Failures</title>
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
      max-width: 700px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background-color: #f59e0b;
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
    .summary-box {
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .info-row {
      margin: 8px 0;
    }
    .info-label {
      font-weight: 600;
      color: #374151;
    }
    .info-value {
      color: #6b7280;
    }
    .errors-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 14px;
    }
    .errors-table th {
      background-color: #f3f4f6;
      padding: 12px 8px;
      text-align: left;
      font-weight: 600;
      border: 1px solid #e5e7eb;
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
      <h1>⚠️ Delivery Creation: Partial Failures</h1>
    </div>
    <div class="content">
      <div class="summary-box">
        <div class="info-row">
          <span class="info-label">Timestamp:</span>
          <span class="info-value">${params.timestamp}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Log ID:</span>
          <span class="info-value">${params.logId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Subscriptions Processed:</span>
          <span class="info-value">${params.subscriptionsProcessed}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Deliveries Created:</span>
          <span class="info-value">${params.deliveriesCreated}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Failed Subscriptions:</span>
          <span class="info-value" style="color: #dc2626; font-weight: 600;">${params.errors.length}</span>
        </div>
      </div>
      
      <h3>Failed Subscriptions:</h3>
      <table class="errors-table">
        <thead>
          <tr>
            <th>Subscription ID</th>
            <th>Error Message</th>
          </tr>
        </thead>
        <tbody>
          ${errorRows}
        </tbody>
      </table>
      
      <p style="margin-top: 24px; font-size: 14px; color: #64748b;">
        The cron job completed successfully, but some subscriptions failed to process. 
        Please investigate these failures and manually create deliveries if needed.
        Check the cron_job_logs table for detailed error information.
      </p>
    </div>
    <div class="footer">
      <p>This is an automated alert from ORDAX Platform.</p>
      <p>&copy; ${new Date().getFullYear()} ORDAX. All rights reserved.</p>
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
    logId = await logCronStart('cron-create-deliveries');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current Bahia time
    const bahiaTime = nowInBahia();
    const day = bahiaTime.getDate();
    const month = bahiaTime.getMonth() + 1; // JavaScript months are 0-indexed
    const year = bahiaTime.getFullYear();

    console.log(`Cron job running at ${bahiaTime.toISOString()} (Bahia time)`);
    console.log(`Current day: ${day}, month: ${month}, year: ${year}`);

    // Only run on day 1 of the month
    if (day !== 1) {
      console.log(`Not day 1 (current day: ${day}), skipping delivery creation`);
      
      await logCronSuccess(logId, {
        skipped: true,
        reason: 'Not day 1 of month',
        currentDay: day,
        month,
        year,
      });

      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          message: 'Not day 1 of month',
          currentDay: day,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Query all active subscriptions
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select('id, user_id, plan_type, status, deliveries_total, deliveries_completed, created_at')
      .eq('status', 'active');

    if (subscriptionsError) {
      throw new Error(`Failed to fetch subscriptions: ${subscriptionsError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No active subscriptions found');
      
      await logCronSuccess(logId, {
        subscriptionsProcessed: 0,
        deliveriesCreated: 0,
        month,
        year,
      });

      return new Response(
        JSON.stringify({
          success: true,
          subscriptionsProcessed: 0,
          deliveriesCreated: 0,
          message: 'No active subscriptions found',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${subscriptions.length} active subscriptions`);

    let deliveriesCreated = 0;
    let subscriptionsProcessed = 0;
    const errors: Array<{ subscriptionId: string; error: string }> = [];

    // Process each subscription
    for (const subscription of subscriptions as Subscription[]) {
      try {
        // Get all existing deliveries for this subscription
        const { data: existingDeliveries, error: deliveriesError } = await supabase
          .from('subscription_deliveries')
          .select('id, subscription_id, delivery_number, status, expected_delivery_date')
          .eq('subscription_id', subscription.id)
          .order('delivery_number', { ascending: true });

        if (deliveriesError) {
          throw new Error(`Failed to fetch deliveries: ${deliveriesError.message}`);
        }

        const deliveries = (existingDeliveries || []) as Delivery[];

        // Determine the next delivery number
        const nextDeliveryNumber = deliveries.length + 1;

        // Check if we've already created all deliveries for this subscription
        if (nextDeliveryNumber > subscription.deliveries_total) {
          console.log(`Subscription ${subscription.id}: All deliveries already created (${deliveries.length}/${subscription.deliveries_total})`);
          subscriptionsProcessed++;
          continue;
        }

        // Check if a delivery for this month already exists
        const deliveryForThisMonth = deliveries.find(d => {
          if (!d.expected_delivery_date) return false;
          const deliveryDate = new Date(d.expected_delivery_date);
          return deliveryDate.getMonth() + 1 === month && deliveryDate.getFullYear() === year;
        });

        if (deliveryForThisMonth) {
          console.log(`Subscription ${subscription.id}: Delivery for ${month}/${year} already exists (delivery #${deliveryForThisMonth.delivery_number})`);
          subscriptionsProcessed++;
          continue;
        }

        // Calculate expected delivery date (5th business day of the month)
        // For now, we'll use a simple approximation - this should be enhanced with business day calculation
        const expectedDeliveryDate = new Date(year, month - 1, 5);

        // Create the delivery record with status 'pending_choice'
        const { data: newDelivery, error: createError } = await supabase
          .from('subscription_deliveries')
          .insert({
            subscription_id: subscription.id,
            delivery_number: nextDeliveryNumber,
            status: 'pending_choice',
            expected_delivery_date: expectedDeliveryDate.toISOString(),
          })
          .select()
          .single();

        if (createError) {
          throw new Error(`Failed to create delivery: ${createError.message}`);
        }

        console.log(`Created delivery #${nextDeliveryNumber} for subscription ${subscription.id} (delivery ID: ${newDelivery.id})`);
        deliveriesCreated++;

        // Apply automatic maintenance if this is not the first delivery
        if (nextDeliveryNumber > 1) {
          try {
            // Call the activate_delivery_with_auto_maintenance function
            const { error: maintenanceError } = await supabase.rpc(
              'activate_delivery_with_auto_maintenance',
              { p_delivery_id: newDelivery.id }
            );

            if (maintenanceError) {
              console.error(`Failed to apply automatic maintenance for delivery ${newDelivery.id}:`, maintenanceError);
              // Don't throw - the delivery was created successfully, maintenance is a bonus
            } else {
              console.log(`Applied automatic maintenance for delivery ${newDelivery.id}`);
            }
          } catch (maintenanceError) {
            console.error(`Error applying automatic maintenance for delivery ${newDelivery.id}:`, maintenanceError);
            // Don't throw - the delivery was created successfully
          }
        } else {
          console.log(`Delivery #${nextDeliveryNumber} is first delivery, skipping automatic maintenance`);
        }

        subscriptionsProcessed++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        console.error(`Error processing subscription ${subscription.id}:`, error);
        
        // Log individual subscription error to cron_job_logs
        try {
          await supabase.from('cron_job_logs').insert({
            job_name: 'cron-create-deliveries',
            status: 'failed',
            error_message: `Subscription ${subscription.id}: ${errorMessage}`,
            execution_details: {
              subscriptionId: subscription.id,
              userId: subscription.user_id,
              planType: subscription.plan_type,
              errorStack,
              month,
              year,
            },
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          });
        } catch (logError) {
          console.error(`Failed to log subscription error for ${subscription.id}:`, logError);
          // Don't throw - continue processing
        }
        
        errors.push({
          subscriptionId: subscription.id,
          error: errorMessage,
        });
        // Continue processing other subscriptions
      }
    }

    // Log success with details
    await logCronSuccess(logId, {
      subscriptionsProcessed,
      deliveriesCreated,
      errors: errors.length > 0 ? errors : undefined,
      month,
      year,
    });

    // If there were any errors processing individual subscriptions, send an alert
    if (errors.length > 0) {
      try {
        await sendPartialFailureAlert(logId, errors, subscriptionsProcessed, deliveriesCreated);
      } catch (alertError) {
        console.error('Failed to send partial failure alert:', alertError);
        // Don't throw - the job completed successfully overall
      }
    }

    console.log(`Cron job completed: ${deliveriesCreated} deliveries created for ${subscriptionsProcessed} subscriptions`);
    if (errors.length > 0) {
      console.warn(`${errors.length} subscription(s) failed to process`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionsProcessed,
        deliveriesCreated,
        errors: errors.length > 0 ? errors : undefined,
        month,
        year,
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
