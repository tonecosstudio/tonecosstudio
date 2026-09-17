import { describe, expect, it } from "vitest";
import fc from "fast-check";

import {
  addBusinessDays,
  calculate5thBusinessDay,
  calculateBusinessDays,
  calculateNthBusinessDayOfMonth,
  countBusinessDays,
  getNextBusinessDay,
  getPreviousBusinessDay,
  isBusinessDay,
} from "./business-days";

const validDateArbitrary = fc
  .date({ min: new Date("2026-01-01T12:00:00.000Z"), max: new Date("2030-12-31T12:00:00.000Z") })
  .filter((date) => !Number.isNaN(date.getTime()));

const validHolidayArray = (maxLength = 10) =>
  fc.array(validDateArbitrary, { minLength: 0, maxLength });

function civilDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function expectCivilDate(date: Date, year: number, month: number, day: number): void {
  expect(date.getUTCFullYear()).toBe(year);
  expect(date.getUTCMonth() + 1).toBe(month);
  expect(date.getUTCDate()).toBe(day);
}

describe("Business Day Utilities", () => {
  describe("calculateBusinessDays", () => {
    it("calculates forward business days while skipping weekends", () => {
      expectCivilDate(calculateBusinessDays(civilDate(2026, 3, 2), 5), 2026, 3, 9);
    });

    it("calculates backward business days while skipping weekends", () => {
      expectCivilDate(calculateBusinessDays(civilDate(2026, 3, 9), -5), 2026, 3, 2);
    });

    it("skips supplied holidays", () => {
      const result = calculateBusinessDays(
        civilDate(2026, 3, 2),
        3,
        [civilDate(2026, 3, 4)],
      );
      expectCivilDate(result, 2026, 3, 6);
    });

    it("preserves the starting instant for zero days", () => {
      const start = new Date("2026-03-01T12:00:00.000Z");
      expect(calculateBusinessDays(start, 0).getTime()).toBe(start.getTime());
    });

    it("keeps the civil date stable regardless of host timezone", () => {
      const result = calculateBusinessDays(new Date("2026-03-01T12:00:00.000Z"), 1);

      expect(result.toISOString()).toBe("2026-03-02T12:00:00.000Z");
      expect(isBusinessDay(result)).toBe(true);
    });

    it("rejects invalid inputs", () => {
      expect(() => calculateBusinessDays(null as never, 5)).toThrow("startDate is required");
      expect(() => calculateBusinessDays(new Date("invalid"), 5)).toThrow(
        "startDate is required and must be a Date object",
      );
      expect(() => calculateBusinessDays(civilDate(2026, 3, 2), Number.NaN)).toThrow(
        "numDays must be a finite number",
      );
      expect(() => calculateBusinessDays(civilDate(2026, 3, 2), Number.POSITIVE_INFINITY)).toThrow(
        "numDays must be a finite number",
      );
    });
  });

  describe("isBusinessDay", () => {
    it("accepts Monday through Friday", () => {
      for (const day of [2, 3, 4, 5, 6]) {
        expect(isBusinessDay(civilDate(2026, 3, day))).toBe(true);
      }
    });

    it("rejects Saturday and Sunday", () => {
      expect(isBusinessDay(civilDate(2026, 3, 7))).toBe(false);
      expect(isBusinessDay(civilDate(2026, 3, 8))).toBe(false);
    });

    it("rejects holidays using civil-date equality", () => {
      expect(
        isBusinessDay(civilDate(2026, 3, 4), [civilDate(2026, 3, 4)]),
      ).toBe(false);
      expect(
        isBusinessDay(civilDate(2026, 3, 4), [civilDate(2026, 3, 5)]),
      ).toBe(true);
    });

    it("ignores invalid holiday entries but rejects an invalid target date", () => {
      expect(
        isBusinessDay(civilDate(2026, 3, 4), [new Date("invalid")]),
      ).toBe(true);
      expect(() => isBusinessDay(new Date("invalid"))).toThrow(
        "date is required and must be a Date object",
      );
    });
  });

  describe("addBusinessDays", () => {
    it("adds positive business days", () => {
      expectCivilDate(addBusinessDays(civilDate(2026, 3, 2), 3), 2026, 3, 5);
    });

    it("rejects negative values", () => {
      expect(() => addBusinessDays(civilDate(2026, 3, 2), -1)).toThrow(
        "addBusinessDays requires positive numDays",
      );
    });
  });

  describe("next and previous business day", () => {
    it("finds Monday after Friday", () => {
      expectCivilDate(getNextBusinessDay(civilDate(2026, 3, 6)), 2026, 3, 9);
    });

    it("skips a holiday when moving forward", () => {
      expectCivilDate(
        getNextBusinessDay(civilDate(2026, 3, 4), [civilDate(2026, 3, 5)]),
        2026,
        3,
        6,
      );
    });

    it("finds Friday before Monday", () => {
      expectCivilDate(getPreviousBusinessDay(civilDate(2026, 3, 2)), 2026, 2, 27);
    });

    it("skips a holiday when moving backward", () => {
      expectCivilDate(
        getPreviousBusinessDay(civilDate(2026, 3, 6), [civilDate(2026, 3, 5)]),
        2026,
        3,
        4,
      );
    });
  });

  describe("Nth business day of month", () => {
    it("calculates the fifth business day", () => {
      expectCivilDate(calculate5thBusinessDay(3, 2026), 2026, 3, 6);
      expectCivilDate(calculate5thBusinessDay(6, 2026), 2026, 6, 5);
    });

    it("calculates a configurable Nth business day", () => {
      expectCivilDate(calculateNthBusinessDayOfMonth(6, 2026, 3), 2026, 6, 3);
    });

    it("skips holidays while counting", () => {
      expectCivilDate(
        calculate5thBusinessDay(3, 2026, [civilDate(2026, 3, 6)]),
        2026,
        3,
        9,
      );
    });

    it("validates month and Nth-day inputs", () => {
      expect(() => calculate5thBusinessDay(0, 2026)).toThrow("Month must be between 1 and 12");
      expect(() => calculate5thBusinessDay(13, 2026)).toThrow("Month must be between 1 and 12");
      expect(() => calculateNthBusinessDayOfMonth(6, 2026, 0)).toThrow(
        "nthBusinessDay must be a positive integer",
      );
    });
  });

  describe("countBusinessDays", () => {
    it("counts weekdays inclusively", () => {
      expect(countBusinessDays(civilDate(2026, 3, 2), civilDate(2026, 3, 8))).toBe(5);
    });

    it("excludes holidays", () => {
      expect(
        countBusinessDays(
          civilDate(2026, 3, 2),
          civilDate(2026, 3, 8),
          [civilDate(2026, 3, 4)],
        ),
      ).toBe(4);
    });

    it("handles a single business or weekend day", () => {
      expect(countBusinessDays(civilDate(2026, 3, 2), civilDate(2026, 3, 2))).toBe(1);
      expect(countBusinessDays(civilDate(2026, 3, 7), civilDate(2026, 3, 7))).toBe(0);
    });

    it("rejects inverted ranges", () => {
      expect(() =>
        countBusinessDays(civilDate(2026, 3, 8), civilDate(2026, 3, 2)),
      ).toThrow("startDate must be before or equal to endDate");
    });
  });
});

describe("Business Day Utilities - Properties", () => {
  it("counts exactly the requested positive business days", () => {
    fc.assert(
      fc.property(
        validDateArbitrary,
        fc.integer({ min: 1, max: 20 }),
        validHolidayArray(),
        (startDate, numDays, holidays) => {
          const validHolidays = holidays.filter((holiday) => !Number.isNaN(holiday.getTime()));
          const result = calculateBusinessDays(startDate, numDays, validHolidays);
          const dayAfterStart = new Date(startDate);
          dayAfterStart.setUTCDate(dayAfterStart.getUTCDate() + 1);

          expect(countBusinessDays(dayAfterStart, result, validHolidays)).toBe(numDays);
          expect(isBusinessDay(result, validHolidays)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("never returns a weekend for positive business-day movement", () => {
    fc.assert(
      fc.property(
        validDateArbitrary,
        fc.integer({ min: 1, max: 10 }),
        validHolidayArray(5),
        (startDate, numDays, holidays) => {
          const validHolidays = holidays.filter((holiday) => !Number.isNaN(holiday.getTime()));
          const result = calculateBusinessDays(startDate, numDays, validHolidays);

          expect(result.getUTCDay()).not.toBe(0);
          expect(result.getUTCDay()).not.toBe(6);
          expect(isBusinessDay(result, validHolidays)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("forward then backward returns to a business-day start", () => {
    fc.assert(
      fc.property(
        validDateArbitrary,
        fc.integer({ min: 1, max: 10 }),
        validHolidayArray(5),
        (startDate, numDays, holidays) => {
          const validHolidays = holidays.filter((holiday) => !Number.isNaN(holiday.getTime()));
          if (!isBusinessDay(startDate, validHolidays)) return;

          const forward = calculateBusinessDays(startDate, numDays, validHolidays);
          const backward = calculateBusinessDays(forward, -numDays, validHolidays);

          expect(backward.toISOString().slice(0, 10)).toBe(startDate.toISOString().slice(0, 10));
        },
      ),
      { numRuns: 100 },
    );
  });

  it("the fifth business day is always a valid business day in its month", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 2026, max: 2030 }),
        validHolidayArray(),
        (month, year, holidays) => {
          const validHolidays = holidays.filter((holiday) => !Number.isNaN(holiday.getTime()));
          const result = calculate5thBusinessDay(month, year, validHolidays);

          expect(isBusinessDay(result, validHolidays)).toBe(true);
          expect(result.getUTCFullYear()).toBe(year);
          expect(result.getUTCMonth() + 1).toBe(month);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("countBusinessDays matches a manual UTC-civil calculation", () => {
    fc.assert(
      fc.property(
        validDateArbitrary,
        fc.integer({ min: 0, max: 30 }),
        validHolidayArray(5),
        (startDate, daysToAdd, holidays) => {
          const validHolidays = holidays.filter((holiday) => !Number.isNaN(holiday.getTime()));
          const endDate = new Date(startDate);
          endDate.setUTCDate(endDate.getUTCDate() + daysToAdd);

          let manual = 0;
          const cursor = new Date(Date.UTC(
            startDate.getUTCFullYear(),
            startDate.getUTCMonth(),
            startDate.getUTCDate(),
            12,
          ));
          const end = new Date(Date.UTC(
            endDate.getUTCFullYear(),
            endDate.getUTCMonth(),
            endDate.getUTCDate(),
            12,
          ));

          while (cursor <= end) {
            if (isBusinessDay(cursor, validHolidays)) manual++;
            cursor.setUTCDate(cursor.getUTCDate() + 1);
          }

          expect(countBusinessDays(startDate, endDate, validHolidays)).toBe(manual);
        },
      ),
      { numRuns: 100 },
    );
  });
});
