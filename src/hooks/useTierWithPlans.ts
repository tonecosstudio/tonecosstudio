import { useQuery } from "@tanstack/react-query";
import {
  getTierWithPlans,
  listAllTiersWithPlans,
} from "@/services/pricing/pricing-tier-read-service";

export const tierWithPlansKeys = {
  all: ["tier-with-plans"] as const,
  detail: (tierId: string) => [...tierWithPlansKeys.all, tierId] as const,
};

export function useTierWithPlans(tierId: string | null | undefined) {
  return useQuery({
    queryKey: tierWithPlansKeys.detail(tierId || ""),
    queryFn: () => getTierWithPlans(tierId),
    enabled: !!tierId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAllTiersWithPlans() {
  return useQuery({
    queryKey: [...tierWithPlansKeys.all, "list"],
    queryFn: listAllTiersWithPlans,
    staleTime: 2 * 60 * 1000,
  });
}
