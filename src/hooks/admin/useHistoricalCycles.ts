import { useQuery } from "@tanstack/react-query";
import {
  fetchHistoricalCycles,
  type HistoricalCycle,
  type HistoricalCyclesFilters,
} from "@/services/admin/delivery/historical-cycles-service";

export type { HistoricalCycle, HistoricalCyclesFilters };

export function useHistoricalCycles(filters: HistoricalCyclesFilters) {
  return useQuery({
    queryKey: ["historical-cycles", filters.selectedYear, filters.selectedStatus],
    queryFn: () => fetchHistoricalCycles(filters),
  });
}
