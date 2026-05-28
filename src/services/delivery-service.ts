/**
 * Delivery Service
 *
 * Handles delivery lifecycle operations including activation and automatic maintenance.
 *
 * Requirements: 6.2, 9.6, 10.4
 */

import { supabase } from "@/integrations/supabase/client";
import log from "@/lib/logger";
import { assertCurrentUserId } from "./auth/current-user";
import {
  activateDeliveryWithAutoMaintenanceRpc,
  changeCollectionChoiceForCurrentUserRpc,
} from "./delivery-cycle-mutations-service";

interface DeliveryRpcError {
  message: string;
}

interface DeliveryRpcClient {
  rpc(name: 'is_before_cutoff'): Promise<{ data: boolean | null; error: DeliveryRpcError | null }>;
}

const deliveryRpc = supabase as unknown as DeliveryRpcClient;

/**
 * Activate a delivery and apply automatic maintenance
 *
 * This function transitions a delivery from 'scheduled' to 'pending_choice' status
 * and applies automatic maintenance if applicable (not first delivery and previous
 * delivery has a collection choice).
 *
 * The function uses the database function activate_delivery_with_auto_maintenance
 * which handles the entire workflow atomically.
 *
 * @param deliveryId - The ID of the delivery to activate
 * @returns Promise<void>
 * @throws Error if delivery not found or activation fails
 *
 * @example
 * // Activate a delivery when its month arrives
 * await activateDelivery(deliveryId);
 *
 * Requirements: 6.2, 10.4
 */
export async function activateDelivery(deliveryId: string): Promise<void> {
  await activateDeliveryWithAutoMaintenanceRpc(deliveryId);
}

/**
 * Activate a delivery using the TypeScript automatic maintenance service
 *
 * This is an alternative implementation that uses the TypeScript service
 * instead of the database function. Use this when you need more control
 * or want to handle the workflow in application code.
 *
 * @param deliveryId - The ID of the delivery to activate
 * @param subscriptionId - The ID of the subscription
 * @returns Promise<void>
 * @throws Error if delivery not found or activation fails
 *
 * Requirements: 6.2, 10.4
 */
export async function activateDeliveryWithService(
  deliveryId: string,
  _subscriptionId: string
): Promise<void> {
  await activateDelivery(deliveryId);
}

/**
 * Batch activate deliveries for a specific month
 *
 * This function is typically called by a cron job at the start of each month
 * to activate all deliveries scheduled for that month.
 *
 * @param month - Month number (1-12)
 * @param year - Year (e.g., 2026)
 * @returns Promise<{ activated: number, failed: number }>
 *
 * Requirements: 10.1, 10.2, 10.3
 */
export async function batchActivateDeliveriesForMonth(
  month: number,
  year: number
): Promise<{ activated: number; failed: number }> {
  // Get all scheduled deliveries for the target month
  const { data: deliveries, error: queryError } = await supabase
    .from('subscription_deliveries')
    .select('id, subscription_id, delivery_number')
    .eq('status', 'scheduled')
    .gte('expected_delivery_date', `${year}-${String(month).padStart(2, '0')}-01`)
    .lt('expected_delivery_date', `${year}-${String(month + 1).padStart(2, '0')}-01`);

  if (queryError) {
    throw new Error(`Failed to query deliveries: ${queryError.message}`);
  }

  if (!deliveries || deliveries.length === 0) {
    log.info('No scheduled deliveries found', { month, year });
    return { activated: 0, failed: 0 };
  }

  let activated = 0;
  let failed = 0;

  // Activate each delivery
  for (const delivery of deliveries) {
    try {
      await activateDelivery(delivery.id);
      activated++;
      log.info('Delivery activated', {
        deliveryId: delivery.id,
        deliveryNumber: delivery.delivery_number
      });
    } catch (error) {
      failed++;
      log.error('Failed to activate delivery', { deliveryId: delivery.id, error });
    }
  }

  return { activated, failed };
}

/**
 * Check if a delivery can have its collection changed
 *
 * A delivery can be changed if:
 * 1. Current time is before the cutoff (day 15 at 23:59:59 Bahia time)
 * 2. Delivery status is 'pending_choice' or 'confirmed'
 *
 * @param deliveryId - The ID of the delivery to check
 * @returns Promise<boolean> - True if changes are allowed
 *
 * Requirements: 6.6, 7.1, 7.2
 */
export async function canChangeCollection(deliveryId: string): Promise<boolean> {
  // Get delivery information
  const { data: delivery, error: deliveryError } = await supabase
    .from('subscription_deliveries')
    .select('status, cycle_id')
    .eq('id', deliveryId)
    .single();

  if (deliveryError || !delivery) {
    throw new Error(`Failed to get delivery: ${deliveryError?.message || 'Delivery not found'}`);
  }

  // Check if delivery status allows changes
  if (delivery.status !== 'pending_choice' && delivery.status !== 'confirmed') {
    return false;
  }

  // Check if before cutoff using database function
  const { data: beforeCutoff, error: cutoffError } = await deliveryRpc
    .rpc('is_before_cutoff');

  if (cutoffError) {
    throw new Error(`Failed to check cutoff: ${cutoffError.message}`);
  }

  return beforeCutoff === true;
}

/**
 * Change the collection choice for a delivery
 *
 * This function:
 * 1. Validates that changes are allowed (before cutoff)
 * 2. Updates the delivery's collection_id
 * 3. Sets auto_maintained to false if it was true
 * 4. Creates an audit trail record
 *
 * @param deliveryId - The ID of the delivery to update
 * @param newCollectionId - The ID of the new collection
 * @param userId - The ID of the user making the change
 * @param ipAddress - The IP address of the request (optional)
 * @param userAgent - The user agent of the request (optional)
 * @returns Promise<void>
 * @throws Error if changes not allowed or update fails
 *
 * Requirements: 6.6, 8.1, 8.2, 8.3, 21.1, 21.2
 */
export async function changeCollectionChoice(
  deliveryId: string,
  newCollectionId: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await assertCurrentUserId(userId);

  // Check if changes are allowed
  const allowed = await canChangeCollection(deliveryId);
  if (!allowed) {
    throw new Error('CUTOFF_PASSED: Changes blocked - production has started');
  }

  await changeCollectionChoiceForCurrentUserRpc(
    deliveryId,
    newCollectionId,
    userId,
    ipAddress,
    userAgent
  );
}
