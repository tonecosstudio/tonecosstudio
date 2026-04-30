/**
 * Server-only Stripe configuration.
 *
 * Do not import this module from React components or any browser bundle.
 * Stripe secret and webhook keys must be provided as server/Edge Function
 * environment variables without the VITE_ prefix.
 */

import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY || '';
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

if (!secretKey && typeof window === 'undefined') {
  console.error('STRIPE_SECRET_KEY is not configured');
}

export const stripe = new Stripe(secretKey, {
  apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
  typescript: true,
  appInfo: {
    name: 'ORDAX',
    version: '1.0.0',
    url: 'https://ordax.com.br',
  },
});

export function getWebhookSecret(): string {
  return webhookSecret;
}
