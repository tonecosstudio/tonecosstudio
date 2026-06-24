import { supabase } from "@/integrations/supabase/client";

export interface Holiday {
  id: string;
  holiday_date: string;
  name: string;
  description: string | null;
  type: "national" | "state";
  state_code: string | null;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

type HolidayQueryRow = Partial<Holiday> & {
  date?: string;
};

function toHoliday(row: HolidayQueryRow): Holiday {
  const holidayDate = row.holiday_date ?? row.date;
  if (!row.id || !holidayDate || !row.name || !row.created_at) {
    throw new Error("Invalid holiday row returned from database");
  }

  return {
    id: row.id,
    holiday_date: holidayDate,
    name: row.name,
    description: row.description ?? null,
    type: row.type ?? "national",
    state_code: row.state_code ?? null,
    is_recurring: row.is_recurring ?? false,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

export async function listHolidays(year?: number): Promise<Holiday[]> {
  let query = supabase
    .from("holidays")
    .select("*")
    .order("holiday_date", { ascending: true });

  if (year) {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    query = query.gte("holiday_date", startDate).lte("holiday_date", endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  return ((data ?? []) as unknown as HolidayQueryRow[]).map(toHoliday);
}
