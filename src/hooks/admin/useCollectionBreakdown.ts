import { useQuery } from "@tanstack/react-query";
import {
  fetchCollectionBreakdown,
  type CollectionBreakdownData,
} from "@/services/admin/catalog/collection-breakdown-service";

export type { CollectionBreakdownData };

export function useCollectionBreakdown(cycleId: string) {
  return useQuery({
    queryKey: ["collection-breakdown", cycleId],
    queryFn: () => fetchCollectionBreakdown(cycleId),
    enabled: !!cycleId,
  });
}

