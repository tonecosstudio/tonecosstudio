import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCollectionsForTierAssignment,
  saveCollectionsForTierAssignment,
} from "@/services/admin/pricing/collection-tier-assignment-dialog-service";

export function useCollectionsForTierAssignment(enabled: boolean, tierId: string) {
  return useQuery({
    queryKey: ["collections-for-assignment", tierId],
    queryFn: fetchCollectionsForTierAssignment,
    enabled,
  });
}

export function useSaveCollectionsForTierAssignment(tierId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (collectionIds: string[]) =>
      saveCollectionsForTierAssignment({ tierId, collectionIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-tiers"] });
      queryClient.invalidateQueries({ queryKey: ["collections-for-assignment"] });
      queryClient.invalidateQueries({ queryKey: ["collections-by-tier"] });
    },
  });
}
