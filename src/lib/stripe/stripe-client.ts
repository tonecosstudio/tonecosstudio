/**
 * Stripe Client Configuration
 *
 * Professional Stripe integration with:
 * - Client-side Stripe.js
 * - Environment-based configuration
 * - Type safety
 *
 * @example
 * ```typescript
 * import { stripePromise } from '@/lib/stripe/stripe-client';
 *
 * const stripeInstance = await stripePromise;
 * ```
 */

import { loadStripe } from '@stripe/stripe-js';
import { logInfo, logError } from '@/lib/logger';

/**
 * Stripe configuration
 */
interface StripeConfig {
  publishableKey: string;
  apiVersion: string;
  currency: string;
  country: string;
}

/**
 * Load Stripe configuration from environment variables
 */
function loadStripeConfig(): StripeConfig {
  const publishableKey = (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY || '';

  if (!publishableKey) {
    logError('Stripe keys not configured', {
      hasPublishableKey: !!publishableKey
    }, 'stripe');
  }

  return {
    publishableKey,
    apiVersion: '2023-10-16', // Latest stable version
    currency: 'brl', // Brazilian Real
    country: 'BR', // Brazil
  };
}

// Load configuration
const config = loadStripeConfig();

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
export function getStripeConfig(): StripeConfig {
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
  return !!config.publishableKey;
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

