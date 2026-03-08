/**
 * Tests for Notification Preferences Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  shouldSendNotification,
  resetNotificationPreferences,
} from '../notification-preferences-service';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/notification-preferences';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('Notification Preferences Service', () => {
  const mockUserId = 'user-123';
  const mockUser = { id: mockUserId };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    });
  });

  describe('fetchNotificationPreferences', () => {
    it('fetches preferences for authenticated user', async () => {
      const mockPreferences = {
        production_stage_updates: true,
        item_shipped: false,
        item_delivered: true,
        marketing_emails: false,
      };

      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { notification_preferences: mockPreferences },
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const result = await fetchNotificationPreferences();

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockFrom.select).toHaveBeenCalledWith('notification_preferences');
      expect(mockFrom.eq).toHaveBeenCalledWith('id', mockUserId);
      expect(result).toEqual(mockPreferences);
    });

    it('returns default preferences when none are set', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { notification_preferences: null },
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const result = await fetchNotificationPreferences();

      expect(result).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    });

    it('throws error when user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(fetchNotificationPreferences()).rejects.toThrow('User not authenticated');
    });

    it('throws error when database query fails', async () => {
      const mockError = new Error('Database error');
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      await expect(fetchNotificationPreferences()).rejects.toThrow(mockError);
    });
  });

  describe('updateNotificationPreferences', () => {
    it('updates preferences for authenticated user', async () => {
      const currentPreferences = {
        production_stage_updates: true,
        item_shipped: true,
        item_delivered: true,
        marketing_emails: true,
      };

      const updates = {
        production_stage_updates: false,
      };

      const expectedPreferences = {
        ...currentPreferences,
        ...updates,
      };

      // Mock fetch
      const mockFetchFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { notification_preferences: currentPreferences },
          error: null,
        }),
      };

      // Mock update
      const mockUpdateFrom = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { notification_preferences: expectedPreferences },
          error: null,
        }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockFetchFrom as any)
        .mockReturnValueOnce(mockUpdateFrom as any);

      const result = await updateNotificationPreferences(updates);

      expect(mockUpdateFrom.update).toHaveBeenCalledWith({
        notification_preferences: expectedPreferences,
      });
      expect(result).toEqual(expectedPreferences);
    });

    it('throws error when user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(updateNotificationPreferences({})).rejects.toThrow('User not authenticated');
    });

    it('throws error when update fails', async () => {
      const mockError = new Error('Update failed');

      // Mock fetch
      const mockFetchFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { notification_preferences: DEFAULT_NOTIFICATION_PREFERENCES },
          error: null,
        }),
      };

      // Mock update with error
      const mockUpdateFrom = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockFetchFrom as any)
        .mockReturnValueOnce(mockUpdateFrom as any);

      await expect(updateNotificationPreferences({})).rejects.toThrow(mockError);
    });
  });

  describe('shouldSendNotification', () => {
    it('calls database function to check preference', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null,
      });

      const result = await shouldSendNotification(mockUserId, 'stage_update');

      expect(supabase.rpc).toHaveBeenCalledWith('should_send_notification', {
        user_id: mockUserId,
        notification_type: 'stage_update',
      });
      expect(result).toBe(true);
    });

    it('returns true when database function returns true', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null,
      });

      const result = await shouldSendNotification(mockUserId, 'stage_update');
      expect(result).toBe(true);
    });

    it('returns false when database function returns false', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: false,
        error: null,
      });

      const result = await shouldSendNotification(mockUserId, 'stage_update');
      expect(result).toBe(false);
    });

    it('returns true on error (fail-safe)', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      const result = await shouldSendNotification(mockUserId, 'stage_update');
      expect(result).toBe(true);
    });
  });

  describe('resetNotificationPreferences', () => {
    it('resets preferences to defaults', async () => {
      // Mock fetch
      const mockFetchFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            notification_preferences: {
              production_stage_updates: false,
              item_shipped: false,
              item_delivered: false,
              marketing_emails: false,
            },
          },
          error: null,
        }),
      };

      // Mock update
      const mockUpdateFrom = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { notification_preferences: DEFAULT_NOTIFICATION_PREFERENCES },
          error: null,
        }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockFetchFrom as any)
        .mockReturnValueOnce(mockUpdateFrom as any);

      const result = await resetNotificationPreferences();

      expect(mockUpdateFrom.update).toHaveBeenCalledWith({
        notification_preferences: DEFAULT_NOTIFICATION_PREFERENCES,
      });
      expect(result).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    });
  });
});
