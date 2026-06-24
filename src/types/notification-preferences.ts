/**
 * Notification Preferences Types
 * 
 * Defines types for customer notification preferences.
 * Customers can opt-out of non-critical notifications.
 */

/**
 * Notification preferences structure
 * All fields default to true (opted in)
 */
export interface NotificationPreferences {
  /** Non-critical: Production stage updates (design, production, quality check, packaging) */
  production_stage_updates: boolean;
  
  /** Non-critical: Item shipped notifications with tracking */
  item_shipped: boolean;
  
  /** Non-critical: Item delivered notifications */
  item_delivered: boolean;
  
  /** Non-critical: General marketing emails */
  marketing_emails: boolean;
}

/**
 * Default notification preferences (all enabled)
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  production_stage_updates: true,
  item_shipped: true,
  item_delivered: true,
  marketing_emails: true,
};

/**
 * Notification types that are CRITICAL and cannot be opted out
 */
export const CRITICAL_NOTIFICATION_TYPES = [
  'choice_reminder',           // Character choice deadline reminders
  'choice_approval',           // Character choice approved
  'choice_rejection',          // Character choice rejected
  'payment_notification',      // Payment-related notifications
  'order_confirmed',           // Order status: confirmed
  'order_cancelled',           // Order status: cancelled
  'delay_notification',        // Production delays
] as const;

/**
 * Notification types that are NON-CRITICAL and can be opted out
 */
export const NON_CRITICAL_NOTIFICATION_TYPES = [
  'stage_update',              // Production stage updates
  'item_shipped',              // Item shipped
  'item_delivered',            // Item delivered
  'marketing',                 // Marketing emails
] as const;

export type CriticalNotificationType = typeof CRITICAL_NOTIFICATION_TYPES[number];
export type NonCriticalNotificationType = typeof NON_CRITICAL_NOTIFICATION_TYPES[number];
export type NotificationType = CriticalNotificationType | NonCriticalNotificationType;

/**
 * Map notification type to preference key
 */
export function getPreferenceKey(notificationType: NotificationType): keyof NotificationPreferences | null {
  switch (notificationType) {
    case 'stage_update':
      return 'production_stage_updates';
    case 'item_shipped':
      return 'item_shipped';
    case 'item_delivered':
      return 'item_delivered';
    case 'marketing':
      return 'marketing_emails';
    default:
      // Critical notifications don't have a preference key
      return null;
  }
}

/**
 * Check if a notification type is critical (cannot be opted out)
 */
export function isCriticalNotification(notificationType: string): boolean {
  return CRITICAL_NOTIFICATION_TYPES.includes(notificationType as CriticalNotificationType);
}

/**
 * Get user-friendly label for notification preference
 */
export function getNotificationLabel(key: keyof NotificationPreferences): string {
  const labels: Record<keyof NotificationPreferences, string> = {
    production_stage_updates: 'Atualizacoes de producao',
    item_shipped: 'Avisos de envio',
    item_delivered: 'Confirmacoes de entrega',
    marketing_emails: 'Novidades e promocoes',
  };
  return labels[key];
}

/**
 * Get user-friendly description for notification preference
 */
export function getNotificationDescription(key: keyof NotificationPreferences): string {
  const descriptions: Record<keyof NotificationPreferences, string> = {
    production_stage_updates: 'Receba avisos quando seu pedido avancar pelas etapas de design, producao, qualidade e embalagem.',
    item_shipped: 'Receba notificacoes quando seu item for enviado com codigo de rastreamento.',
    item_delivered: 'Receba confirmacoes quando a entrega for concluida.',
    marketing_emails: 'Receba novidades, ofertas especiais e anuncios futuros do catalogo.',
  };
  return descriptions[key];
}
