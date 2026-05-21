/**
 * Timezone utilities for ORDAX platform
 * All date/time operations use America/Bahia timezone (UTC-3)
 */

import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';

/**
 * Timezone constant for Bahia, Brazil (America/Bahia)
 * This is the timezone used for all business logic in the ORDAX platform.
 */
export const BAHIA_TIMEZONE = 'America/Bahia';

/**
 * Converts a Bahia local time to UTC for database storage
 * 
 * This function is used when storing timestamps in the database. All timestamps
 * are stored in UTC format, but business logic operates in Bahia timezone.
 * 
 * @param bahiaDate - Date object representing a time in Bahia timezone
 * @returns Date object in UTC
 * @throws {Error} If bahiaDate is not provided
 * 
 * @example
 * // Convert cutoff time to UTC for database storage
 * const bahiaTime = new Date('2024-01-15T23:59:59');
 * const utcTime = toUTC(bahiaTime);
 * // Store utcTime in database
 * 
 * @example
 * // Convert user input to UTC
 * const userSelectedDate = new Date('2024-03-20T14:30:00');
 * const utcDate = toUTC(userSelectedDate);
 * await supabase.from('cycles').insert({ open_start: utcDate });
 */
export function toUTC(bahiaDate: Date): Date {
  if (!bahiaDate) {
    throw new Error('bahiaDate is required');
  }
  return fromZonedTime(bahiaDate, BAHIA_TIMEZONE);
}

/**
 * Converts a UTC time from the database to Bahia local time for display
 * 
 * This function is used when displaying timestamps to users. All timestamps
 * are stored in UTC in the database, but should be displayed in Bahia timezone.
 * 
 * @param utcDate - Date object in UTC from database
 * @returns Date object in Bahia timezone
 * @throws {Error} If utcDate is not provided
 * 
 * @example
 * // Convert database timestamp to Bahia time for display
 * const utcDate = new Date('2024-01-16T02:59:59Z');
 * const bahiaTime = toBahiaTime(utcDate);
 * console.log(bahiaTime); // Shows time in Bahia timezone
 * 
 * @example
 * // Display cycle cutoff time to user
 * const cycle = await supabase.from('cycles').select('open_end').single();
 * const bahiaTime = toBahiaTime(new Date(cycle.open_end));
 * return `Cutoff: ${bahiaTime.toLocaleString()}`;
 */
export function toBahiaTime(utcDate: Date): Date {
  if (!utcDate) {
    throw new Error('utcDate is required');
  }
  return toZonedTime(utcDate, BAHIA_TIMEZONE);
}

/**
 * Checks if the current Bahia time is before the cutoff (day 15 at 23:59:59)
 * 
 * The cutoff is the deadline for making collection changes and purchases.
 * After the cutoff, the cycle enters production and no changes are allowed.
 * 
 * @param currentBahiaTime - The current time in Bahia timezone
 * @returns true if current time is before or at the cutoff (day 15 at 23:59:59), false otherwise
 * @throws {Error} If currentBahiaTime is not provided
 * 
 * @example
 * // Check if collection changes are allowed
 * const now = nowInBahia();
 * if (isBeforeCutoff(now)) {
 *   // Allow collection changes
 *   await updateCollectionChoice(deliveryId, newCollectionId);
 * } else {
 *   throw new Error('Changes blocked - production has started');
 * }
 * 
 * @example
 * // Validate standalone purchase timing
 * const currentTime = nowInBahia();
 * if (!isBeforeCutoff(currentTime)) {
 *   return { error: 'Purchases closed for this cycle' };
 * }
 */
export function isBeforeCutoff(currentBahiaTime: Date): boolean {
  if (!currentBahiaTime) {
    throw new Error('currentBahiaTime is required');
  }
  
  const day = currentBahiaTime.getDate();
  const hours = currentBahiaTime.getHours();
  const minutes = currentBahiaTime.getMinutes();
  const seconds = currentBahiaTime.getSeconds();
  
  // If before the 15th, definitely before cutoff
  if (day < 15) {
    return true;
  }
  
  // If it's the 15th, check the time
  if (day === 15) {
    // Check if before or at 23:59:59 on the 15th
    if (hours < 23) {
      return true;
    }
    if (hours === 23) {
      if (minutes < 59) return true;
      if (minutes === 59 && seconds <= 59) return true;
    }
  }
  
  // If it's after 23:59:59 on the 15th, or after the 15th
  return false;
}

/**
 * Gets the cutoff date for a specific month and year
 * 
 * Returns the exact cutoff timestamp (day 15 at 23:59:59.999) for a given month.
 * This is used to calculate time remaining until cutoff and for scheduling.
 * 
 * @param month - Month (1-12)
 * @param year - Full year (e.g., 2024)
 * @returns Date object representing the cutoff (day 15 at 23:59:59.999 Bahia time)
 * @throws {Error} If month is not between 1 and 12
 * @throws {Error} If year is not between 2000 and 2100
 * 
 * @example
 * // Get cutoff for March 2024
 * const cutoff = getCutoffDate(3, 2024);
 * console.log(cutoff); // 2024-03-15T23:59:59.999 in Bahia time
 * 
 * @example
 * // Calculate time remaining until cutoff
 * const cutoff = getCutoffDate(3, 2024);
 * const now = nowInBahia();
 * const msRemaining = cutoff.getTime() - now.getTime();
 * const hoursRemaining = msRemaining / (1000 * 60 * 60);
 */
export function getCutoffDate(month: number, year: number): Date {
  if (month < 1 || month > 12) {
    throw new Error('Month must be between 1 and 12');
  }
  
  if (year < 2000 || year > 2100) {
    throw new Error('Year must be between 2000 and 2100');
  }
  
  // Create date for the 15th of the month at 23:59:59 in Bahia timezone
  const cutoff = new Date(Date.UTC(year, month - 1, 15, 23, 59, 59));
  
  // Convert to Bahia timezone
  const bahiaTime = toBahiaTime(cutoff);
  
  // Set to 23:59:59.999 in Bahia timezone
  bahiaTime.setHours(23, 59, 59, 999);
  
  return bahiaTime;
}

/**
 * Formats a date in Bahia timezone for display
 * 
 * Uses date-fns-tz format strings to display dates in Bahia timezone.
 * Common format strings: 'yyyy-MM-dd', 'dd/MM/yyyy HH:mm:ss', 'PPpp'
 * 
 * @param date - Date to format (in UTC or any timezone)
 * @param formatStr - Format string compatible with date-fns-tz (see date-fns documentation)
 * @returns Formatted date string in Bahia timezone
 * 
 * @example
 * // Format for Brazilian date display
 * const date = new Date('2024-03-15T23:59:59Z');
 * const formatted = formatInBahiaTime(date, 'dd/MM/yyyy HH:mm:ss');
 * // Returns: "15/03/2024 20:59:59" (UTC-3)
 * 
 * @example
 * // Format for ISO date
 * const date = nowInBahia();
 * const isoDate = formatInBahiaTime(date, 'yyyy-MM-dd');
 * // Returns: "2024-03-15"
 */
export function formatInBahiaTime(date: Date, formatStr: string): string {
  const bahiaTime = toBahiaTime(date);
  return format(bahiaTime, formatStr, { timeZone: BAHIA_TIMEZONE });
}

/**
 * Gets the current time in Bahia timezone
 * 
 * Convenience function to get the current moment in Bahia timezone.
 * Use this instead of `new Date()` for business logic that needs current time.
 * 
 * @returns Current date/time in Bahia timezone
 * 
 * @example
 * // Check if before cutoff using current time
 * const now = nowInBahia();
 * if (isBeforeCutoff(now)) {
 *   console.log('Still accepting changes');
 * }
 * 
 * @example
 * // Log current Bahia time
 * const currentTime = nowInBahia();
 * console.log(`Current Bahia time: ${currentTime.toLocaleString()}`);
 */
export function nowInBahia(): Date {
  const now = new Date();
  return toBahiaTime(now);
}

/**
 * Checks if a given date is a business day (not weekend or holiday)
 * 
 * A business day is Monday-Friday, excluding holidays.
 * Weekends (Saturday and Sunday) are not business days.
 * 
 * @param date - Date to check (should be in Bahia timezone)
 * @param holidays - Array of holiday dates to exclude (optional, defaults to empty array)
 * @returns true if the date is a business day (Monday-Friday and not a holiday)
 * 
 * @example
 * // Check if a date is a business day
 * const date = new Date('2024-03-15'); // Friday
 * const holidays = [new Date('2024-03-29')]; // Good Friday
 * const isBusiness = isBusinessDay(date, holidays); // true
 * 
 * @example
 * // Check weekend
 * const saturday = new Date('2024-03-16');
 * const isBusiness = isBusinessDay(saturday, []); // false
 */
export function isBusinessDay(date: Date, holidays: Date[] = []): boolean {
  const day = date.getDay();
  const isWeekend = day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
  
  if (isWeekend) return false;
  
  // Check if it's a holiday
  const dateStr = date.toISOString().split('T')[0];
  const holidayDates = holidays.map(h => h.toISOString().split('T')[0]);
  
  return !holidayDates.includes(dateStr);
}

/**
 * Calculates the Nth business day from a start date, skipping weekends and holidays
 * 
 * Adds the specified number of business days to the start date, automatically
 * skipping weekends (Saturday/Sunday) and any holidays provided.
 * 
 * @param startDate - Start date (should be in Bahia timezone)
 * @param businessDays - Number of business days to add (must be positive)
 * @param holidays - Array of holiday dates to exclude (optional, defaults to empty array)
 * @returns The date after adding business days
 * 
 * @example
 * // Calculate 5 business days from March 1
 * const start = new Date('2024-03-01'); // Friday
 * const result = addBusinessDays(start, 5, []);
 * // Returns March 8 (skips weekend March 2-3)
 * 
 * @example
 * // Calculate shipping deadline (5 business days)
 * const monthStart = new Date('2024-03-01');
 * const holidays = [new Date('2024-03-08')]; // Holiday
 * const deadline = addBusinessDays(monthStart, 5, holidays);
 * // Returns March 11 (skips weekend and holiday)
 */
export function addBusinessDays(startDate: Date, businessDays: number, holidays: Date[] = []): Date {
  let daysAdded = 0;
  const currentDate = new Date(startDate);
  
  while (daysAdded < businessDays) {
    currentDate.setDate(currentDate.getDate() + 1);
    
    if (isBusinessDay(currentDate, holidays)) {
      daysAdded++;
    }
  }
  
  return currentDate;
}

export default {
  BAHIA_TIMEZONE,
  toUTC,
  toBahiaTime,
  isBeforeCutoff,
  getCutoffDate,
  formatInBahiaTime: formatInBahiaTime,
  nowInBahia,
  isBusinessDay,
  addBusinessDays
};
