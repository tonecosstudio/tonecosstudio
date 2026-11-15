/**
 * Notification Preferences Service
 *
 * Handles fetching and updating customer notification preferences.
 */

import { supabase } from '@/integrations/supabase/client';
import log from '@/lib/logger';
import { assertCurrentUserId, requireAuthenticatedUserId } from '@/services/auth/current-user';
import type { NotificationPreferences } from '@/types/notification-preferences';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/notification-preferences';
import { LOCAL_SUPABASE_FALLBACK } from '@/config/supabase-environment';

let localPreviewPreferences: NotificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };

interface CustomerNotificationPreferencesRpcClient {
  rpc(
    fn: 'update_customer_notification_preferences',
    args: { p_preferences: Partial<NotificationPreferences> }
  ): Promise<{ data: NotificationPreferences | null; error: { message: string } | null }>;
  rpc(
    fn: 'should_send_notification',
    args: { user_id: string; notification_type: string }
  ): Promise<{ data: boolean | null; error: { message: string } | null }>;
}

const customerNotificationPreferencesRpc =
  supabase as unknown as CustomerNotificationPreferencesRpcClient;

interface CustomerNotificationProfileGateway {
  from(table: 'profiles'): {
    select(columns: 'notification_preferences'): {
      eq(column: 'id', value: string): {
        single(): Promise<{
          data: { notification_preferences: NotificationPreferences | null } | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
}

const customerNotificationProfileGateway =
  supabase as unknown as CustomerNotificationProfileGateway;

/**
 * Fetch notification preferences for the current user
 */
export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  if (LOCAL_SUPABASE_FALLBACK) return { ...localPreviewPreferences };
  const userId = await requireAuthenticatedUserId();

  const { data, error } = await customerNotificationProfileGateway
    .from('profiles')
    .select('notification_preferences')
    .eq('id', userId)
    .single();

  if (error) {
    log.error('Failed to fetch notification preferences', { error });
    throw error;
  }

  // Return preferences or default if not set
  return (data?.notification_preferences as NotificationPreferences) || DEFAULT_NOTIFICATION_PREFERENCES;
}

/**
 * Update notification preferences for the current user
 */
export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  if (LOCAL_SUPABASE_FALLBACK) {
    localPreviewPreferences = { ...localPreviewPreferences, ...preferences };
    return { ...localPreviewPreferences };
  }
  await requireAuthenticatedUserId();

  // Fetch current preferences
  const currentPreferences = await fetchNotificationPreferences();

  // Merge with new preferences
  const updatedPreferences: NotificationPreferences = {
    ...currentPreferences,
    ...preferences,
  };

  const { data, error } = await customerNotificationPreferencesRpc.rpc(
    'update_customer_notification_preferences',
    { p_preferences: updatedPreferences }
  );

  if (error) {
    log.error('Failed to update notification preferences', { error });
    throw error;
  }

  return data as NotificationPreferences;
}

/**
 * Check if user should receive a specific notification type
 * This is a client-side check; the database function should_send_notification
 * is the authoritative source for server-side checks.
 */
export async function shouldSendNotification(
  userId: string,
  notificationType: string
): Promise<boolean> {
  if (LOCAL_SUPABASE_FALLBACK) {
    switch (notificationType) {
      case 'stage_update': return localPreviewPreferences.production_stage_updates;
      case 'item_shipped': return localPreviewPreferences.item_shipped;
      case 'item_delivered': return localPreviewPreferences.item_delivered;
      case 'marketing': return localPreviewPreferences.marketing_emails;
      default: return true;
    }
  }
  await assertCurrentUserId(userId);

  const { data, error } = await customerNotificationPreferencesRpc.rpc('should_send_notification', {
    user_id: userId,
    notification_type: notificationType,
  });

  if (error) {
    log.error('Failed to check notification preference', { error });
    // Default to true on error (send notification)
    return true;
  }

  return data ?? true;
}

/**
 * Reset notification preferences to defaults
 */
export async function resetNotificationPreferences(): Promise<NotificationPreferences> {
  return updateNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
}
