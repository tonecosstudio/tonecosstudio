/**
 * Tests for Cutoff Middleware
 * 
 * Verifies that cutoff logic correctly handles month transitions
 * and re-enables changes when a new month begins.
 * 
 * Requirements: 7.7
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isBeforeCutoff as isBeforeCutoffClient } from './cutoff-middleware';
import { isBeforeCutoff as isBeforeCutoffTz, getCutoffDate } from './timezone';

describe('Cutoff Month Transition Tests', () => {
  describe('isBeforeCutoff (timezone utility)', () => {
    it('should return true on day 1 of any month', () => {
      // Test multiple months to ensure consistency
      const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      
      months.forEach(month => {
        const day1 = new Date(2024, month - 1, 1, 10, 0, 0); // Day 1 at 10:00
        expect(isBeforeCutoffTz(day1)).toBe(true);
      });
    });

    it('should return true on day 14 at any time', () => {
      const day14Morning = new Date(2024, 2, 14, 8, 0, 0);
      const day14Noon = new Date(2024, 2, 14, 12, 0, 0);
      const day14Evening = new Date(2024, 2, 14, 23, 59, 59);
      
      expect(isBeforeCutoffTz(day14Morning)).toBe(true);
      expect(isBeforeCutoffTz(day14Noon)).toBe(true);
      expect(isBeforeCutoffTz(day14Evening)).toBe(true);
    });

    it('should return true on day 15 before 23:59:59', () => {
      const day15Morning = new Date(2024, 2, 15, 8, 0, 0);
      const day15Afternoon = new Date(2024, 2, 15, 15, 30, 0);
      const day15Evening = new Date(2024, 2, 15, 23, 59, 58);
      
      expect(isBeforeCutoffTz(day15Morning)).toBe(true);
      expect(isBeforeCutoffTz(day15Afternoon)).toBe(true);
      expect(isBeforeCutoffTz(day15Evening)).toBe(true);
    });

    it('should return true on day 15 at exactly 23:59:59', () => {
      const cutoffMoment = new Date(2024, 2, 15, 23, 59, 59);
      expect(isBeforeCutoffTz(cutoffMoment)).toBe(true);
    });

    it('should return false after day 15 at 23:59:59', () => {
      const afterCutoff = new Date(2024, 2, 16, 0, 0, 0); // Day 16 at midnight
      const day20 = new Date(2024, 2, 20, 12, 0, 0);
      const lastDay = new Date(2024, 2, 31, 23, 59, 59);
      
      expect(isBeforeCutoffTz(afterCutoff)).toBe(false);
      expect(isBeforeCutoffTz(day20)).toBe(false);
      expect(isBeforeCutoffTz(lastDay)).toBe(false);
    });

    it('should handle month transition correctly - last day of month to first day of next month', () => {
      // Last day of March (after cutoff)
      const marchLast = new Date(2024, 2, 31, 23, 59, 59);
      expect(isBeforeCutoffTz(marchLast)).toBe(false);
      
      // First day of April (before cutoff - new month)
      const aprilFirst = new Date(2024, 3, 1, 0, 0, 0);
      expect(isBeforeCutoffTz(aprilFirst)).toBe(true);
    });

    it('should handle February (short month) correctly', () => {
      // February 28 (after cutoff)
      const feb28 = new Date(2024, 1, 28, 12, 0, 0);
      expect(isBeforeCutoffTz(feb28)).toBe(false);
      
      // March 1 (before cutoff - new month)
      const march1 = new Date(2024, 2, 1, 0, 0, 0);
      expect(isBeforeCutoffTz(march1)).toBe(true);
    });

    it('should handle leap year February correctly', () => {
      // February 29, 2024 (leap year, after cutoff)
      const feb29 = new Date(2024, 1, 29, 12, 0, 0);
      expect(isBeforeCutoffTz(feb29)).toBe(false);
      
      // March 1, 2024 (before cutoff - new month)
      const march1 = new Date(2024, 2, 1, 0, 0, 0);
      expect(isBeforeCutoffTz(march1)).toBe(true);
    });

    it('should handle year transition correctly', () => {
      // December 31 (after cutoff)
      const dec31 = new Date(2024, 11, 31, 23, 59, 59);
      expect(isBeforeCutoffTz(dec31)).toBe(false);
      
      // January 1 of next year (before cutoff - new month)
      const jan1 = new Date(2025, 0, 1, 0, 0, 0);
      expect(isBeforeCutoffTz(jan1)).toBe(true);
    });
  });

  describe('getCutoffDate', () => {
    it('should return day 15 at 23:59:59 for any month', () => {
      const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      
      months.forEach(month => {
        const cutoff = getCutoffDate(month, 2024);
        expect(cutoff.getDate()).toBe(15);
        expect(cutoff.getHours()).toBe(23);
        expect(cutoff.getMinutes()).toBe(59);
        expect(cutoff.getSeconds()).toBe(59);
      });
    });

    it('should return different cutoff dates for different months', () => {
      const marchCutoff = getCutoffDate(3, 2024);
      const aprilCutoff = getCutoffDate(4, 2024);
      
      expect(marchCutoff.getMonth()).toBe(2); // March (0-indexed)
      expect(aprilCutoff.getMonth()).toBe(3); // April (0-indexed)
      expect(marchCutoff.getTime()).not.toBe(aprilCutoff.getTime());
    });

    it('should handle year transitions correctly', () => {
      const dec2024Cutoff = getCutoffDate(12, 2024);
      const jan2025Cutoff = getCutoffDate(1, 2025);
      
      expect(dec2024Cutoff.getFullYear()).toBe(2024);
      expect(dec2024Cutoff.getMonth()).toBe(11); // December
      
      expect(jan2025Cutoff.getFullYear()).toBe(2025);
      expect(jan2025Cutoff.getMonth()).toBe(0); // January
    });
  });

  describe('Countdown Timer Reset on New Month', () => {
    it('should calculate time remaining correctly for day 1 of month', () => {
      const day1 = new Date(2024, 2, 1, 10, 0, 0); // March 1 at 10:00
      const cutoff = getCutoffDate(3, 2024); // March 15 at 23:59:59
      
      const timeRemaining = cutoff.getTime() - day1.getTime();
      const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
      
      // Should be approximately 14 days remaining
      expect(daysRemaining).toBeGreaterThanOrEqual(14);
      expect(daysRemaining).toBeLessThanOrEqual(15);
    });

    it('should calculate time remaining correctly for day 14', () => {
      const day14 = new Date(2024, 2, 14, 10, 0, 0); // March 14 at 10:00
      const cutoff = getCutoffDate(3, 2024); // March 15 at 23:59:59
      
      const timeRemaining = cutoff.getTime() - day14.getTime();
      const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
      
      // Should be approximately 37 hours remaining (1 day + 13 hours)
      expect(hoursRemaining).toBeGreaterThanOrEqual(36);
      expect(hoursRemaining).toBeLessThanOrEqual(38);
    });

    it('should return 0 time remaining after cutoff', () => {
      const afterCutoff = new Date(2024, 2, 16, 10, 0, 0); // March 16 at 10:00
      const cutoff = getCutoffDate(3, 2024); // March 15 at 23:59:59
      
      const timeRemaining = cutoff.getTime() - afterCutoff.getTime();
      
      // Time remaining should be negative (cutoff has passed)
      expect(timeRemaining).toBeLessThan(0);
    });
  });

  describe('Integration: Month Transition Scenario', () => {
    it('should correctly transition from March 31 (blocked) to April 1 (allowed)', () => {
      // Scenario: User tries to make changes on March 31 (should be blocked)
      const march31 = new Date(2024, 2, 31, 15, 0, 0);
      expect(isBeforeCutoffTz(march31)).toBe(false);
      
      // Next day (April 1), changes should be allowed again
      const april1 = new Date(2024, 3, 1, 0, 0, 1);
      expect(isBeforeCutoffTz(april1)).toBe(true);
      
      // Verify countdown timer would show time until April 15
      const aprilCutoff = getCutoffDate(4, 2024);
      const timeRemaining = aprilCutoff.getTime() - april1.getTime();
      const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
      
      expect(daysRemaining).toBeGreaterThanOrEqual(13);
      expect(daysRemaining).toBeLessThanOrEqual(15);
    });

    it('should handle the complete cycle: before cutoff -> after cutoff -> new month', () => {
      // March 10: Before cutoff
      const march10 = new Date(2024, 2, 10, 12, 0, 0);
      expect(isBeforeCutoffTz(march10)).toBe(true);
      
      // March 15 at 23:59:59: At cutoff (still allowed)
      const march15Cutoff = new Date(2024, 2, 15, 23, 59, 59);
      expect(isBeforeCutoffTz(march15Cutoff)).toBe(true);
      
      // March 16: After cutoff (blocked)
      const march16 = new Date(2024, 2, 16, 0, 0, 0);
      expect(isBeforeCutoffTz(march16)).toBe(false);
      
      // March 25: Still blocked
      const march25 = new Date(2024, 2, 25, 12, 0, 0);
      expect(isBeforeCutoffTz(march25)).toBe(false);
      
      // April 1: New month, allowed again
      const april1 = new Date(2024, 3, 1, 0, 0, 0);
      expect(isBeforeCutoffTz(april1)).toBe(true);
    });
  });
});

describe('Cutoff Middleware Client Function', () => {
  // Note: These tests verify the client-side function that calls the database
  // In a real environment, this would require mocking the Supabase client
  
  it('should be defined and callable', () => {
    expect(isBeforeCutoffClient).toBeDefined();
    expect(typeof isBeforeCutoffClient).toBe('function');
  });
});

/**
 * Property-Based Tests for Cutoff Enforcement
 * 
 * **Property 24: Collection Changes Allowed Before Cutoff**
 * **Validates: Requirements 7.1, 7.2**
 * 
 * For any delivery, collection choice changes should be allowed if and only if 
 * the current Bahia time is before day 15 at 23:59:59.
 */
describe('Property 24: Collection Changes Allowed Before Cutoff', () => {
  it('should allow changes before cutoff and block changes after cutoff', () => {
    fc.assert(
      fc.property(
        // Generate random dates throughout the year
        fc.integer({ min: 2024, max: 2026 }), // year
        fc.integer({ min: 1, max: 12 }),      // month (1-12)
        fc.integer({ min: 1, max: 31 }),      // day (1-31)
        fc.integer({ min: 0, max: 23 }),      // hour (0-23)
        fc.integer({ min: 0, max: 59 }),      // minute (0-59)
        fc.integer({ min: 0, max: 59 }),      // second (0-59)
        (year, month, day, hour, minute, second) => {
          // Try to create a valid date
          // JavaScript Date constructor handles invalid dates (e.g., Feb 31) by rolling over
          const testDate = new Date(year, month - 1, day, hour, minute, second);
          
          // Skip if date rolled over to a different month (invalid date like Feb 31)
          if (testDate.getMonth() !== month - 1) {
            return true; // Skip this test case
          }
          
          // Get the actual day after date construction (handles month boundaries)
          const actualDay = testDate.getDate();
          const actualHour = testDate.getHours();
          const actualMinute = testDate.getMinutes();
          const actualSecond = testDate.getSeconds();
          
          // Determine if this date should be before cutoff
          // Before cutoff: day < 15 OR (day == 15 AND time <= 23:59:59)
          const shouldBeBeforeCutoff = 
            actualDay < 15 || 
            (actualDay === 15 && (
              actualHour < 23 || 
              (actualHour === 23 && actualMinute < 59) ||
              (actualHour === 23 && actualMinute === 59 && actualSecond <= 59)
            ));
          
          // Test the function
          const result = isBeforeCutoffTz(testDate);
          
          // Verify the property: result should match expected behavior
          if (shouldBeBeforeCutoff) {
            // Before cutoff: changes should be ALLOWED (function returns true)
            expect(result).toBe(true);
          } else {
            // After cutoff: changes should be BLOCKED (function returns false)
            expect(result).toBe(false);
          }
          
          return true;
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in requirements
    );
  });

  it('should correctly identify cutoff boundary at day 15 23:59:59', () => {
    fc.assert(
      fc.property(
        // Generate random years and months
        fc.integer({ min: 2024, max: 2026 }),
        fc.integer({ min: 1, max: 12 }),
        (year, month) => {
          // Test the exact cutoff moment: day 15 at 23:59:59
          const cutoffMoment = new Date(year, month - 1, 15, 23, 59, 59);
          const result = isBeforeCutoffTz(cutoffMoment);
          
          // At the cutoff moment, changes should still be allowed
          expect(result).toBe(true);
          
          // One second after cutoff: day 16 at 00:00:00
          const afterCutoff = new Date(year, month - 1, 16, 0, 0, 0);
          const resultAfter = isBeforeCutoffTz(afterCutoff);
          
          // After cutoff, changes should be blocked
          expect(resultAfter).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle month transitions correctly', () => {
    fc.assert(
      fc.property(
        // Generate random years and months
        fc.integer({ min: 2024, max: 2026 }),
        fc.integer({ min: 1, max: 12 }),
        (year, month) => {
          // Last day of the month (after cutoff)
          const lastDay = new Date(year, month, 0); // Day 0 of next month = last day of current month
          lastDay.setHours(23, 59, 59, 999);
          
          // This should be after cutoff (blocked)
          const resultLastDay = isBeforeCutoffTz(lastDay);
          expect(resultLastDay).toBe(false);
          
          // First day of next month (before cutoff)
          const firstDayNextMonth = new Date(year, month, 1, 0, 0, 0);
          
          // This should be before cutoff (allowed)
          const resultFirstDay = isBeforeCutoffTz(firstDayNextMonth);
          expect(resultFirstDay).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should consistently classify dates in the same period', () => {
    fc.assert(
      fc.property(
        // Generate a base date
        fc.integer({ min: 2024, max: 2026 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 31 }),
        (year, month, day) => {
          const baseDate = new Date(year, month - 1, day, 12, 0, 0);
          
          // Skip invalid dates
          if (baseDate.getMonth() !== month - 1) {
            return true;
          }
          
          // Test the same day at different times
          const morning = new Date(year, month - 1, day, 8, 0, 0);
          const noon = new Date(year, month - 1, day, 12, 0, 0);
          const evening = new Date(year, month - 1, day, 20, 0, 0);
          
          // Skip if any date rolled over
          if (morning.getMonth() !== month - 1 || 
              noon.getMonth() !== month - 1 || 
              evening.getMonth() !== month - 1) {
            return true;
          }
          
          const resultMorning = isBeforeCutoffTz(morning);
          const resultNoon = isBeforeCutoffTz(noon);
          const resultEvening = isBeforeCutoffTz(evening);
          
          // For days other than day 15, all times should give the same result
          if (day !== 15) {
            expect(resultMorning).toBe(resultNoon);
            expect(resultNoon).toBe(resultEvening);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge cases around cutoff time on day 15', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2024, max: 2026 }),
        fc.integer({ min: 1, max: 12 }),
        (year, month) => {
          // Test various times on day 15
          const beforeCutoffTimes = [
            new Date(year, month - 1, 15, 0, 0, 0),    // Midnight
            new Date(year, month - 1, 15, 12, 0, 0),   // Noon
            new Date(year, month - 1, 15, 23, 0, 0),   // 11 PM
            new Date(year, month - 1, 15, 23, 59, 0),  // 11:59 PM
            new Date(year, month - 1, 15, 23, 59, 59), // 11:59:59 PM (cutoff)
          ];
          
          // All these times should be before cutoff (allowed)
          beforeCutoffTimes.forEach(time => {
            const result = isBeforeCutoffTz(time);
            expect(result).toBe(true);
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
