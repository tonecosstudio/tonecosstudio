/**
 * Automatic Maintenance Service
 * 
 * Handles automatic maintenance of collection choices from month to month.
 * When a subscriber doesn't make a new collection choice, the system automatically
 * copies their previous month's collection to the new delivery if it's still active.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 * 
 */

import { supabase } from "@/integrations/supabase/client";
import { isCollectionActive } from "./collection-service";
import { nowInBahia } from "@/lib/timezone";
import { recordCollectionChange } from "./audit-trail-service";
import { emailService } from "./email-service";
import { logInfo, logError } from "@/lib/logger";

interface QueryResult<T> {
  data: T;
  error: { message: string } | null;
}

interface CurrentDeliveryRow {
  expected_delivery_date: string | null;
  delivery_number: number;
}

interface PreviousDeliveryRow {
  id: string;
  collection_id: string | null;
}

interface DeliveryMaintenanceUpdate {
  collection_id: string;
  auto_maintained: boolean;
  updated_at: string;
}

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
    .single() as unknown as QueryResult<CurrentDeliveryRow | null>;

  if (currentDeliveryError || !currentDelivery) {
    throw new Error(`Failed to get current delivery: ${currentDeliveryError?.message || 'Delivery not found'}`);
  }

  // Get the previous delivery's collection_id
  // Previous delivery is the one with delivery_number = current - 1
  const { data: previousDelivery, error: previousDeliveryError } = await supabase
    .from('subscription_deliveries')
    .select('collection_id, id')
    .eq('subscription_id', subscriptionId)
    .eq('delivery_number', currentDelivery.delivery_number - 1)
    .single() as unknown as QueryResult<PreviousDeliveryRow | null>;

  if (previousDeliveryError || !previousDelivery) {
    // No previous delivery found - this is the first delivery
    // No automatic maintenance needed, subscriber must make manual selection
    logInfo(`No previous delivery found for subscription ${subscriptionId}, skipping automatic maintenance`, 
      { subscriptionId, deliveryId }, 
      'automatic-maintenance');
    return;
  }

  if (!previousDelivery.collection_id) {
    // Previous delivery has no collection choice yet
    // Cannot apply automatic maintenance
    logInfo(`Previous delivery ${previousDelivery.id} has no collection choice, skipping automatic maintenance`, 
      { previousDeliveryId: previousDelivery.id, subscriptionId }, 
      'automatic-maintenance');
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
    previousDelivery.collection_id,
    month,
    year
  );

  if (collectionIsActive) {
    // Collection is active - copy it to current delivery
    const deliveryUpdate: DeliveryMaintenanceUpdate = {
      collection_id: previousDelivery.collection_id,
      auto_maintained: true,
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('subscription_deliveries')
      .update(deliveryUpdate)
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
        newCollectionId: previousDelivery.collection_id,
        changeReason: 'automatic_maintenance',
        changedByAdmin: false,
      });
    } catch (auditError) {
      // Log the error but don't fail the operation
      logError('Failed to create audit trail record', auditError, 'automatic-maintenance');
    }

    logInfo(`Automatic maintenance applied: copied collection ${previousDelivery.collection_id} to delivery ${deliveryId}`, 
      { deliveryId, collectionId: previousDelivery.collection_id, subscriptionId }, 
      'automatic-maintenance');
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

    // Send email notification to subscriber
    try {
      // Get user email
      const { data: userData } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', subscription.user_id)
        .single();

      if (userData?.email) {
        const userName = userData.full_name || userData.email.split('@')[0];
        
        // Get collection info
        const { data: collectionData } = await supabase
          .from('collections')
          .select('name')
          .eq('id', previousDelivery.collection_id)
          .single();

        const collectionName = collectionData?.name || 'Coleção anterior';

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .notice { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
    .cta-button { display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📦 Atualização de Coleção</h1>
      <p>Manutenção Automática</p>
    </div>
    <div class="content">
      <p>Olá, ${userName}!</p>
      <div class="notice">
        <h3>Mudança de Coleção Necessária</h3>
        <p>A coleção <strong>${collectionName}</strong> não está mais disponível para o mês ${month}/${year}.</p>
      </div>
      <p>Para garantir que você receba sua entrega, uma nova coleção ativa foi automaticamente selecionada para você.</p>
      <p>Você pode revisar e alterar sua seleção no painel de assinaturas.</p>
      <div style="text-align: center;">
        <a href="${window.location.origin}/my-subscriptions" class="cta-button">
          Ver Minha Assinatura
        </a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ORDAX. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>`;

        await emailService.sendEmail(
          userData.email,
          '📦 Atualização de Coleção - ORDAX',
          html,
          'collection_maintenance',
          subscription.user_id,
          { 
            delivery_id: deliveryId,
            old_collection_id: previousDelivery.collection_id,
            month,
            year
          }
        );

        logInfo('Collection maintenance notification sent', 
          { userId: subscription.user_id, deliveryId, month, year }, 
          'automatic-maintenance');
      }
    } catch (emailError) {
      logError('Failed to send collection maintenance email', emailError, 'automatic-maintenance');
      // Don't fail the maintenance operation if email fails
    }
  }
}
