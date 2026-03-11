/**
 * Stripe Client Configuration
 * 
 * Professional Stripe integration with:
 * - Server-side Stripe instance
 * - Client-side Stripe.js
 * - Environment-based configuration
 * - Type safety
 * 
 * @example
 * ```typescript
 * import { stripe, stripePromise } from '@/lib/stripe/stripe-client';
 * 
 * // Server-side
 * const paymentIntent = await stripe.paymentIntents.create({...});
 * 
 * // Client-side
 * const stripeInstance = await stripePromise;
 * ```
 */

import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';
import { logInfo, logError } from '@/lib/logger';

/**
 * Stripe configuration
 */
interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  apiVersion: string;
  currency: string;
  country: string;
}

/**
 * Load Stripe configuration from environment variables
 */
function loadStripeConfig(): StripeConfig {
  const secretKey = (import.meta as any).env?.VITE_STRIPE_SECRET_KEY || '';
  const publishableKey = (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY || '';
  const webhookSecret = (import.meta as any).env?.VITE_STRIPE_WEBHOOK_SECRET || '';
  
  if (!secretKey || !publishableKey) {
    logError('Stripe keys not configured', {
      hasSecretKey: !!secretKey,
      hasPublishableKey: !!publishableKey
    }, 'stripe');
  }

  return {
    secretKey,
    publishableKey,
    webhookSecret,
    apiVersion: '2023-10-16', // Latest stable version
    currency: 'brl', // Brazilian Real
    country: 'BR', // Brazil
  };
}

// Load configuration
const config = loadStripeConfig();

/**
 * Server-side Stripe instance
 * 
 * Use this for server-side operations:
 * - Creating payment intents
 * - Creating customers
 * - Managing subscriptions
 * - Handling webhooks
 */
export const stripe = new Stripe(config.secretKey, {
  apiVersion: config.apiVersion as Stripe.LatestApiVersion,
  typescript: true,
  appInfo: {
    name: 'ORDAX',
    version: '1.0.0',
    url: 'https://ordax.com.br',
  },
});

/**
 * Client-side Stripe.js promise
 * 
 * Use this for client-side operations:
 * - Collecting payment details
 * - Confirming payments
 * - Handling 3D Secure
 */
export const stripePromise = loadStripe(config.publishableKey, {
  locale: 'pt-BR',
});

/**
 * Get Stripe configuration
 */
export function getStripeConfig(): Omit<StripeConfig, 'secretKey' | 'webhookSecret'> {
  return {
    publishableKey: config.publishableKey,
    apiVersion: config.apiVersion,
    currency: config.currency,
    country: config.country,
  };
}

/**
 * Check if Stripe is properly configured
 */
export function isStripeConfigured(): boolean {
  return !!(config.secretKey && config.publishableKey);
}

/**
 * Get webhook secret
 */
export function getWebhookSecret(): string {
  return config.webhookSecret;
}

// Log configuration status
if (isStripeConfigured()) {
  logInfo('Stripe configured successfully', {
    currency: config.currency,
    country: config.country,
    apiVersion: config.apiVersion
  }, 'stripe');
} else {
  logError('Stripe not configured - missing API keys', undefined, 'stripe');
}

