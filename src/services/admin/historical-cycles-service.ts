import { supabase } from "@/integrations/supabase/client";

export interface HistoricalCycle {
  id: string;
  cycle_number: 1 | 2;
  month: number;
  year: number;
  open_start: string;
  open_end: string;
  production_start: string;
  production_end: string;
  shipping_date: string;
  status: "open" | "production" | "shipping" | "completed";
  status_changed_at: string | null;
  capacity_max: number;
  capacity_current: number;
  created_at: string;
}

export interface HistoricalCyclesFilters {
  selectedYear: number | "all";
  selectedStatus: string;
  currentYear: number;
  currentMonth: number;
}

export async function fetchHistoricalCycles(
  filters: HistoricalCyclesFilters
): Promise<HistoricalCycle[]> {
  const { selectedYear, selectedStatus, currentYear, currentMonth } = filters;

  let query = supabase.from("cycles").select("*");

  if (selectedYear !== "all") {
    query = query.eq("year", selectedYear);
  }

  if (selectedStatus !== "all") {
    query = query.eq("status", selectedStatus);
  }

  query = query.or(
    `year.lt.${currentYear},and(year.eq.${currentYear},month.lt.${currentMonth})`
  );

  const { data, error } = await query;
  if (error) throw error;

  return ((data as HistoricalCycle[] | null) || []);
}

