/**
 * Notification Preferences Service
 * 
 * Manages user preferences for email notifications.
 */

import { supabase } from '@/integrations/supabase/client';

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

class NotificationPreferencesService {
  /**
   * Get notification preferences for a user
   * 
   * @param userId - User ID
   * @returns User's notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching notification preferences:', error);
      return null;
    }

    return data as NotificationPreferences;
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
    preferences: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<NotificationPreferences | null> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .update(preferences)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating notification preferences:', error);
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
    const { data, error } = await supabase
      .from('notification_preferences')
      .insert({
        user_id: userId,
        welcome_emails: true,
        reminder_emails: true,
        revelation_emails: true,
        shipping_emails: true,
        payment_emails: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification preferences:', error);
      return null;
    }

    return data as NotificationPreferences;
  }

  /**
   * Check if user wants to receive a specific email type
   * 
   * @param userId - User ID
   * @param emailType - Type of email
   * @returns True if user wants to receive this email type
   */
  async shouldSendEmail(userId: string, emailType: EmailType): Promise<boolean> {
    const preferences = await this.getPreferences(userId);

    if (!preferences) {
      // If no preferences found, create default (all enabled)
      await this.createDefaultPreferences(userId);
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
}

// Export singleton instance
export const notificationPreferencesService = new NotificationPreferencesService();
