import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { resolveCycleCapacity } from "@/lib/cycle-capacity";

type CycleRow = Tables<"cycles">;
type CycleStatus = NonNullable<CycleRow["status"]>;

const CYCLE_STATUSES = new Set<CycleStatus>([
  "open",
  "active",
  "sales",
  "production",
  "shipping",
  "completed",
  "cancelled",
]);

export interface HistoricalCycle {
  id: string;
  cycle_number: 1 | 2;
  month: number;
  year: number;
  open_start: string | null;
  open_end: string | null;
  production_start: string | null;
  production_end: string | null;
  shipping_date: string | null;
  status: CycleStatus;
  status_changed_at: string | null;
  capacity: number;
  used_capacity: number;
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

function parseCycleStatus(value: string): CycleStatus | null {
  return CYCLE_STATUSES.has(value as CycleStatus) ? (value as CycleStatus) : null;
}

export async function fetchHistoricalCycles(
  filters: HistoricalCyclesFilters,
): Promise<HistoricalCycle[]> {
  const { selectedYear, selectedStatus, currentYear, currentMonth } = filters;

  let query = supabase.from("cycles").select("*");

  if (selectedYear !== "all") {
    query = query.eq("year", selectedYear);
  }

  if (selectedStatus !== "all") {
    const status = parseCycleStatus(selectedStatus);
    if (!status) {
      throw new Error("Status de ciclo invalido");
    }
    query = query.eq("status", status);
  }

  query = query.or(
    `year.lt.${currentYear},and(year.eq.${currentYear},month.lt.${currentMonth})`,
  );

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((cycle) => {
    const capacity = resolveCycleCapacity(cycle, "Historical cycle");

    if (cycle.cycle_number !== 1 && cycle.cycle_number !== 2) {
      throw new Error(`Historical cycle ${cycle.id} has invalid cycle_number`);
    }
    if (!cycle.status) {
      throw new Error(`Historical cycle ${cycle.id} has no status`);
    }

    return {
      id: cycle.id,
      cycle_number: cycle.cycle_number,
      month: cycle.month,
      year: cycle.year,
      open_start: cycle.open_start,
      open_end: cycle.open_end,
      production_start: cycle.production_start,
      production_end: cycle.production_end,
      shipping_date: cycle.shipping_date,
      status: cycle.status,
      status_changed_at: cycle.status_changed_at,
      capacity: capacity.capacity,
      used_capacity: capacity.usedCapacity,
      capacity_max: capacity.capacity,
      capacity_current: capacity.usedCapacity,
      created_at: cycle.created_at,
    };
  });
}
