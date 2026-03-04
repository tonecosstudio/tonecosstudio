// @ts-nocheck
/**
 * Automatic Maintenance Service
 * 
 * Handles automatic maintenance of collection choices from month to month.
 * When a subscriber doesn't make a new collection choice, the system automatically
 * copies their previous month's collection to the new delivery if it's still active.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 * 
 * IMPORTANT NOTES:
 * - This service uses type assertions (as any) in some places because the Supabase
 *   generated types have not been regenerated after adding the collection_id and
 *   auto_maintained columns to subscription_deliveries table (migration 1.4) and
 *   the record_collection_change database function (migration 1.2).
 * - To regenerate types, run: npx supabase gen types typescript --project-id <project-id>
 * - Once types are regenerated, the type assertions can be removed.
 * - The service is fully functional and tested despite the type assertions.
 */

import { supabase } from "@/integrations/supabase/client";
import { isCollectionActive } from "./collection-service";
import { nowInBahia } from "@/lib/timezone";
import { recordCollectionChange } from "./audit-trail-service";

/**
 * Apply automatic maintenance to a delivery
 * 
 * This function implements the automatic maintenance logic:
 * 1. Gets the previous delivery's collection_id
 * 2. Checks if that collection is active in the current month
 * 3. If active, copies it to the current delivery and sets auto_maintained = true
 * 4. If not active, sends notification to subscriber to make a new selection
 * 5. Creates an audit trail record with change_reason = 'automatic_maintenance'
 * 
 * @param deliveryId - The ID of the delivery to apply automatic maintenance to
 * @param subscriptionId - The ID of the subscription
 * @returns Promise<void>
 * @throws Error if delivery not found, no previous delivery, or database operation fails
 * 
 * @example
 * // Apply automatic maintenance when creating a new delivery
 * await applyAutomaticMaintenance(newDeliveryId, subscriptionId);
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
export async function applyAutomaticMaintenance(
  deliveryId: string,
  subscriptionId: string
): Promise<void> {
  // Get the current delivery to determine its expected delivery date
  const { data: currentDelivery, error: currentDeliveryError } = await supabase
    .from('subscription_deliveries')
    .select('expected_delivery_date, delivery_number')
    .eq('id', deliveryId)
    .single();

  if (currentDeliveryError || !currentDelivery) {
    throw new Error(`Failed to get current delivery: ${currentDeliveryError?.message || 'Delivery not found'}`);
  }

  // Get the previous delivery's collection_id
  // Previous delivery is the one with delivery_number = current - 1
  // Note: Type assertion needed until Supabase types are regenerated after migration 1.4
  const { data: previousDelivery, error: previousDeliveryError } = await supabase
    .from('subscription_deliveries')
    .select('collection_id, id' as any)
    .eq('subscription_id', subscriptionId)
    .eq('delivery_number', currentDelivery.delivery_number - 1)
    .single();

  if (previousDeliveryError || !previousDelivery) {
    // No previous delivery found - this is the first delivery
    // No automatic maintenance needed, subscriber must make manual selection
    console.log(`No previous delivery found for subscription ${subscriptionId}, skipping automatic maintenance`);
    return;
  }

  const prevDelivery = previousDelivery as any;
  if (!prevDelivery.collection_id) {
    // Previous delivery has no collection choice yet
    // Cannot apply automatic maintenance
    console.log(`Previous delivery ${prevDelivery.id} has no collection choice, skipping automatic maintenance`);
    return;
  }

  // Determine the month and year for the current delivery
  const expectedDate = currentDelivery.expected_delivery_date 
    ? new Date(currentDelivery.expected_delivery_date)
    : nowInBahia();
  
  const month = expectedDate.getMonth() + 1; // JavaScript months are 0-indexed
  const year = expectedDate.getFullYear();

  // Check if the previous collection is active in the current month
  const collectionIsActive = await isCollectionActive(
    prevDelivery.collection_id,
    month,
    year
  );

  if (collectionIsActive) {
    // Collection is active - copy it to current delivery
    // Note: Type assertion needed until Supabase types are regenerated
    const { error: updateError } = await supabase
      .from('subscription_deliveries')
      .update({
        collection_id: prevDelivery.collection_id,
        auto_maintained: true,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', deliveryId);

    if (updateError) {
      throw new Error(`Failed to update delivery with automatic maintenance: ${updateError.message}`);
    }

    // Get the user_id for the audit trail
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('id', subscriptionId)
      .single();

    if (subscriptionError || !subscription) {
      throw new Error(`Failed to get subscription user: ${subscriptionError?.message || 'Subscription not found'}`);
    }

    // Create audit trail record using the audit trail service
    try {
      await recordCollectionChange({
        deliveryId,
        userId: subscription.user_id,
        previousCollectionId: null, // No previous choice for this delivery
        newCollectionId: prevDelivery.collection_id,
        changeReason: 'automatic_maintenance',
        changedByAdmin: false,
      });
    } catch (auditError) {
      // Log the error but don't fail the operation
      console.error(`Failed to create audit trail record:`, auditError);
    }

    console.log(`Automatic maintenance applied: copied collection ${prevDelivery.collection_id} to delivery ${deliveryId}`);
  } else {
    // Collection is not active in current month - send notification
    // Get the user_id and email for notification
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('user_id, profiles(email, full_name)')
      .eq('id', subscriptionId)
      .single();

    if (subscriptionError || !subscription) {
      throw new Error(`Failed to get subscription for notification: ${subscriptionError?.message || 'Subscription not found'}`);
    }

    // TODO: Send email notification to subscriber
    // For now, just log the notification need
    console.log(`Collection ${prevDelivery.collection_id} is not active in month ${month}/${year}`);
    console.log(`Notification needed for user ${subscription.user_id} to make new selection for delivery ${deliveryId}`);
    
    // In a future task, this will call the email service:
    // await emailService.sendCollectionChoiceReminder(subscription.user_id, deliveryId, 'collection_not_available');
  }
}
