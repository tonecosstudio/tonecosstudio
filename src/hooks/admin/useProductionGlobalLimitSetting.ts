import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchProductionGlobalLimitSetting,
  updateProductionGlobalLimitSetting,
} from "@/services/admin/production/production-global-limit-settings-service";

export function useProductionGlobalLimitSetting() {
  return useQuery({
    queryKey: ["production-global-limit-setting"],
    queryFn: fetchProductionGlobalLimitSetting,
  });
}

export function useUpdateProductionGlobalLimitSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (value: string) => updateProductionGlobalLimitSetting(value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-global-limit-setting"] });
      queryClient.invalidateQueries({ queryKey: ["production-limit"] });
    },
  });
}
