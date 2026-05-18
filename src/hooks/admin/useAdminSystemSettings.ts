import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminSystemSettings,
  updateAdminSystemSettings,
} from "@/services/admin/admin-system-settings-service";

export function useAdminSystemSettings() {
  return useQuery({
    queryKey: ["admin-system-settings"],
    queryFn: fetchAdminSystemSettings,
  });
}

export function useUpdateAdminSystemSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAdminSystemSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-system-settings"] });
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
    },
  });
}
