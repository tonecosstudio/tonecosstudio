// @ts-nocheck
/**
 * Holiday Management Service for ORDAX Platform
 * 
 * This service manages holidays for business day calculations.
 * Holidays include Brazilian national holidays and Bahia state holidays.
 * All operations use America/Bahia timezone (UTC-3).
 * 
 * Requirements: 24.1, 24.2, 24.3, 24.6
 * 
 * @module holiday-service
 */

import { supabase } from "@/integrations/supabase/client";
import { toBahiaTime } from "@/lib/timezone";

/**
 * Holiday interface matching the database schema
 */
export interface Holiday {
  id: string;
  holiday_date: Date;
  name: string;
  description: string | null;
  type: 'national' | 'state';
  state_code: string | null;
  is_recurring: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Database holiday row type (with nullable fields)
 */
interface HolidayRow {
  id: string;
  holiday_date: string;
  name: string;
  description: string | null;
  type: 'national' | 'state';
  state_code: string | null;
  is_recurring: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Input type for creating a new holiday (without id and timestamps)
 */
export type HolidayInput = Omit<Holiday, 'id' | 'created_at' | 'updated_at'>;

/**
 * Holiday Management Service
 * 
 * Provides functions to manage holidays for business day calculations.
 */
export class HolidayService {
  /**
   * Get all holidays for a specific year
   * 
   * @param year - The year to get holidays for
   * @returns Promise resolving to array of holidays
   * 
   * @example
   * const holidays = await getHolidays(2026);
   * 
   * Validates: Requirements 24.1
   */
  async getHolidays(year: number): Promise<Holiday[]> {
    if (year < 2000 || year > 2100) {
      throw new Error('Year must be between 2000 and 2100');
    }

    // Get holidays for the specified year
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .gte('holiday_date', startDate)
      .lte('holiday_date', endDate)
      .order('holiday_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch holidays: ${error.message}`);
    }

    // Convert date strings to Date objects and handle nullable fields
    return (data || []).map((holiday: HolidayRow) => ({
      ...holiday,
      holiday_date: new Date(holiday.holiday_date),
      is_recurring: holiday.is_recurring ?? false,
      created_at: holiday.created_at ? new Date(holiday.created_at) : new Date(),
      updated_at: holiday.updated_at ? new Date(holiday.updated_at) : new Date(),
    }));
  }

  /**
   * Add a new holiday to the calendar
   * 
   * @param holiday - Holiday data without id and timestamps
   * @returns Promise resolving to the created holiday
   * 
   * @example
   * const newHoliday = await addHoliday({
   *   holiday_date: new Date('2026-12-25'),
   *   name: 'Natal',
   *   description: 'Christmas Day',
   *   type: 'national',
   *   state_code: null,
   *   is_recurring: true
   * });
   * 
   * Validates: Requirements 24.6
   */
  async addHoliday(holiday: HolidayInput): Promise<Holiday> {
    // Validate holiday data
    this.validateHolidayInput(holiday);

    // Convert date to Bahia timezone for storage
    const bahiaDate = toBahiaTime(holiday.holiday_date);
    
    // Format date as YYYY-MM-DD for database
    const dateStr = bahiaDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('holidays')
      .insert({
        holiday_date: dateStr,
        name: holiday.name,
        description: holiday.description,
        type: holiday.type,
        state_code: holiday.state_code,
        is_recurring: holiday.is_recurring,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add holiday: ${error.message}`);
    }

    // Convert date strings to Date objects and handle nullable fields
    const row = data as HolidayRow;
    return {
      ...row,
      holiday_date: new Date(row.holiday_date),
      is_recurring: row.is_recurring ?? false,
      created_at: row.created_at ? new Date(row.created_at) : new Date(),
      updated_at: row.updated_at ? new Date(row.updated_at) : new Date(),
    };
  }

  /**
   * Delete a holiday from the calendar
   * 
   * @param id - UUID of the holiday to delete
   * @returns Promise that resolves when deletion is complete
   * 
   * @example
   * await deleteHoliday('123e4567-e89b-12d3-a456-426614174000');
   * 
   * Validates: Requirements 24.6
   */
  async deleteHoliday(id: string): Promise<void> {
    if (!id || typeof id !== 'string') {
      throw new Error('Holiday id is required');
    }

    const { error } = await supabase
      .from('holidays')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete holiday: ${error.message}`);
    }
  }

  /**
   * Check if a specific date is a holiday
   * 
   * @param date - Date to check
   * @returns Promise resolving to true if the date is a holiday
   * 
   * @example
   * const isChristmas = await isHoliday(new Date('2026-12-25'));
   * 
   * Validates: Requirements 24.1, 24.5
   */
  async isHoliday(date: Date): Promise<boolean> {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error('Valid date is required');
    }

    // Convert to Bahia timezone
    const bahiaDate = toBahiaTime(date);
    
    // Format date as YYYY-MM-DD for comparison
    const dateStr = bahiaDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('holidays')
      .select('id')
      .eq('holiday_date', dateStr)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to check holiday: ${error.message}`);
    }

    return data !== null;
  }

  /**
   * Get all holidays as Date objects for use with business day calculations
   * 
   * @param year - The year to get holidays for
   * @returns Promise resolving to array of Date objects
   * 
   * @example
   * // Use with business day calculations
   * import { calculateBusinessDays } from '@/lib/business-days';
   * import { getHolidayDates } from '@/services/holiday-service';
   * 
   * const holidayDates = await getHolidayDates(2026);
   * const startDate = new Date('2026-03-01');
   * const businessDay = calculateBusinessDays(startDate, 5, holidayDates);
   * 
   * @example
   * // Calculate 5th business day of month with holidays
   * import { calculate5thBusinessDay } from '@/lib/business-days';
   * import { getHolidayDates } from '@/services/holiday-service';
   * 
   * const holidays = await getHolidayDates(2026);
   * const shippingDeadline = calculate5thBusinessDay(3, 2026, holidays);
   */
  async getHolidayDates(year: number): Promise<Date[]> {
    const holidays = await this.getHolidays(year);
    return holidays.map(h => h.holiday_date);
  }

  /**
   * Validate holiday input data
   * 
   * @param holiday - Holiday data to validate
   * @throws Error if validation fails
   * @private
   */
  private validateHolidayInput(holiday: HolidayInput): void {
    if (!holiday.holiday_date || !(holiday.holiday_date instanceof Date)) {
      throw new Error('holiday_date is required and must be a Date object');
    }

    if (isNaN(holiday.holiday_date.getTime())) {
      throw new Error('holiday_date must be a valid date');
    }

    if (!holiday.name || typeof holiday.name !== 'string' || holiday.name.trim() === '') {
      throw new Error('name is required and must be a non-empty string');
    }

    if (!holiday.type || !['national', 'state'].includes(holiday.type)) {
      throw new Error('type must be either "national" or "state"');
    }

    // Validate state_code constraint
    if (holiday.type === 'national' && holiday.state_code !== null) {
      throw new Error('state_code must be null for national holidays');
    }

    if (holiday.type === 'state' && !holiday.state_code) {
      throw new Error('state_code is required for state holidays');
    }

    if (typeof holiday.is_recurring !== 'boolean') {
      throw new Error('is_recurring must be a boolean');
    }
  }
}

/**
 * Singleton instance of HolidayService
 */
export const holidayService = new HolidayService();

/**
 * Export individual functions for convenience
 */
export const getHolidays = (year: number) => holidayService.getHolidays(year);
export const addHoliday = (holiday: HolidayInput) => holidayService.addHoliday(holiday);
export const deleteHoliday = (id: string) => holidayService.deleteHoliday(id);
export const isHoliday = (date: Date) => holidayService.isHoliday(date);
export const getHolidayDates = (year: number) => holidayService.getHolidayDates(year);
