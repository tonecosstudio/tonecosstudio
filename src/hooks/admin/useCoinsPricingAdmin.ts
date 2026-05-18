import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateBasePrices, updateContextMultipliers } from "@/services/admin/coins-pricing-admin-service";

export function useUpdateBasePrices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateBasePrices,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coins-pricing-config"] });
    },
  });
}

export function useUpdateContextMultipliers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateContextMultipliers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coins-pricing-config"] });
    },
  });
}
