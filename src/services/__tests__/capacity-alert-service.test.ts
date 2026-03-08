/**
 * Capacity Alert Service Tests
 * 
 * Tests for capacity alert configuration and triggering functionality.
 * 
 * Requirements: 16.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  configureAlert,
  getAlertConfig,
  getAlertStatus,
  checkAndTriggerAlert,
  resetAlert
} from '../capacity-alert-service';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

describe('Capacity Alert Service', () => {
  const mockCycleId = 'test-cycle-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('configureAlert', () => {
    it('should configure alert with valid threshold', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ error: null });
      const mockEq = vi.fn().mockReturnValue({ error: null });
      
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate.mockReturnValue({
          eq: mockEq
        })
      } as any);

      await configureAlert(mockCycleId, {
        threshold: 80,
        email: 'admin@ordax.com',
        sms: '+5571999999999'
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        alert_threshold: 80,
        alert_email: 'admin@ordax.com',
        alert_sms: '+5571999999999'
      });
      expect(mockEq).toHaveBeenCalledWith('id', mockCycleId);
    });

    it('should reject threshold below 1', async () => {
      await expect(
        configureAlert(mockCycleId, {
          threshold: 0,
          email: null,
          sms: null
        })
      ).rejects.toThrow('Alert threshold must be between 1 and 100');
    });

    it('should reject threshold above 100', async () => {
      await expect(
        configureAlert(mockCycleId, {
          threshold: 101,
          email: null,
          sms: null
        })
      ).rejects.toThrow('Alert threshold must be between 1 and 100');
    });

    it('should accept null email and sms', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ error: null });
      const mockEq = vi.fn().mockReturnValue({ error: null });
      
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate.mockReturnValue({
          eq: mockEq
        })
      } as any);

      await configureAlert(mockCycleId, {
        threshold: 75,
        email: null,
        sms: null
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        alert_threshold: 75,
        alert_email: null,
        alert_sms: null
      });
    });
  });

  describe('getAlertConfig', () => {
    it('should return alert configuration', async () => {
      const mockCycle = {
        alert_threshold: 85,
        alert_email: 'test@ordax.com',
        alert_sms: '+5571888888888'
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockCycle, error: null })
          })
        })
      } as any);

      const config = await getAlertConfig(mockCycleId);

      expect(config).toEqual({
        threshold: 85,
        email: 'test@ordax.com',
        sms: '+5571888888888'
      });
    });

    it('should return default threshold if not set', async () => {
      const mockCycle = {
        alert_threshold: null,
        alert_email: null,
        alert_sms: null
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockCycle, error: null })
          })
        })
      } as any);

      const config = await getAlertConfig(mockCycleId);

      expect(config.threshold).toBe(80); // Default threshold
    });
  });

  describe('getAlertStatus', () => {
    it('should calculate current percentage correctly', async () => {
      const mockCycle = {
        alert_triggered: false,
        alert_triggered_at: null,
        alert_threshold: 80,
        capacity_current: 75,
        capacity_max: 100
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockCycle, error: null })
          })
        })
      } as any);

      const status = await getAlertStatus(mockCycleId);

      expect(status.currentPercentage).toBe(75);
      expect(status.threshold).toBe(80);
      expect(status.triggered).toBe(false);
    });

    it('should handle triggered alert', async () => {
      const triggeredAt = new Date('2026-03-15T10:00:00Z');
      const mockCycle = {
        alert_triggered: true,
        alert_triggered_at: triggeredAt.toISOString(),
        alert_threshold: 80,
        capacity_current: 85,
        capacity_max: 100
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockCycle, error: null })
          })
        })
      } as any);

      const status = await getAlertStatus(mockCycleId);

      expect(status.triggered).toBe(true);
      expect(status.triggeredAt).toEqual(triggeredAt);
      expect(status.currentPercentage).toBe(85);
    });
  });

  describe('checkAndTriggerAlert', () => {
    it('should return true when alert is triggered', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null });

      const result = await checkAndTriggerAlert(mockCycleId);

      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('check_capacity_alert', {
        p_cycle_id: mockCycleId
      });
    });

    it('should return false when alert is not triggered', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: false, error: null });

      const result = await checkAndTriggerAlert(mockCycleId);

      expect(result).toBe(false);
    });
  });

  describe('resetAlert', () => {
    it('should reset alert successfully', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ error: null });

      await resetAlert(mockCycleId);

      expect(supabase.rpc).toHaveBeenCalledWith('reset_capacity_alert', {
        p_cycle_id: mockCycleId
      });
    });

    it('should throw error on failure', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ 
        error: { message: 'Database error' } 
      });

      await expect(resetAlert(mockCycleId)).rejects.toThrow(
        'Failed to reset alert: Database error'
      );
    });
  });
});
