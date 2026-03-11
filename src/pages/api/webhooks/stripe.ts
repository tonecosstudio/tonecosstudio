/**
 * Stripe Webhook Handler
 * 
 * API route para processar webhooks do Stripe.
 * 
 * IMPORTANTE:
 * 1. Configure o webhook no Stripe Dashboard
 * 2. URL: https://seu-dominio.com/api/webhooks/stripe
 * 3. Adicione o webhook secret no .env
 * 
 * Eventos processados:
 * - payment_intent.succeeded
 * - payment_intent.payment_failed
 * - payment_intent.canceled
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - charge.refunded
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 */

import type { APIRoute } from 'astro';
import { constructWebhookEvent, handleStripeWebhook } from '@/lib/stripe/stripe-webhooks';
import { logInfo, logError } from '@/lib/logger';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Obter body raw
    const body = await request.text();
    
    // Obter signature do header
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      logError('Missing stripe-signature header', undefined, 'stripe-webhook');
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar e construir evento
    const event = constructWebhookEvent(body, signature);

    logInfo('Webhook received', {
      type: event.type,
      id: event.id
    }, 'stripe-webhook');

    // Processar evento
    await handleStripeWebhook(event);

    // Retornar sucesso
    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    logError('Webhook processing failed', error, 'stripe-webhook');

    // Retornar erro
    return new Response(
      JSON.stringify({ error: error.message || 'Webhook processing failed' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Desabilitar body parsing para obter raw body
export const config = {
  api: {
    bodyParser: false,
  },
};
