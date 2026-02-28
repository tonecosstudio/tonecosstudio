import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Custom error for role checking operations
 */
export class RoleCheckError extends Error {
  constructor(message: string, public userId?: string, public originalError?: unknown) {
    super(message);
    this.name = 'RoleCheckError';
  }
}

/**
 * Hook to check if a user has admin role
 * 
 * Features:
 * - Proper error handling with custom error types
 * - Optimized caching to prevent unnecessary refetches
 * - Type-safe implementation
 * 
 * @param userId - The user ID to check
 * @returns Query result with boolean indicating admin status
 */
export function useIsAdmin(userId?: string) {
  return useQuery({
    queryKey: ["is-admin", userId],
    enabled: !!userId, // Only execute if userId exists
    staleTime: 5 * 60 * 1000, // 5 minutes - prevents unnecessary refetches
    gcTime: 10 * 60 * 1000, // 10 minutes - cache time
    refetchOnMount: false, // Don't refetch on mount if data exists in cache
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false, // Don't refetch on network reconnect
    retry: 2, // Retry twice on failure (increased from 1)
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    queryFn: async () => {
      if (!userId) {
        return false;
      }

      try {
        const { data, error } = await supabase.rpc("has_role", { 
          _user_id: userId, 
          _role: "admin" 
        });

        if (error) {
          throw new RoleCheckError(
            `Failed to check admin role: ${error.message}`,
            userId,
            error
          );
        }

        return Boolean(data);
      } catch (error) {
        // Re-throw custom errors
        if (error instanceof RoleCheckError) {
          throw error;
        }

        // Wrap unexpected errors
        throw new RoleCheckError(
          'Unexpected error while checking admin role',
          userId,
          error
        );
      }
    },
  });
}
