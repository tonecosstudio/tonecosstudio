import { useQueries, useQuery } from "@tanstack/react-query";
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

export function useHolidays(year?: number) {
  return useQuery({
    queryKey: ["holidays", year],
    queryFn: async () => {
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
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useIsBusinessDay(date: Date) {
  const year = date.getFullYear();
  const { data: holidays, isLoading } = useHolidays(year);

  const isBusinessDay = () => {
    if (isLoading || !holidays) return null;

    // Check if weekend
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }

    // Check if holiday
    const dateStr = date.toISOString().split("T")[0];
    const isHoliday = holidays.some((h) => h.holiday_date === dateStr);

    return !isHoliday;
  };

  return {
    isBusinessDay: isBusinessDay(),
    isLoading,
  };
}

export function useBusinessDaysInRange(startDate: Date, endDate: Date) {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  // Get holidays for all years in range
  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => startYear + i
  );

  const holidayQueries = useQueries({
    queries: years.map((year) => ({
      queryKey: ["holidays", year],
      queryFn: async () => {
        const start = `${year}-01-01`;
        const end = `${year}-12-31`;
        const { data, error } = await supabase
          .from("holidays")
          .select("*")
          .gte("holiday_date", start)
          .lte("holiday_date", end)
          .order("holiday_date", { ascending: true });

        if (error) throw error;
        return ((data ?? []) as unknown as HolidayQueryRow[]).map(toHoliday);
      },
      staleTime: 1000 * 60 * 60,
    })),
  });

  const isLoading = holidayQueries.some((q) => q.isLoading);
  const allHolidays = holidayQueries.flatMap((q) => q.data || []);

  const countBusinessDays = () => {
    if (isLoading) return null;

    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (!isWeekend) {
        const dateStr = current.toISOString().split("T")[0];
        const isHoliday = allHolidays.some((h) => h.holiday_date === dateStr);

        if (!isHoliday) {
          count++;
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return count;
  };

  return {
    businessDaysCount: countBusinessDays(),
    isLoading,
  };
}
