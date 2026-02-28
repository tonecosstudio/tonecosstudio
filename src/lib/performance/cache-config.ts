/**
 * Cache Configuration for React Query
 * 
 * Provides optimized cache settings for different types of data.
 * Implements intelligent caching strategies to improve performance
 * and reduce unnecessary API calls.
 * 
 * Features:
 * - Predefined cache times for different data types
 * - Automatic cache invalidation strategies
 * - Optimistic updates
 * - Background refetching
 */

import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

/**
 * Cache time constants (in milliseconds)
 */
export const CACHE_TIMES = {
  // Very short cache (30 seconds) - Real-time data
  REALTIME: 30 * 1000,

  // Short cache (1 minute) - Frequently changing data
  SHORT: 60 * 1000,

  // Medium cache (5 minutes) - Moderately changing data
  MEDIUM: 5 * 60 * 1000,

  // Long cache (15 minutes) - Slowly changing data
  LONG: 15 * 60 * 1000,

  // Very long cache (1 hour) - Rarely changing data
  VERY_LONG: 60 * 60 * 1000,

  // Static cache (24 hours) - Static data
  STATIC: 24 * 60 * 60 * 1000,

  // Infinite cache - Never refetch automatically
  INFINITE: Infinity,
} as const;

/**
 * Stale time constants (in milliseconds)
 * Data is considered fresh during this time
 */
export const STALE_TIMES = {
  REALTIME: 0, // Always stale
  SHORT: 30 * 1000, // 30 seconds
  MEDIUM: 2 * 60 * 1000, // 2 minutes
  LONG: 5 * 60 * 1000, // 5 minutes
  VERY_LONG: 30 * 60 * 1000, // 30 minutes
  STATIC: 60 * 60 * 1000, // 1 hour
  INFINITE: Infinity, // Never stale
} as const;

/**
 * Query configurations for different data types
 */
export const QUERY_CONFIGS = {
  // User profile - changes occasionally
  userProfile: {
    staleTime: STALE_TIMES.LONG,
    cacheTime: CACHE_TIMES.VERY_LONG,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 2,
  },

  // User roles - rarely changes
  userRoles: {
    staleTime: STALE_TIMES.VERY_LONG,
    cacheTime: CACHE_TIMES.STATIC,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 2,
  },

  // Collections list - changes occasionally
  collections: {
    staleTime: STALE_TIMES.MEDIUM,
    cacheTime: CACHE_TIMES.LONG,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 2,
  },

  // Collection details - changes occasionally
  collectionDetails: {
    staleTime: STALE_TIMES.MEDIUM,
    cacheTime: CACHE_TIMES.LONG,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 2,
  },

  // Subscriptions - changes occasionally
  subscriptions: {
    staleTime: STALE_TIMES.MEDIUM,
    cacheTime: CACHE_TIMES.LONG,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
  },

  // Payments - changes frequently
  payments: {
    staleTime: STALE_TIMES.SHORT,
    cacheTime: CACHE_TIMES.MEDIUM,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
  },

  // Orders - changes frequently
  orders: {
    staleTime: STALE_TIMES.SHORT,
    cacheTime: CACHE_TIMES.MEDIUM,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
  },

  // Notifications - real-time data
  notifications: {
    staleTime: STALE_TIMES.REALTIME,
    cacheTime: CACHE_TIMES.SHORT,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 30 * 1000, // Poll every 30 seconds
    retry: 1,
  },

  // Search results - short cache
  search: {
    staleTime: STALE_TIMES.SHORT,
    cacheTime: CACHE_TIMES.MEDIUM,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  },

  // Static data (categories, tags, etc.)
  static: {
    staleTime: STALE_TIMES.STATIC,
    cacheTime: CACHE_TIMES.INFINITE,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 3,
  },

  // Admin lists - medium cache
  adminList: {
    staleTime: STALE_TIMES.MEDIUM,
    cacheTime: CACHE_TIMES.LONG,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 2,
  },

  // Analytics - long cache
  analytics: {
    staleTime: STALE_TIMES.LONG,
    cacheTime: CACHE_TIMES.VERY_LONG,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 2,
  },
} as const;

/**
 * Mutation configurations
 */
export const MUTATION_CONFIGS = {
  // Standard mutation
  standard: {
    retry: 1,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },

  // Critical mutation (payments, orders)
  critical: {
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },

  // No retry mutation (idempotent operations)
  noRetry: {
    retry: 0,
  },
} as const;

/**
 * Get query config by type
 * 
 * @param type - Query type
 * @returns Query configuration
 */
export function getQueryConfig<T = unknown>(
  type: keyof typeof QUERY_CONFIGS
): Partial<UseQueryOptions<T>> {
  return QUERY_CONFIGS[type] as Partial<UseQueryOptions<T>>;
}

/**
 * Get mutation config by type
 * 
 * @param type - Mutation type
 * @returns Mutation configuration
 */
export function getMutationConfig<T = unknown, V = unknown>(
  type: keyof typeof MUTATION_CONFIGS
): Partial<UseMutationOptions<T, Error, V>> {
  return MUTATION_CONFIGS[type] as Partial<UseMutationOptions<T, Error, V>>;
}

/**
 * Cache invalidation patterns
 */
export const CACHE_INVALIDATION = {
  // Invalidate user-related queries
  user: ['user', 'userProfile', 'userRoles', 'subscriptions', 'payments'],

  // Invalidate collection-related queries
  collection: ['collections', 'collectionDetails', 'search'],

  // Invalidate order-related queries
  order: ['orders', 'payments', 'subscriptions'],

  // Invalidate admin queries
  admin: ['adminList', 'analytics'],

  // Invalidate all queries
  all: ['*'],
} as const;

/**
 * Optimistic update helper
 * 
 * @param queryKey - Query key to update
 * @param updater - Function to update cached data
 * @returns Optimistic update configuration
 */
export function createOptimisticUpdate<T>(
  queryKey: string[],
  updater: (old: T | undefined) => T
) {
  return {
    onMutate: async (variables: any) => {
      // Cancel outgoing refetches
      // await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      // const previousData = queryClient.getQueryData<T>(queryKey);

      // Optimistically update
      // queryClient.setQueryData<T>(queryKey, updater);

      // Return context with previous data
      return { previousData: undefined }; // Placeholder
    },
    onError: (err: Error, variables: any, context: any) => {
      // Rollback on error
      // if (context?.previousData) {
      //   queryClient.setQueryData(queryKey, context.previousData);
      // }
    },
    onSettled: () => {
      // Refetch after mutation
      // queryClient.invalidateQueries({ queryKey });
    },
  };
}

/**
 * Prefetch configuration
 */
export const PREFETCH_CONFIG = {
  // Prefetch on hover (for links)
  onHover: {
    staleTime: STALE_TIMES.MEDIUM,
  },

  // Prefetch on mount (for tabs)
  onMount: {
    staleTime: STALE_TIMES.SHORT,
  },

  // Prefetch in background
  background: {
    staleTime: STALE_TIMES.LONG,
  },
} as const;

/**
 * Query key factories
 * Centralized query key management
 */
export const queryKeys = {
  // User keys
  user: {
    all: ['user'] as const,
    profile: (userId: string) => ['user', 'profile', userId] as const,
    roles: (userId: string) => ['user', 'roles', userId] as const,
    subscriptions: (userId: string) => ['user', 'subscriptions', userId] as const,
    payments: (userId: string) => ['user', 'payments', userId] as const,
  },

  // Collection keys
  collection: {
    all: ['collection'] as const,
    lists: () => ['collection', 'list'] as const,
    list: (filters: Record<string, any>) => ['collection', 'list', filters] as const,
    details: (id: string) => ['collection', 'details', id] as const,
    characters: (id: string) => ['collection', 'characters', id] as const,
  },

  // Order keys
  order: {
    all: ['order'] as const,
    lists: () => ['order', 'list'] as const,
    list: (filters: Record<string, any>) => ['order', 'list', filters] as const,
    details: (id: string) => ['order', 'details', id] as const,
  },

  // Admin keys
  admin: {
    all: ['admin'] as const,
    users: (filters: Record<string, any>) => ['admin', 'users', filters] as const,
    analytics: (period: string) => ['admin', 'analytics', period] as const,
  },

  // Search keys
  search: {
    all: ['search'] as const,
    query: (q: string, filters: Record<string, any>) => ['search', q, filters] as const,
  },
} as const;

/**
 * Background sync configuration
 * For offline-first features
 */
export const BACKGROUND_SYNC = {
  enabled: true,
  retryInterval: 5 * 60 * 1000, // 5 minutes
  maxRetries: 3,
} as const;
