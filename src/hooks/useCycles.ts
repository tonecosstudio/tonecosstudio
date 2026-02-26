import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Cycle {
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
  capacity_current: number;
  capacity_max: number;
  created_at: string;
  updated_at: string;
}

export function useCycles() {
  return useQuery({
    queryKey: ["cycles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cycles")
        .select("*")
        .order("year", { ascending: true })
        .order("month", { ascending: true })
        .order("cycle_number", { ascending: true });

      if (error) throw error;
      return data as Cycle[];
    },
  });
}

export function useCurrentCycle() {
  return useQuery({
    queryKey: ["current-cycle"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cycles")
        .select("*")
        .eq("status", "open")
        .order("year", { ascending: true })
        .order("month", { ascending: true })
        .order("cycle_number", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as Cycle | null;
    },
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useCycleById(cycleId: string | undefined) {
  return useQuery({
    queryKey: ["cycle", cycleId],
    enabled: Boolean(cycleId),
    queryFn: async () => {
      if (!cycleId) return null;

      const { data, error } = await supabase
        .from("cycles")
        .select("*")
        .eq("id", cycleId)
        .maybeSingle();

      if (error) throw error;
      return data as Cycle | null;
    },
  });
}

export function useCyclesByMonth(month: number, year: number) {
  return useQuery({
    queryKey: ["cycles", "month", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cycles")
        .select("*")
        .eq("month", month)
        .eq("year", year)
        .order("cycle_number", { ascending: true });

      if (error) throw error;
      return data as Cycle[];
    },
  });
}
