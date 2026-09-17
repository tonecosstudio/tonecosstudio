/**
 * Business-day calculation utilities for ORDAX.
 *
 * Business days are civil calendar dates. They must not move when the code runs
 * in a different host timezone (browser, local Node, or Vercel). Date-only
 * values therefore use their UTC calendar fields as the canonical civil date.
 */

function assertValidDate(date: Date, name: string): void {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error(`${name} is required and must be a Date object`);
  }
}

function formatDateForComparison(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftCivilDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function normalizeCivilDate(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    12,
    0,
    0,
    0,
  ));
}

/**
 * Checks whether a civil date is Monday-Friday and is not a supplied holiday.
 */
export function isBusinessDay(date: Date, holidays: Date[] = []): boolean {
  assertValidDate(date, 'date');

  const dayOfWeek = date.getUTCDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  const dateStr = formatDateForComparison(date);
  const holidayStrs = holidays
    .filter((holiday) => holiday instanceof Date && !Number.isNaN(holiday.getTime()))
    .map(formatDateForComparison);

  return !holidayStrs.includes(dateStr);
}

/**
 * Calculates the civil date N business days after/before a start date.
 * The start date itself is not counted.
 */
export function calculateBusinessDays(
  startDate: Date,
  numDays: number,
  holidays: Date[] = [],
): Date {
  assertValidDate(startDate, 'startDate');

  if (!Number.isFinite(numDays)) {
    throw new Error('numDays must be a finite number');
  }

  const direction = numDays >= 0 ? 1 : -1;
  const daysToAdd = Math.abs(numDays);
  let result = new Date(startDate);
  let daysCounted = 0;

  while (daysCounted < daysToAdd) {
    result = shiftCivilDays(result, direction);
    if (isBusinessDay(result, holidays)) {
      daysCounted++;
    }
  }

  return result;
}

/** Adds positive business days. */
export function addBusinessDays(
  startDate: Date,
  numDays: number,
  holidays: Date[] = [],
): Date {
  if (numDays < 0) {
    throw new Error('addBusinessDays requires positive numDays. Use calculateBusinessDays for negative values.');
  }

  return calculateBusinessDays(startDate, numDays, holidays);
}

/** Returns the next business civil date. */
export function getNextBusinessDay(date: Date, holidays: Date[] = []): Date {
  assertValidDate(date, 'date');

  let result = new Date(date);
  do {
    result = shiftCivilDays(result, 1);
  } while (!isBusinessDay(result, holidays));

  return result;
}

/** Returns the previous business civil date. */
export function getPreviousBusinessDay(date: Date, holidays: Date[] = []): Date {
  assertValidDate(date, 'date');

  let result = new Date(date);
  do {
    result = shiftCivilDays(result, -1);
  } while (!isBusinessDay(result, holidays));

  return result;
}

/**
 * Calculates the Nth business civil date of a month.
 * Returned values use noon UTC so the civil date remains the same when rendered
 * in Bahia (UTC-3) and in the UTC Vercel test/build environment.
 */
export function calculateNthBusinessDayOfMonth(
  month: number,
  year: number,
  nthBusinessDay: number,
  holidays: Date[] = [],
): Date {
  if (month < 1 || month > 12) {
    throw new Error('Month must be between 1 and 12');
  }

  if (!Number.isInteger(nthBusinessDay) || nthBusinessDay < 1) {
    throw new Error('nthBusinessDay must be a positive integer');
  }

  const lastDay = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
  let businessDaysSeen = 0;

  for (let day = 1; day <= lastDay; day++) {
    const current = new Date(Date.UTC(year, month - 1, day, 12));

    if (!isBusinessDay(current, holidays)) {
      continue;
    }

    businessDaysSeen++;
    if (businessDaysSeen === nthBusinessDay) {
      return current;
    }
  }

  throw new Error(`Month ${month}/${year} has fewer than ${nthBusinessDay} business days`);
}

/** Calculates the fifth business civil date of a month. */
export function calculate5thBusinessDay(
  month: number,
  year: number,
  holidays: Date[] = [],
): Date {
  return calculateNthBusinessDayOfMonth(month, year, 5, holidays);
}

/** Counts business civil dates between start and end, inclusive. */
export function countBusinessDays(
  startDate: Date,
  endDate: Date,
  holidays: Date[] = [],
): number {
  assertValidDate(startDate, 'startDate');
  assertValidDate(endDate, 'endDate');

  const start = normalizeCivilDate(startDate);
  const end = normalizeCivilDate(endDate);

  if (start > end) {
    throw new Error('startDate must be before or equal to endDate');
  }

  let count = 0;
  let current = start;

  while (current <= end) {
    if (isBusinessDay(current, holidays)) {
      count++;
    }
    current = shiftCivilDays(current, 1);
  }

  return count;
}

export default {
  calculateBusinessDays,
  isBusinessDay,
  addBusinessDays,
  getNextBusinessDay,
  getPreviousBusinessDay,
  calculateNthBusinessDayOfMonth,
  calculate5thBusinessDay,
  countBusinessDays,
};
