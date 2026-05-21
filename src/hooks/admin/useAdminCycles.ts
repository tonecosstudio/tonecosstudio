import { useQuery } from "@tanstack/react-query";
import {
  fetchAdminCyclesByYear,
  type AdminCycle,
} from "@/services/admin/admin-cycles-service";

export type { AdminCycle };

export function useAdminCycles(selectedYear: number) {
  return useQuery({
    queryKey: ["admin-cycles", selectedYear],
    queryFn: () => fetchAdminCyclesByYear(selectedYear),
  });
}
