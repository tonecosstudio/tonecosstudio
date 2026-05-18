import { useQuery } from "@tanstack/react-query";
import {
  fetchContextualPricingHistory,
  type ContextualPricingHistoryTab,
} from "@/services/admin/contextual-pricing-history-service";

export function useContextualPricingHistory(open: boolean, tab: ContextualPricingHistoryTab) {
  return useQuery({
    queryKey: ["contextual-pricing-history", tab],
    queryFn: () => fetchContextualPricingHistory(tab),
    enabled: open,
  });
}
