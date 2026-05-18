import { useQuery } from "@tanstack/react-query";
import {
  fetchCollectionStats,
  type CollectionStatsData,
} from "@/services/admin/collection-stats-service";

export type { CollectionStatsData };

export function useCollectionStats(collectionId: string) {
  return useQuery({
    queryKey: ["collection-stats", collectionId],
    queryFn: () => fetchCollectionStats(collectionId),
    enabled: !!collectionId,
  });
}

