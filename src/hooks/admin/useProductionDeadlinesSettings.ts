import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchProductionDeadlinesSettings,
  updateProductionDeadlineSetting,
} from "@/services/admin/production-deadlines-settings-service";

export function useProductionDeadlinesSettings() {
  return useQuery({
    queryKey: ["ssot-deadlines"],
    queryFn: fetchProductionDeadlinesSettings,
  });
}

export function useUpdateProductionDeadlineSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProductionDeadlineSetting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ssot-deadlines"] });
      queryClient.invalidateQueries({ queryKey: ["system-deadlines"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-cycles"] });
    },
  });
}
