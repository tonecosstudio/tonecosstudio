/**
 * IntegrationService - Service for integrating manual payments with quotes and subscriptions
 * 
 * Requirements: 15.1-15.15
 * Design: .kiro/specs/manual-payment-system/design.md
 * 
 * This service orchestrates the integration between approved manual payments
 * and the existing quote/subscription systems. When a payment is approved,
 * it updates the linked entity and creates necessary records.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Plan type to delivery interval mapping (in months)
 */
const PLAN_DELIVERY_INTERVALS = {
  trimestral: 3,  // 3 months
  semestral: 6,   // 6 months
  anual: 12,      // 12 months
} as const;

/**
 * Plan type to number of deliveries mapping
 */
const PLAN_DELIVERIES_COUNT = {
  trimestral: 3,
  semestral: 6,
  anual: 12,
} as const;

type PlanType = keyof typeof PLAN_DELIVERY_INTERVALS;

/**
 * Handle payment approval and orchestrate all necessary updates
 * This is the main entry point for payment approval integration
 * 
 * Requirements: 15.1-15.15
 * 
 * @param paymentId - UUID of the approved payment
 * @throws Error if payment not found or integration fails
 */
export async function handlePaymentApproval(paymentId: string): Promise<void> {
  // Fetch payment details
  const { data: payment, error: paymentError } = await supabase
    .from("manual_payments")
    .select("*")
    .eq("id", paymentId)
    .single();
  
  if (paymentError) {
    throw new Error(`Failed to fetch payment: ${paymentError.message}`);
  }
  
  if (!payment) {
    throw new Error("Payment not found");
  }
  
  // Check if payment is approved
  if (payment.status !== 'approved') {
    throw new Error("Payment must be approved before integration");
  }
  
  // Handle quote or subscription based on payment type
  if (payment.quote_id) {
    await updateQuoteStatus(payment.quote_id, 'paid');
  } else if (payment.subscription_id) {
    await activateSubscription(payment.subscription_id, paymentId);
  } else {
    throw new Error("Payment must be linked to either a quote or subscription");
  }
}

/**
 * Update quote status to paid
 * Triggers the existing order fulfillment workflow
 * 
 * Requirements: 15.1-15.2
 * 
 * @param quoteId - UUID of the quote to update
 * @param status - New status (typically 'paid')
 * @throws Error if quote update fails
 */
export async function updateQuoteStatus(quoteId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from("quotes")
    .update({ status })
    .eq("id", quoteId);
  
  if (error) {
    throw new Error(`Failed to update quote status: ${error.message}`);
  }
}

/**
 * Activate a subscription and create delivery records
 * Sets subscription status to 'active' and creates all scheduled deliveries
 * 
 * Requirements: 15.3-15.7
 * 
 * @param subscriptionId - UUID of the subscription to activate
 * @param paymentId - UUID of the payment that triggered activation
 * @throws Error if subscription update or delivery creation fails
 */
export async function activateSubscription(
  subscriptionId: string,
  paymentId: string
): Promise<void> {
  // Fetch subscription details
  const { data: subscription, error: fetchError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .single();
  
  if (fetchError) {
    throw new Error(`Failed to fetch subscription: ${fetchError.message}`);
  }
  
  if (!subscription) {
    throw new Error("Subscription not found");
  }
  
  // Calculate next delivery and production dates
  const nextDeliveryDate = calculateNextDeliveryDate(subscription.plan_type);
  const nextProductionStart = calculateNextProductionStart(subscription.plan_type);
  
  // Update subscription status to active
  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({
      status: 'active',
      next_delivery_date: nextDeliveryDate.toISOString(),
      next_production_start: nextProductionStart.toISOString(),
    })
    .eq("id", subscriptionId);
  
  if (updateError) {
    throw new Error(`Failed to activate subscription: ${updateError.message}`);
  }
  
  // Create subscription deliveries
  await createSubscriptionDeliveries(subscriptionId);
}

/**
 * Create subscription delivery records based on plan type
 * Creates scheduled delivery records for the entire subscription period
 * 
 * Requirements: 15.4-15.5
 * 
 * @param subscriptionId - UUID of the subscription
 * @throws Error if delivery creation fails
 */
export async function createSubscriptionDeliveries(subscriptionId: string): Promise<void> {
  // Fetch subscription details
  const { data: subscription, error: fetchError } = await supabase
    .from("subscriptions")
    .select("plan_type, deliveries_total")
    .eq("id", subscriptionId)
    .single();
  
  if (fetchError) {
    throw new Error(`Failed to fetch subscription: ${fetchError.message}`);
  }
  
  if (!subscription) {
    throw new Error("Subscription not found");
  }
  
  const planType = subscription.plan_type as PlanType;
  const deliveriesTotal = subscription.deliveries_total;
  
  // Create delivery records
  const deliveries = [];
  const baseDate = new Date();
  
  for (let i = 1; i <= deliveriesTotal; i++) {
    const deliveryDate = calculateDeliveryDate(baseDate, planType, i);
    
    deliveries.push({
      subscription_id: subscriptionId,
      delivery_number: i,
      status: 'scheduled',
      expected_delivery_date: deliveryDate.toISOString(),
    });
  }
  
  // Insert all deliveries
  const { error: insertError } = await supabase
    .from("subscription_deliveries")
    .insert(deliveries);
  
  if (insertError) {
    throw new Error(`Failed to create subscription deliveries: ${insertError.message}`);
  }
}

/**
 * Calculate the next delivery date based on plan type
 * 
 * Requirements: 15.6
 * 
 * @param planType - Subscription plan type (trimestral, semestral, anual)
 * @returns Date of next delivery
 */
export function calculateNextDeliveryDate(planType: string): Date {
  const plan = planType as PlanType;
  const intervalMonths = PLAN_DELIVERY_INTERVALS[plan] || 3;
  
  const nextDate = new Date();
  nextDate.setMonth(nextDate.getMonth() + intervalMonths);
  
  return nextDate;
}

/**
 * Calculate the next production start date based on plan type
 * Production typically starts 1 month before delivery
 * 
 * Requirements: 15.7
 * 
 * @param planType - Subscription plan type
 * @returns Date when production should start
 */
export function calculateNextProductionStart(planType: string): Date {
  const deliveryDate = calculateNextDeliveryDate(planType);
  
  // Production starts 1 month before delivery
  const productionDate = new Date(deliveryDate);
  productionDate.setMonth(productionDate.getMonth() - 1);
  
  return productionDate;
}

/**
 * Calculate delivery date for a specific delivery number
 * 
 * @param baseDate - Base date to calculate from
 * @param planType - Subscription plan type
 * @param deliveryNumber - Delivery sequence number (1-based)
 * @returns Expected delivery date
 */
function calculateDeliveryDate(
  baseDate: Date,
  planType: PlanType,
  deliveryNumber: number
): Date {
  const intervalMonths = PLAN_DELIVERY_INTERVALS[planType];
  
  const deliveryDate = new Date(baseDate);
  deliveryDate.setMonth(deliveryDate.getMonth() + (intervalMonths * deliveryNumber));
  
  return deliveryDate;
}
