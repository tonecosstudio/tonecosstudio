/**
 * Payment Gateway Integration Service
 * 
 * Serviço responsável por integrar com gateway de pagamento (Stripe).
 * Fornece funções para:
 * - Processar pagamentos de assinaturas
 * - Processar reembolsos (cancelamento com extorno)
 * - Processar complementos de compra
 * - Lidar com webhooks de confirmação
 * 
 * Este serviço substitui os stubs de pagamento no subscription.service.ts
 * 
 * Requisitos:
 * - Task 11.1: Integração com gateway de pagamento
 * - Suporte a Stripe como gateway principal
 * - Processamento de pagamentos e reembolsos
 * - Webhook handler para confirmações
 */

/**
 * Resultado do processamento de pagamento
 */
export interface PaymentResult {
  success: boolean;
  transactionId: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
  error?: string;
}

/**
 * Dados para processar pagamento
 */
export interface ProcessPaymentData {
  amount: number;
  currency?: string;
  paymentMethodId: string;
  description?: string;
  metadata?: Record<string, string>;
}

/**
 * Dados para processar reembolso
 */
export interface ProcessRefundData {
  transactionId: string;
  amount: number;
  reason?: string;
  metadata?: Record<string, string>;
}

/**
 * Configuração do gateway de pagamento
 */
interface PaymentGatewayConfig {
  provider: 'stripe' | 'mercadopago' | 'stub';
  apiKey?: string;
  webhookSecret?: string;
}

/**
 * Obtém configuração do gateway de pagamento
 * 
 * Lê variáveis de ambiente para determinar qual gateway usar
 * e suas credenciais.
 * 
 * Variáveis de ambiente:
 * - PAYMENT_GATEWAY_PROVIDER: 'stripe' | 'mercadopago' | 'stub' (padrão: 'stub')
 * - STRIPE_SECRET_KEY: Chave secreta do Stripe
 * - STRIPE_WEBHOOK_SECRET: Secret para validar webhooks do Stripe
 * - MERCADOPAGO_ACCESS_TOKEN: Token de acesso do Mercado Pago
 * 
 * @returns Configuração do gateway
 */
function getPaymentGatewayConfig(): PaymentGatewayConfig {
  const provider = (process.env.PAYMENT_GATEWAY_PROVIDER || 'stub') as PaymentGatewayConfig['provider'];
  
  return {
    provider,
    apiKey: provider === 'stripe' 
      ? process.env.STRIPE_SECRET_KEY 
      : provider === 'mercadopago'
      ? process.env.MERCADOPAGO_ACCESS_TOKEN
      : undefined,
    webhookSecret: provider === 'stripe'
      ? process.env.STRIPE_WEBHOOK_SECRET
      : undefined
  };
}

/**
 * Processa pagamento via Stripe
 * 
 * Cria um Payment Intent no Stripe e confirma o pagamento.
 * 
 * @param data - Dados do pagamento
 * @returns Resultado do pagamento
 */
async function processPaymentStripe(data: ProcessPaymentData): Promise<PaymentResult> {
  const config = getPaymentGatewayConfig();
  
  if (!config.apiKey) {
    throw new Error('Stripe API key not configured. Set STRIPE_SECRET_KEY environment variable.');
  }

  try {
    // Importação dinâmica do Stripe para evitar erro se não estiver instalado
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(config.apiKey, {
      apiVersion: '2024-12-18.acacia'
    });

    // Converte valor para centavos (Stripe trabalha com centavos)
    const amountInCents = Math.round(data.amount * 100);

    // Cria Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: data.currency || 'brl',
      payment_method: data.paymentMethodId,
      confirm: true,
      description: data.description,
      metadata: data.metadata || {},
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      }
    });

    // Verifica status do pagamento
    if (paymentIntent.status === 'succeeded') {
      return {
        success: true,
        transactionId: paymentIntent.id,
        amount: data.amount,
        currency: paymentIntent.currency,
        paymentMethod: paymentIntent.payment_method as string
      };
    } else {
      return {
        success: false,
        transactionId: paymentIntent.id,
        amount: data.amount,
        error: `Payment status: ${paymentIntent.status}`
      };
    }
  } catch (error: any) {
    console.error('[Payment Service] Stripe payment error:', error);
    return {
      success: false,
      transactionId: '',
      amount: data.amount,
      error: error.message || 'Payment processing failed'
    };
  }
}

/**
 * Processa reembolso via Stripe
 * 
 * Cria um Refund no Stripe para o Payment Intent especificado.
 * 
 * @param data - Dados do reembolso
 * @returns Resultado do reembolso
 */
async function processRefundStripe(data: ProcessRefundData): Promise<PaymentResult> {
  const config = getPaymentGatewayConfig();
  
  if (!config.apiKey) {
    throw new Error('Stripe API key not configured. Set STRIPE_SECRET_KEY environment variable.');
  }

  try {
    // Importação dinâmica do Stripe
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(config.apiKey, {
      apiVersion: '2024-12-18.acacia'
    });

    // Converte valor para centavos
    const amountInCents = Math.round(data.amount * 100);

    // Cria Refund
    const refund = await stripe.refunds.create({
      payment_intent: data.transactionId,
      amount: amountInCents,
      reason: data.reason as any || 'requested_by_customer',
      metadata: data.metadata || {}
    });

    // Verifica status do reembolso
    if (refund.status === 'succeeded' || refund.status === 'pending') {
      return {
        success: true,
        transactionId: refund.id,
        amount: data.amount,
        currency: refund.currency
      };
    } else {
      return {
        success: false,
        transactionId: refund.id,
        amount: data.amount,
        error: `Refund status: ${refund.status}`
      };
    }
  } catch (error: any) {
    console.error('[Payment Service] Stripe refund error:', error);
    return {
      success: false,
      transactionId: '',
      amount: data.amount,
      error: error.message || 'Refund processing failed'
    };
  }
}

/**
 * Processa pagamento via stub (para desenvolvimento/testes)
 * 
 * Simula um pagamento bem-sucedido sem integração real.
 * 
 * @param data - Dados do pagamento
 * @returns Resultado do pagamento simulado
 */
async function processPaymentStub(data: ProcessPaymentData): Promise<PaymentResult> {
  console.log('[Payment Service] STUB: Processing payment', {
    amount: data.amount,
    paymentMethodId: data.paymentMethodId,
    description: data.description
  });

  // Simula delay de rede
  await new Promise(resolve => setTimeout(resolve, 100));

  return {
    success: true,
    transactionId: `stub_${Date.now()}_${data.paymentMethodId}`,
    amount: data.amount,
    currency: data.currency || 'brl',
    paymentMethod: data.paymentMethodId
  };
}

/**
 * Processa reembolso via stub (para desenvolvimento/testes)
 * 
 * Simula um reembolso bem-sucedido sem integração real.
 * 
 * @param data - Dados do reembolso
 * @returns Resultado do reembolso simulado
 */
async function processRefundStub(data: ProcessRefundData): Promise<PaymentResult> {
  console.log('[Payment Service] STUB: Processing refund', {
    transactionId: data.transactionId,
    amount: data.amount,
    reason: data.reason
  });

  // Simula delay de rede
  await new Promise(resolve => setTimeout(resolve, 100));

  return {
    success: true,
    transactionId: `refund_${Date.now()}_${data.transactionId}`,
    amount: data.amount,
    currency: 'brl'
  };
}

/**
 * Processa pagamento via gateway configurado
 * 
 * Esta é a função principal para processar pagamentos.
 * Detecta automaticamente qual gateway usar baseado na configuração.
 * 
 * @param amount - Valor do pagamento
 * @param paymentMethodId - ID do método de pagamento
 * @param options - Opções adicionais (descrição, metadata)
 * @returns Resultado do pagamento
 * 
 * @example
 * ```typescript
 * const result = await processPayment(99.90, 'pm_123456', {
 *   description: 'Assinatura Trimestral',
 *   metadata: { userId: '123', planType: 'trimestral' }
 * });
 * 
 * if (result.success) {
 *   console.log('Payment successful:', result.transactionId);
 * } else {
 *   console.error('Payment failed:', result.error);
 * }
 * ```
 */
export async function processPayment(
  amount: number,
  paymentMethodId: string,
  options?: {
    description?: string;
    metadata?: Record<string, string>;
    currency?: string;
  }
): Promise<PaymentResult> {
  const config = getPaymentGatewayConfig();

  const paymentData: ProcessPaymentData = {
    amount,
    paymentMethodId,
    currency: options?.currency || 'brl',
    description: options?.description,
    metadata: options?.metadata
  };

  switch (config.provider) {
    case 'stripe':
      return await processPaymentStripe(paymentData);
    
    case 'mercadopago':
      // TODO: Implementar integração com Mercado Pago
      throw new Error('Mercado Pago integration not yet implemented. Use PAYMENT_GATEWAY_PROVIDER=stripe or stub.');
    
    case 'stub':
    default:
      return await processPaymentStub(paymentData);
  }
}

/**
 * Processa reembolso via gateway configurado
 * 
 * Esta é a função principal para processar reembolsos.
 * Detecta automaticamente qual gateway usar baseado na configuração.
 * 
 * @param transactionId - ID da transação original a reembolsar
 * @param amount - Valor do reembolso
 * @param options - Opções adicionais (motivo, metadata)
 * @returns Resultado do reembolso
 * 
 * @example
 * ```typescript
 * const result = await processRefund('pi_123456', 49.95, {
 *   reason: 'Cancelamento com extorno',
 *   metadata: { userId: '123', subscriptionId: '456' }
 * });
 * 
 * if (result.success) {
 *   console.log('Refund successful:', result.transactionId);
 * } else {
 *   console.error('Refund failed:', result.error);
 * }
 * ```
 */
export async function processRefund(
  transactionId: string,
  amount: number,
  options?: {
    reason?: string;
    metadata?: Record<string, string>;
  }
): Promise<PaymentResult> {
  const config = getPaymentGatewayConfig();

  const refundData: ProcessRefundData = {
    transactionId,
    amount,
    reason: options?.reason,
    metadata: options?.metadata
  };

  switch (config.provider) {
    case 'stripe':
      return await processRefundStripe(refundData);
    
    case 'mercadopago':
      // TODO: Implementar integração com Mercado Pago
      throw new Error('Mercado Pago integration not yet implemented. Use PAYMENT_GATEWAY_PROVIDER=stripe or stub.');
    
    case 'stub':
    default:
      return await processRefundStub(refundData);
  }
}

/**
 * Tipo de evento de webhook
 */
export type WebhookEventType = 
  | 'payment.succeeded'
  | 'payment.failed'
  | 'refund.succeeded'
  | 'refund.failed'
  | 'unknown';

/**
 * Dados do evento de webhook
 */
export interface WebhookEvent {
  type: WebhookEventType;
  transactionId: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, any>;
  rawEvent?: any;
}

/**
 * Resultado do processamento de webhook
 */
export interface WebhookProcessResult {
  success: boolean;
  eventType: WebhookEventType;
  transactionId: string;
  message?: string;
  error?: string;
}

/**
 * Processa webhook do Stripe
 * 
 * Valida a assinatura do webhook e extrai os dados do evento.
 * 
 * @param rawBody - Corpo bruto da requisição (string ou Buffer)
 * @param signature - Assinatura do webhook (header stripe-signature)
 * @returns Evento processado
 */
async function processWebhookStripe(
  rawBody: string | Buffer,
  signature: string
): Promise<WebhookEvent> {
  const config = getPaymentGatewayConfig();
  
  if (!config.apiKey) {
    throw new Error('Stripe API key not configured');
  }

  if (!config.webhookSecret) {
    throw new Error('Stripe webhook secret not configured. Set STRIPE_WEBHOOK_SECRET environment variable.');
  }

  try {
    // Importação dinâmica do Stripe
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(config.apiKey, {
      apiVersion: '2024-12-18.acacia'
    });

    // Valida e constrói o evento
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.webhookSecret
    );

    // Mapeia tipo de evento do Stripe para nosso tipo
    let eventType: WebhookEventType = 'unknown';
    let transactionId = '';
    let amount: number | undefined;
    let currency: string | undefined;
    let metadata: Record<string, any> | undefined;

    switch (event.type) {
      case 'payment_intent.succeeded':
        eventType = 'payment.succeeded';
        const paymentIntent = event.data.object as any;
        transactionId = paymentIntent.id;
        amount = paymentIntent.amount / 100; // Converte de centavos
        currency = paymentIntent.currency;
        metadata = paymentIntent.metadata;
        break;

      case 'payment_intent.payment_failed':
        eventType = 'payment.failed';
        const failedPayment = event.data.object as any;
        transactionId = failedPayment.id;
        amount = failedPayment.amount / 100;
        currency = failedPayment.currency;
        metadata = failedPayment.metadata;
        break;

      case 'charge.refunded':
        eventType = 'refund.succeeded';
        const charge = event.data.object as any;
        transactionId = charge.payment_intent || charge.id;
        amount = charge.amount_refunded / 100;
        currency = charge.currency;
        metadata = charge.metadata;
        break;

      case 'charge.refund.updated':
        const refund = event.data.object as any;
        if (refund.status === 'failed') {
          eventType = 'refund.failed';
          transactionId = refund.payment_intent || refund.id;
          amount = refund.amount / 100;
          currency = refund.currency;
          metadata = refund.metadata;
        }
        break;

      default:
        console.log('[Payment Service] Unhandled Stripe webhook event:', event.type);
    }

    return {
      type: eventType,
      transactionId,
      amount,
      currency,
      metadata,
      rawEvent: event
    };
  } catch (error: any) {
    console.error('[Payment Service] Stripe webhook error:', error);
    throw new Error(`Webhook validation failed: ${error.message}`);
  }
}

/**
 * Handler básico de webhook para confirmações de pagamento
 * 
 * Esta função processa webhooks do gateway de pagamento e retorna
 * informações sobre o evento. A aplicação deve usar essas informações
 * para atualizar o status de assinaturas, pedidos, etc.
 * 
 * @param rawBody - Corpo bruto da requisição HTTP
 * @param signature - Assinatura do webhook (varia por gateway)
 * @returns Resultado do processamento do webhook
 * 
 * @example
 * ```typescript
 * // Em uma rota Express:
 * app.post('/webhooks/payment', express.raw({ type: 'application/json' }), async (req, res) => {
 *   const signature = req.headers['stripe-signature'] as string;
 *   
 *   try {
 *     const result = await handlePaymentWebhook(req.body, signature);
 *     
 *     if (result.success) {
 *       // Atualizar status de assinatura/pedido baseado no evento
 *       console.log('Webhook processed:', result.eventType, result.transactionId);
 *     }
 *     
 *     res.json({ received: true });
 *   } catch (error) {
 *     console.error('Webhook error:', error);
 *     res.status(400).send('Webhook validation failed');
 *   }
 * });
 * ```
 */
export async function handlePaymentWebhook(
  rawBody: string | Buffer,
  signature: string
): Promise<WebhookProcessResult> {
  const config = getPaymentGatewayConfig();

  try {
    let event: WebhookEvent;

    switch (config.provider) {
      case 'stripe':
        event = await processWebhookStripe(rawBody, signature);
        break;
      
      case 'mercadopago':
        // TODO: Implementar processamento de webhook do Mercado Pago
        throw new Error('Mercado Pago webhook processing not yet implemented');
      
      case 'stub':
      default:
        // Para stub, apenas loga e retorna sucesso
        console.log('[Payment Service] STUB: Webhook received');
        event = {
          type: 'payment.succeeded',
          transactionId: 'stub_webhook_' + Date.now(),
          amount: 0
        };
    }

    // Log do evento processado
    console.log('[Payment Service] Webhook event processed:', {
      type: event.type,
      transactionId: event.transactionId,
      amount: event.amount,
      metadata: event.metadata
    });

    return {
      success: true,
      eventType: event.type,
      transactionId: event.transactionId,
      message: `Webhook processed successfully: ${event.type}`
    };
  } catch (error: any) {
    console.error('[Payment Service] Webhook processing error:', error);
    return {
      success: false,
      eventType: 'unknown',
      transactionId: '',
      error: error.message || 'Webhook processing failed'
    };
  }
}
