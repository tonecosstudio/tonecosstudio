/**
 * Cron Job Logging Utility for ORDAX Platform
 * 
 * Provides functions to log cron job executions and send alerts on errors.
 * Integrates with the cron_job_logs table created in task 12.1.
 * 
 * Requirements:
 * - 34.1: Log all cron job executions with success/failure status
 * - 34.8: Send alert notifications for critical errors
 */

import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Starts logging a cron job execution
 * 
 * @param jobName - Name of the cron job being executed
 * @param executionDetails - Optional additional details about the execution
 * @returns Promise resolving to the log ID (UUID)
 * 
 * @example
 * const logId = await logCronStart('daily-delivery-creation');
 */
export async function logCronStart(
  jobName: string,
  executionDetails?: Record<string, unknown>
): Promise<string> {
  if (!jobName) {
    throw new Error('jobName is required');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.rpc('start_cron_job_log', {
    p_job_name: jobName,
    p_execution_details: executionDetails || null,
  });

  if (error) {
    console.error('Failed to start cron job log:', error);
    throw new Error(`Failed to start cron job log: ${error.message}`);
  }

  if (!data) {
    throw new Error('No log ID returned from start_cron_job_log');
  }

  console.log(`Cron job started: ${jobName} (log ID: ${data})`);
  return data as string;
}

/**
 * Marks a cron job execution as successful
 * 
 * @param logId - The log ID returned from logCronStart
 * @param executionDetails - Optional additional details about the execution
 * @returns Promise that resolves when the log is updated
 * 
 * @example
 * await logCronSuccess(logId, { deliveriesCreated: 42 });
 */
export async function logCronSuccess(
  logId: string,
  executionDetails?: Record<string, unknown>
): Promise<void> {
  if (!logId) {
    throw new Error('logId is required');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase.rpc('complete_cron_job_log', {
    p_log_id: logId,
    p_execution_details: executionDetails || null,
  });

  if (error) {
    console.error('Failed to complete cron job log:', error);
    throw new Error(`Failed to complete cron job log: ${error.message}`);
  }

  console.log(`Cron job completed successfully (log ID: ${logId})`);
}

/**
 * Marks a cron job execution as failed and sends an alert notification
 * 
 * @param logId - The log ID returned from logCronStart
 * @param error - The error that caused the failure
 * @param executionDetails - Optional additional details about the execution
 * @returns Promise that resolves when the log is updated and alert is sent
 * 
 * @example
 * try {
 *   // ... cron job logic
 * } catch (error) {
 *   await logCronError(logId, error);
 * }
 */
export async function logCronError(
  logId: string,
  error: Error,
  executionDetails?: Record<string, unknown>
): Promise<void> {
  if (!logId) {
    throw new Error('logId is required');
  }

  if (!error) {
    throw new Error('error is required');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Extract error message and stack trace
  const errorMessage = error.message || 'Unknown error';
  const errorStack = error.stack || '';

  // Combine execution details with error information
  const detailsWithError = {
    ...executionDetails,
    errorStack,
    errorName: error.name,
  };

  // Mark the cron job as failed
  const { error: logError } = await supabase.rpc('fail_cron_job_log', {
    p_log_id: logId,
    p_error_message: errorMessage,
    p_execution_details: detailsWithError,
  });

  if (logError) {
    console.error('Failed to mark cron job as failed:', logError);
    // Don't throw here - we still want to send the alert
  }

  console.error(`Cron job failed (log ID: ${logId}): ${errorMessage}`);

  // Send alert notification
  try {
    await sendCronErrorAlert(logId, errorMessage, errorStack);
  } catch (alertError) {
    console.error('Failed to send cron error alert:', alertError);
    // Don't throw - the log has been updated, which is the primary goal
  }
}

/**
 * Sends an alert notification for a cron job error
 * 
 * @param logId - The log ID of the failed cron job
 * @param errorMessage - The error message
 * @param errorStack - The error stack trace
 * @returns Promise that resolves when the alert is sent
 */
async function sendCronErrorAlert(
  logId: string,
  errorMessage: string,
  errorStack: string
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get the cron job details from the log
  const { data: logData, error: fetchError } = await supabase
    .from('cron_job_logs')
    .select('job_name, started_at')
    .eq('id', logId)
    .single();

  if (fetchError || !logData) {
    console.error('Failed to fetch cron job log details:', fetchError);
    throw new Error('Failed to fetch cron job log details');
  }

  const jobName = logData.job_name;
  const startedAt = new Date(logData.started_at).toLocaleString('pt-BR', {
    timeZone: 'America/Bahia',
  });

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
  const subject = `🚨 Cron Job Failed: ${jobName}`;
  const htmlContent = generateAlertEmailHTML({
    jobName,
    startedAt,
    errorMessage,
    errorStack,
    logId,
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

      console.log(`Alert email sent to admin: ${admin.email}`);
    } catch (emailError) {
      console.error(`Failed to send alert email to ${admin.email}:`, emailError);
      // Continue sending to other admins
    }
  }
}

/**
 * Generates HTML content for the alert email
 */
function generateAlertEmailHTML(params: {
  jobName: string;
  startedAt: string;
  errorMessage: string;
  errorStack: string;
  logId: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cron Job Failed</title>
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
      background-color: #dc2626;
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
    .alert-box {
      background-color: #fef2f2;
      border-left: 4px solid #dc2626;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .info-row {
      margin: 12px 0;
    }
    .info-label {
      font-weight: 600;
      color: #374151;
    }
    .info-value {
      color: #6b7280;
      font-family: 'Courier New', monospace;
    }
    .error-stack {
      background-color: #1f2937;
      color: #f3f4f6;
      padding: 16px;
      border-radius: 4px;
      overflow-x: auto;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      margin: 16px 0;
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
      <h1>🚨 Cron Job Failed</h1>
    </div>
    <div class="content">
      <div class="alert-box">
        <div class="info-row">
          <span class="info-label">Job Name:</span>
          <span class="info-value">${params.jobName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Started At:</span>
          <span class="info-value">${params.startedAt}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Log ID:</span>
          <span class="info-value">${params.logId}</span>
        </div>
      </div>
      
      <h3>Error Message:</h3>
      <p style="color: #dc2626; font-weight: 600;">${params.errorMessage}</p>
      
      <h3>Stack Trace:</h3>
      <div class="error-stack">${params.errorStack || 'No stack trace available'}</div>
      
      <p style="margin-top: 24px; font-size: 14px; color: #64748b;">
        Please investigate this issue as soon as possible. Check the cron_job_logs table for more details.
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
