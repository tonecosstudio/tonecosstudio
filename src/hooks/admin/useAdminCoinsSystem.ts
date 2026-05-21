import { useQuery } from "@tanstack/react-query";
import {
  fetchAdminCoinsPricingConfig,
  fetchAdminCoinsStats,
} from "@/services/admin/admin-coins-system-service";

export function useAdminCoinsStats() {
  return useQuery({
    queryKey: ["admin-coins-stats"],
    queryFn: fetchAdminCoinsStats,
  });
}

export function useAdminCoinsPricingConfig() {
  return useQuery({
    queryKey: ["admin-coins-pricing-config"],
    queryFn: fetchAdminCoinsPricingConfig,
  });
}
