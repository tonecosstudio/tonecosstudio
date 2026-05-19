/**
 * Pause Service
 * 
 * Handles subscription pause operations including validation, delivery shifting,
 * and capacity release.
 * 
 * Requirements: 23.1, 23.2, 23.3, 23.4, 23.6
 */

import { supabase } from "@/integrations/supabase/client";
import { logInfo, logError } from "@/lib/logger";
import { isBeforeCutoff, nowInBahia } from "@/lib/timezone";
import { releaseCapacity } from "./capacity-service";

interface QueryResult<T> {
  data: T;
  error: { message: string } | null;
}

interface SubscriptionPauseRow {
  pause_count: number | null;
  status: string;
}

interface SubscriptionPauseUpdate {
  pause_count: number;
  updated_at: string;
}

interface SubsequentDeliveryRow {
  id: string;
  expected_delivery_date: string | null;
  cycle_id: string | null;
}

/**
 * Request to pause the next delivery of a subscription
 * 
 * This function:
 * 1. Validates current time is before cutoff (day 15 at 23:59:59 Bahia time)
 * 2. Verifies pause_count < 2 (maximum 2 pauses allowed per subscription)
 * 3. Releases capacity for the paused delivery (CRITICAL - must succeed)
 * 4. Marks next delivery as paused
 * 5. Shifts all subsequent deliveries by one month
 * 6. Increments pause_count
 * 
 * @param subscriptionId - The ID of the subscription to pause
 * @returns Promise<void>
 * @throws Error if validation fails or pause operation fails
 * 
 * @example
 * // Pause next delivery
 * await requestPause(subscriptionId);
 * 
 * Requirements: 23.1, 23.2, 23.3, 23.4, 23.6
 */
export async function requestPause(
  subscriptionId: string
): Promise<void> {
  // Requirement 23.1: Validate current time is before cutoff
  const currentTime = nowInBahia();
  if (!isBeforeCutoff(currentTime)) {
    throw new Error('CUTOFF_PASSED: Cannot pause after cutoff (day 15 at 23:59:59 Bahia time)');
  }

  // Get subscription details
  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('pause_count, status')
    .eq('id', subscriptionId)
    .single() as unknown as QueryResult<SubscriptionPauseRow | null>;

  if (subscriptionError || !subscription) {
    throw new Error(`Failed to get subscription: ${subscriptionError?.message || 'Subscription not found'}`);
  }

  // Verify subscription is active
  if (subscription.status !== 'active') {
    throw new Error('INVALID_STATUS: Subscription must be active to pause');
  }

  // Requirement 23.6: Verify pause_count < 2
  const pauseCount = subscription.pause_count ?? 0;
  if (pauseCount >= 2) {
    throw new Error('PAUSE_LIMIT_EXCEEDED: Maximum 2 pauses allowed per subscription');
  }

  // Get next delivery (first delivery with status 'scheduled' or 'pending_choice')
  const { data: nextDelivery, error: deliveryError } = await supabase
    .from('subscription_deliveries')
    .select('id, delivery_number, cycle_id, status')
    .eq('subscription_id', subscriptionId)
    .in('status', ['scheduled', 'pending_choice'])
    .order('delivery_number', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (deliveryError) {
    throw new Error(`Failed to get next delivery: ${deliveryError.message}`);
  }

  if (!nextDelivery) {
    throw new Error('NO_UPCOMING_DELIVERY: No upcoming delivery found to pause');
  }

  // Requirement 23.4: Release capacity for paused delivery
  // CRITICAL: Must succeed before proceeding with pause to maintain accurate capacity tracking
  if (nextDelivery.cycle_id) {
    try {
      await releaseCapacity(nextDelivery.cycle_id, 1, subscriptionId);
      logInfo('Successfully released capacity for paused delivery', 
        { deliveryId: nextDelivery.id, cycleId: nextDelivery.cycle_id }, 
        'pause-service');
    } catch (capacityError) {
      logError('CRITICAL: Failed to release capacity for paused delivery', capacityError, 'pause-service');
      throw new Error(`CAPACITY_RELEASE_FAILED: Unable to release capacity. ${capacityError instanceof Error ? capacityError.message : 'Unknown error'}`);
    }
  }

  // Requirement 23.3: Shift all subsequent deliveries by one month
  // Get all deliveries after the paused one
  const { data: subsequentDeliveries, error: subsequentError } = await supabase
    .from('subscription_deliveries')
    .select('id, expected_delivery_date, cycle_id')
    .eq('subscription_id', subscriptionId)
    .gt('delivery_number', nextDelivery.delivery_number)
    .order('delivery_number', { ascending: true }) as unknown as QueryResult<SubsequentDeliveryRow[] | null>;

  if (subsequentError) {
    throw new Error(`Failed to get subsequent deliveries: ${subsequentError.message}`);
  }

  // Shift each subsequent delivery by one month
  if (subsequentDeliveries && subsequentDeliveries.length > 0) {
    for (const delivery of subsequentDeliveries) {
      if (delivery.expected_delivery_date) {
        const currentDate = new Date(delivery.expected_delivery_date);
        // Add one month
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + 1);

        const { error: shiftError } = await supabase
          .from('subscription_deliveries')
          .update({
            expected_delivery_date: newDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', delivery.id);

        if (shiftError) {
          logError(`Failed to shift delivery ${delivery.id}`, shiftError, 'pause-service');
          // Continue with other deliveries
        }
      }
    }
  }

  // Requirement 23.2: Mark next delivery as paused
  // We delete the paused delivery since the user is skipping this month
  // The subsequent deliveries have already been shifted forward by one month
  const { error: deleteDeliveryError } = await supabase
    .from('subscription_deliveries')
    .delete()
    .eq('id', nextDelivery.id);

  if (deleteDeliveryError) {
    throw new Error(`Failed to delete paused delivery: ${deleteDeliveryError.message}`);
  }

  // Requirement 23.6: Increment pause_count
  const subscriptionUpdate: SubscriptionPauseUpdate = {
    pause_count: pauseCount + 1,
    updated_at: new Date().toISOString()
  };

  const { error: incrementError } = await supabase
    .from('subscriptions')
    .update(subscriptionUpdate)
    .eq('id', subscriptionId);

  if (incrementError) {
    throw new Error(`Failed to increment pause count: ${incrementError.message}`);
  }

  logInfo('Successfully paused subscription', 
    { subscriptionId, pauseCount: pauseCount + 1, maxPauses: 2 }, 
    'pause-service');
}
