/**
 * Tests for business day calculation utilities
 * 
 * Includes both unit tests and property-based tests using fast-check.
 * 
 * Validates: Requirements 1.3, 1.7, 24.4, 24.5
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { 
  calculateBusinessDays, 
  isBusinessDay, 
  addBusinessDays, 
  getNextBusinessDay,
  getPreviousBusinessDay,
  calculate5thBusinessDay,
  countBusinessDays 
} from './business-days';
import { toBahiaTime } from './timezone';

describe('Business Day Utilities', () => {
  describe('calculateBusinessDays function', () => {
    it('should calculate forward business days skipping weekends', () => {
      // Monday, March 2, 2026 (March 1, 2026 is actually a Sunday in Bahia time)
      const startDate = new Date(2026, 2, 2); // March 2, 2026 (months are 0-indexed)
      
      // 5 business days from Monday should be next Monday (skip weekend)
      const result = calculateBusinessDays(startDate, 5, []);
      
      // March 2 (Mon) + 5 business days = March 9 (Mon)
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(2); // March (0-indexed)
      expect(result.getDate()).toBe(9);
    });

    it('should calculate backward business days skipping weekends', () => {
      // Monday, March 9, 2026
      const startDate = new Date(2026, 2, 9);
      
      // 5 business days before Monday should be previous Monday
      const result = calculateBusinessDays(startDate, -5, []);
      
      // March 9 (Mon) - 5 business days = March 2 (Mon)
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(2); // March
      expect(result.getDate()).toBe(2);
    });

    it('should skip holidays', () => {
      // Monday, March 2, 2026
      const startDate = new Date(2026, 2, 2);
      const holidays = [new Date(2026, 2, 4)]; // Wednesday is a holiday
      
      // 3 business days from Monday with Wednesday as holiday
      const result = calculateBusinessDays(startDate, 3, holidays);
      
      // March 2 (Mon) + 1 = March 3 (Tue) = day 1
      // March 3 (Tue) + 1 = March 4 (Wed) = holiday, skip
      // March 4 (Wed) + 1 = March 5 (Thu) = day 2
      // March 5 (Thu) + 1 = March 6 (Fri) = day 3
      expect(result.getDate()).toBe(6); // Friday, March 6
    });

    it('should handle zero business days', () => {
      const startDate = new Date('2026-03-01');
      const result = calculateBusinessDays(startDate, 0, []);
      
      expect(result.getTime()).toBe(startDate.getTime());
    });

    it('should throw error for invalid startDate', () => {
      expect(() => calculateBusinessDays(null as any, 5, [])).toThrow('startDate is required');
      expect(() => calculateBusinessDays('invalid' as any, 5, [])).toThrow('startDate is required');
    });

    it('should throw error for invalid numDays', () => {
      const startDate = new Date('2026-03-01');
      expect(() => calculateBusinessDays(startDate, NaN, [])).toThrow('numDays must be a finite number');
      expect(() => calculateBusinessDays(startDate, Infinity, [])).toThrow('numDays must be a finite number');
    });

    it('should use Bahia timezone for calculations', () => {
      // Create a date in UTC
      const utcDate = new Date('2026-03-01T12:00:00Z');
      
      // Calculate business days
      const result = calculateBusinessDays(utcDate, 1, []);
      
      // Result should be in Bahia timezone
      const bahiaResult = toBahiaTime(result);
      expect(result.getTime()).toBe(bahiaResult.getTime());
    });
  });

  describe('isBusinessDay function', () => {
    it('should return false for Saturday', () => {
      // March 7, 2026 is a Saturday
      const saturday = new Date(2026, 2, 7); // Using explicit constructor
      expect(isBusinessDay(saturday, [])).toBe(false);
    });

    it('should return false for Sunday', () => {
      // March 8, 2026 is a Sunday
      const sunday = new Date(2026, 2, 8); // Using explicit constructor
      expect(isBusinessDay(sunday, [])).toBe(false);
    });

    it('should return true for Monday-Friday', () => {
      // March 2-6, 2026 are Monday-Friday
      const monday = new Date(2026, 2, 2);
      const tuesday = new Date(2026, 2, 3);
      const wednesday = new Date(2026, 2, 4);
      const thursday = new Date(2026, 2, 5);
      const friday = new Date(2026, 2, 6);
      
      expect(isBusinessDay(monday, [])).toBe(true);
      expect(isBusinessDay(tuesday, [])).toBe(true);
      expect(isBusinessDay(wednesday, [])).toBe(true);
      expect(isBusinessDay(thursday, [])).toBe(true);
      expect(isBusinessDay(friday, [])).toBe(true);
    });

    it('should return false for holidays', () => {
      const weekday = new Date(2026, 2, 4); // Wednesday, March 4
      const holidays = [new Date(2026, 2, 4)]; // Same day is a holiday
      
      expect(isBusinessDay(weekday, holidays)).toBe(false);
    });

    it('should return true for weekdays that are not holidays', () => {
      const weekday = new Date(2026, 2, 4); // Wednesday, March 4
      const holidays = [new Date(2026, 2, 5)]; // Different day is a holiday
      
      expect(isBusinessDay(weekday, holidays)).toBe(true);
    });
  });

  describe('addBusinessDays function', () => {
    it('should add business days forward', () => {
      const startDate = new Date('2026-03-01'); // Monday
      const result = addBusinessDays(startDate, 3, []);
      
      // Monday + 3 business days = Thursday
      expect(result.getDate()).toBe(4); // March 4
    });

    it('should throw error for negative days', () => {
      const startDate = new Date('2026-03-01');
      expect(() => addBusinessDays(startDate, -3, [])).toThrow('addBusinessDays requires positive numDays');
    });
  });

  describe('getNextBusinessDay function', () => {
    it('should get next business day after Friday', () => {
      const friday = new Date(2026, 2, 6); // Friday, March 6
      const result = getNextBusinessDay(friday, []);
      
      // Next business day after Friday is Monday
      expect(result.getDate()).toBe(9); // Monday, March 9
    });

    it('should get next business day after Thursday', () => {
      const thursday = new Date(2026, 2, 5); // Thursday, March 5
      const result = getNextBusinessDay(thursday, []);
      
      // Next business day after Thursday is Friday
      expect(result.getDate()).toBe(6); // Friday, March 6
    });

    it('should skip holidays', () => {
      const wednesday = new Date(2026, 2, 4); // Wednesday, March 4
      const holidays = [new Date(2026, 2, 5)]; // Thursday is a holiday
      const result = getNextBusinessDay(wednesday, holidays);
      
      // Next business day after Wednesday, skipping Thursday holiday, is Friday
      expect(result.getDate()).toBe(6); // Friday, March 6
    });
  });

  describe('getPreviousBusinessDay function', () => {
    it('should get previous business day before Monday', () => {
      const monday = new Date(2026, 2, 2); // Monday, March 2
      const result = getPreviousBusinessDay(monday, []);
      
      // Previous business day before Monday is Friday
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(1); // February (0-indexed)
      expect(result.getDate()).toBe(27); // Friday, February 27
    });

    it('should get previous business day before Tuesday', () => {
      const tuesday = new Date(2026, 2, 3); // Tuesday, March 3
      const result = getPreviousBusinessDay(tuesday, []);
      
      // Previous business day before Tuesday is Monday
      expect(result.getDate()).toBe(2); // Monday, March 2
    });

    it('should skip holidays', () => {
      const friday = new Date(2026, 2, 6); // Friday, March 6
      const holidays = [new Date(2026, 2, 5)]; // Thursday is a holiday
      const result = getPreviousBusinessDay(friday, holidays);
      
      // Previous business day before Friday, skipping Thursday holiday, is Wednesday
      expect(result.getDate()).toBe(4); // Wednesday, March 4
    });
  });

  describe('calculate5thBusinessDay function', () => {
    it('should calculate 5th business day of March 2026', () => {
      const result = calculate5thBusinessDay(3, 2026, []);
      
      // March 2026 starts on Sunday, March 1
      // Business days: Mar 1 (Sun) = skip, Mar 2 (Mon) = 1st, Mar 3 (Tue) = 2nd, 
      // Mar 4 (Wed) = 3rd, Mar 5 (Thu) = 4th, Mar 6 (Fri) = 5th
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(2); // March
      expect(result.getDate()).toBe(6); // March 6
    });

    it('should skip holidays when calculating 5th business day', () => {
      const holidays = [new Date('2026-03-06')]; // Friday is a holiday
      const result = calculate5thBusinessDay(3, 2026, holidays);
      
      // With Friday as holiday, 5th business day becomes Monday, March 9
      expect(result.getDate()).toBe(9); // Monday, March 9
    });

    it('should throw error for invalid month', () => {
      expect(() => calculate5thBusinessDay(0, 2026, [])).toThrow('Month must be between 1 and 12');
      expect(() => calculate5thBusinessDay(13, 2026, [])).toThrow('Month must be between 1 and 12');
    });
  });

  describe('countBusinessDays function', () => {
    it('should count business days in a week', () => {
      const startDate = new Date(2026, 2, 2); // Monday, March 2
      const endDate = new Date(2026, 2, 8); // Sunday, March 8
      
      const count = countBusinessDays(startDate, endDate, []);
      
      // Monday to Sunday includes 5 business days (Mon-Fri)
      expect(count).toBe(5);
    });

    it('should count business days excluding holidays', () => {
      const startDate = new Date(2026, 2, 2); // Monday, March 2
      const endDate = new Date(2026, 2, 8); // Sunday, March 8
      const holidays = [new Date(2026, 2, 4)]; // Wednesday is a holiday
      
      const count = countBusinessDays(startDate, endDate, holidays);
      
      // 5 business days minus 1 holiday = 4
      expect(count).toBe(4);
    });

    it('should throw error if startDate is after endDate', () => {
      const startDate = new Date(2026, 2, 8);
      const endDate = new Date(2026, 2, 2);
      
      expect(() => countBusinessDays(startDate, endDate, [])).toThrow('startDate must be before or equal to endDate');
    });

    it('should return 1 for single business day', () => {
      const date = new Date(2026, 2, 2); // Monday, March 2
      const count = countBusinessDays(date, date, []);
      
      expect(count).toBe(1);
    });

    it('should return 0 for single weekend day', () => {
      const date = new Date(2026, 2, 7); // Saturday, March 7
      const count = countBusinessDays(date, date, []);
      
      expect(count).toBe(0);
    });
  });
});

describe('Business Day Utilities - Property-Based Tests', () => {
  describe('Property 3: Business Day Calculation Excludes Non-Working Days', () => {
    it('Validates: Requirements 1.3, 1.7, 9.7', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.date({ min: new Date('2026-01-01'), max: new Date('2030-12-31') }),
          fc.integer({ min: 1, max: 20 }),
          fc.array(
            fc.date({ min: new Date('2026-01-01'), max: new Date('2030-12-31') }),
            { minLength: 0, maxLength: 10 }
          ),
          async (startDate, numDays, holidays) => {
            // Skip invalid dates
            if (!startDate || isNaN(startDate.getTime())) {
              return;
            }
            
            const result = calculateBusinessDays(startDate, numDays, holidays);
            
            // Verify result is after start date for positive numDays
            if (numDays > 0) {
              expect(result.getTime()).toBeGreaterThan(startDate.getTime());
            }
            
            // Count business days between start (exclusive) and result (inclusive)
            // This should equal numDays
            const dayAfterStart = new Date(startDate);
            dayAfterStart.setDate(dayAfterStart.getDate() + 1);
            const businessDaysCounted = countBusinessDays(dayAfterStart, result, holidays);
            
            // The count should equal numDays (since we're counting from day after start)
            expect(businessDaysCounted).toBe(numDays);
            
            // Verify result is a business day
            expect(isBusinessDay(result, holidays)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Business days never include weekends', () => {
    it('Any result from calculateBusinessDays should not be a weekend', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.date({ min: new Date('2026-01-01'), max: new Date('2030-12-31') }),
          fc.integer({ min: 1, max: 10 }),
          fc.array(
            fc.date({ min: new Date('2026-01-01'), max: new Date('2030-12-31') }),
            { minLength: 0, maxLength: 5 }
          ),
          async (startDate, numDays, holidays) => {
            const result = calculateBusinessDays(startDate, numDays, holidays);
            const dayOfWeek = result.getDay();
            
            // Result should not be Saturday (6) or Sunday (0)
            expect(dayOfWeek).not.toBe(0);
            expect(dayOfWeek).not.toBe(6);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Business days skip holidays', () => {
    it('Result from calculateBusinessDays should not be a holiday', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.date({ min: new Date('2026-01-01'), max: new Date('2030-12-31') }),
          fc.integer({ min: 1, max: 10 }),
          fc.array(
            fc.date({ min: new Date('2026-01-01'), max: new Date('2030-12-31') }),
            { minLength: 1, maxLength: 5 }
          ),
          async (startDate, numDays, holidays) => {
            // Skip invalid dates
            if (!startDate || isNaN(startDate.getTime())) {
              return;
            }
            
            // Filter out invalid holidays
            const validHolidays = holidays.filter(h => h && !isNaN(h.getTime()));
            
            const result = calculateBusinessDays(startDate, numDays, validHolidays);
            const resultStr = result.toISOString().split('T')[0];
            const holidayStrs = validHolidays.map(h => h.toISOString().split('T')[0]);
            
            // Result should not match any holiday
            expect(holidayStrs).not.toContain(resultStr);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Negative days work correctly', () => {
    it('calculateBusinessDays with negative numDays should go backward', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.date({ min: new Date('2026-01-01'), max: new Date('2030-12-31') }),
          fc.integer({ min: 1, max: 10 }),
          fc.array(
            fc.date({ min: new Date('2026-01-01'), max: new Date('2030-12-31') }),
            { minLength: 0, maxLength: 5 }
          ),
          async (startDate, numDays, holidays) => {
            // Skip invalid dates
            if (!startDate || isNaN(startDate.getTime())) {
              return;
            }
            
            // Only test with start dates that are business days
            if (!isBusinessDay(startDate, holidays)) {
              return; // Skip this test case
            }
            
            const forwardResult = calculateBusinessDays(startDate, numDays, holidays);
            const backwardResult = calculateBusinessDays(forwardResult, -numDays, holidays);
            
            // Going forward then backward should return to the same date
            const startStr = startDate.toISOString().split('T')[0];
            const backwardStr = backwardResult.toISOString().split('T')[0];
            
            // They should be the same date
            expect(backwardStr).toBe(startStr);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: 5th business day calculation', () => {
    it('5th business day should always be a business day', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 2026, max: 2030 }),
          fc.array(
            fc.date({ min: new Date('2026-01-01'), max: new Date('2030-12-31') }),
            { minLength: 0, maxLength: 10 }
          ),
          async (month, year, holidays) => {
            const fifthDay = calculate5thBusinessDay(month, year, holidays);
            
            // Should be a business day
            expect(isBusinessDay(fifthDay, holidays)).toBe(true);
            
            // Should be in the correct month
            expect(fifthDay.getFullYear()).toBe(year);
            expect(fifthDay.getMonth() + 1).toBe(month);
            
            // Should be at least the 1st and at most the last day of month
            expect(fifthDay.getDate()).toBeGreaterThanOrEqual(1);
            const lastDay = new Date(year, month, 0).getDate();
            expect(fifthDay.getDate()).toBeLessThanOrEqual(lastDay);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Count business days consistency', () => {
    it('Counting business days should match manual calculation', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.date({ min: new Date('2026-01-01'), max: new Date('2030-12-31') }),
          fc.integer({ min: 0, max: 30 }),
          fc.array(
            fc.date({ min: new Date('2026-01-01'), max: new Date('2030-12-31') }),
            { minLength: 0, maxLength: 5 }
          ),
          async (startDate, daysToAdd, holidays) => {
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + daysToAdd);
            
            const count = countBusinessDays(startDate, endDate, holidays);
            
            // Manual count
            let manualCount = 0;
            const current = new Date(startDate);
            
            while (current <= endDate) {
              if (isBusinessDay(current, holidays)) {
                manualCount++;
              }
              current.setDate(current.getDate() + 1);
            }
            
            expect(count).toBe(manualCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Next and previous business day consistency', () => {
    it('Next business day after previous business day should be original day', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.date({ min: new Date('2026-01-01'), max: new Date('2030-12-31') }),
          fc.array(
            fc.date({ min: new Date('2026-01-01'), max: new Date('2030-12-31') }),
            { minLength: 0, maxLength: 5 }
          ),
          async (date, holidays) => {
            // Skip invalid dates
            if (!date || isNaN(date.getTime())) {
              return;
            }
            
            const next = getNextBusinessDay(date, holidays);
            const prev = getPreviousBusinessDay(next, holidays);
            
            // Previous business day of next business day should be the original
            // if original was a business day, otherwise it should be the next business day
            const dateStr = date.toISOString().split('T')[0];
            const prevStr = prev.toISOString().split('T')[0];
            
            if (isBusinessDay(date, holidays)) {
              expect(dateStr).toBe(prevStr);
            } else {
              // If original wasn't a business day, prev should be a business day
              expect(isBusinessDay(prev, holidays)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('Business Day Utilities - Edge Cases', () => {
  it('should handle month with many holidays', () => {
    // December 2026 with many holidays
    const holidays = [
      new Date(2026, 11, 25), // Christmas
      new Date(2026, 11, 24), // Christmas Eve
      new Date(2026, 11, 31), // New Year's Eve
    ];
    
    const fifthDay = calculate5thBusinessDay(12, 2026, holidays);
    expect(isBusinessDay(fifthDay, holidays)).toBe(true);
  });

  it('should handle consecutive holidays', () => {
    const startDate = new Date(2026, 2, 2); // Monday, March 2
    const holidays = [
      new Date(2026, 2, 3), // Tuesday
      new Date(2026, 2, 4), // Wednesday
      new Date(2026, 2, 5), // Thursday
    ];
    
    const result = calculateBusinessDays(startDate, 3, holidays);
    // Monday (Mar 2) + 1 business day = Friday (Mar 6)
    // Friday (Mar 6) + 1 business day = Monday (Mar 9) [skip weekend]
    // Monday (Mar 9) + 1 business day = Tuesday (Mar 10)
    expect(result.getDate()).toBe(10); // Tuesday, March 10
  });

  it('should handle year boundary', () => {
    const startDate = new Date(2026, 11, 31); // Wednesday, Dec 31
    const result = calculateBusinessDays(startDate, 1, []);
    
    // Next business day after Dec 31, 2026 (Wed) is Jan 1, 2027 (Thu)
    expect(result.getFullYear()).toBe(2027);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(1);
  });

  it('should handle leap year', () => {
    const startDate = new Date(2028, 1, 28); // Monday, Feb 28 (leap year)
    const result = calculateBusinessDays(startDate, 1, []);
    
    // Next business day after Feb 28, 2028 is Feb 29, 2028
    expect(result.getFullYear()).toBe(2028);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(29); // Leap day
  });
});