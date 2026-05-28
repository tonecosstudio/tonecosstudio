/**
 * Capacity Alert Service
 * 
 * Handles capacity alert configuration and notification sending
 * when capacity thresholds are reached.
 * 
 * Requirements: 16.5
 */

import { supabase } from "@/integrations/supabase/client";
import { emailService } from "./email-service";
import { logInfo, logError } from "@/lib/logger";
import {
  checkCapacityAlertRpc,
  configureCapacityAlertRpc,
  resetCapacityAlertRpc,
} from "./customer-account-mutations-service";

interface CycleAlertConfigRow {
  alert_threshold: number | null;
  alert_email: string | null;
  alert_sms: string | null;
}

interface CycleAlertStatusRow extends CycleAlertConfigRow {
  alert_triggered: boolean | null;
  alert_triggered_at: string | null;
  capacity: number | null;
  used_capacity: number | null;
}

interface CycleAlertSingleQuery<T> {
  eq(column: "id", value: string): {
    single(): Promise<{ data: T | null; error: { message: string } | null }>;
  };
}

interface CycleAlertGateway {
  from(table: "cycles"): {
    select(columns: "alert_threshold, alert_email, alert_sms"): CycleAlertSingleQuery<CycleAlertConfigRow>;
    select(
      columns: "alert_triggered, alert_triggered_at, alert_threshold, used_capacity, capacity"
    ): CycleAlertSingleQuery<CycleAlertStatusRow>;
  };
}

const cycleAlertGateway = supabase as unknown as CycleAlertGateway;

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
 *   email: 'admin@example.com',
 *   sms: null
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

  if (config.sms) {
    throw new Error('SMS capacity alerts require a configured server-side SMS provider');
  }

  await configureCapacityAlertRpc({
    cycleId,
    threshold: config.threshold,
    email: config.email,
    sms: config.sms,
  });

  logInfo(`Configured alert for cycle ${cycleId}`, { 
    threshold: config.threshold, 
    email: config.email, 
    sms: config.sms 
  }, 'capacity-alert');
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
  const { data: cycle, error } = await cycleAlertGateway
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
  const { data: cycle, error } = await cycleAlertGateway
    .from('cycles')
    .select('alert_triggered, alert_triggered_at, alert_threshold, used_capacity, capacity')
    .eq('id', cycleId)
    .single();

  if (error) {
    throw new Error(`Failed to get alert status: ${error.message}`);
  }

  if (!cycle) {
    throw new Error(`Cycle not found: ${cycleId}`);
  }

  const max = cycle.capacity ?? 100;
  const current = cycle.used_capacity ?? 0;
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
  return checkCapacityAlertRpc(cycleId);
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
  await resetCapacityAlertRpc(cycleId);

  logInfo(`Reset alert for cycle ${cycleId}`, undefined, 'capacity-alert');
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

  // Send email if configured
  if (config.email) {
    try {
      const availableCapacity = cycleInfo.maxCapacity - cycleInfo.currentCapacity;
      
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .alert { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; }
    .metrics { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; }
    .metric-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .metric-row:last-child { border-bottom: none; }
    .metric-label { font-weight: 600; color: #4b5563; }
    .metric-value { color: #111827; }
    .cta-button { display: inline-block; background: #dc2626; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Alerta de Capacidade</h1>
      <p>Ciclo ${cycleInfo.cycleNumber} - ${cycleInfo.month}/${cycleInfo.year}</p>
    </div>
    <div class="content">
      <div class="alert">
        <h3>⚠️ Limite de Capacidade Atingido</h3>
        <p>O ciclo ${cycleInfo.cycleNumber} atingiu <strong>${cycleInfo.percentage}%</strong> da capacidade máxima.</p>
        <p>Limite configurado: <strong>${config.threshold}%</strong></p>
      </div>
      <div class="metrics">
        <h3>📊 Métricas do Ciclo</h3>
        <div class="metric-row">
          <span class="metric-label">Capacidade Total:</span>
          <span class="metric-value">${cycleInfo.maxCapacity} unidades</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Capacidade Usada:</span>
          <span class="metric-value">${cycleInfo.currentCapacity} unidades</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Capacidade Disponível:</span>
          <span class="metric-value">${availableCapacity} unidades</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Utilização:</span>
          <span class="metric-value">${cycleInfo.percentage}%</span>
        </div>
      </div>
      <p><strong>Ação Recomendada:</strong> Revise a capacidade do ciclo e considere:</p>
      <ul>
        <li>Aumentar a capacidade máxima do ciclo</li>
        <li>Pausar novas assinaturas temporariamente</li>
        <li>Ajustar o cronograma de produção</li>
      </ul>
      <div style="text-align: center;">
        <a href="${typeof window !== 'undefined' ? window.location.origin : ''}/admin/cycles" class="cta-button">
          Gerenciar Capacidade
        </a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ORDAX. Todos os direitos reservados.</p>
      <p>Este é um alerta automático do sistema de gerenciamento de capacidade.</p>
    </div>
  </div>
</body>
</html>`;

      await emailService.sendEmail(
        config.email,
        `⚠️ Alerta de Capacidade - Ciclo ${cycleInfo.cycleNumber}`,
        html,
        'capacity_alert',
        undefined,
        { 
          cycle_id: cycleId,
          alert_type: 'capacity',
          current_capacity: cycleInfo.currentCapacity,
          max_capacity: cycleInfo.maxCapacity,
          percentage: cycleInfo.percentage,
          threshold: config.threshold
        }
      );

      logInfo('Capacity alert email sent', { email: config.email, cycle: cycleInfo.cycleNumber }, 'capacity-alert');
    } catch (error) {
      logError('Failed to send capacity alert email', error, 'capacity-alert');
    }
  }

  if (config.sms) {
    logError(
      'SMS capacity alert skipped because no server-side SMS provider is configured',
      undefined,
      'capacity-alert'
    );
  }
}
