/**
 * Holiday Management Service for ORDAX Platform.
 *
 * Holidays are civil dates in America/Bahia. Database reads use the canonical
 * generated Supabase schema and admin writes stay behind the existing RPC layer.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { formatInBahiaTime } from "@/lib/timezone";
import { addHolidayRpc, deleteHolidayRpc } from "./holiday-mutations-service";

export interface Holiday {
  id: string;
  holiday_date: Date;
  name: string;
  description: string | null;
  type: "national" | "state";
  state_code: string | null;
  is_recurring: boolean;
  created_at: Date;
  updated_at: Date;
}

type HolidayRow = Database["public"]["Tables"]["holidays"]["Row"];

export type HolidayInput = Omit<Holiday, "id" | "created_at" | "updated_at">;

function requireHolidayType(value: string): Holiday["type"] {
  if (value !== "national" && value !== "state") {
    throw new Error(`Invalid holiday type returned by database: ${value}`);
  }
  return value;
}

function requireTimestamp(value: string | null, field: string): Date {
  if (!value) {
    throw new Error(`Holiday ${field} is missing`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Holiday ${field} is invalid`);
  }

  return parsed;
}

function parseHolidayDate(value: string): Date {
  const parsed = new Date(`${value}T12:00:00-03:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Holiday date is invalid: ${value}`);
  }
  return parsed;
}

function toHoliday(row: HolidayRow): Holiday {
  return {
    id: row.id,
    holiday_date: parseHolidayDate(row.holiday_date),
    name: row.name,
    description: row.description,
    type: requireHolidayType(row.type),
    state_code: row.state_code,
    is_recurring: row.is_recurring ?? false,
    created_at: requireTimestamp(row.created_at, "created_at"),
    updated_at: requireTimestamp(row.updated_at, "updated_at"),
  };
}

export class HolidayService {
  async getHolidays(year: number): Promise<Holiday[]> {
    if (year < 2000 || year > 2100) {
      throw new Error("Year must be between 2000 and 2100");
    }

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { data, error } = await supabase
      .from("holidays")
      .select("*")
      .gte("holiday_date", startDate)
      .lte("holiday_date", endDate)
      .order("holiday_date", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch holidays: ${error.message}`);
    }

    return (data ?? []).map(toHoliday);
  }

  async addHoliday(holiday: HolidayInput): Promise<Holiday> {
    this.validateHolidayInput(holiday);

    // holiday_date is a civil date, not a UTC timestamp.
    const dateStr = formatInBahiaTime(holiday.holiday_date, "yyyy-MM-dd");

    const row = await addHolidayRpc<HolidayRow>({
      holiday_date: dateStr,
      name: holiday.name,
      description: holiday.description,
      type: holiday.type,
      state_code: holiday.state_code,
      is_recurring: holiday.is_recurring,
    });

    return toHoliday(row);
  }

  async deleteHoliday(id: string): Promise<void> {
    if (!id || typeof id !== "string") {
      throw new Error("Holiday id is required");
    }

    await deleteHolidayRpc<HolidayRow>(id);
  }

  async isHoliday(date: Date): Promise<boolean> {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      throw new Error("Valid date is required");
    }

    const dateStr = formatInBahiaTime(date, "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("holidays")
      .select("id")
      .eq("holiday_date", dateStr)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to check holiday: ${error.message}`);
    }

    return data !== null;
  }

  async getHolidayDates(year: number): Promise<Date[]> {
    const holidays = await this.getHolidays(year);
    return holidays.map((holiday) => holiday.holiday_date);
  }

  private validateHolidayInput(holiday: HolidayInput): void {
    if (!(holiday.holiday_date instanceof Date)) {
      throw new Error("holiday_date is required and must be a Date object");
    }

    if (Number.isNaN(holiday.holiday_date.getTime())) {
      throw new Error("holiday_date must be a valid date");
    }

    if (!holiday.name || typeof holiday.name !== "string" || holiday.name.trim() === "") {
      throw new Error("name is required and must be a non-empty string");
    }

    if (holiday.type !== "national" && holiday.type !== "state") {
      throw new Error('type must be either "national" or "state"');
    }

    if (holiday.type === "national" && holiday.state_code !== null) {
      throw new Error("state_code must be null for national holidays");
    }

    if (holiday.type === "state" && !holiday.state_code) {
      throw new Error("state_code is required for state holidays");
    }

    if (typeof holiday.is_recurring !== "boolean") {
      throw new Error("is_recurring must be a boolean");
    }
  }
}

export const holidayService = new HolidayService();

export const getHolidays = (year: number) => holidayService.getHolidays(year);
export const addHoliday = (holiday: HolidayInput) => holidayService.addHoliday(holiday);
export const deleteHoliday = (id: string) => holidayService.deleteHoliday(id);
export const isHoliday = (date: Date) => holidayService.isHoliday(date);
export const getHolidayDates = (year: number) => holidayService.getHolidayDates(year);
