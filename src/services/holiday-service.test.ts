/**
 * Holiday Service Tests
 * 
 * Tests for holiday management service operations
 * Requirements: 24.1, 24.2, 24.3, 24.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HolidayService, type HolidayInput } from './holiday-service';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn(() => 
              Promise.resolve({
                data: [
                  {
                    id: 'test-holiday-1',
                    holiday_date: '2026-12-25',
                    name: 'Natal',
                    description: 'Christmas Day',
                    type: 'national',
                    state_code: null,
                    is_recurring: true,
                    created_at: '2026-01-01T00:00:00Z',
                    updated_at: '2026-01-01T00:00:00Z',
                  },
                ],
                error: null,
              })
            ),
          })),
        })),
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: {
                id: 'test-holiday-1',
              },
              error: null,
            })
          ),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                id: 'test-holiday-new',
                holiday_date: '2026-12-25',
                name: 'Natal',
                description: 'Christmas Day',
                type: 'national',
                state_code: null,
                is_recurring: true,
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-01T00:00:00Z',
              },
              error: null,
            })
          ),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() =>
          Promise.resolve({
            error: null,
          })
        ),
      })),
    })),
  },
}));

describe('HolidayService', () => {
  let service: HolidayService;

  beforeEach(() => {
    service = new HolidayService();
    vi.clearAllMocks();
  });

  describe('getHolidays', () => {
    it('should fetch holidays for a given year', async () => {
      const holidays = await service.getHolidays(2026);

      expect(holidays).toHaveLength(1);
      expect(holidays[0].name).toBe('Natal');
      expect(holidays[0].type).toBe('national');
      expect(holidays[0].holiday_date).toBeInstanceOf(Date);
    });

    it('should throw error for invalid year', async () => {
      await expect(service.getHolidays(1999)).rejects.toThrow('Year must be between 2000 and 2100');
      await expect(service.getHolidays(2101)).rejects.toThrow('Year must be between 2000 and 2100');
    });
  });

  describe('addHoliday', () => {
    it('should add a new holiday', async () => {
      const newHoliday: HolidayInput = {
        holiday_date: new Date('2026-12-25'),
        name: 'Natal',
        description: 'Christmas Day',
        type: 'national',
        state_code: null,
        is_recurring: true,
      };

      const result = await service.addHoliday(newHoliday);

      expect(result.id).toBe('test-holiday-new');
      expect(result.name).toBe('Natal');
      expect(result.type).toBe('national');
    });

    it('should validate holiday input - missing name', async () => {
      const invalidHoliday = {
        holiday_date: new Date('2026-12-25'),
        name: '',
        description: null,
        type: 'national' as const,
        state_code: null,
        is_recurring: true,
      };

      await expect(service.addHoliday(invalidHoliday)).rejects.toThrow('name is required');
    });

    it('should validate holiday input - invalid type', async () => {
      const invalidHoliday = {
        holiday_date: new Date('2026-12-25'),
        name: 'Test Holiday',
        description: null,
        type: 'invalid' as any,
        state_code: null,
        is_recurring: true,
      };

      await expect(service.addHoliday(invalidHoliday)).rejects.toThrow('type must be either "national" or "state"');
    });

    it('should validate state_code for national holidays', async () => {
      const invalidHoliday: HolidayInput = {
        holiday_date: new Date('2026-12-25'),
        name: 'Test Holiday',
        description: null,
        type: 'national',
        state_code: 'BA',
        is_recurring: true,
      };

      await expect(service.addHoliday(invalidHoliday)).rejects.toThrow('state_code must be null for national holidays');
    });

    it('should validate state_code for state holidays', async () => {
      const invalidHoliday: HolidayInput = {
        holiday_date: new Date('2026-07-02'),
        name: 'Independência da Bahia',
        description: null,
        type: 'state',
        state_code: null,
        is_recurring: true,
      };

      await expect(service.addHoliday(invalidHoliday)).rejects.toThrow('state_code is required for state holidays');
    });
  });

  describe('deleteHoliday', () => {
    it('should delete a holiday by id', async () => {
      await expect(service.deleteHoliday('test-holiday-1')).resolves.not.toThrow();
    });

    it('should throw error for invalid id', async () => {
      await expect(service.deleteHoliday('')).rejects.toThrow('Holiday id is required');
      await expect(service.deleteHoliday(null as any)).rejects.toThrow('Holiday id is required');
    });
  });

  describe('isHoliday', () => {
    it('should return true for a holiday date', async () => {
      const result = await service.isHoliday(new Date('2026-12-25'));
      expect(result).toBe(true);
    });

    it('should throw error for invalid date', async () => {
      await expect(service.isHoliday(null as any)).rejects.toThrow('Valid date is required');
      await expect(service.isHoliday(new Date('invalid'))).rejects.toThrow('Valid date is required');
    });
  });

  describe('getHolidayDates', () => {
    it('should return array of Date objects', async () => {
      const dates = await service.getHolidayDates(2026);

      expect(dates).toHaveLength(1);
      expect(dates[0]).toBeInstanceOf(Date);
    });
  });
});

describe('HolidayService - Validation', () => {
  let service: HolidayService;

  beforeEach(() => {
    service = new HolidayService();
  });

  it('should validate holiday_date is a Date object', async () => {
    const invalidHoliday = {
      holiday_date: '2026-12-25' as any,
      name: 'Test',
      description: null,
      type: 'national' as const,
      state_code: null,
      is_recurring: true,
    };

    await expect(service.addHoliday(invalidHoliday)).rejects.toThrow('holiday_date is required and must be a Date object');
  });

  it('should validate holiday_date is valid', async () => {
    const invalidHoliday: HolidayInput = {
      holiday_date: new Date('invalid'),
      name: 'Test',
      description: null,
      type: 'national',
      state_code: null,
      is_recurring: true,
    };

    await expect(service.addHoliday(invalidHoliday)).rejects.toThrow('holiday_date must be a valid date');
  });

  it('should validate is_recurring is boolean', async () => {
    const invalidHoliday = {
      holiday_date: new Date('2026-12-25'),
      name: 'Test',
      description: null,
      type: 'national' as const,
      state_code: null,
      is_recurring: 'true' as any,
    };

    await expect(service.addHoliday(invalidHoliday)).rejects.toThrow('is_recurring must be a boolean');
  });
});
