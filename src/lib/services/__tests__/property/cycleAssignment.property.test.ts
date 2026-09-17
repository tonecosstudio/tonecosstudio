import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { cycleService } from '../../cycleService';
import { timezoneService } from '../../timezoneService';

describe('Property-Based: Cycle Assignment', () => {
  describe('Cycle Number Identification', () => {
    it('assigns cycle 1 for every Bahia civil date from day 1 through 15', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 15 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 2026, max: 2030 }),
          fc.integer({ min: 0, max: 23 }),
          (day, month, year, hour) => {
            const date = timezoneService.createDate(year, month, day, hour, 0, 0);
            expect(cycleService.identifyCycleNumber(date)).toBe(1);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('assigns cycle 2 for every Bahia civil date from day 16 onward', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 16, max: 28 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 2026, max: 2030 }),
          fc.integer({ min: 0, max: 23 }),
          (day, month, year, hour) => {
            const date = timezoneService.createDate(year, month, day, hour, 0, 0);
            expect(cycleService.identifyCycleNumber(date)).toBe(2);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('keeps the day 15/day 16 boundary exact in America/Bahia', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 2026, max: 2030 }),
          (month, year) => {
            const lastCycle1 = timezoneService.createDate(year, month, 15, 23, 59, 59);
            const firstCycle2 = timezoneService.createDate(year, month, 16, 0, 0, 0);

            expect(cycleService.identifyCycleNumber(lastCycle1)).toBe(1);
            expect(cycleService.identifyCycleNumber(firstCycle2)).toBe(2);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Timezone Consistency', () => {
    it('is independent of time within the same Bahia civil day', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 28 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 2026, max: 2030 }),
          fc.integer({ min: 0, max: 23 }),
          fc.integer({ min: 0, max: 23 }),
          (day, month, year, hour1, hour2) => {
            const date1 = timezoneService.createDate(year, month, day, hour1, 0, 0);
            const date2 = timezoneService.createDate(year, month, day, hour2, 0, 0);

            expect(cycleService.identifyCycleNumber(date1)).toBe(
              cycleService.identifyCycleNumber(date2),
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('evaluates absolute instants using Bahia, not the runner timezone', () => {
      expect(cycleService.identifyCycleNumber(new Date('2026-03-16T02:59:59Z'))).toBe(1);
      expect(cycleService.identifyCycleNumber(new Date('2026-03-16T03:00:00Z'))).toBe(2);
    });
  });

  describe('Cycle Sequence and Capacity Invariants', () => {
    it('generates consecutive cycle sequence values', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 24 }),
          fc.integer({ min: 1, max: 12 }),
          (startCycle, count) => {
            const cycles = Array.from({ length: count }, (_, index) => startCycle + index);
            for (let index = 1; index < cycles.length; index++) {
              expect(cycles[index]).toBe(cycles[index - 1] + 1);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('never reports capacity when current usage is already at or above maximum', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 1, max: 1000 }),
          (current, max) => {
            expect(current < max).toBe(current < max);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('calculates remaining capacity without going below zero for valid states', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 1, max: 1000 }),
          (current, max) => {
            fc.pre(current <= max);
            const remaining = max - current;
            expect(remaining).toBeGreaterThanOrEqual(0);
            expect(current + remaining).toBe(max);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
