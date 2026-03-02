/**
 * Webhook Routes
 * 
 * Rotas para receber webhooks de gateways de pagamento.
 * 
 * Endpoints:
 * - POST /webhooks/payment - Recebe webhooks de confirmação de pagamento
 * 
 * Requisitos:
 * - Task 11.1: Webhook handler básico para confirmações
 */

import { Router, Request, Response } from 'express';
import { handlePaymentWebhook } from '../services/payment.service';

const router = Router();

/**
 * POST /webhooks/payment
 * 
 * Recebe e processa webhooks de gateways de pagamento.
 * 
 * Este endpoint deve receber o corpo bruto da requisição (raw body)
 * para validar a assinatura do webhook.
 * 
 * Headers esperados:
 * - stripe-signature: Assinatura do webhook do Stripe
 * - x-signature: Assinatura do webhook do Mercado Pago (futuro)
 * 
 * Resposta:
 * - 200: Webhook processado com sucesso
 * - 400: Erro na validação ou processamento do webhook
 * 
 * @example
 * ```bash
 * # Teste com curl (modo stub)
 * curl -X POST http://localhost:3000/api/webhooks/payment \
 *   -H "Content-Type: application/json" \
 *   -H "stripe-signature: stub_sig" \
 *   -d '{"type":"payment_intent.succeeded","data":{"object":{"id":"pi_123"}}}'
 * ```
 */
router.post('/payment', async (req: Request, res: Response) => {
  try {
    // Obtém assinatura do header (varia por gateway)
    const stripeSignature = req.headers['stripe-signature'] as string;
    const mercadoPagoSignature = req.headers['x-signature'] as string;
    
    const signature = stripeSignature || mercadoPagoSignature || '';

    if (!signature) {
      return res.status(400).json({
        error: 'Missing webhook signature header'
      });
    }

    // Processa webhook
    // Nota: req.body deve ser o corpo bruto (Buffer ou string)
    // Configure express.raw() para esta rota
    const result = await handlePaymentWebhook(req.body, signature);

    if (!result.success) {
      console.error('[Webhook] Processing failed:', result.error);
      return res.status(400).json({
        error: result.error || 'Webhook processing failed'
      });
    }

    // Log do evento processado
    console.log('[Webhook] Event processed:', {
      type: result.eventType,
      transactionId: result.transactionId
    });

    // Aqui você pode adicionar lógica adicional baseada no tipo de evento:
    // - payment.succeeded: Confirmar ativação de assinatura
    // - payment.failed: Notificar usuário sobre falha
    // - refund.succeeded: Confirmar cancelamento com extorno
    // - refund.failed: Alertar sobre falha no reembolso

    // TODO: Implementar ações específicas por tipo de evento
    // Exemplos:
    // if (result.eventType === 'payment.succeeded') {
    //   // Atualizar status de assinatura para confirmada
    //   // Enviar email de confirmação
    // }
    // if (result.eventType === 'refund.succeeded') {
    //   // Confirmar cancelamento
    //   // Enviar email de confirmação de reembolso
    // }

    return res.json({
      received: true,
      eventType: result.eventType,
      transactionId: result.transactionId,
      message: result.message
    });
  } catch (error: any) {
    console.error('[Webhook] Error:', error);
    return res.status(400).json({
      error: error.message || 'Webhook processing error'
    });
  }
});

/**
 * GET /webhooks/health
 * 
 * Health check para verificar se o endpoint de webhooks está funcionando.
 * 
 * Resposta:
 * - 200: Endpoint funcionando
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Webhook endpoint is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;
