import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteCollectionPricingTier,
  fetchCollectionPricingTiers,
  saveCollectionPricingTier,
} from "@/services/admin/collection-pricing-manager-service";

export function useCollectionPricingTiers() {
  return useQuery({
    queryKey: ["pricing-tiers"],
    queryFn: fetchCollectionPricingTiers,
  });
}

export function useSaveCollectionPricingTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveCollectionPricingTier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-tiers"] });
    },
  });
}

export function useDeleteCollectionPricingTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCollectionPricingTier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-tiers"] });
    },
  });
}
