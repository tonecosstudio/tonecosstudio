/**
 * Timezone utilities for ORDAX platform
 * All date/time operations use America/Bahia timezone (UTC-3)
 */

import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';

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
 * await dbClient.insertCycle({ open_start: utcDate });
 */
export function toUTC(bahiaDate: Date): Date {
  if (!bahiaDate) {
    throw new Error('bahiaDate is required');
  }
  return fromZonedTime(bahiaDate, BAHIA_TIMEZONE);
}

/**
 * Converts a UTC time from the database to Bahia local wall-clock time.
 *
 * The returned Date is a wall-clock representation intended for legacy callers
 * that read local getters (getHours/getDate) or pass it to date-fns `format`.
 * Do not compare its timestamp with UTC instants; use the original Date instant
 * for comparisons and `formatInBahiaTime` for display.
 *
 * @param utcDate - Date object in UTC from database
 * @returns Date object whose local fields represent Bahia wall-clock time
 * @throws {Error} If utcDate is not provided
 */
export function toBahiaTime(utcDate: Date): Date {
  if (!utcDate) {
    throw new Error('utcDate is required');
  }
  return toZonedTime(utcDate, BAHIA_TIMEZONE);
}

/**
 * Checks if the supplied Bahia wall-clock time is before the cutoff
 * (day 15 at 23:59:59).
 *
 * @param currentBahiaTime - A Date whose local fields represent Bahia time
 * @returns true if current time is before or at the cutoff, false otherwise
 * @throws {Error} If currentBahiaTime is not provided
 */
export function isBeforeCutoff(currentBahiaTime: Date): boolean {
  if (!currentBahiaTime) {
    throw new Error('currentBahiaTime is required');
  }

  const day = currentBahiaTime.getDate();
  const hours = currentBahiaTime.getHours();
  const minutes = currentBahiaTime.getMinutes();
  const seconds = currentBahiaTime.getSeconds();

  if (day < 15) {
    return true;
  }

  if (day === 15) {
    if (hours < 23) {
      return true;
    }
    if (hours === 23) {
      if (minutes < 59) return true;
      if (minutes === 59 && seconds <= 59) return true;
    }
  }

  return false;
}

/**
 * Gets the cutoff date for a specific month and year.
 *
 * Returns the legacy Bahia wall-clock representation used by callers that read
 * local date fields. For storage or instant comparisons convert it with `toUTC`.
 *
 * @param month - Month (1-12)
 * @param year - Full year (e.g., 2024)
 * @returns Date representing day 15 at 23:59:59.999 Bahia wall-clock time
 */
export function getCutoffDate(month: number, year: number): Date {
  if (month < 1 || month > 12) {
    throw new Error('Month must be between 1 and 12');
  }

  if (year < 2000 || year > 2100) {
    throw new Error('Year must be between 2000 and 2100');
  }

  const cutoff = new Date(Date.UTC(year, month - 1, 15, 23, 59, 59));
  const bahiaTime = toBahiaTime(cutoff);
  bahiaTime.setHours(23, 59, 59, 999);

  return bahiaTime;
}

/**
 * Formats an instant directly in Bahia timezone for display.
 *
 * This deliberately does not call `toBahiaTime` first. `formatInTimeZone`
 * applies the timezone exactly once and keeps the input instant unchanged.
 *
 * @param date - Date instant to format
 * @param formatStr - date-fns format string
 * @returns Formatted date string in Bahia timezone
 */
export function formatInBahiaTime(date: Date, formatStr: string): string {
  return formatInTimeZone(date, BAHIA_TIMEZONE, formatStr);
}

/**
 * Gets the current instant.
 *
 * JavaScript Date values represent instants, not timezone-tagged values. The
 * instant must remain unchanged; Bahia is applied when reading calendar fields
 * or formatting with `formatInBahiaTime`/`toBahiaTime`.
 *
 * @returns Current instant
 */
export function nowInBahia(): Date {
  return new Date();
}

/**
 * Checks if a given wall-clock date is a business day (not weekend or holiday).
 *
 * @param date - Date to check
 * @param holidays - Array of holiday dates to exclude
 * @returns true if Monday-Friday and not a holiday
 */
export function isBusinessDay(date: Date, holidays: Date[] = []): boolean {
  const day = date.getDay();
  const isWeekend = day === 0 || day === 6;

  if (isWeekend) return false;

  const dateStr = date.toISOString().split('T')[0];
  const holidayDates = holidays.map(h => h.toISOString().split('T')[0]);

  return !holidayDates.includes(dateStr);
}

/**
 * Adds business days to a wall-clock date.
 *
 * @param startDate - Start date
 * @param businessDays - Number of business days to add
 * @param holidays - Array of holiday dates to exclude
 * @returns Date after adding business days
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
  formatInBahiaTime,
  nowInBahia,
  isBusinessDay,
  addBusinessDays,
};
