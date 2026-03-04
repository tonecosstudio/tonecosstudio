// @ts-nocheck
/**
 * Integration tests for capacity reservation management
 * 
 * Tests the interaction between reserved capacity and regular capacity usage.
 * 
 * Requirements: 16.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { getCapacityUsage, checkAvailability } from '../capacity-service';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('Capacity Reservation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCapacityUsage with reserved capacity', () => {
    it('should include reserved capacity in usage calculation', async () => {
      const mockCycle = {
        capacity_max: 100,
        capacity_current: 30,
        reserved_capacity: 20,
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCycle,
              error: null,
            }),
          }),
        }),
      });

      const usage = await getCapacityUsage('cycle-123');

      expect(usage.max).toBe(100);
      expect(usage.current).toBe(30);
      expect(usage.reserved).toBe(20);
      // Available = max - current - reserved = 100 - 30 - 20 = 50
      expect(usage.available).toBe(50);
    });

    it('should handle zero reserved capacity', async () => {
      const mockCycle = {
        capacity_max: 100,
        capacity_current: 40,
        reserved_capacity: 0,
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCycle,
              error: null,
            }),
          }),
        }),
      });

      const usage = await getCapacityUsage('cycle-123');

      expect(usage.reserved).toBe(0);
      expect(usage.available).toBe(60); // 100 - 40 - 0
    });

    it('should handle missing reserved_capacity field (backward compatibility)', async () => {
      const mockCycle = {
        capacity_max: 100,
        capacity_current: 40,
        // reserved_capacity not present
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCycle,
              error: null,
            }),
          }),
        }),
      });

      const usage = await getCapacityUsage('cycle-123');

      expect(usage.reserved).toBe(0);
      expect(usage.available).toBe(60); // 100 - 40 - 0
    });

    it('should not allow negative available capacity', async () => {
      const mockCycle = {
        capacity_max: 100,
        capacity_current: 60,
        reserved_capacity: 50,
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCycle,
              error: null,
            }),
          }),
        }),
      });

      const usage = await getCapacityUsage('cycle-123');

      // Available = max(0, 100 - 60 - 50) = max(0, -10) = 0
      expect(usage.available).toBe(0);
    });
  });

  describe('checkAvailability with reserved capacity', () => {
    it('should account for reserved capacity when checking availability', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: true,
        error: null,
      });

      (supabase.rpc as any) = mockRpc;

      const available = await checkAvailability('cycle-123', 5);

      expect(available).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith('check_capacity_available', {
        p_cycle_id: 'cycle-123',
        p_quantity: 5,
      });
    });

    it('should return false when reserved capacity reduces availability', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: false,
        error: null,
      });

      (supabase.rpc as any) = mockRpc;

      const available = await checkAvailability('cycle-123', 60);

      expect(available).toBe(false);
    });
  });

  describe('Capacity reservation scenarios', () => {
    it('should correctly calculate available capacity with high reservation', async () => {
      // Scenario: 100 max, 20 used, 70 reserved = 10 available
      const mockCycle = {
        capacity_max: 100,
        capacity_current: 20,
        reserved_capacity: 70,
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCycle,
              error: null,
            }),
          }),
        }),
      });

      const usage = await getCapacityUsage('cycle-123');

      expect(usage.available).toBe(10);
      expect(usage.percentage).toBe(20); // Based on current usage only
    });

    it('should handle full capacity with reservations', async () => {
      // Scenario: 100 max, 50 used, 50 reserved = 0 available
      const mockCycle = {
        capacity_max: 100,
        capacity_current: 50,
        reserved_capacity: 50,
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCycle,
              error: null,
            }),
          }),
        }),
      });

      const usage = await getCapacityUsage('cycle-123');

      expect(usage.available).toBe(0);
      expect(usage.current).toBe(50);
      expect(usage.reserved).toBe(50);
    });

    it('should handle partial reservation release', async () => {
      // Scenario: After releasing some reserved capacity
      const mockCycle = {
        capacity_max: 100,
        capacity_current: 40,
        reserved_capacity: 30, // Was 50, released 20
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCycle,
              error: null,
            }),
          }),
        }),
      });

      const usage = await getCapacityUsage('cycle-123');

      expect(usage.available).toBe(30); // 100 - 40 - 30
      expect(usage.reserved).toBe(30);
    });
  });

  describe('Edge cases', () => {
    it('should handle maximum reserved capacity', async () => {
      const mockCycle = {
        capacity_max: 100,
        capacity_current: 0,
        reserved_capacity: 100,
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCycle,
              error: null,
            }),
          }),
        }),
      });

      const usage = await getCapacityUsage('cycle-123');

      expect(usage.available).toBe(0);
      expect(usage.reserved).toBe(100);
    });

    it('should handle small capacity with reservations', async () => {
      const mockCycle = {
        capacity_max: 10,
        capacity_current: 3,
        reserved_capacity: 5,
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCycle,
              error: null,
            }),
          }),
        }),
      });

      const usage = await getCapacityUsage('cycle-123');

      expect(usage.available).toBe(2); // 10 - 3 - 5
    });
  });
});
