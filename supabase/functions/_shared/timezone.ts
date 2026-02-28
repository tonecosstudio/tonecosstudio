/**
 * Timezone utilities for ORDAX platform (Deno/Edge Functions)
 * All date/time operations use America/Bahia timezone (UTC-3)
 */

/**
 * Timezone constant for Bahia, Brazil (America/Bahia)
 */
export const BAHIA_TIMEZONE = 'America/Bahia';

/**
 * Converts a Bahia local time to UTC for database storage
 * 
 * @param bahiaDate - Date object representing a time in Bahia timezone
 * @returns Date object in UTC
 */
export function toUTC(bahiaDate: Date): Date {
  if (!bahiaDate) {
    throw new Error('bahiaDate is required');
  }
  
  // Bahia is UTC-3, so we add 3 hours to convert to UTC
  const utcTime = new Date(bahiaDate.getTime() + (3 * 60 * 60 * 1000));
  return utcTime;
}

/**
 * Converts a UTC time from the database to Bahia local time for display
 * 
 * @param utcDate - Date object in UTC from database
 * @returns Date object in Bahia timezone
 */
export function toBahiaTime(utcDate: Date): Date {
  if (!utcDate) {
    throw new Error('utcDate is required');
  }
  
  // Bahia is UTC-3, so we subtract 3 hours from UTC
  const bahiaTime = new Date(utcDate.getTime() - (3 * 60 * 60 * 1000));
  return bahiaTime;
}

/**
 * Gets the current time in Bahia timezone
 * 
 * @returns Current date/time in Bahia timezone
 */
export function nowInBahia(): Date {
  const now = new Date();
  return toBahiaTime(now);
}

/**
 * Checks if the current Bahia time is before the cutoff (day 15 at 23:59:59)
 * 
 * @param currentBahiaTime - The current time in Bahia timezone
 * @returns true if current time is before the cutoff, false otherwise
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
 * @param month - Month (1-12)
 * @param year - Full year (e.g., 2024)
 * @returns Date object representing the cutoff (day 15 at 23:59:59 Bahia time)
 */
export function getCutoffDate(month: number, year: number): Date {
  if (month < 1 || month > 12) {
    throw new Error('Month must be between 1 and 12');
  }
  
  if (year < 2000 || year > 2100) {
    throw new Error('Year must be between 2000 and 2100');
  }
  
  // Create date for the 15th of the month at 23:59:59 in Bahia timezone
  const cutoff = new Date(year, month - 1, 15, 23, 59, 59, 999);
  
  return cutoff;
}

/**
 * Adds days to a date in Bahia timezone
 * 
 * @param date - Starting date
 * @param days - Number of days to add
 * @returns New date with days added
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Adds months to a date in Bahia timezone
 * 
 * @param date - Starting date
 * @param months - Number of months to add
 * @returns New date with months added
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
