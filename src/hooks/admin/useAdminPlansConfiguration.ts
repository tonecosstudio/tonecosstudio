import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminPricingTierPlans,
  fetchCoinExchangeRate,
  savePricingTierPlan,
  type PricingTierPlan,
  type SavePricingTierPlanInput,
} from "@/services/admin/config/admin-plans-configuration-service";

export type { PricingTierPlan, SavePricingTierPlanInput };

export const ADMIN_PLANS_CONFIGURATION_QUERY_KEY = ["admin-plans-configuration"] as const;

export function useAdminPlansConfiguration() {
  return useQuery({
    queryKey: ADMIN_PLANS_CONFIGURATION_QUERY_KEY,
    queryFn: fetchAdminPricingTierPlans,
  });
}

export function useCoinExchangeRate() {
  return useQuery({
    queryKey: ["coin-exchange-rate"],
    queryFn: fetchCoinExchangeRate,
  });
}

export function useSavePricingTierPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SavePricingTierPlanInput) => savePricingTierPlan(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_PLANS_CONFIGURATION_QUERY_KEY });
    },
  });
}
