// @ts-nocheck
/**
 * Notification Preferences Service
 * 
 * Handles fetching and updating customer notification preferences.
 */

import { supabase } from '@/integrations/supabase/client';
import type { NotificationPreferences } from '@/types/notification-preferences';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/notification-preferences';

/**
 * Fetch notification preferences for the current user
 */
export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('notification_preferences')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Failed to fetch notification preferences:', error);
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
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Fetch current preferences
  const currentPreferences = await fetchNotificationPreferences();

  // Merge with new preferences
  const updatedPreferences: NotificationPreferences = {
    ...currentPreferences,
    ...preferences,
  };

  // Update in database
  const { data, error } = await supabase
    .from('profiles')
    .update({ notification_preferences: updatedPreferences })
    .eq('id', user.id)
    .select('notification_preferences')
    .single();

  if (error) {
    console.error('Failed to update notification preferences:', error);
    throw error;
  }

  return data.notification_preferences as NotificationPreferences;
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
  const { data, error } = await supabase.rpc('should_send_notification', {
    user_id: userId,
    notification_type: notificationType,
  });

  if (error) {
    console.error('Failed to check notification preference:', error);
    // Default to true on error (send notification)
    return true;
  }

  return data as boolean;
}

/**
 * Reset notification preferences to defaults
 */
export async function resetNotificationPreferences(): Promise<NotificationPreferences> {
  return updateNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
}
