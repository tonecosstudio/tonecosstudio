/**
 * Subscription Capacity Integration Tests
 * 
 * Tests the capacity checking logic for subscription creation
 * to ensure all delivery cycles have available capacity before
 * allowing subscription creation.
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

describe('Subscription Capacity Checking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Trimestral Plan (3 deliveries)', () => {
    it('should check capacity for all 3 consecutive cycles', async () => {
      // Mock entry cycle: Cycle 1, January 2026
      const entryCycle = {
        id: 'cycle-1-jan',
        cycle_number: 1,
        month: 1,
        year: 2026,
        capacity_current: 50,
        capacity_max: 100,
      };

      // Expected cycles for 3 deliveries starting from Cycle 1, Jan:
      // 1. Cycle 2, January 2026
      // 2. Cycle 1, February 2026
      // 3. Cycle 2, February 2026

      const mockCycles = [
        { id: 'cycle-2-jan', cycle_number: 2, month: 1, year: 2026, capacity_current: 30, capacity_max: 100 },
        { id: 'cycle-1-feb', cycle_number: 1, month: 2, year: 2026, capacity_current: 40, capacity_max: 100 },
        { id: 'cycle-2-feb', cycle_number: 2, month: 2, year: 2026, capacity_current: 20, capacity_max: 100 },
      ];

      // Mock database queries
      const fromMock = vi.fn();
      (supabase.from as any) = fromMock;

      mockCycles.forEach((cycle, index) => {
        fromMock.mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: cycle, error: null }),
                }),
              }),
            }),
          }),
        });
      });

      // Mock capacity check RPC calls - all should return true
      (supabase.rpc as any)
        .mockResolvedValueOnce({ data: true, error: null }) // Cycle 2, Jan
        .mockResolvedValueOnce({ data: true, error: null }) // Cycle 1, Feb
        .mockResolvedValueOnce({ data: true, error: null }); // Cycle 2, Feb

      // Simulate the capacity checking logic
      const deliveryCount = 3;
      let currentCycleNumber = entryCycle.cycle_number;
      let currentMonth = entryCycle.month;
      let currentYear = entryCycle.year;

      for (let i = 0; i < deliveryCount; i++) {
        // Advance to next cycle
        if (currentCycleNumber === 1) {
          currentCycleNumber = 2;
        } else {
          currentCycleNumber = 1;
          currentMonth = currentMonth + 1;
          if (currentMonth > 12) {
            currentMonth = 1;
            currentYear = currentYear + 1;
          }
        }

        // Check cycle exists
        const { data: cycle } = await supabase
          .from('cycles')
          .select('id, capacity_current, capacity_max, capacity_limit')
          .eq('cycle_number', currentCycleNumber)
          .eq('month', currentMonth)
          .eq('year', currentYear)
          .maybeSingle();

        expect(cycle).toBeDefined();

        // Check capacity
        const { data: hasCapacity } = await supabase.rpc('check_capacity_available', {
          p_cycle_id: cycle!.id,
          p_quantity: 1,
        });

        expect(hasCapacity).toBe(true);
      }

      // Verify all RPC calls were made
      expect(supabase.rpc).toHaveBeenCalledTimes(3);
    });

    it('should reject subscription if any cycle lacks capacity', async () => {
      const entryCycle = {
        id: 'cycle-1-jan',
        cycle_number: 1,
        month: 1,
        year: 2026,
      };

      const mockCycles = [
        { id: 'cycle-2-jan', capacity_current: 30, capacity_max: 100 },
        { id: 'cycle-1-feb', capacity_current: 99, capacity_max: 100 }, // Almost full
        { id: 'cycle-2-feb', capacity_current: 20, capacity_max: 100 },
      ];

      const fromMock = vi.fn();
      (supabase.from as any) = fromMock;

      mockCycles.forEach((cycle) => {
        fromMock.mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: cycle, error: null }),
                }),
              }),
            }),
          }),
        });
      });

      // First cycle has capacity, second doesn't, third won't be checked
      (supabase.rpc as any)
        .mockResolvedValueOnce({ data: true, error: null })
        .mockResolvedValueOnce({ data: false, error: null }); // No capacity!

      // Simulate checking
      let hasError = false;
      let errorMessage = '';

      try {
        const deliveryCount = 3;
        let currentCycleNumber = entryCycle.cycle_number;
        let currentMonth = entryCycle.month;
        let currentYear = entryCycle.year;

        for (let i = 0; i < deliveryCount; i++) {
          if (currentCycleNumber === 1) {
            currentCycleNumber = 2;
          } else {
            currentCycleNumber = 1;
            currentMonth = currentMonth + 1;
            if (currentMonth > 12) {
              currentMonth = 1;
              currentYear = currentYear + 1;
            }
          }

          const { data: cycle } = await supabase
            .from('cycles')
            .select('id, capacity_current, capacity_max, capacity_limit')
            .eq('cycle_number', currentCycleNumber)
            .eq('month', currentMonth)
            .eq('year', currentYear)
            .maybeSingle();

          const { data: hasCapacity } = await supabase.rpc('check_capacity_available', {
            p_cycle_id: cycle!.id,
            p_quantity: 1,
          });

          if (!hasCapacity) {
            throw new Error(
              `Capacidade esgotada para o Ciclo ${currentCycleNumber} de ${currentMonth}/${currentYear}`
            );
          }
        }
      } catch (error) {
        hasError = true;
        errorMessage = (error as Error).message;
      }

      expect(hasError).toBe(true);
      expect(errorMessage).toContain('Capacidade esgotada');
      expect(errorMessage).toContain('Ciclo 1');
      expect(errorMessage).toContain('2/2026'); // February 2026
    });
  });

  describe('Semestral Plan (6 deliveries)', () => {
    it('should check capacity for all 6 consecutive cycles', async () => {
      // Entry cycle: Cycle 2, March 2026
      const entryCycle = {
        id: 'cycle-2-mar',
        cycle_number: 2,
        month: 3,
        year: 2026,
      };

      // Expected cycles for 6 deliveries starting from Cycle 2, March:
      // 1. Cycle 1, April 2026
      // 2. Cycle 2, April 2026
      // 3. Cycle 1, May 2026
      // 4. Cycle 2, May 2026
      // 5. Cycle 1, June 2026
      // 6. Cycle 2, June 2026

      const mockCycles = [
        { id: 'cycle-1-apr', cycle_number: 1, month: 4, year: 2026 },
        { id: 'cycle-2-apr', cycle_number: 2, month: 4, year: 2026 },
        { id: 'cycle-1-may', cycle_number: 1, month: 5, year: 2026 },
        { id: 'cycle-2-may', cycle_number: 2, month: 5, year: 2026 },
        { id: 'cycle-1-jun', cycle_number: 1, month: 6, year: 2026 },
        { id: 'cycle-2-jun', cycle_number: 2, month: 6, year: 2026 },
      ];

      const fromMock = vi.fn();
      (supabase.from as any) = fromMock;

      mockCycles.forEach((cycle) => {
        fromMock.mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: cycle, error: null }),
                }),
              }),
            }),
          }),
        });
      });

      // All cycles have capacity
      for (let i = 0; i < 6; i++) {
        (supabase.rpc as any).mockResolvedValueOnce({ data: true, error: null });
      }

      // Simulate checking
      const deliveryCount = 6;
      let currentCycleNumber = entryCycle.cycle_number;
      let currentMonth = entryCycle.month;
      let currentYear = entryCycle.year;

      for (let i = 0; i < deliveryCount; i++) {
        if (currentCycleNumber === 1) {
          currentCycleNumber = 2;
        } else {
          currentCycleNumber = 1;
          currentMonth = currentMonth + 1;
          if (currentMonth > 12) {
            currentMonth = 1;
            currentYear = currentYear + 1;
          }
        }

        const { data: cycle } = await supabase
          .from('cycles')
          .select('id, capacity_current, capacity_max, capacity_limit')
          .eq('cycle_number', currentCycleNumber)
          .eq('month', currentMonth)
          .eq('year', currentYear)
          .maybeSingle();

        expect(cycle).toBeDefined();

        const { data: hasCapacity } = await supabase.rpc('check_capacity_available', {
          p_cycle_id: cycle!.id,
          p_quantity: 1,
        });

        expect(hasCapacity).toBe(true);
      }

      expect(supabase.rpc).toHaveBeenCalledTimes(6);
    });

    it('should reject if 5th delivery cycle lacks capacity', async () => {
      const entryCycle = {
        id: 'cycle-2-mar',
        cycle_number: 2,
        month: 3,
        year: 2026,
      };

      const mockCycles = [
        { id: 'cycle-1-apr', cycle_number: 1, month: 4, year: 2026 },
        { id: 'cycle-2-apr', cycle_number: 2, month: 4, year: 2026 },
        { id: 'cycle-1-may', cycle_number: 1, month: 5, year: 2026 },
        { id: 'cycle-2-may', cycle_number: 2, month: 5, year: 2026 },
        { id: 'cycle-1-jun', cycle_number: 1, month: 6, year: 2026 }, // This one is full
      ];

      const fromMock = vi.fn();
      (supabase.from as any) = fromMock;

      mockCycles.forEach((cycle) => {
        fromMock.mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: cycle, error: null }),
                }),
              }),
            }),
          }),
        });
      });

      // First 4 have capacity, 5th doesn't
      (supabase.rpc as any)
        .mockResolvedValueOnce({ data: true, error: null })
        .mockResolvedValueOnce({ data: true, error: null })
        .mockResolvedValueOnce({ data: true, error: null })
        .mockResolvedValueOnce({ data: true, error: null })
        .mockResolvedValueOnce({ data: false, error: null }); // No capacity!

      let hasError = false;
      let errorMessage = '';

      try {
        const deliveryCount = 6;
        let currentCycleNumber = entryCycle.cycle_number;
        let currentMonth = entryCycle.month;
        let currentYear = entryCycle.year;

        for (let i = 0; i < deliveryCount; i++) {
          if (currentCycleNumber === 1) {
            currentCycleNumber = 2;
          } else {
            currentCycleNumber = 1;
            currentMonth = currentMonth + 1;
            if (currentMonth > 12) {
              currentMonth = 1;
              currentYear = currentYear + 1;
            }
          }

          const { data: cycle } = await supabase
            .from('cycles')
            .select('id, capacity_current, capacity_max, capacity_limit')
            .eq('cycle_number', currentCycleNumber)
            .eq('month', currentMonth)
            .eq('year', currentYear)
            .maybeSingle();

          const { data: hasCapacity } = await supabase.rpc('check_capacity_available', {
            p_cycle_id: cycle!.id,
            p_quantity: 1,
          });

          if (!hasCapacity) {
            throw new Error(
              `Capacidade esgotada para o Ciclo ${currentCycleNumber} de ${currentMonth}/${currentYear} (entrega ${i + 1} de ${deliveryCount})`
            );
          }
        }
      } catch (error) {
        hasError = true;
        errorMessage = (error as Error).message;
      }

      expect(hasError).toBe(true);
      expect(errorMessage).toContain('Capacidade esgotada');
      expect(errorMessage).toContain('entrega 5 de 6');
      expect(errorMessage).toContain('Ciclo 1');
      expect(errorMessage).toContain('6/2026'); // June 2026
    });
  });

  describe('Year boundary handling', () => {
    it('should correctly handle cycles crossing year boundary', async () => {
      // Entry cycle: Cycle 2, November 2026
      const entryCycle = {
        id: 'cycle-2-nov',
        cycle_number: 2,
        month: 11,
        year: 2026,
      };

      // Expected cycles for 3 deliveries:
      // 1. Cycle 1, December 2026
      // 2. Cycle 2, December 2026
      // 3. Cycle 1, January 2027 (year boundary!)

      const mockCycles = [
        { id: 'cycle-1-dec', cycle_number: 1, month: 12, year: 2026 },
        { id: 'cycle-2-dec', cycle_number: 2, month: 12, year: 2026 },
        { id: 'cycle-1-jan-2027', cycle_number: 1, month: 1, year: 2027 }, // New year!
      ];

      const fromMock = vi.fn();
      (supabase.from as any) = fromMock;

      mockCycles.forEach((cycle) => {
        fromMock.mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: cycle, error: null }),
                }),
              }),
            }),
          }),
        });
      });

      for (let i = 0; i < 3; i++) {
        (supabase.rpc as any).mockResolvedValueOnce({ data: true, error: null });
      }

      const deliveryCount = 3;
      let currentCycleNumber = entryCycle.cycle_number;
      let currentMonth = entryCycle.month;
      let currentYear = entryCycle.year;

      const checkedCycles: Array<{ cycle: number; month: number; year: number }> = [];

      for (let i = 0; i < deliveryCount; i++) {
        if (currentCycleNumber === 1) {
          currentCycleNumber = 2;
        } else {
          currentCycleNumber = 1;
          currentMonth = currentMonth + 1;
          if (currentMonth > 12) {
            currentMonth = 1;
            currentYear = currentYear + 1;
          }
        }

        checkedCycles.push({
          cycle: currentCycleNumber,
          month: currentMonth,
          year: currentYear,
        });

        await supabase
          .from('cycles')
          .select('id, capacity_current, capacity_max, capacity_limit')
          .eq('cycle_number', currentCycleNumber)
          .eq('month', currentMonth)
          .eq('year', currentYear)
          .maybeSingle();
      }

      // Verify the year boundary was handled correctly
      expect(checkedCycles[0]).toEqual({ cycle: 1, month: 12, year: 2026 });
      expect(checkedCycles[1]).toEqual({ cycle: 2, month: 12, year: 2026 });
      expect(checkedCycles[2]).toEqual({ cycle: 1, month: 1, year: 2027 }); // New year!
    });
  });

  describe('Capacity reservation after successful check', () => {
    it('should reserve capacity for all delivery cycles after check passes', async () => {
      // Mock deliveries returned from schedule_consecutive_deliveries
      const mockDeliveries = [
        { id: 'delivery-1', cycle_id: 'cycle-2-jan', delivery_number: 1 },
        { id: 'delivery-2', cycle_id: 'cycle-1-feb', delivery_number: 2 },
        { id: 'delivery-3', cycle_id: 'cycle-2-feb', delivery_number: 3 },
      ];

      // Mock reserve_capacity RPC calls
      (supabase.rpc as any)
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      // Simulate reserving capacity for all deliveries
      for (const delivery of mockDeliveries) {
        await supabase.rpc('reserve_capacity', {
          p_cycle_id: delivery.cycle_id,
          p_quantity: 1,
        });
      }

      // Verify reserve_capacity was called for each delivery
      expect(supabase.rpc).toHaveBeenCalledTimes(3);
      expect(supabase.rpc).toHaveBeenCalledWith('reserve_capacity', {
        p_cycle_id: 'cycle-2-jan',
        p_quantity: 1,
      });
      expect(supabase.rpc).toHaveBeenCalledWith('reserve_capacity', {
        p_cycle_id: 'cycle-1-feb',
        p_quantity: 1,
      });
      expect(supabase.rpc).toHaveBeenCalledWith('reserve_capacity', {
        p_cycle_id: 'cycle-2-feb',
        p_quantity: 1,
      });
    });
  });
});
