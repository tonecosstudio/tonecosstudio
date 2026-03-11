/**
 * Stripe Webhooks Handler
 * 
 * Professional webhook handling with:
 * - Signature verification
 * - Event processing
 * - Error handling
 * - Logging
 * - Database updates
 * 
 * Supported Events:
 * - payment_intent.succeeded
 * - payment_intent.payment_failed
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - charge.refunded
 * 
 * @example
 * ```typescript
 * import { handleStripeWebhook } from '@/lib/stripe/stripe-webhooks';
 * 
 * // In your API route
 * const event = await handleStripeWebhook(request);
 * ```
 */

import Stripe from 'stripe';
import { stripe, getWebhookSecret } from './stripe-client';
import { logInfo, logError, logWarn } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

/**
 * Webhook event handler type
 */
type WebhookHandler = (event: Stripe.Event) => Promise<void>;

/**
 * Webhook handlers map
 */
const webhookHandlers: Record<string, WebhookHandler> = {
  'payment_intent.succeeded': handlePaymentIntentSucceeded,
  'payment_intent.payment_failed': handlePaymentIntentFailed,
  'payment_intent.canceled': handlePaymentIntentCanceled,
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,
  'charge.refunded': handleChargeRefunded,
  'invoice.payment_succeeded': handleInvoicePaymentSucceeded,
  'invoice.payment_failed': handleInvoicePaymentFailed,
};

/**
 * Verify and construct Stripe webhook event
 * 
 * @param payload - Raw request body
 * @param signature - Stripe signature header
 * @returns Stripe Event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  try {
    const webhookSecret = getWebhookSecret();
    
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );

    logInfo('Webhook event verified', {
      type: event.type,
      id: event.id
    }, 'stripe-webhook');

    return event;
  } catch (error) {
    logError('Webhook verification failed', error, 'stripe-webhook');
    throw error;
  }
}

/**
 * Handle Stripe webhook event
 * 
 * @param event - Stripe Event
 */
export async function handleStripeWebhook(event: Stripe.Event): Promise<void> {
  try {
    logInfo('Processing webhook event', {
      type: event.type,
      id: event.id
    }, 'stripe-webhook');

    // Get handler for event type
    const handler = webhookHandlers[event.type];

    if (handler) {
      await handler(event);
      logInfo('Webhook event processed successfully', {
        type: event.type,
        id: event.id
      }, 'stripe-webhook');
    } else {
      logWarn('No handler for webhook event type', {
        type: event.type,
        id: event.id
      }, 'stripe-webhook');
    }

    // Log event to database
    await logWebhookEvent(event);
  } catch (error) {
    logError('Failed to process webhook event', error, 'stripe-webhook');
    throw error;
  }
}

/**
 * Handle payment_intent.succeeded event
 */
async function handlePaymentIntentSucceeded(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  logInfo('Payment succeeded', {
    id: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency
  }, 'stripe-webhook');

  // Update payment intent status in database
  await supabase
    .from('stripe_payment_intents')
    .update({
      status: 'succeeded',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  // Update related order/subscription status
  const metadata = paymentIntent.metadata;
  if (metadata?.orderId) {
    await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', metadata.orderId);
  }

  if (metadata?.subscriptionId) {
    await supabase
      .from('subscriptions')
      .update({
        payment_status: 'paid',
        status: 'active',
      })
      .eq('id', metadata.subscriptionId);
  }

  // TODO: Send confirmation email
  // TODO: Trigger fulfillment process
}

/**
 * Handle payment_intent.payment_failed event
 */
async function handlePaymentIntentFailed(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  logWarn('Payment failed', {
    id: paymentIntent.id,
    amount: paymentIntent.amount,
    lastError: paymentIntent.last_payment_error?.message
  }, 'stripe-webhook');

  // Update payment intent status in database
  await supabase
    .from('stripe_payment_intents')
    .update({
      status: 'failed',
      error_message: paymentIntent.last_payment_error?.message,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  // Update related order status
  const metadata = paymentIntent.metadata;
  if (metadata?.orderId) {
    await supabase
      .from('orders')
      .update({
        payment_status: 'failed',
      })
      .eq('id', metadata.orderId);
  }

  // TODO: Send payment failed email
  // TODO: Notify customer to retry payment
}

/**
 * Handle payment_intent.canceled event
 */
async function handlePaymentIntentCanceled(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  logInfo('Payment canceled', {
    id: paymentIntent.id,
    amount: paymentIntent.amount
  }, 'stripe-webhook');

  // Update payment intent status in database
  await supabase
    .from('stripe_payment_intents')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  // Update related order status
  const metadata = paymentIntent.metadata;
  if (metadata?.orderId) {
    await supabase
      .from('orders')
      .update({
        payment_status: 'canceled',
      })
      .eq('id', metadata.orderId);
  }
}

/**
 * Handle customer.subscription.created event
 */
async function handleSubscriptionCreated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;

  logInfo('Subscription created', {
    id: subscription.id,
    customerId: subscription.customer,
    status: subscription.status
  }, 'stripe-webhook');

  // Save subscription to database
  await supabase.from('stripe_subscriptions').upsert({
    stripe_subscription_id: subscription.id,
    customer_id: subscription.customer as string,
    status: subscription.status,
    current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
    current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
    metadata: subscription.metadata,
  });

  // TODO: Send subscription confirmation email
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;

  logInfo('Subscription updated', {
    id: subscription.id,
    status: subscription.status
  }, 'stripe-webhook');

  // Update subscription in database
  await supabase
    .from('stripe_subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
      current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
      cancel_at_period_end: (subscription as any).cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  // TODO: Handle status changes (active, past_due, canceled, etc)
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;

  logInfo('Subscription deleted', {
    id: subscription.id,
    customerId: subscription.customer
  }, 'stripe-webhook');

  // Update subscription in database
  await supabase
    .from('stripe_subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  // TODO: Send subscription cancellation email
  // TODO: Stop fulfillment
}

/**
 * Handle charge.refunded event
 */
async function handleChargeRefunded(event: Stripe.Event): Promise<void> {
  const charge = event.data.object as Stripe.Charge;

  logInfo('Charge refunded', {
    id: charge.id,
    amount: charge.amount_refunded,
    paymentIntent: charge.payment_intent
  }, 'stripe-webhook');

  // Save refund to database
  if (charge.refunds && charge.refunds.data.length > 0) {
    const refund = charge.refunds.data[0];
    
    await supabase.from('stripe_refunds').upsert({
      stripe_refund_id: refund.id,
      payment_intent_id: charge.payment_intent as string,
      amount: refund.amount,
      currency: refund.currency,
      status: refund.status,
      reason: refund.reason,
    });
  }

  // TODO: Send refund confirmation email
  // TODO: Update order status
}

/**
 * Handle invoice.payment_succeeded event
 */
async function handleInvoicePaymentSucceeded(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;

  logInfo('Invoice payment succeeded', {
    id: invoice.id,
    subscriptionId: (invoice as any).subscription,
    amount: invoice.amount_paid
  }, 'stripe-webhook');

  // TODO: Send invoice receipt email
  // TODO: Update subscription payment status
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;

  logWarn('Invoice payment failed', {
    id: invoice.id,
    subscriptionId: (invoice as any).subscription,
    amount: invoice.amount_due
  }, 'stripe-webhook');

  // TODO: Send payment failed email
  // TODO: Update subscription status
  // TODO: Retry payment or cancel subscription
}

/**
 * Log webhook event to database
 */
async function logWebhookEvent(event: Stripe.Event): Promise<void> {
  try {
    await supabase.from('stripe_webhook_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      event_data: event.data.object,
      processed_at: new Date().toISOString(),
    });
  } catch (error) {
    logWarn('Failed to log webhook event to database', error, 'stripe-webhook');
  }
}

