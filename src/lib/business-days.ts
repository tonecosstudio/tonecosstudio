// @ts-nocheck
/**
 * Business day calculation utilities for ORDAX platform
 * 
 * These functions calculate business days (Monday-Friday) excluding weekends and holidays.
 * All calculations use America/Bahia timezone (UTC-3).
 * 
 * @module business-days
 */

import { toBahiaTime } from './timezone';

/**
 * Calculates the date that is N business days after a start date
 * 
 * @param startDate - The starting date (in any timezone, will be converted to Bahia time)
 * @param numDays - Number of business days to add (positive for future, negative for past)
 * @param holidays - Array of holiday dates to exclude (should be in Bahia timezone)
 * @returns The date that is N business days after startDate
 * 
 * @example
 * // Calculate 5 business days from March 1, 2026
 * const start = new Date('2026-03-01');
 * const holidays = [new Date('2026-03-08')]; // Example holiday
 * const result = calculateBusinessDays(start, 5, holidays);
 * 
 * @example
 * // Calculate 3 business days before a date
 * const start = new Date('2026-03-10');
 * const result = calculateBusinessDays(start, -3, []);
 * 
 * @throws {Error} If startDate is not provided
 * @throws {Error} If numDays is not a finite number
 * 
 * Validates: Requirements 1.3, 1.7, 24.4, 24.5
 */
export function calculateBusinessDays(
  startDate: Date,
  numDays: number,
  holidays: Date[] = []
): Date {
  // Validate inputs
  if (!startDate || !(startDate instanceof Date)) {
    throw new Error('startDate is required and must be a Date object');
  }
  
  if (!Number.isFinite(numDays)) {
    throw new Error('numDays must be a finite number');
  }

  // Convert start date to Bahia timezone for calculations
  const bahiaStartDate = toBahiaTime(startDate);
  
  // Create a copy to avoid modifying the input
  const result = new Date(bahiaStartDate);
  
  // Determine direction (forward for positive, backward for negative)
  const direction = numDays >= 0 ? 1 : -1;
  const daysToAdd = Math.abs(numDays);
  
  let daysCounted = 0;
  
  while (daysCounted < daysToAdd) {
    // Move one day in the appropriate direction
    result.setDate(result.getDate() + direction);
    
    // Check if this day is a business day
    if (isBusinessDay(result, holidays)) {
      daysCounted++;
    }
  }
  
  return result;
}

/**
 * Checks if a date is a business day (not weekend or holiday)
 * 
 * A business day is defined as Monday through Friday, excluding any dates
 * in the holidays array. Weekends (Saturday=6, Sunday=0) are never business days.
 * 
 * @param date - Date to check (in Bahia timezone)
 * @param holidays - Array of holiday dates to exclude (optional, defaults to empty array)
 * @returns true if the date is a business day (Monday-Friday and not a holiday)
 * 
 * @example
 * // Check if a specific date is a business day
 * const date = new Date('2026-03-15'); // Sunday
 * const isBusiness = isBusinessDay(date, []); // false (weekend)
 * 
 * @example
 * // Check with holidays
 * const date = new Date('2026-03-29'); // Friday
 * const holidays = [new Date('2026-03-29')]; // Good Friday
 * const isBusiness = isBusinessDay(date, holidays); // false (holiday)
 */
export function isBusinessDay(date: Date, holidays: Date[] = []): boolean {
  // Check if weekend (0 = Sunday, 6 = Saturday)
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }
  
  // Check if holiday
  const dateStr = formatDateForComparison(date);
  const holidayStrs = holidays.map(h => formatDateForComparison(h));
  
  return !holidayStrs.includes(dateStr);
}

/**
 * Adds business days to a start date (alias for calculateBusinessDays with positive days)
 * 
 * This is a convenience function that only accepts positive day counts.
 * Use calculateBusinessDays directly if you need to subtract business days.
 * 
 * @param startDate - The starting date (in any timezone, will be converted to Bahia time)
 * @param numDays - Number of business days to add (must be positive)
 * @param holidays - Array of holiday dates to exclude (optional, defaults to empty array)
 * @returns The date after adding business days
 * @throws {Error} If numDays is negative
 * 
 * @example
 * // Calculate balance payment deadline (5 business days after production)
 * const productionComplete = new Date('2026-03-10');
 * const paymentDeadline = addBusinessDays(productionComplete, 5, []);
 * 
 * @example
 * // Calculate with holidays
 * const start = new Date('2026-03-01');
 * const holidays = [new Date('2026-03-08')]; // Holiday on March 8
 * const result = addBusinessDays(start, 5, holidays);
 * // Skips weekend and holiday
 */
export function addBusinessDays(
  startDate: Date,
  numDays: number,
  holidays: Date[] = []
): Date {
  if (numDays < 0) {
    throw new Error('addBusinessDays requires positive numDays. Use calculateBusinessDays for negative values.');
  }
  
  return calculateBusinessDays(startDate, numDays, holidays);
}

/**
 * Gets the next business day after a given date
 * 
 * Finds the next business day (Monday-Friday, excluding holidays) after the given date.
 * Useful for scheduling tasks that must occur on business days.
 * 
 * @param date - Starting date (in any timezone, will be converted to Bahia time)
 * @param holidays - Array of holiday dates to exclude (optional, defaults to empty array)
 * @returns The next business day after the given date
 * 
 * @example
 * // Get next business day after Friday
 * const friday = new Date('2026-03-12'); // Friday
 * const nextBusinessDay = getNextBusinessDay(friday, []);
 * // Returns Monday, March 15 (skipping weekend)
 * 
 * @example
 * // Get next business day when next day is a holiday
 * const thursday = new Date('2026-03-28'); // Thursday before Good Friday
 * const holidays = [new Date('2026-03-29')]; // Good Friday
 * const nextBusinessDay = getNextBusinessDay(thursday, holidays);
 * // Returns Monday, March 31 (skipping Friday holiday and weekend)
 */
export function getNextBusinessDay(date: Date, holidays: Date[] = []): Date {
  const bahiaDate = toBahiaTime(date);
  const result = new Date(bahiaDate);
  
  do {
    result.setDate(result.getDate() + 1);
  } while (!isBusinessDay(result, holidays));
  
  return result;
}

/**
 * Gets the previous business day before a given date
 * 
 * Finds the previous business day (Monday-Friday, excluding holidays) before the given date.
 * Useful for looking back to the last business day.
 * 
 * @param date - Starting date (in any timezone, will be converted to Bahia time)
 * @param holidays - Array of holiday dates to exclude (optional, defaults to empty array)
 * @returns The previous business day before the given date
 * 
 * @example
 * // Get previous business day before Monday
 * const monday = new Date('2026-03-15'); // Monday
 * const prevBusinessDay = getPreviousBusinessDay(monday, []);
 * // Returns Friday, March 12 (skipping weekend)
 * 
 * @example
 * // Get previous business day when previous day is a holiday
 * const monday = new Date('2026-03-31'); // Monday after Good Friday
 * const holidays = [new Date('2026-03-29')]; // Good Friday
 * const prevBusinessDay = getPreviousBusinessDay(monday, holidays);
 * // Returns Thursday, March 28 (skipping Friday holiday and weekend)
 */
export function getPreviousBusinessDay(date: Date, holidays: Date[] = []): Date {
  const bahiaDate = toBahiaTime(date);
  const result = new Date(bahiaDate);
  
  do {
    result.setDate(result.getDate() - 1);
  } while (!isBusinessDay(result, holidays));
  
  return result;
}

/**
 * Calculates the 5th business day of a month (shipping deadline)
 * 
 * This function is specifically used to calculate the shipping deadline for ORDAX deliveries.
 * The 5th business day is counted from the 1st of the month, skipping weekends and holidays.
 * 
 * @param month - Month (1-12)
 * @param year - Year (e.g., 2026)
 * @param holidays - Array of holiday dates to exclude (optional, defaults to empty array)
 * @returns The 5th business day of the month
 * @throws {Error} If month is not between 1 and 12
 * 
 * @example
 * // Get shipping deadline for March 2026
 * const holidays = [new Date('2026-03-08')]; // Example holiday
 * const deadline = calculate5thBusinessDay(3, 2026, holidays);
 * console.log(`Shipping deadline: ${deadline.toLocaleDateString()}`);
 * 
 * @example
 * // Calculate for month starting on weekend
 * // If March 1 is Saturday, counting starts from Monday March 3
 * const deadline = calculate5thBusinessDay(3, 2026, []);
 * 
 * Validates: Requirements 1.7, 9.7
 */
export function calculate5thBusinessDay(
  month: number,
  year: number,
  holidays: Date[] = []
): Date {
  // Validate month
  if (month < 1 || month > 12) {
    throw new Error('Month must be between 1 and 12');
  }
  
  // Start from the 1st of the month
  const firstOfMonth = new Date(year, month - 1, 1);
  const bahiaFirstOfMonth = toBahiaTime(firstOfMonth);
  
  return calculateBusinessDays(bahiaFirstOfMonth, 5, holidays);
}

/**
 * Counts business days between two dates (inclusive)
 * 
 * Counts the number of business days (Monday-Friday, excluding holidays) between
 * two dates, including both the start and end dates if they are business days.
 * 
 * @param startDate - Start date (inclusive, in any timezone, will be converted to Bahia time)
 * @param endDate - End date (inclusive, in any timezone, will be converted to Bahia time)
 * @param holidays - Array of holiday dates to exclude (optional, defaults to empty array)
 * @returns Number of business days between dates (inclusive)
 * @throws {Error} If startDate is after endDate
 * 
 * @example
 * // Count business days in March 2026
 * const start = new Date('2026-03-01');
 * const end = new Date('2026-03-31');
 * const holidays = [new Date('2026-03-29')]; // Good Friday
 * const count = countBusinessDays(start, end, holidays);
 * // Returns number of weekdays in March minus 1 holiday
 * 
 * @example
 * // Count business days in a week
 * const monday = new Date('2026-03-15');
 * const friday = new Date('2026-03-19');
 * const count = countBusinessDays(monday, friday, []);
 * // Returns 5 (Monday through Friday)
 */
export function countBusinessDays(
  startDate: Date,
  endDate: Date,
  holidays: Date[] = []
): number {
  // Convert to Bahia timezone
  const start = toBahiaTime(startDate);
  const end = toBahiaTime(endDate);
  
  if (start > end) {
    throw new Error('startDate must be before or equal to endDate');
  }
  
  let count = 0;
  const current = new Date(start);
  
  // Count business days between start (inclusive) and end (inclusive)
  while (current <= end) {
    if (isBusinessDay(current, holidays)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Formats a date as YYYY-MM-DD for comparison
 * 
 * @param date - Date to format
 * @returns Formatted date string
 * @private
 */
function formatDateForComparison(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default {
  calculateBusinessDays,
  isBusinessDay,
  addBusinessDays,
  getNextBusinessDay,
  getPreviousBusinessDay,
  calculate5thBusinessDay,
  countBusinessDays,
};