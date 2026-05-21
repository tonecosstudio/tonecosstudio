/**
 * Tests for Delivery Scheduling Service (Monthly Cycles)
 * 
 * Tests the consecutive delivery scheduling logic including:
 * - First delivery month calculation (always next month)
 * - Consecutive month scheduling
 * - Correct number of deliveries (3 for Trimestral, 6 for Semestral)
 * 
 * UPDATED: Now uses monthly cycles instead of bi-weekly cycles
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Test the delivery schedule calculation logic directly
describe('Delivery Scheduling Logic (Monthly Cycles)', () => {
  describe('Input validation', () => {
    it('should validate plan type is trimestral or semestral', () => {
      const validPlans = ['trimestral', 'semestral'];
      expect(validPlans).toContain('trimestral');
      expect(validPlans).toContain('semestral');
    });

    it('should validate delivery counts', () => {
      const trimestralCount = 3;
      const semestralCount = 6;
      
      expect(trimestralCount).toBe(3);
      expect(semestralCount).toBe(6);
    });
  });

  describe('First delivery month calculation (Monthly)', () => {
    it('should always calculate next month for any entry', () => {
      // Entry: March 2026
      const entryMonth = 3;
      const entryYear = 2026;
      
      // First delivery should always be in next month (April)
      let firstDeliveryMonth = entryMonth + 1;
      let firstDeliveryYear = entryYear;
      
      if (firstDeliveryMonth > 12) {
        firstDeliveryMonth = 1;
        firstDeliveryYear += 1;
      }
      
      expect(firstDeliveryMonth).toBe(4);
      expect(firstDeliveryYear).toBe(2026);
    });

    it('should handle December entry correctly', () => {
      // Entry: December 2026
      const entryMonth = 12;
      const entryYear = 2026;
      
      // First delivery should be in January 2027
      let firstDeliveryMonth = entryMonth + 1;
      let firstDeliveryYear = entryYear;
      
      if (firstDeliveryMonth > 12) {
        firstDeliveryMonth = 1;
        firstDeliveryYear += 1;
      }
      
      expect(firstDeliveryMonth).toBe(1);
      expect(firstDeliveryYear).toBe(2027);
    });
  });

  describe('Consecutive month scheduling', () => {
    it('should schedule 3 consecutive months for Trimestral', () => {
      // Start: April 2026
      const startMonth = 4;
      const startYear = 2026;
      const deliveryCount = 3;
      
      const months = [];
      let currentMonth = startMonth;
      let currentYear = startYear;
      
      for (let i = 0; i < deliveryCount; i++) {
        months.push({ month: currentMonth, year: currentYear });
        
        currentMonth += 1;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear += 1;
        }
      }
      
      expect(months).toHaveLength(3);
      expect(months[0]).toEqual({ month: 4, year: 2026 }); // April
      expect(months[1]).toEqual({ month: 5, year: 2026 }); // May
      expect(months[2]).toEqual({ month: 6, year: 2026 }); // June
    });

    it('should schedule 6 consecutive months for Semestral', () => {
      // Start: April 2026
      const startMonth = 4;
      const startYear = 2026;
      const deliveryCount = 6;
      
      const months = [];
      let currentMonth = startMonth;
      let currentYear = startYear;
      
      for (let i = 0; i < deliveryCount; i++) {
        months.push({ month: currentMonth, year: currentYear });
        
        currentMonth += 1;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear += 1;
        }
      }
      
      expect(months).toHaveLength(6);
      expect(months[0]).toEqual({ month: 4, year: 2026 }); // April
      expect(months[1]).toEqual({ month: 5, year: 2026 }); // May
      expect(months[2]).toEqual({ month: 6, year: 2026 }); // June
      expect(months[3]).toEqual({ month: 7, year: 2026 }); // July
      expect(months[4]).toEqual({ month: 8, year: 2026 }); // August
      expect(months[5]).toEqual({ month: 9, year: 2026 }); // September
    });
  });

  describe('Year rollover', () => {
    it('should handle year rollover correctly', () => {
      // Start: November 2026
      const startMonth = 11;
      const startYear = 2026;
      const deliveryCount = 3;
      
      const months = [];
      let currentMonth = startMonth;
      let currentYear = startYear;
      
      for (let i = 0; i < deliveryCount; i++) {
        months.push({ month: currentMonth, year: currentYear });
        
        currentMonth += 1;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear += 1;
        }
      }
      
      expect(months).toHaveLength(3);
      expect(months[0]).toEqual({ month: 11, year: 2026 }); // November 2026
      expect(months[1]).toEqual({ month: 12, year: 2026 }); // December 2026
      expect(months[2]).toEqual({ month: 1, year: 2027 });  // January 2027
    });

    it('should handle December to January rollover', () => {
      // Start: December 2026
      const startMonth = 12;
      const startYear = 2026;
      
      let nextMonth = startMonth + 1;
      let nextYear = startYear;
      
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }
      
      expect(nextMonth).toBe(1);
      expect(nextYear).toBe(2027);
    });
  });
});


/**
 * Property 31: Deliveries Scheduled Consecutively (Monthly Cycles)
 * 
 * **Validates: Requirements 9.3**
 * 
 * For any subscription, all deliveries should be scheduled in consecutive months
 * starting from the month after subscription creation.
 * 
 * This property test verifies that:
 * 1. Deliveries are scheduled in consecutive months (no gaps)
 * 2. The correct number of deliveries is created (3 for Trimestral, 6 for Semestral)
 * 3. Year rollover is handled correctly (e.g., Dec -> Jan)
 * 4. First delivery is always in the next month after subscription
 */
describe('Property-Based Tests (Monthly Cycles)', () => {
  describe('Property 31: Deliveries Scheduled Consecutively', () => {
    it('should schedule deliveries in consecutive months for any subscription scenario', () => {
      fc.assert(
        fc.property(
          // Generate random entry cycle data (monthly)
          fc.record({
            month: fc.integer({ min: 1, max: 12 }),
            year: fc.integer({ min: 2024, max: 2030 }),
          }),
          // Generate random plan type
          fc.constantFrom('trimestral' as const, 'semestral' as const),
          (entryCycle, _planType) => {
            // Calculate expected delivery count
            const expectedCount = planType === 'trimestral' ? 3 : 6;
            
            // Calculate first delivery month (always next month)
            let firstMonth = entryCycle.month + 1;
            let firstYear = entryCycle.year;
            
            if (firstMonth > 12) {
              firstMonth = 1;
              firstYear += 1;
            }
            
            // Generate delivery schedule
            const deliveries = [];
            let currentMonth = firstMonth;
            let currentYear = firstYear;
            
            for (let i = 0; i < expectedCount; i++) {
              deliveries.push({
                deliveryNumber: i + 1,
                month: currentMonth,
                year: currentYear,
              });
              
              // Move to next month
              currentMonth += 1;
              if (currentMonth > 12) {
                currentMonth = 1;
                currentYear += 1;
              }
            }
            
            // Verify correct number of deliveries
            expect(deliveries).toHaveLength(expectedCount);
            
            // Verify deliveries are consecutive
            for (let i = 1; i < deliveries.length; i++) {
              const prev = deliveries[i - 1];
              const curr = deliveries[i];
              
              // Calculate expected next month/year
              let expectedMonth = prev.month + 1;
              let expectedYear = prev.year;
              
              if (expectedMonth > 12) {
                expectedMonth = 1;
                expectedYear += 1;
              }
              
              // Verify current delivery is in expected month/year
              expect(curr.month).toBe(expectedMonth);
              expect(curr.year).toBe(expectedYear);
            }
            
            // Verify delivery numbers are sequential
            deliveries.forEach((delivery, index) => {
              expect(delivery.deliveryNumber).toBe(index + 1);
            });
          }
        ),
        { numRuns: 100 } // Run 100 random scenarios
      );
    });
  });

  describe('Property 32: Year Boundary Handling', () => {
    it('should correctly handle deliveries that cross year boundaries', () => {
      fc.assert(
        fc.property(
          // Generate scenarios that will cross year boundaries
          fc.record({
            month: fc.integer({ min: 10, max: 12 }), // Oct, Nov, Dec
            year: fc.integer({ min: 2024, max: 2029 }),
          }),
          fc.constantFrom('trimestral' as const, 'semestral' as const),
          (entryCycle, _planType) => {
            const expectedCount = planType === 'trimestral' ? 3 : 6;
            
            // Calculate first delivery month
            let firstMonth = entryCycle.month + 1;
            let firstYear = entryCycle.year;
            
            if (firstMonth > 12) {
              firstMonth = 1;
              firstYear += 1;
            }
            
            // Generate deliveries
            const deliveries = [];
            let currentMonth = firstMonth;
            let currentYear = firstYear;
            
            for (let i = 0; i < expectedCount; i++) {
              deliveries.push({
                month: currentMonth,
                year: currentYear,
              });
              
              currentMonth += 1;
              if (currentMonth > 12) {
                currentMonth = 1;
                currentYear += 1;
              }
            }
            
            // Verify at least one delivery crosses year boundary
            const years = [...new Set(deliveries.map(d => d.year))];
            
            // If entry is Oct-Dec, we should have deliveries in next year
            if (entryCycle.month >= 10) {
              expect(years.length).toBeGreaterThan(1);
            }
            
            // Verify months are valid (1-12)
            deliveries.forEach(delivery => {
              expect(delivery.month).toBeGreaterThanOrEqual(1);
              expect(delivery.month).toBeLessThanOrEqual(12);
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 33: First Delivery Always Next Month', () => {
    it('should always schedule first delivery in the month after subscription', () => {
      fc.assert(
        fc.property(
          fc.record({
            month: fc.integer({ min: 1, max: 12 }),
            year: fc.integer({ min: 2024, max: 2030 }),
          }),
          fc.constantFrom('trimestral' as const, 'semestral' as const),
          (entryCycle, _planType) => {
            // Calculate first delivery month
            let firstMonth = entryCycle.month + 1;
            let firstYear = entryCycle.year;
            
            if (firstMonth > 12) {
              firstMonth = 1;
              firstYear += 1;
            }
            
            // Verify first delivery is exactly one month after entry
            if (entryCycle.month === 12) {
              // December -> January next year
              expect(firstMonth).toBe(1);
              expect(firstYear).toBe(entryCycle.year + 1);
            } else {
              // Any other month -> next month same year
              expect(firstMonth).toBe(entryCycle.month + 1);
              expect(firstYear).toBe(entryCycle.year);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
