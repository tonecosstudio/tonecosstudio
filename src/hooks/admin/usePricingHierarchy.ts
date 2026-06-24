import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deletePricingTier,
  fetchPricingHierarchyData,
} from "@/services/admin/pricing/pricing-hierarchy-service";

export function usePricingHierarchy() {
  return useQuery({
    queryKey: ["pricing-hierarchy-data"],
    queryFn: fetchPricingHierarchyData,
  });
}

export function useDeletePricingTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePricingTier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-hierarchy-data"] });
    },
  });
}
