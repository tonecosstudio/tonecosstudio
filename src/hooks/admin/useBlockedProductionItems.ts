import { useQuery } from "@tanstack/react-query";
import { fetchBlockedProductionItems } from "@/services/admin/production/blocked-production-service";

export function useBlockedProductionItems() {
  return useQuery({
    queryKey: ["blocked-production-items"],
    queryFn: fetchBlockedProductionItems,
    refetchInterval: 30000,
  });
}
