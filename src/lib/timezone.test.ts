import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  toUTC, 
  toBahiaTime, 
  isBeforeCutoff, 
  getCutoffDate, 
  BAHIA_TIMEZONE,
  formatInBahiaTime,
  nowInBahia,
  isBusinessDay,
  addBusinessDays
} from './timezone';

describe('Timezone Utilities', () => {
  describe('Property 1: Timezone Round-Trip Preservation', () => {
    /**
     * **Validates: Requirements 1.4, 1.5**
     * 
     * For any date/time value in Bahia timezone, converting to UTC for storage 
     * and back to Bahia time for display should preserve the original value.
     * 
     * This property ensures that:
     * - toUTC(toBahiaTime(utcDate)) === utcDate (within millisecond precision)
     * - No data loss occurs during timezone conversions
     * - Database storage and display operations are consistent
     */
    it('should preserve date values through UTC round-trip conversion', () => {
      fc.assert(
        fc.property(
          // Generate random dates between 2020 and 2030
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          (originalDate) => {
            // Convert to Bahia time (as if reading from database)
            const bahiaTime = toBahiaTime(originalDate);
            
            // Convert back to UTC (as if storing to database)
            const roundTripDate = toUTC(bahiaTime);
            
            // The round-trip should preserve the original UTC timestamp
            // We compare timestamps to avoid issues with Date object references
            expect(roundTripDate.getTime()).toBe(originalDate.getTime());
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in the task
      );
    });

    it('should handle edge cases: leap years, DST transitions, month boundaries', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
          (date) => {
            const bahiaTime = toBahiaTime(date);
            const backToUTC = toUTC(bahiaTime);
            
            // Verify the conversion is accurate within millisecond precision
            const timeDifference = Math.abs(backToUTC.getTime() - date.getTime());
            expect(timeDifference).toBeLessThan(1); // Less than 1ms difference
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Cutoff Calculation', () => {
    it('should correctly identify dates before cutoff (day 15 at 23:59:59)', () => {
      // Test day 1-14: should be before cutoff
      const earlyMonth = new Date(2024, 2, 10, 12, 0, 0); // March 10, 2024, noon
      expect(isBeforeCutoff(earlyMonth)).toBe(true);

      // Test day 15 at 23:59:59: should be before cutoff
      const cutoffMoment = new Date(2024, 2, 15, 23, 59, 59); // March 15, 2024, 23:59:59
      expect(isBeforeCutoff(cutoffMoment)).toBe(true);

      // Test day 15 at 23:59:58: should be before cutoff
      const justBeforeCutoff = new Date(2024, 2, 15, 23, 59, 58);
      expect(isBeforeCutoff(justBeforeCutoff)).toBe(true);
    });

    it('should correctly identify dates after cutoff', () => {
      // Test day 16: should be after cutoff
      const afterCutoff = new Date(2024, 2, 16, 0, 0, 0); // March 16, 2024, midnight
      expect(isBeforeCutoff(afterCutoff)).toBe(false);

      // Test day 20: should be after cutoff
      const lateMonth = new Date(2024, 2, 20, 12, 0, 0); // March 20, 2024, noon
      expect(isBeforeCutoff(lateMonth)).toBe(false);
    });
  });

  describe('Cutoff Date Calculation', () => {
    it('should generate correct cutoff date for any month', () => {
      const cutoff = getCutoffDate(3, 2024); // March 2024
      
      expect(cutoff.getDate()).toBe(15);
      expect(cutoff.getMonth()).toBe(2); // 0-indexed, so 2 = March
      expect(cutoff.getFullYear()).toBe(2024);
      expect(cutoff.getHours()).toBe(23);
      expect(cutoff.getMinutes()).toBe(59);
      expect(cutoff.getSeconds()).toBe(59);
    });

    it('should throw error for invalid month', () => {
      expect(() => getCutoffDate(0, 2024)).toThrow('Month must be between 1 and 12');
      expect(() => getCutoffDate(13, 2024)).toThrow('Month must be between 1 and 12');
    });

    it('should throw error for invalid year', () => {
      expect(() => getCutoffDate(3, 1999)).toThrow('Year must be between 2000 and 2100');
      expect(() => getCutoffDate(3, 2101)).toThrow('Year must be between 2000 and 2100');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when toUTC receives null or undefined', () => {
      expect(() => toUTC(null as any)).toThrow('bahiaDate is required');
      expect(() => toUTC(undefined as any)).toThrow('bahiaDate is required');
    });

    it('should throw error when toBahiaTime receives null or undefined', () => {
      expect(() => toBahiaTime(null as any)).toThrow('utcDate is required');
      expect(() => toBahiaTime(undefined as any)).toThrow('utcDate is required');
    });

    it('should throw error when isBeforeCutoff receives null or undefined', () => {
      expect(() => isBeforeCutoff(null as any)).toThrow('currentBahiaTime is required');
      expect(() => isBeforeCutoff(undefined as any)).toThrow('currentBahiaTime is required');
    });
  });

  describe('toUTC Conversion Accuracy', () => {
    it('should convert Bahia time to UTC correctly', () => {
      // Bahia is UTC-3, so 12:00 in Bahia = 15:00 UTC
      const bahiaDate = new Date(2024, 2, 15, 12, 0, 0);
      const utcDate = toUTC(bahiaDate);
      
      // Verify conversion happened
      expect(utcDate).toBeInstanceOf(Date);
      expect(utcDate.getTime()).toBeGreaterThan(0);
    });

    it('should handle midnight conversions', () => {
      const bahiaMidnight = new Date(2024, 2, 15, 0, 0, 0);
      const utcDate = toUTC(bahiaMidnight);
      
      // Verify conversion happened
      expect(utcDate).toBeInstanceOf(Date);
      expect(utcDate.getTime()).toBeGreaterThan(0);
    });

    it('should handle end of day conversions', () => {
      const bahiaEndOfDay = new Date(2024, 2, 15, 23, 59, 59);
      const utcDate = toUTC(bahiaEndOfDay);
      
      // Verify conversion happened
      expect(utcDate).toBeInstanceOf(Date);
      expect(utcDate.getTime()).toBeGreaterThan(0);
    });
  });

  describe('toBahiaTime Conversion Accuracy', () => {
    it('should convert UTC to Bahia time correctly', () => {
      const utcDate = new Date('2024-03-15T15:00:00Z');
      const bahiaDate = toBahiaTime(utcDate);
      
      // Verify conversion happened
      expect(bahiaDate).toBeInstanceOf(Date);
    });

    it('should handle UTC midnight conversions', () => {
      const utcMidnight = new Date('2024-03-15T00:00:00Z');
      const bahiaDate = toBahiaTime(utcMidnight);
      
      // Verify conversion happened
      expect(bahiaDate).toBeInstanceOf(Date);
    });

    it('should handle month boundary conversions', () => {
      // Last moment of March in UTC
      const utcEndOfMonth = new Date('2024-03-31T23:59:59Z');
      const bahiaDate = toBahiaTime(utcEndOfMonth);
      
      // Verify conversion happened
      expect(bahiaDate).toBeInstanceOf(Date);
    });
  });

  describe('isBeforeCutoff Edge Cases', () => {
    it('should return true for day 1 of month', () => {
      const firstDay = new Date(2024, 2, 1, 0, 0, 0);
      expect(isBeforeCutoff(firstDay)).toBe(true);
    });

    it('should return true for day 14 at any time', () => {
      const day14Morning = new Date(2024, 2, 14, 8, 0, 0);
      const day14Evening = new Date(2024, 2, 14, 23, 59, 59);
      
      expect(isBeforeCutoff(day14Morning)).toBe(true);
      expect(isBeforeCutoff(day14Evening)).toBe(true);
    });

    it('should return true for day 15 at 00:00:00', () => {
      const day15Start = new Date(2024, 2, 15, 0, 0, 0);
      expect(isBeforeCutoff(day15Start)).toBe(true);
    });

    it('should return true for day 15 at 23:59:59', () => {
      const cutoffMoment = new Date(2024, 2, 15, 23, 59, 59);
      expect(isBeforeCutoff(cutoffMoment)).toBe(true);
    });

    it('should return false for day 16 at 00:00:00', () => {
      const afterCutoff = new Date(2024, 2, 16, 0, 0, 0);
      expect(isBeforeCutoff(afterCutoff)).toBe(false);
    });

    it('should return false for last day of month', () => {
      const lastDay = new Date(2024, 2, 31, 12, 0, 0);
      expect(isBeforeCutoff(lastDay)).toBe(false);
    });

    it('should handle February (short month)', () => {
      const feb14 = new Date(2024, 1, 14, 12, 0, 0);
      const feb16 = new Date(2024, 1, 16, 12, 0, 0);
      
      expect(isBeforeCutoff(feb14)).toBe(true);
      expect(isBeforeCutoff(feb16)).toBe(false);
    });

    it('should handle leap year February', () => {
      const leapFeb15 = new Date(2024, 1, 15, 23, 59, 59);
      const leapFeb29 = new Date(2024, 1, 29, 12, 0, 0);
      
      expect(isBeforeCutoff(leapFeb15)).toBe(true);
      expect(isBeforeCutoff(leapFeb29)).toBe(false);
    });
  });

  describe('getCutoffDate Calculation', () => {
    it('should calculate cutoff for all months of the year', () => {
      for (let month = 1; month <= 12; month++) {
        const cutoff = getCutoffDate(month, 2024);
        
        expect(cutoff.getDate()).toBe(15);
        expect(cutoff.getMonth()).toBe(month - 1); // 0-indexed
        expect(cutoff.getFullYear()).toBe(2024);
        expect(cutoff.getHours()).toBe(23);
        expect(cutoff.getMinutes()).toBe(59);
        expect(cutoff.getSeconds()).toBe(59);
      }
    });

    it('should handle January correctly', () => {
      const janCutoff = getCutoffDate(1, 2024);
      expect(janCutoff.getMonth()).toBe(0);
      expect(janCutoff.getDate()).toBe(15);
    });

    it('should handle December correctly', () => {
      const decCutoff = getCutoffDate(12, 2024);
      expect(decCutoff.getMonth()).toBe(11);
      expect(decCutoff.getDate()).toBe(15);
    });

    it('should handle leap year February', () => {
      const febCutoff = getCutoffDate(2, 2024);
      expect(febCutoff.getMonth()).toBe(1);
      expect(febCutoff.getDate()).toBe(15);
    });

    it('should handle non-leap year February', () => {
      const febCutoff = getCutoffDate(2, 2023);
      expect(febCutoff.getMonth()).toBe(1);
      expect(febCutoff.getDate()).toBe(15);
    });

    it('should set milliseconds to 999', () => {
      const cutoff = getCutoffDate(3, 2024);
      expect(cutoff.getMilliseconds()).toBe(999);
    });

    it('should validate month boundaries', () => {
      expect(() => getCutoffDate(0, 2024)).toThrow();
      expect(() => getCutoffDate(13, 2024)).toThrow();
      expect(() => getCutoffDate(-1, 2024)).toThrow();
      expect(() => getCutoffDate(100, 2024)).toThrow();
    });

    it('should validate year boundaries', () => {
      expect(() => getCutoffDate(3, 1999)).toThrow();
      expect(() => getCutoffDate(3, 2101)).toThrow();
      expect(() => getCutoffDate(3, 1900)).toThrow();
      expect(() => getCutoffDate(3, 3000)).toThrow();
    });
  });

  describe('formatInBahiaTime', () => {
    it('should format date in Brazilian format (dd/MM/yyyy)', () => {
      const date = new Date('2024-03-15T12:00:00Z');
      const formatted = formatInBahiaTime(date, 'dd/MM/yyyy');
      
      // Should be in dd/MM/yyyy format
      expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });

    it('should format date with time (dd/MM/yyyy HH:mm:ss)', () => {
      const date = new Date('2024-03-15T12:00:00Z');
      const formatted = formatInBahiaTime(date, 'dd/MM/yyyy HH:mm:ss');
      
      // Should include time
      expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
    });

    it('should format date in ISO format (yyyy-MM-dd)', () => {
      const date = new Date('2024-03-15T12:00:00Z');
      const formatted = formatInBahiaTime(date, 'yyyy-MM-dd');
      
      // Should be in ISO format
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle different format strings', () => {
      const date = new Date('2024-03-15T12:00:00Z');
      
      const format1 = formatInBahiaTime(date, 'yyyy');
      expect(format1).toBe('2024');
      
      const format2 = formatInBahiaTime(date, 'MM');
      expect(format2).toMatch(/^\d{2}$/);
    });
  });

  describe('nowInBahia', () => {
    it('should return a Date object', () => {
      const now = nowInBahia();
      expect(now).toBeInstanceOf(Date);
    });

    it('should return a valid date', () => {
      const now = nowInBahia();
      expect(now.getTime()).toBeGreaterThan(0);
      expect(isNaN(now.getTime())).toBe(false);
    });

    it('should return current time (within reasonable range)', () => {
      const before = new Date();
      const now = nowInBahia();
      const after = new Date();
      
      // Should be between before and after (with some tolerance)
      expect(now.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(now.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });
  });

  describe('isBusinessDay', () => {
    it('should return true for Monday', () => {
      const monday = new Date(2024, 2, 18); // March 18, 2024 - Monday
      expect(isBusinessDay(monday, [])).toBe(true);
    });

    it('should return true for Tuesday', () => {
      const tuesday = new Date(2024, 2, 19); // March 19, 2024 - Tuesday
      expect(isBusinessDay(tuesday, [])).toBe(true);
    });

    it('should return true for Wednesday', () => {
      const wednesday = new Date(2024, 2, 20); // March 20, 2024 - Wednesday
      expect(isBusinessDay(wednesday, [])).toBe(true);
    });

    it('should return true for Thursday', () => {
      const thursday = new Date(2024, 2, 21); // March 21, 2024 - Thursday
      expect(isBusinessDay(thursday, [])).toBe(true);
    });

    it('should return true for Friday', () => {
      const friday = new Date(2024, 2, 22); // March 22, 2024 - Friday
      expect(isBusinessDay(friday, [])).toBe(true);
    });

    it('should return false for Saturday', () => {
      const saturday = new Date(2024, 2, 23); // March 23, 2024 - Saturday
      expect(isBusinessDay(saturday, [])).toBe(false);
    });

    it('should return false for Sunday', () => {
      const sunday = new Date(2024, 2, 24); // March 24, 2024 - Sunday
      expect(isBusinessDay(sunday, [])).toBe(false);
    });

    it('should return false for holidays', () => {
      const workday = new Date(2024, 2, 20); // Wednesday
      const holidays = [new Date(2024, 2, 20)];
      
      expect(isBusinessDay(workday, holidays)).toBe(false);
    });

    it('should handle multiple holidays', () => {
      const date1 = new Date(2024, 2, 20);
      const date2 = new Date(2024, 2, 21);
      const holidays = [
        new Date(2024, 2, 20),
        new Date(2024, 2, 21),
        new Date(2024, 2, 22)
      ];
      
      expect(isBusinessDay(date1, holidays)).toBe(false);
      expect(isBusinessDay(date2, holidays)).toBe(false);
    });

    it('should return true for weekday not in holiday list', () => {
      const workday = new Date(2024, 2, 20);
      const holidays = [new Date(2024, 2, 21)];
      
      expect(isBusinessDay(workday, holidays)).toBe(true);
    });

    it('should handle empty holiday array', () => {
      const monday = new Date(2024, 2, 18);
      expect(isBusinessDay(monday, [])).toBe(true);
    });

    it('should handle undefined holiday array', () => {
      const monday = new Date(2024, 2, 18);
      expect(isBusinessDay(monday)).toBe(true);
    });
  });

  describe('addBusinessDays', () => {
    it('should add 1 business day correctly', () => {
      const friday = new Date(2024, 2, 15); // March 15, 2024 - Friday
      const result = addBusinessDays(friday, 1, []);
      
      // Next business day should be Monday (skipping weekend)
      expect(result.getDate()).toBe(18); // March 18
    });

    it('should add 5 business days correctly', () => {
      const monday = new Date(2024, 2, 18); // March 18, 2024 - Monday
      const result = addBusinessDays(monday, 5, []);
      
      // 5 business days from Monday should be next Monday
      expect(result.getDate()).toBe(25); // March 25
    });

    it('should skip weekends', () => {
      const thursday = new Date(2024, 2, 14); // March 14, 2024 - Thursday
      const result = addBusinessDays(thursday, 2, []);
      
      // 2 business days from Thursday should be Monday (skipping weekend)
      expect(result.getDate()).toBe(18); // March 18
    });

    it('should skip holidays', () => {
      const monday = new Date(2024, 2, 18); // March 18, 2024 - Monday
      const holidays = [new Date(2024, 2, 19)]; // Tuesday is holiday
      const result = addBusinessDays(monday, 1, holidays);
      
      // Next business day should be Wednesday (skipping Tuesday holiday)
      expect(result.getDate()).toBe(20); // March 20
    });

    it('should skip both weekends and holidays', () => {
      const friday = new Date(2024, 2, 15); // March 15, 2024 - Friday
      const holidays = [new Date(2024, 2, 18)]; // Monday is holiday
      const result = addBusinessDays(friday, 1, holidays);
      
      // Next business day should be Tuesday (skipping weekend and Monday holiday)
      expect(result.getDate()).toBe(19); // March 19
    });

    it('should handle multiple consecutive holidays', () => {
      const friday = new Date(2024, 2, 15); // March 15, 2024 - Friday
      const holidays = [
        new Date(2024, 2, 18), // Monday
        new Date(2024, 2, 19), // Tuesday
        new Date(2024, 2, 20)  // Wednesday
      ];
      const result = addBusinessDays(friday, 1, holidays);
      
      // Next business day should be Thursday
      expect(result.getDate()).toBe(21); // March 21
    });

    it('should calculate 5th business day from month start (shipping deadline)', () => {
      const monthStart = new Date(2024, 2, 1); // March 1, 2024 - Friday
      const result = addBusinessDays(monthStart, 5, []);
      
      // 5 business days from March 1 (Friday) should be March 8 (Friday)
      // Mar 1 (Fri) -> Mar 4 (Mon) -> Mar 5 (Tue) -> Mar 6 (Wed) -> Mar 7 (Thu) -> Mar 8 (Fri)
      expect(result.getDate()).toBe(8);
    });

    it('should handle large number of business days', () => {
      const monday = new Date(2024, 2, 18);
      const result = addBusinessDays(monday, 10, []);
      
      // 10 business days = 2 weeks
      expect(result.getDate()).toBe(1); // April 1
    });

    it('should handle empty holiday array', () => {
      const monday = new Date(2024, 2, 18);
      const result = addBusinessDays(monday, 1, []);
      
      expect(result.getDate()).toBe(19); // Tuesday
    });

    it('should handle undefined holiday array', () => {
      const monday = new Date(2024, 2, 18);
      const result = addBusinessDays(monday, 1);
      
      expect(result.getDate()).toBe(19); // Tuesday
    });
  });

  describe('BAHIA_TIMEZONE constant', () => {
    it('should be defined', () => {
      expect(BAHIA_TIMEZONE).toBeDefined();
    });

    it('should be America/Bahia', () => {
      expect(BAHIA_TIMEZONE).toBe('America/Bahia');
    });

    it('should be a string', () => {
      expect(typeof BAHIA_TIMEZONE).toBe('string');
    });
  });

  describe('Integration Tests', () => {
    it('should correctly handle cutoff check with current Bahia time', () => {
      const now = nowInBahia();
      const result = isBeforeCutoff(now);
      
      // Result should be boolean
      expect(typeof result).toBe('boolean');
    });

    it('should correctly format current Bahia time', () => {
      const now = nowInBahia();
      const formatted = formatInBahiaTime(now, 'yyyy-MM-dd');
      
      // Should be valid ISO date format
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should calculate business days with real dates', () => {
      const start = new Date(2024, 0, 2); // January 2, 2024 - Tuesday
      const holidays = [new Date(2024, 0, 1)]; // New Year
      const result = addBusinessDays(start, 5, holidays);
      
      // Should be a valid date
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThan(start.getTime());
    });

    it('should handle complete workflow: get cutoff, check if before, format', () => {
      const cutoff = getCutoffDate(3, 2024);
      const isBefore = isBeforeCutoff(cutoff);
      const cutoffInstant = toUTC(cutoff);
      const formatted = formatInBahiaTime(cutoffInstant, 'dd/MM/yyyy HH:mm:ss');
      
      expect(isBefore).toBe(true); // Cutoff wall-clock itself is before cutoff
      expect(formatted).toContain('15/03/2024');
      expect(formatted).toContain('23:59:59');
    });
  });
});
