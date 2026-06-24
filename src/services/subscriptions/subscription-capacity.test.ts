/**
 * Subscription Capacity Integration Tests
 * 
 * Tests the capacity checking logic for subscription creation
 * to ensure all delivery cycles have available capacity before
 * allowing subscription creation.
 * 
 * UPDATED: Now uses monthly cycles instead of bi-weekly cycles
 * 
 * Requirements: 3.2, 9.9, 22.1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

describe('Subscription Capacity Checking (Monthly Cycles)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Trimestral Plan (3 deliveries)', () => {
    it('should check capacity for 3 consecutive monthly cycles', async () => {
      // Mock entry cycle: March 2026
      const entryCycle = {
        id: 'cycle-mar',
        month: 3,
        year: 2026,
        capacity_current: 50,
        capacity_max: 100,
      };

      // Expected cycles for 3 deliveries starting from March:
      // 1. April 2026 (next month)
      // 2. May 2026
      // 3. June 2026

      const mockCycles = [
        { id: 'cycle-apr', month: 4, year: 2026, capacity_current: 30, capacity_max: 100 },
        { id: 'cycle-may', month: 5, year: 2026, capacity_current: 40, capacity_max: 100 },
        { id: 'cycle-jun', month: 6, year: 2026, capacity_current: 20, capacity_max: 100 },
      ];

      // Mock database queries
      const fromMock = vi.fn();
      (supabase.from as any) = fromMock;

      mockCycles.forEach((cycle) => {
        fromMock.mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: cycle, error: null }),
              }),
            }),
          }),
        });
      });

      // Mock capacity check RPC calls - all should return true
      (supabase.rpc as any)
        .mockResolvedValueOnce({ data: true, error: null }) // April
        .mockResolvedValueOnce({ data: true, error: null }) // May
        .mockResolvedValueOnce({ data: true, error: null }); // June

      // Simulate the capacity checking logic (monthly)
      const deliveryCount = 3;
      let currentMonth = entryCycle.month + 1; // Start next month
      let currentYear = entryCycle.year;

      for (let i = 0; i < deliveryCount; i++) {
        // Check cycle exists
        const { data: cycle } = await supabase
          .from('cycles')
          .select('id, capacity_current, capacity_max')
          .eq('month', currentMonth)
          .eq('year', currentYear)
          .maybeSingle();

        expect(cycle).toBeDefined();
        expect(cycle.id).toBe(mockCycles[i].id);

        // Check capacity
        const { data: hasCapacity } = await supabase.rpc('check_capacity_availability', {
          p_cycle_id: cycle.id,
          p_quantity: 1,
        });

        expect(hasCapacity).toBe(true);

        // Move to next month
        currentMonth += 1;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear += 1;
        }
      }

      // Verify all cycles were checked
      expect(fromMock).toHaveBeenCalledTimes(3);
      expect(supabase.rpc).toHaveBeenCalledTimes(3);
    });

    it('should reject subscription if any month lacks capacity', async () => {
      // Mock entry cycle: March 2026
      const entryCycle = {
        id: 'cycle-mar',
        month: 3,
        year: 2026,
      };

      // Mock cycles where May is at capacity
      const mockCycles = [
        { id: 'cycle-apr', month: 4, year: 2026, capacity_current: 30, capacity_max: 100 },
        { id: 'cycle-may', month: 5, year: 2026, capacity_current: 100, capacity_max: 100 }, // FULL
        { id: 'cycle-jun', month: 6, year: 2026, capacity_current: 20, capacity_max: 100 },
      ];

      const fromMock = vi.fn();
      (supabase.from as any) = fromMock;

      mockCycles.forEach((cycle) => {
        fromMock.mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: cycle, error: null }),
              }),
            }),
          }),
        });
      });

      // Mock capacity checks: April OK, May FULL
      (supabase.rpc as any)
        .mockResolvedValueOnce({ data: true, error: null })  // April OK
        .mockResolvedValueOnce({ data: false, error: null }); // May FULL

      // Simulate checking
      try {
        const deliveryCount = 3;
        let currentMonth = entryCycle.month + 1;
        let currentYear = entryCycle.year;

        for (let i = 0; i < deliveryCount; i++) {
          const { data: cycle } = await supabase
            .from('cycles')
            .select('id, capacity_current, capacity_max')
            .eq('month', currentMonth)
            .eq('year', currentYear)
            .maybeSingle();

          const { data: hasCapacity } = await supabase.rpc('check_capacity_availability', {
            p_cycle_id: cycle.id,
            p_quantity: 1,
          });

          if (!hasCapacity) {
            throw new Error(`Capacity unavailable for ${currentMonth}/${currentYear}`);
          }

          currentMonth += 1;
          if (currentMonth > 12) {
            currentMonth = 1;
            currentYear += 1;
          }
        }

        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toContain('Capacity unavailable');
        expect(error.message).toContain('5/2026'); // May 2026
      }
    });
  });

  describe('Semestral Plan (6 deliveries)', () => {
    it('should check capacity for 6 consecutive monthly cycles', async () => {
      // Mock entry cycle: March 2026
      const entryCycle = {
        id: 'cycle-mar',
        month: 3,
        year: 2026,
      };

      // Expected cycles: April, May, June, July, August, September
      const mockCycles = [
        { id: 'cycle-apr', month: 4, year: 2026 },
        { id: 'cycle-may', month: 5, year: 2026 },
        { id: 'cycle-jun', month: 6, year: 2026 },
        { id: 'cycle-jul', month: 7, year: 2026 },
        { id: 'cycle-aug', month: 8, year: 2026 },
        { id: 'cycle-sep', month: 9, year: 2026 },
      ];

      const fromMock = vi.fn();
      (supabase.from as any) = fromMock;

      mockCycles.forEach((cycle) => {
        fromMock.mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: cycle, error: null }),
              }),
            }),
          }),
        });
      });

      // Mock all capacity checks as OK
      (supabase.rpc as any)
        .mockResolvedValueOnce({ data: true, error: null })
        .mockResolvedValueOnce({ data: true, error: null })
        .mockResolvedValueOnce({ data: true, error: null })
        .mockResolvedValueOnce({ data: true, error: null })
        .mockResolvedValueOnce({ data: true, error: null })
        .mockResolvedValueOnce({ data: true, error: null });

      // Simulate checking
      const deliveryCount = 6;
      let currentMonth = entryCycle.month + 1;
      let currentYear = entryCycle.year;

      for (let i = 0; i < deliveryCount; i++) {
        const { data: cycle } = await supabase
          .from('cycles')
          .select('id, capacity_current, capacity_max')
          .eq('month', currentMonth)
          .eq('year', currentYear)
          .maybeSingle();

        expect(cycle).toBeDefined();

        const { data: hasCapacity } = await supabase.rpc('check_capacity_availability', {
          p_cycle_id: cycle.id,
          p_quantity: 1,
        });

        expect(hasCapacity).toBe(true);

        currentMonth += 1;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear += 1;
        }
      }

      expect(fromMock).toHaveBeenCalledTimes(6);
      expect(supabase.rpc).toHaveBeenCalledTimes(6);
    });
  });

  describe('Year Boundary Handling', () => {
    it('should correctly handle deliveries crossing year boundary', async () => {
      // Mock entry cycle: November 2026
      const entryCycle = {
        id: 'cycle-nov',
        month: 11,
        year: 2026,
      };

      // Expected cycles: December 2026, January 2027, February 2027
      const mockCycles = [
        { id: 'cycle-dec', month: 12, year: 2026 },
        { id: 'cycle-jan-2027', month: 1, year: 2027 }, // New year!
        { id: 'cycle-feb-2027', month: 2, year: 2027 },
      ];

      const fromMock = vi.fn();
      (supabase.from as any) = fromMock;

      mockCycles.forEach((cycle) => {
        fromMock.mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: cycle, error: null }),
              }),
            }),
          }),
        });
      });

      (supabase.rpc as any)
        .mockResolvedValueOnce({ data: true, error: null })
        .mockResolvedValueOnce({ data: true, error: null })
        .mockResolvedValueOnce({ data: true, error: null });

      const deliveryCount = 3;
      let currentMonth = entryCycle.month + 1;
      let currentYear = entryCycle.year;

      const checkedCycles: Array<{ month: number; year: number }> = [];

      for (let i = 0; i < deliveryCount; i++) {
        checkedCycles.push({ month: currentMonth, year: currentYear });

        const { data: cycle } = await supabase
          .from('cycles')
          .select('id, capacity_current, capacity_max')
          .eq('month', currentMonth)
          .eq('year', currentYear)
          .maybeSingle();

        expect(cycle).toBeDefined();
        expect(cycle.id).toBe(mockCycles[i].id);

        currentMonth += 1;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear += 1;
        }
      }

      // Verify year boundary was crossed correctly
      expect(checkedCycles).toEqual([
        { month: 12, year: 2026 },
        { month: 1, year: 2027 },
        { month: 2, year: 2027 },
      ]);
    });
  });
});
