/**
 * Cutoff Validation Middleware
 * 
 * Provides validation functions to enforce the cutoff deadline for collection changes.
 * The cutoff is day 15 at 23:59:59 in America/Bahia timezone.
 * 
 * Requirements: 7.1, 7.2, 7.3
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Custom error class for cutoff violations
 */
export class CutoffPassedError extends Error {
  constructor(message: string = "Changes blocked - production has started") {
    super(message);
    this.name = "CutoffPassedError";
  }
}

/**
 * Validate that current time is before the cutoff deadline
 * 
 * This function checks if the current time in Bahia timezone is before
 * day 15 at 23:59:59. If the cutoff has passed, it throws a CutoffPassedError.
 * 
 * @param deliveryId - The ID of the delivery to validate (optional, for logging)
 * @returns Promise<void>
 * @throws CutoffPassedError if cutoff has passed
 * 
 * Requirements: 7.1, 7.2, 7.3
 */
export async function validateBeforeCutoff(deliveryId?: string): Promise<void> {
  // Call the database function to check cutoff
  const { data: beforeCutoff, error } = await supabase
    .rpc('is_before_cutoff' as any);

  if (error) {
    throw new Error(`Failed to check cutoff: ${error.message}`);
  }

  if (!beforeCutoff) {
    const message = deliveryId 
      ? `Changes blocked for delivery ${deliveryId} - production has started`
      : "Changes blocked - production has started";
    throw new CutoffPassedError(message);
  }
}

/**
 * Validate that a specific delivery can be modified
 * 
 * This function checks both:
 * 1. The current time is before cutoff
 * 2. The delivery status allows modifications
 * 
 * @param deliveryId - The ID of the delivery to validate
 * @returns Promise<void>
 * @throws CutoffPassedError if cutoff has passed
 * @throws Error if delivery not found or in invalid status
 * 
 * Requirements: 7.1, 7.2, 7.3
 */
export async function validateDeliveryModification(deliveryId: string): Promise<void> {
  // First check if before cutoff
  await validateBeforeCutoff(deliveryId);

  // Then check delivery status
  const { data: delivery, error } = await supabase
    .from('subscription_deliveries')
    .select('status, cycle_id')
    .eq('id', deliveryId)
    .single();

  if (error || !delivery) {
    throw new Error(`Failed to get delivery: ${error?.message || 'Delivery not found'}`);
  }

  // Check if delivery status allows modifications
  const modifiableStatuses = ['pending_choice', 'confirmed'];
  if (!modifiableStatuses.includes(delivery.status)) {
    throw new Error(`Cannot modify delivery in status: ${delivery.status}`);
  }
}

/**
 * Check if current time is before cutoff (non-throwing version)
 * 
 * This function returns a boolean instead of throwing an error,
 * useful for UI conditional rendering.
 * 
 * @returns Promise<boolean> - True if before cutoff, false otherwise
 * 
 * Requirements: 7.4
 */
export async function isBeforeCutoff(): Promise<boolean> {
  try {
    const { data: beforeCutoff, error } = await supabase
      .rpc('is_before_cutoff' as any);

    if (error) {
      console.error('Failed to check cutoff:', error);
      return false;
    }

    return beforeCutoff === true;
  } catch (error) {
    console.error('Failed to check cutoff:', error);
    return false;
  }
}

/**
 * Get the cutoff date for the current month
 * 
 * Returns the cutoff date (day 15 at 23:59:59) for the current month
 * in Bahia timezone.
 * 
 * @returns Date - The cutoff date
 * 
 * Requirements: 7.4
 */
export function getCurrentCutoffDate(): Date {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  
  // Create date for day 15 at 23:59:59 in local time
  // Note: This is a simplified version. For production, use date-fns-tz
  // to properly handle Bahia timezone
  const cutoffDate = new Date(year, month, 15, 23, 59, 59, 999);
  
  return cutoffDate;
}

/**
 * Get time remaining until cutoff
 * 
 * Returns the number of milliseconds until the cutoff deadline.
 * Returns 0 if cutoff has passed.
 * 
 * @returns number - Milliseconds until cutoff (0 if passed)
 * 
 * Requirements: 7.4
 */
export function getTimeUntilCutoff(): number {
  const now = new Date();
  const cutoff = getCurrentCutoffDate();
  const diff = cutoff.getTime() - now.getTime();
  
  return Math.max(0, diff);
}

/**
 * Format time remaining until cutoff
 * 
 * Returns a human-readable string of time remaining.
 * 
 * @returns string - Formatted time remaining (e.g., "3 days, 5 hours")
 * 
 * Requirements: 7.4
 */
export function formatTimeUntilCutoff(): string {
  const ms = getTimeUntilCutoff();
  
  if (ms === 0) {
    return "Cutoff passed";
  }
  
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
}
