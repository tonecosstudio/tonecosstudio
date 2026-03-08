/**
 * Capacity Alert Service
 * 
 * Handles capacity alert configuration and notification sending
 * when capacity thresholds are reached.
 * 
 * Requirements: 16.5
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Alert configuration for a cycle
 */
export interface AlertConfig {
  /** Alert threshold percentage (1-100) */
  threshold: number;
  /** Email address for alerts */
  email: string | null;
  /** Phone number for SMS alerts */
  sms: string | null;
}

/**
 * Alert status information
 */
export interface AlertStatus {
  /** Whether alert has been triggered */
  triggered: boolean;
  /** Timestamp when alert was triggered */
  triggeredAt: Date | null;
  /** Current capacity percentage */
  currentPercentage: number;
  /** Alert threshold percentage */
  threshold: number;
}

/**
 * Configure capacity alert settings for a cycle
 * 
 * @param cycleId - The ID of the cycle to configure
 * @param config - Alert configuration (threshold, email, sms)
 * @returns Promise<void>
 * @throws Error if database update fails
 * 
 * @example
 * await configureAlert(cycleId, {
 *   threshold: 80,
 *   email: 'admin@ordax.com',
 *   sms: '+5571999999999'
 * });
 * 
 * Requirements: 16.5
 */
export async function configureAlert(
  cycleId: string,
  config: AlertConfig
): Promise<void> {
  // Validate threshold
  if (config.threshold < 1 || config.threshold > 100) {
    throw new Error('Alert threshold must be between 1 and 100');
  }

  const { error } = await supabase
    .from('cycles')
    .update({
      alert_threshold: config.threshold,
      alert_email: config.email,
      alert_sms: config.sms
    })
    .eq('id', cycleId);

  if (error) {
    throw new Error(`Failed to configure alert: ${error.message}`);
  }

  console.log(`Configured alert for cycle ${cycleId}: threshold=${config.threshold}%, email=${config.email}, sms=${config.sms}`);
}

/**
 * Get alert configuration for a cycle
 * 
 * @param cycleId - The ID of the cycle
 * @returns Promise<AlertConfig> - Current alert configuration
 * @throws Error if cycle not found or database query fails
 * 
 * Requirements: 16.5
 */
export async function getAlertConfig(cycleId: string): Promise<AlertConfig> {
  const { data: cycle, error } = await supabase
    .from('cycles')
    .select('alert_threshold, alert_email, alert_sms')
    .eq('id', cycleId)
    .single();

  if (error) {
    throw new Error(`Failed to get alert config: ${error.message}`);
  }

  if (!cycle) {
    throw new Error(`Cycle not found: ${cycleId}`);
  }

  return {
    threshold: cycle.alert_threshold ?? 80,
    email: cycle.alert_email,
    sms: cycle.alert_sms
  };
}

/**
 * Get alert status for a cycle
 * 
 * @param cycleId - The ID of the cycle
 * @returns Promise<AlertStatus> - Current alert status
 * @throws Error if cycle not found or database query fails
 * 
 * Requirements: 16.5
 */
export async function getAlertStatus(cycleId: string): Promise<AlertStatus> {
  const { data: cycle, error } = await supabase
    .from('cycles')
    .select('alert_triggered, alert_triggered_at, alert_threshold, capacity_current, capacity_max')
    .eq('id', cycleId)
    .single();

  if (error) {
    throw new Error(`Failed to get alert status: ${error.message}`);
  }

  if (!cycle) {
    throw new Error(`Cycle not found: ${cycleId}`);
  }

  const max = cycle.capacity_max ?? 100;
  const current = cycle.capacity_current ?? 0;
  const currentPercentage = max > 0 ? Math.round((current / max) * 100) : 0;

  return {
    triggered: cycle.alert_triggered ?? false,
    triggeredAt: cycle.alert_triggered_at ? new Date(cycle.alert_triggered_at) : null,
    currentPercentage,
    threshold: cycle.alert_threshold ?? 80
  };
}

/**
 * Manually check and trigger alert for a cycle
 * 
 * This function checks if the capacity threshold has been reached
 * and triggers the alert if needed. Normally this is done automatically
 * by the database trigger, but this function can be used for manual checks.
 * 
 * @param cycleId - The ID of the cycle to check
 * @returns Promise<boolean> - True if alert was triggered
 * @throws Error if database operation fails
 * 
 * Requirements: 16.5
 */
export async function checkAndTriggerAlert(cycleId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_capacity_alert' as any, {
    p_cycle_id: cycleId
  });

  if (error) {
    throw new Error(`Failed to check capacity alert: ${error.message}`);
  }

  return data === true;
}

/**
 * Reset alert for a cycle (for testing or when capacity is reduced)
 * 
 * @param cycleId - The ID of the cycle
 * @returns Promise<void>
 * @throws Error if database operation fails
 * 
 * Requirements: 16.5
 */
export async function resetAlert(cycleId: string): Promise<void> {
  const { error } = await supabase.rpc('reset_capacity_alert' as any, {
    p_cycle_id: cycleId
  });

  if (error) {
    throw new Error(`Failed to reset alert: ${error.message}`);
  }

  console.log(`Reset alert for cycle ${cycleId}`);
}

/**
 * Send capacity alert notification
 * 
 * This function sends email and/or SMS notifications when capacity
 * threshold is reached. It's called by the Edge Function that monitors
 * for triggered alerts.
 * 
 * @param cycleId - The ID of the cycle
 * @param cycleInfo - Cycle information for the notification
 * @returns Promise<void>
 * @throws Error if notification sending fails
 * 
 * Requirements: 16.5
 */
export async function sendCapacityAlert(
  cycleId: string,
  cycleInfo: {
    cycleNumber: 1 | 2;
    month: number;
    year: number;
    currentCapacity: number;
    maxCapacity: number;
    percentage: number;
  }
): Promise<void> {
  // Get alert configuration
  const config = await getAlertConfig(cycleId);

  const message = `
ALERTA DE CAPACIDADE - ORDAX

Ciclo ${cycleInfo.cycleNumber} - ${cycleInfo.month}/${cycleInfo.year}
Capacidade: ${cycleInfo.currentCapacity}/${cycleInfo.maxCapacity} (${cycleInfo.percentage}%)

O limite de ${config.threshold}% foi atingido.
Acesse o painel administrativo para gerenciar a capacidade.
  `.trim();

  // Send email if configured
  if (config.email) {
    try {
      // Call email service (to be implemented)
      console.log(`Sending email alert to ${config.email}`);
      // TODO: Integrate with email service
      // await sendEmail({
      //   to: config.email,
      //   subject: `Alerta de Capacidade - Ciclo ${cycleInfo.cycleNumber}`,
      //   body: message
      // });
    } catch (error) {
      console.error('Failed to send email alert:', error);
    }
  }

  // Send SMS if configured
  if (config.sms) {
    try {
      // Call SMS service (to be implemented)
      console.log(`Sending SMS alert to ${config.sms}`);
      // TODO: Integrate with SMS service
      // await sendSMS({
      //   to: config.sms,
      //   message: message
      // });
    } catch (error) {
      console.error('Failed to send SMS alert:', error);
    }
  }
}
