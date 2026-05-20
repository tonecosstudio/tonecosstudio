import { useQuery } from "@tanstack/react-query";
import { fetchProductionTimeline } from "@/lib/production";

export function useProductionTimeline(quoteId: string) {
  return useQuery({
    queryKey: ["production", quoteId],
    queryFn: () => fetchProductionTimeline(quoteId),
  });
}
