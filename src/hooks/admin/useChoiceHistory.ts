import { useQuery } from "@tanstack/react-query";
import { getChoiceHistory } from "@/services/admin/choices/choice-service";

export function useChoiceHistory(orderId: string) {
  return useQuery({
    queryKey: ["choice-history", orderId],
    queryFn: () => getChoiceHistory(orderId),
    enabled: Boolean(orderId),
  });
}
