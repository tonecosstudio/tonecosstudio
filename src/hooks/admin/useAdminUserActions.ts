import { useMutation, useQueryClient } from "@tanstack/react-query";
import { promoteAdminByEmail, removeUserRole } from "@/services/admin/admin-users-service";

export function usePromoteAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: promoteAdminByEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useRemoveAdminUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeUserRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
    },
  });
}
