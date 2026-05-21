import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotificationPreferences,
  resetNotificationPreferences,
  updateNotificationPreferences,
} from "@/services/customer/notification-preferences-service";
import type { NotificationPreferences } from "@/types/notification-preferences";

interface UseCustomerNotificationPreferencesOptions {
  onUpdate?: (preferences: NotificationPreferences) => void;
}

export function useCustomerNotificationPreferences({
  onUpdate,
}: UseCustomerNotificationPreferencesOptions = {}) {
  const queryClient = useQueryClient();

  const preferencesQuery = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: fetchNotificationPreferences,
  });

  const updateMutation = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      onUpdate?.(data);
    },
  });

  const resetMutation = useMutation({
    mutationFn: resetNotificationPreferences,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      onUpdate?.(data);
    },
  });

  return {
    preferences: preferencesQuery.data,
    isLoading: preferencesQuery.isLoading,
    error: preferencesQuery.error,
    updatePreferences: updateMutation.mutate,
    resetPreferences: resetMutation.mutate,
    isUpdating: updateMutation.isPending,
    isResetting: resetMutation.isPending,
    updateSucceeded: updateMutation.isSuccess,
    updateFailed: updateMutation.isError,
  };
}
