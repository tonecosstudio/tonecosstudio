/**
 * Stripe Payment Service
 * 
 * Professional payment service with:
 * - Payment Intent creation
 * - Customer management
 * - Subscription handling
 * - Refunds
 * - Error handling
 * - Logging
 * 
 * @example
 * ```typescript
 * import { stripeService } from '@/lib/stripe/stripe-service';
 * 
 * // Create payment
 * const paymentIntent = await stripeService.createPaymentIntent({
 *   amount: 10000, // R$ 100.00
 *   customerId: 'cus_xxx',
 *   metadata: { orderId: '123' }
 * });
 * ```
 */

import Stripe from 'stripe';
import { stripe } from './stripe-client';
import { logInfo, logError, logWarn } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

/**
 * Payment Intent creation options
 */
export interface CreatePaymentIntentOptions {
  /** Amount in cents (e.g., 10000 = R$ 100.00) */
  amount: number;
  /** Currency (default: BRL) */
  currency?: string;
  /** Customer ID (optional) */
  customerId?: string;
  /** Payment method types */
  paymentMethodTypes?: string[];
  /** Metadata */
  metadata?: Record<string, string>;
  /** Description */
  description?: string;
  /** Receipt email */
  receiptEmail?: string;
}

/**
 * Customer creation options
 */
export interface CreateCustomerOptions {
  /** Customer email */
  email: string;
  /** Customer name */
  name?: string;
  /** Customer phone */
  phone?: string;
  /** Metadata */
  metadata?: Record<string, string>;
}

/**
 * Subscription creation options
 */
export interface CreateSubscriptionOptions {
  /** Customer ID */
  customerId: string;
  /** Price ID */
  priceId: string;
  /** Metadata */
  metadata?: Record<string, string>;
  /** Trial period days */
  trialPeriodDays?: number;
}

/**
 * Stripe Service Error
 */
export class StripeServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
    public readonly originalError?: any
  ) {
    super(message);
    this.name = 'StripeServiceError';
  }
}

/**
 * Stripe Payment Service
 */
export class StripeService {
  /**
   * Create a Payment Intent
   * 
   * @param options - Payment intent options
   * @returns Payment Intent
   */
  async createPaymentIntent(options: CreatePaymentIntentOptions): Promise<Stripe.PaymentIntent> {
    try {
      logInfo('Creating payment intent', {
        amount: options.amount,
        currency: options.currency || 'brl',
        customerId: options.customerId
      }, 'stripe');

      const paymentIntent = await stripe.paymentIntents.create({
        amount: options.amount,
        currency: options.currency || 'brl',
        customer: options.customerId,
        payment_method_types: options.paymentMethodTypes || ['card'],
        metadata: options.metadata || {},
        description: options.description,
        receipt_email: options.receiptEmail,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      logInfo('Payment intent created', {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        status: paymentIntent.status
      }, 'stripe');

      // Save to database
      await this.savePaymentIntent(paymentIntent);

      return paymentIntent;
    } catch (error) {
      logError('Failed to create payment intent', error, 'stripe');
      throw this.handleStripeError(error);
    }
  }

  /**
   * Retrieve a Payment Intent
   * 
   * @param paymentIntentId - Payment Intent ID
   * @returns Payment Intent
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      logInfo('Payment intent retrieved', {
        id: paymentIntent.id,
        status: paymentIntent.status
      }, 'stripe');

      return paymentIntent;
    } catch (error) {
      logError('Failed to retrieve payment intent', error, 'stripe');
      throw this.handleStripeError(error);
    }
  }

  /**
   * Confirm a Payment Intent
   * 
   * @param paymentIntentId - Payment Intent ID
   * @param paymentMethodId - Payment Method ID
   * @returns Payment Intent
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId: string
  ): Promise<Stripe.PaymentIntent> {
    try {
      logInfo('Confirming payment intent', {
        paymentIntentId,
        paymentMethodId
      }, 'stripe');

      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });

      logInfo('Payment intent confirmed', {
        id: paymentIntent.id,
        status: paymentIntent.status
      }, 'stripe');

      // Update database
      await this.updatePaymentIntent(paymentIntent);

      return paymentIntent;
    } catch (error) {
      logError('Failed to confirm payment intent', error, 'stripe');
      throw this.handleStripeError(error);
    }
  }

  /**
   * Cancel a Payment Intent
   * 
   * @param paymentIntentId - Payment Intent ID
   * @returns Payment Intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      logInfo('Canceling payment intent', { paymentIntentId }, 'stripe');

      const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);

      logInfo('Payment intent canceled', {
        id: paymentIntent.id,
        status: paymentIntent.status
      }, 'stripe');

      // Update database
      await this.updatePaymentIntent(paymentIntent);

      return paymentIntent;
    } catch (error) {
      logError('Failed to cancel payment intent', error, 'stripe');
      throw this.handleStripeError(error);
    }
  }

  /**
   * Create a Customer
   * 
   * @param options - Customer options
   * @returns Customer
   */
  async createCustomer(options: CreateCustomerOptions): Promise<Stripe.Customer> {
    try {
      logInfo('Creating customer', { email: options.email }, 'stripe');

      const customer = await stripe.customers.create({
        email: options.email,
        name: options.name,
        phone: options.phone,
        metadata: options.metadata || {},
      });

      logInfo('Customer created', {
        id: customer.id,
        email: customer.email
      }, 'stripe');

      // Save to database
      await this.saveCustomer(customer);

      return customer;
    } catch (error) {
      logError('Failed to create customer', error, 'stripe');
      throw this.handleStripeError(error);
    }
  }

  /**
   * Get or Create Customer
   * 
   * @param email - Customer email
   * @param userId - User ID
   * @returns Customer
   */
  async getOrCreateCustomer(email: string, userId: string): Promise<Stripe.Customer> {
    try {
      // Check if customer exists in database
      const { data: existingCustomer } = await supabase
        .from('stripe_customers')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();

      if (existingCustomer?.stripe_customer_id) {
        // Retrieve from Stripe
        const customer = await stripe.customers.retrieve(existingCustomer.stripe_customer_id);
        
        if (!customer.deleted) {
          logInfo('Customer retrieved from cache', {
            id: customer.id,
            email: customer.email
          }, 'stripe');
          return customer as Stripe.Customer;
        }
      }

      // Create new customer
      return await this.createCustomer({
        email,
        metadata: { userId }
      });
    } catch (error) {
      logError('Failed to get or create customer', error, 'stripe');
      throw this.handleStripeError(error);
    }
  }

  /**
   * Create a Refund
   * 
   * @param paymentIntentId - Payment Intent ID
   * @param amount - Amount to refund (optional, full refund if not specified)
   * @param reason - Refund reason
   * @returns Refund
   */
  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
  ): Promise<Stripe.Refund> {
    try {
      logInfo('Creating refund', {
        paymentIntentId,
        amount,
        reason
      }, 'stripe');

      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount,
        reason,
      });

      logInfo('Refund created', {
        id: refund.id,
        amount: refund.amount,
        status: refund.status
      }, 'stripe');

      // Save to database
      await this.saveRefund(refund);

      return refund;
    } catch (error) {
      logError('Failed to create refund', error, 'stripe');
      throw this.handleStripeError(error);
    }
  }

  /**
   * Create a Subscription
   * 
   * @param options - Subscription options
   * @returns Subscription
   */
  async createSubscription(options: CreateSubscriptionOptions): Promise<Stripe.Subscription> {
    try {
      logInfo('Creating subscription', {
        customerId: options.customerId,
        priceId: options.priceId
      }, 'stripe');

      const subscription = await stripe.subscriptions.create({
        customer: options.customerId,
        items: [{ price: options.priceId }],
        metadata: options.metadata || {},
        trial_period_days: options.trialPeriodDays,
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
      });

      logInfo('Subscription created', {
        id: subscription.id,
        status: subscription.status
      }, 'stripe');

      // Save to database
      await this.saveSubscription(subscription);

      return subscription;
    } catch (error) {
      logError('Failed to create subscription', error, 'stripe');
      throw this.handleStripeError(error);
    }
  }

  /**
   * Cancel a Subscription
   * 
   * @param subscriptionId - Subscription ID
   * @param immediately - Cancel immediately or at period end
   * @returns Subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    immediately: boolean = false
  ): Promise<Stripe.Subscription> {
    try {
      logInfo('Canceling subscription', {
        subscriptionId,
        immediately
      }, 'stripe');

      const subscription = immediately
        ? await stripe.subscriptions.cancel(subscriptionId)
        : await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
          });

      logInfo('Subscription canceled', {
        id: subscription.id,
        status: subscription.status
      }, 'stripe');

      // Update database
      await this.updateSubscription(subscription);

      return subscription;
    } catch (error) {
      logError('Failed to cancel subscription', error, 'stripe');
      throw this.handleStripeError(error);
    }
  }

  /**
   * Save Payment Intent to database
   */
  private async savePaymentIntent(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      await supabase.from('stripe_payment_intents').insert({
        stripe_payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        customer_id: paymentIntent.customer as string || null,
        metadata: paymentIntent.metadata,
      });
    } catch (error) {
      logWarn('Failed to save payment intent to database', error, 'stripe');
    }
  }

  /**
   * Update Payment Intent in database
   */
  private async updatePaymentIntent(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      await supabase
        .from('stripe_payment_intents')
        .update({
          status: paymentIntent.status,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_payment_intent_id', paymentIntent.id);
    } catch (error) {
      logWarn('Failed to update payment intent in database', error, 'stripe');
    }
  }

  /**
   * Save Customer to database
   */
  private async saveCustomer(customer: Stripe.Customer): Promise<void> {
    try {
      const userId = customer.metadata?.userId;
      
      if (userId) {
        await supabase.from('stripe_customers').insert({
          user_id: userId,
          stripe_customer_id: customer.id,
          email: customer.email,
          metadata: customer.metadata,
        });
      }
    } catch (error) {
      logWarn('Failed to save customer to database', error, 'stripe');
    }
  }

  /**
   * Save Refund to database
   */
  private async saveRefund(refund: Stripe.Refund): Promise<void> {
    try {
      await supabase.from('stripe_refunds').insert({
        stripe_refund_id: refund.id,
        payment_intent_id: refund.payment_intent as string,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason,
      });
    } catch (error) {
      logWarn('Failed to save refund to database', error, 'stripe');
    }
  }

  /**
   * Save Subscription to database
   */
  private async saveSubscription(subscription: Stripe.Subscription): Promise<void> {
    try {
      await supabase.from('stripe_subscriptions').insert({
        stripe_subscription_id: subscription.id,
        customer_id: subscription.customer as string,
        status: subscription.status,
        metadata: subscription.metadata,
      });
    } catch (error) {
      logWarn('Failed to save subscription to database', error, 'stripe');
    }
  }

  /**
   * Update Subscription in database
   */
  private async updateSubscription(subscription: Stripe.Subscription): Promise<void> {
    try {
      await supabase
        .from('stripe_subscriptions')
        .update({
          status: subscription.status,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);
    } catch (error) {
      logWarn('Failed to update subscription in database', error, 'stripe');
    }
  }

  /**
   * Handle Stripe errors
   */
  private handleStripeError(error: any): StripeServiceError {
    if (error instanceof Stripe.errors.StripeError) {
      const statusCode = error.statusCode || 400;
      const code = error.code || 'stripe_error';
      const message = error.message || 'Stripe error occurred';

      return new StripeServiceError(message, code, statusCode, error);
    }

    return new StripeServiceError(
      'An unexpected error occurred',
      'unknown_error',
      500,
      error
    );
  }
}

// Export singleton instance
export const stripeService = new StripeService();

