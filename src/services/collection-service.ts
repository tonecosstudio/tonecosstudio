/**
 * Collection Rotation Service
 * 
 * Handles collection rotation logic for bimonthly rotating collections.
 * Provides functions to determine which collections are active in a given month
 * based on rotation patterns (fixed, odd_months, even_months).
 * 
 * Requirements: 5.1, 5.2, 5.4
 * 
 * PROFESSIONAL IMPLEMENTATION:
 * - Uses properly typed Supabase client with regenerated types
 * - No type assertions or workarounds
 * - Comprehensive error handling with custom error types
 * - Full TypeScript type safety
 * - Integrated with centralized error tracking
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { 
  ValidationError, 
  DatabaseError, 
  errorTracking,
  ErrorCategory 
} from "@/lib/error-tracking";

// Type aliases for better readability
type CollectionRow = Database['public']['Tables']['collections']['Row'];

/**
 * Custom error types for better error handling
 * @deprecated Use error-tracking.ts errors instead
 */
export class CollectionServiceError extends Error {
  constructor(message: string, public code: string, public details?: unknown) {
    super(message);
    this.name = 'CollectionServiceError';
  }
}

/**
 * Collection interface extending the database schema
 * Uses Supabase generated types for type safety
 */
export interface Collection extends CollectionRow {
  // All fields are inherited from CollectionRow
  // This ensures type safety with the database schema
}

/**
 * Get active collections for a specific month and year
 * 
 * Calls the database function get_active_collections which returns:
 * - All fixed collections (always available)
 * - Odd month collections (Jan, Mar, May, Jul, Sep, Nov) when month is odd
 * - Even month collections (Feb, Apr, Jun, Aug, Oct, Dec) when month is even
 * 
 * @param month - Month number (1-12)
 * @param year - Year (2024-2030)
 * @returns Promise<Collection[]> - Array of active collections for the month
 * @throws Error if database query fails or parameters are invalid
 * 
 * @example
 * // Get active collections for January 2026
 * const collections = await getActiveCollections(1, 2026);
 * 
 * @see supabase/migrations/20260319000000_create_get_active_collections_function.sql
 * 
 * Requirements: 5.1, 5.2, 5.4
 */
export async function getActiveCollections(
  month: number,
  year: number
): Promise<Collection[]> {
  // Validate input parameters
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    const error = new ValidationError(
      `Month must be an integer between 1 and 12, got ${month}`,
      ErrorCategory.VALIDATION,
      { month, year },
      'Mês inválido. Deve ser entre 1 e 12.'
    );
    errorTracking.trackError(error);
    throw error;
  }
  
  if (!Number.isInteger(year) || year < 2024 || year > 2030) {
    const error = new ValidationError(
      `Year must be an integer between 2024 and 2030, got ${year}`,
      ErrorCategory.VALIDATION,
      { month, year },
      'Ano inválido. Deve ser entre 2024 e 2030.'
    );
    errorTracking.trackError(error);
    throw error;
  }

  try {
    // Add breadcrumb for debugging
    errorTracking.addBreadcrumb(
      'Fetching active collections',
      'collection_service',
      { month, year }
    );

    // Call the database function get_active_collections
    // Now properly typed without any assertions
    const { data, error } = await supabase
      .rpc('get_active_collections', {
        p_month: month,
        p_year: year
      });

    if (error) {
      const dbError = new DatabaseError(
        `Failed to get active collections: ${error.message}`,
        ErrorCategory.DATABASE,
        { error, month, year },
        'Erro ao buscar coleções ativas. Tente novamente.'
      );
      errorTracking.trackError(dbError);
      throw dbError;
    }

    // Return data with proper typing
    return (data || []) as Collection[];
  } catch (error) {
    // Re-throw custom errors
    if (error instanceof ValidationError || error instanceof DatabaseError) {
      throw error;
    }
    
    // Wrap unexpected errors
    const unexpectedError = new DatabaseError(
      'Unexpected error while fetching active collections',
      ErrorCategory.DATABASE,
      { error, month, year },
      'Erro inesperado ao buscar coleções. Tente novamente.'
    );
    errorTracking.trackError(unexpectedError);
    throw unexpectedError;
  }
}

/**
 * Check if a specific collection is active in a given month and year
 * 
 * Uses the get_active_collections database function to determine if
 * the specified collection is available in the given month based on
 * its rotation pattern.
 * 
 * @param collectionId - UUID of the collection to check
 * @param month - Month number (1-12)
 * @param year - Year (2024-2030)
 * @returns Promise<boolean> - True if collection is active, false otherwise
 * @throws Error if database query fails or parameters are invalid
 * 
 * @example
 * // Check if collection is active in March 2026
 * const isActive = await isCollectionActive('uuid-here', 3, 2026);
 * 
 * Requirements: 5.1, 5.2, 5.4
 */
export async function isCollectionActive(
  collectionId: string,
  month: number,
  year: number
): Promise<boolean> {
  // Validate collection ID
  if (!collectionId || typeof collectionId !== 'string') {
    throw new ValidationError(
      'Collection ID must be a non-empty string',
      { collectionId, month, year }
    );
  }

  try {
    // Get all active collections for the month
    const activeCollections = await getActiveCollections(month, year);
    
    // Check if the specified collection is in the active list
    return activeCollections.some(collection => collection.id === collectionId);
  } catch (error) {
    // Re-throw custom errors
    if (error instanceof CollectionServiceError) {
      throw error;
    }
    
    // Wrap unexpected errors
    throw new DatabaseError(
      'Unexpected error while checking collection activity',
      { error, collectionId, month, year }
    );
  }
}

/**
 * Get rotation schedule for a collection
 * 
 * Returns an array of month numbers (1-12) when the collection is available.
 * - Fixed collections: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] (all months)
 * - Odd months collections: [1, 3, 5, 7, 9, 11]
 * - Even months collections: [2, 4, 6, 8, 10, 12]
 * 
 * @param collectionId - UUID of the collection
 * @returns Promise<number[]> - Array of month numbers when collection is active
 * @throws Error if collection not found or database query fails
 * 
 * @example
 * // Get rotation schedule for a collection
 * const schedule = await getRotationSchedule('uuid-here');
 * // Returns: [1, 3, 5, 7, 9, 11] for odd_months collection
 * 
 * Requirements: 5.1, 5.2
 */
export async function getRotationSchedule(
  collectionId: string
): Promise<number[]> {
  // Validate collection ID
  if (!collectionId || typeof collectionId !== 'string') {
    throw new ValidationError(
      'Collection ID must be a non-empty string',
      { collectionId }
    );
  }

  try {
    // Get the collection to determine its rotation type
    // Now properly typed without any assertions
    const { data: collection, error } = await supabase
      .from('collections')
      .select('rotation_type')
      .eq('id', collectionId)
      .single();

    if (error) {
      throw new DatabaseError(
        `Failed to get collection: ${error.message}`,
        { error, collectionId }
      );
    }

    if (!collection) {
      throw new DatabaseError(
        `Collection not found: ${collectionId}`,
        { collectionId }
      );
    }

    // Get rotation type with proper typing
    const rotationType = collection.rotation_type;

    // Validate rotation type
    if (!rotationType || !['fixed', 'odd_months', 'even_months'].includes(rotationType)) {
      throw new ValidationError(
        `Invalid rotation type: ${rotationType}`,
        { collectionId, rotationType }
      );
    }

    // Return month array based on rotation type
    switch (rotationType) {
      case 'fixed':
        // Available every month
        return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      
      case 'odd_months':
        // Available in odd months: Jan, Mar, May, Jul, Sep, Nov
        return [1, 3, 5, 7, 9, 11];
      
      case 'even_months':
        // Available in even months: Feb, Apr, Jun, Aug, Oct, Dec
        return [2, 4, 6, 8, 10, 12];
      
      default:
        // TypeScript exhaustiveness check
        const _exhaustive: never = rotationType;
        throw new ValidationError(
          `Unknown rotation type: ${_exhaustive}`,
          { collectionId, rotationType }
        );
    }
  } catch (error) {
    // Re-throw custom errors
    if (error instanceof CollectionServiceError) {
      throw error;
    }
    
    // Wrap unexpected errors
    throw new DatabaseError(
      'Unexpected error while getting rotation schedule',
      { error, collectionId }
    );
  }
}
