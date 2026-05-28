import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { openSafeMailtoUrl } from "@/lib/security/safe-open";
import {
  buildAdminContactMailtoUrl,
  sendAdminPasswordResetEmail,
} from "@/services/admin/admin-user-actions-service";
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

export function useAdminUserActions() {
  const sendPasswordReset = useCallback((email: string) => {
    return sendAdminPasswordResetEmail({ email, origin: window.location.origin });
  }, []);

  const openContactEmail = useCallback((email: string, userName: string) => {
    openSafeMailtoUrl(buildAdminContactMailtoUrl({ email, userName }));
  }, []);

  return {
    openContactEmail,
    sendPasswordReset,
  };
}
