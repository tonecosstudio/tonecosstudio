import { useQuery } from "@tanstack/react-query";
import { fetchCollectionsForBulkAssign } from "@/services/admin/catalog/collections-for-bulk-assign-service";

export function useCollectionsForBulkAssign(enabled: boolean) {
  return useQuery({
    queryKey: ["collections-for-bulk-assign"],
    queryFn: fetchCollectionsForBulkAssign,
    enabled,
  });
}
