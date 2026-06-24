import { useQuery } from "@tanstack/react-query";
import { currentUserHasAdminAccess } from "@/services/auth/current-user";

type CurrentUserAdminQueryOptions = {
  currentUserId?: string | null;
  enabled?: boolean;
};

/**
 * Custom error for role checking operations
 */
export class RoleCheckError extends Error {
  constructor(
    message: string,
    public currentUserId?: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = "RoleCheckError";
  }
}

/**
 * Hook to check whether the current authenticated user has admin access.
 *
 * Features:
 * - Proper error handling with custom error types
 * - Optimized caching to prevent unnecessary refetches
 * - Type-safe implementation
 *
 * @param options.currentUserId - Current auth user ID, used only to scope/cache the query
 * @param options.enabled - Explicit execution gate controlled by the auth state owner
 * @returns Query result with boolean indicating admin status
 */
export function useCurrentUserIsAdmin(
  options: CurrentUserAdminQueryOptions = {},
) {
  const { currentUserId, enabled = true } = options;

  return useQuery({
    queryKey: ["current-user-is-admin", currentUserId ?? null],
    enabled: enabled && !!currentUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes - prevents unnecessary refetches
    gcTime: 10 * 60 * 1000, // 10 minutes - cache time
    refetchOnMount: false, // Don't refetch on mount if data exists in cache
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false, // Don't refetch on network reconnect
    retry: 2, // Retry twice on failure (increased from 1)
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    queryFn: async () => {
      if (!currentUserId) {
        return false;
      }

      try {
        return await currentUserHasAdminAccess();
      } catch (error) {
        // Re-throw custom errors
        if (error instanceof RoleCheckError) {
          throw error;
        }

        // Wrap unexpected errors
        throw new RoleCheckError(
          "Unexpected error while checking admin role",
          currentUserId,
          error,
        );
      }
    },
  });
}
