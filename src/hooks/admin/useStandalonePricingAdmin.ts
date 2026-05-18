import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchStandalonePricing,
  updateStandalonePricing,
} from "@/services/admin/standalone-pricing-admin-service";

export function useStandalonePricing() {
  return useQuery({
    queryKey: ["character-standalone-pricing"],
    queryFn: fetchStandalonePricing,
  });
}

export function useUpdateStandalonePricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateStandalonePricing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character-standalone-pricing"] });
    },
  });
}
