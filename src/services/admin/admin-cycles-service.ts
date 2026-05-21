import { adminProductionGateway } from "@/services/admin/admin-production-gateway";

export interface AdminCycle {
  id: string;
  name: string | null;
  month: number;
  year: number;
  status: string;
  capacity: number | null;
  used_capacity: number | null;
  cutoff_date: string | null;
  shipping_start_date: string | null;
}

export async function fetchAdminCyclesByYear(year: number): Promise<AdminCycle[]> {
  const { data, error } = await adminProductionGateway
    .from("cycles")
    .select("*")
    .eq("year", year)
    .order("month", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AdminCycle[];
}
