/**
 * Notification Preferences Service
 * 
 * Manages user preferences for email notifications.
 */

import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';
import { assertCurrentUserId, requireAuthenticatedUserId } from '@/services/auth/current-user';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  welcome_emails: boolean;
  reminder_emails: boolean;
  revelation_emails: boolean;
  shipping_emails: boolean;
  payment_emails: boolean;
  created_at: string;
  updated_at: string;
}

export type EmailType = 
  | 'welcome'
  | 'reminder'
  | 'revelation'
  | 'shipping'
  | 'payment';

type EmailPreferenceUpdate = Partial<
  Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>;

interface NotificationPreferencesRpcClient {
  rpc(
    fn: 'upsert_email_notification_preferences',
    args: {
      p_user_id: string;
      p_preferences: EmailPreferenceUpdate | null;
    }
  ): Promise<{ data: NotificationPreferences | null; error: { message: string } | null }>;
}

const notificationPreferencesRpc = supabase as unknown as NotificationPreferencesRpcClient;

interface NotificationPreferencesQuery extends PromiseLike<{
  data: NotificationPreferences | null;
  error: { message: string } | null;
}> {
  eq(column: 'user_id', value: string): NotificationPreferencesQuery;
  single(): Promise<{ data: NotificationPreferences | null; error: { message: string } | null }>;
}

interface NotificationPreferencesGateway {
  from(table: 'notification_preferences'): {
    select(columns: '*'): NotificationPreferencesQuery;
  };
}

const notificationPreferencesGateway = supabase as unknown as NotificationPreferencesGateway;

class NotificationPreferencesService {
  private async getPreferencesForUser(userId: string): Promise<NotificationPreferences | null> {
    const { data, error } = await notificationPreferencesGateway
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      logError('Error fetching notification preferences', error, 'notification-preferences');
      return null;
    }

    return data as NotificationPreferences;
  }

  private async createDefaultPreferencesForUser(userId: string): Promise<NotificationPreferences | null> {
    const { data, error } = await notificationPreferencesRpc.rpc(
      'upsert_email_notification_preferences',
      {
        p_user_id: userId,
        p_preferences: null,
      }
    );

    if (error) {
      logError('Error creating notification preferences', error, 'notification-preferences');
      return null;
    }

    return data as NotificationPreferences;
  }

  /**
   * Get notification preferences for a user
   *
   * @param userId - User ID
   * @returns User's notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    await assertCurrentUserId(userId);
    return this.getPreferencesForUser(userId);
  }

  /**
   * Update notification preferences for a user
   *
   * @param userId - User ID
   * @param preferences - Preferences to update
   * @returns Updated preferences
   */
  async updatePreferences(
    userId: string,
    preferences: EmailPreferenceUpdate
  ): Promise<NotificationPreferences | null> {
    await assertCurrentUserId(userId);

    const { data, error } = await notificationPreferencesRpc.rpc(
      'upsert_email_notification_preferences',
      {
        p_user_id: userId,
        p_preferences: preferences,
      }
    );

    if (error) {
      logError('Error updating notification preferences', error, 'notification-preferences');
      return null;
    }

    return data as NotificationPreferences;
  }

  /**
   * Create default preferences for a user
   *
   * @param userId - User ID
   * @returns Created preferences
   */
  async createDefaultPreferences(userId: string): Promise<NotificationPreferences | null> {
    await assertCurrentUserId(userId);
    return this.createDefaultPreferencesForUser(userId);
  }

  async getOrCreateCurrentPreferences(): Promise<NotificationPreferences | null> {
    const userId = await requireAuthenticatedUserId();
    const preferences = await this.getPreferencesForUser(userId);

    if (preferences) {
      return preferences;
    }

    return this.createDefaultPreferencesForUser(userId);
  }

  async updateCurrentPreferences(
    preferences: EmailPreferenceUpdate
  ): Promise<NotificationPreferences | null> {
    const userId = await requireAuthenticatedUserId();
    return this.updatePreferences(userId, preferences);
  }

  /**
   * Check if user wants to receive a specific email type
   *
   * @param userId - User ID
   * @param emailType - Type of email
   * @returns True if user wants to receive this email type
   */
  async shouldSendEmail(userId: string, emailType: EmailType): Promise<boolean> {
    const preferences = await this.getPreferencesForUser(userId);

    if (!preferences) {
      // If no preferences found, create default (all enabled)
      await this.createDefaultPreferencesForUser(userId);
      return true;
    }

    // Map email type to preference field
    const preferenceMap: Record<EmailType, keyof NotificationPreferences> = {
      welcome: 'welcome_emails',
      reminder: 'reminder_emails',
      revelation: 'revelation_emails',
      shipping: 'shipping_emails',
      payment: 'payment_emails'
    };

    const preferenceField = preferenceMap[emailType];
    return preferences[preferenceField] as boolean;
  }

  /**
   * Enable all email notifications for a user
   *
   * @param userId - User ID
   * @returns Updated preferences
   */
  async enableAllEmails(userId: string): Promise<NotificationPreferences | null> {
    return this.updatePreferences(userId, {
      welcome_emails: true,
      reminder_emails: true,
      revelation_emails: true,
      shipping_emails: true,
      payment_emails: true
    });
  }

  /**
   * Disable all email notifications for a user
   * 
   * @param userId - User ID
   * @returns Updated preferences
   */
  async disableAllEmails(userId: string): Promise<NotificationPreferences | null> {
    return this.updatePreferences(userId, {
      welcome_emails: false,
      reminder_emails: false,
      revelation_emails: false,
      shipping_emails: false,
      payment_emails: false
    });
  }

  async enableAllCurrentUserEmails(): Promise<NotificationPreferences | null> {
    return this.updateCurrentPreferences({
      welcome_emails: true,
      reminder_emails: true,
      revelation_emails: true,
      shipping_emails: true,
      payment_emails: true
    });
  }

  async disableAllCurrentUserEmails(): Promise<NotificationPreferences | null> {
    return this.updateCurrentPreferences({
      welcome_emails: false,
      reminder_emails: false,
      revelation_emails: false,
      shipping_emails: false,
      payment_emails: false
    });
  }
}

// Export singleton instance
export const notificationPreferencesService = new NotificationPreferencesService();
