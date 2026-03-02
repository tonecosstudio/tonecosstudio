/**
 * Payment Integration Examples
 * 
 * Este arquivo contém exemplos de como integrar o payment service
 * com os fluxos de assinatura existentes.
 * 
 * NOTA: Este é um arquivo de exemplo/documentação, não para execução direta.
 */

import { processPayment, processRefund } from '../src/services/payment.service';
import { activateSubscription, cancelWithRefund } from '../src/services/subscription.service';

/**
 * Exemplo 1: Ativar assinatura com pagamento real
 * 
 * Este exemplo mostra como substituir o stub de pagamento no
 * subscription.service.ts por uma chamada real ao payment service.
 */
async function exampleActivateSubscriptionWithPayment() {
  const userId = 1;
  const planType = 'trimestral';
  const paymentMethodId = 'pm_card_visa'; // ID do método de pagamento do Stripe

  try {
    // 1. Processar pagamento primeiro
    const paymentResult = await processPayment(99.90, paymentMethodId, {
      description: `Ativação Plano ${planType}`,
      metadata: {
        userId: userId.toString(),
        planType: planType,
        action: 'activation'
      }
    });

    if (!paymentResult.success) {
      throw new Error(`Payment failed: ${paymentResult.error}`);
    }

    console.log('Payment successful:', paymentResult.transactionId);

    // 2. Ativar assinatura
    // NOTA: O subscription.service.ts já chama processPayment internamente
    // Este exemplo mostra como seria se fizéssemos manualmente
    const result = await activateSubscription(userId, planType, paymentMethodId);

    console.log('Subscription activated:', {
      subscriptionId: result.subscriptionId,
      creditsAllocated: result.creditsAllocated,
      automaticOrderId: result.automaticOrderId
    });

    return result;
  } catch (error) {
    console.error('Error activating subscription:', error);
    throw error;
  }
}

/**
 * Exemplo 2: Cancelar assinatura com reembolso
 * 
 * Este exemplo mostra como o cancelamento com extorno processa
 * o reembolso através do payment service.
 */
async function exampleCancelSubscriptionWithRefund() {
  const subscriptionId = 10;

  try {
    // O cancelWithRefund já processa o reembolso internamente
    const result = await cancelWithRefund(subscriptionId);

    console.log('Subscription cancelled with refund:', {
      subscriptionId: result.subscriptionId,
      refundAmount: result.refundAmount,
      creditsExpired: result.creditsExpired
    });

    return result;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
}

/**
 * Exemplo 3: Processar complemento de compra
 * 
 * Este exemplo mostra como processar um pagamento de complemento
 * quando o usuário não tem créditos suficientes.
 */
async function exampleProcessComplementPayment() {
  const userId = 1;
  const characterId = 5;
  const availableCredits = 150;
  const characterPriceCredits = 200;
  const characterPriceCash = 50.00;

  try {
    // 1. Calcular valor do complemento
    const creditsDifference = characterPriceCredits - availableCredits;
    const complementAmount = (creditsDifference / characterPriceCredits) * characterPriceCash;

    console.log('Complement calculation:', {
      availableCredits,
      characterPriceCredits,
      creditsDifference,
      complementAmount: complementAmount.toFixed(2)
    });

    // 2. Processar pagamento do complemento
    const paymentResult = await processPayment(complementAmount, 'pm_card_visa', {
      description: `Complemento de compra - Personagem ${characterId}`,
      metadata: {
        userId: userId.toString(),
        characterId: characterId.toString(),
        creditsUsed: availableCredits.toString(),
        action: 'complement'
      }
    });

    if (!paymentResult.success) {
      throw new Error(`Complement payment failed: ${paymentResult.error}`);
    }

    console.log('Complement payment successful:', paymentResult.transactionId);

    // 3. Criar pedido e usar todos os créditos disponíveis
    // (implementação no order.service.ts)

    return {
      paymentTransactionId: paymentResult.transactionId,
      complementAmount,
      creditsUsed: availableCredits
    };
  } catch (error) {
    console.error('Error processing complement payment:', error);
    throw error;
  }
}

/**
 * Exemplo 4: Processar reembolso manual (admin)
 * 
 * Este exemplo mostra como um administrador pode processar
 * um reembolso manual.
 */
async function exampleProcessManualRefund() {
  const originalTransactionId = 'pi_1234567890';
  const refundAmount = 99.90;
  const userId = 1;
  const subscriptionId = 10;

  try {
    const refundResult = await processRefund(originalTransactionId, refundAmount, {
      reason: 'Reembolso manual solicitado pelo administrador',
      metadata: {
        userId: userId.toString(),
        subscriptionId: subscriptionId.toString(),
        processedBy: 'admin',
        reason: 'customer_service_gesture'
      }
    });

    if (!refundResult.success) {
      throw new Error(`Refund failed: ${refundResult.error}`);
    }

    console.log('Manual refund processed:', {
      refundTransactionId: refundResult.transactionId,
      amount: refundResult.amount
    });

    return refundResult;
  } catch (error) {
    console.error('Error processing manual refund:', error);
    throw error;
  }
}

/**
 * Exemplo 5: Webhook handler em rota Express
 * 
 * Este exemplo mostra como configurar uma rota Express para
 * receber webhooks do gateway de pagamento.
 */
function exampleWebhookRoute() {
  // Código de exemplo - não executável diretamente
  const exampleCode = `
import express from 'express';
import { handlePaymentWebhook } from './services/payment.service';

const app = express();

// IMPORTANTE: Use express.raw() para webhooks
// O corpo deve ser mantido como Buffer para validação de assinatura
app.post('/api/webhooks/payment',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      // Obter assinatura do header
      const signature = req.headers['stripe-signature'] as string;
      
      if (!signature) {
        return res.status(400).json({ error: 'Missing signature' });
      }

      // Processar webhook
      const result = await handlePaymentWebhook(req.body, signature);

      if (!result.success) {
        console.error('Webhook processing failed:', result.error);
        return res.status(400).json({ error: result.error });
      }

      // Processar evento baseado no tipo
      switch (result.eventType) {
        case 'payment.succeeded':
          console.log('Payment succeeded:', result.transactionId);
          // TODO: Confirmar ativação de assinatura
          // TODO: Enviar email de confirmação
          break;

        case 'payment.failed':
          console.log('Payment failed:', result.transactionId);
          // TODO: Notificar usuário
          // TODO: Cancelar pedido pendente
          break;

        case 'refund.succeeded':
          console.log('Refund succeeded:', result.transactionId);
          // TODO: Confirmar cancelamento
          // TODO: Enviar email de confirmação
          break;

        case 'refund.failed':
          console.log('Refund failed:', result.transactionId);
          // TODO: Alertar administrador
          break;
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);
  `;

  console.log('Example webhook route code:');
  console.log(exampleCode);
}

/**
 * Exemplo 6: Configuração de ambiente
 * 
 * Este exemplo mostra as diferentes configurações de ambiente
 * para desenvolvimento, teste e produção.
 */
function exampleEnvironmentConfiguration() {
  const examples = {
    development: `
# Desenvolvimento - Modo Stub
PAYMENT_GATEWAY_PROVIDER=stub
# Não precisa de chaves de API
    `,
    
    testing: `
# Testes - Modo Stripe Test
PAYMENT_GATEWAY_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_51234567890abcdef
STRIPE_WEBHOOK_SECRET=whsec_test_1234567890abcdef
    `,
    
    production: `
# Produção - Modo Stripe Live
PAYMENT_GATEWAY_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_live_51234567890abcdef
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef
    `
  };

  console.log('Environment configurations:');
  console.log('Development:', examples.development);
  console.log('Testing:', examples.testing);
  console.log('Production:', examples.production);
}

/**
 * Exemplo 7: Tratamento de erros
 * 
 * Este exemplo mostra como tratar diferentes tipos de erros
 * de pagamento.
 */
async function exampleErrorHandling() {
  const userId = 1;
  const planType = 'trimestral';
  const paymentMethodId = 'pm_card_declined'; // Cartão que será recusado

  try {
    const paymentResult = await processPayment(99.90, paymentMethodId, {
      description: 'Test payment',
      metadata: { userId: userId.toString() }
    });

    if (!paymentResult.success) {
      // Pagamento recusado pelo gateway
      console.error('Payment declined:', paymentResult.error);
      
      // Diferentes tipos de erro podem ser tratados de forma diferente
      if (paymentResult.error?.includes('insufficient_funds')) {
        // Notificar usuário sobre saldo insuficiente
        console.log('User notification: Insufficient funds');
      } else if (paymentResult.error?.includes('card_declined')) {
        // Sugerir outro método de pagamento
        console.log('User notification: Card declined, try another card');
      } else {
        // Erro genérico
        console.log('User notification: Payment failed, please try again');
      }

      return null;
    }

    console.log('Payment successful:', paymentResult.transactionId);
    return paymentResult;
  } catch (error: any) {
    // Erro de comunicação ou configuração
    console.error('Payment service error:', error.message);
    
    if (error.message.includes('API key not configured')) {
      // Erro de configuração
      console.error('Configuration error: Check STRIPE_SECRET_KEY');
    } else if (error.message.includes('network')) {
      // Erro de rede
      console.error('Network error: Check connectivity to Stripe');
    } else {
      // Erro desconhecido
      console.error('Unknown error:', error);
    }

    throw error;
  }
}

// Exportar exemplos para referência
export {
  exampleActivateSubscriptionWithPayment,
  exampleCancelSubscriptionWithRefund,
  exampleProcessComplementPayment,
  exampleProcessManualRefund,
  exampleWebhookRoute,
  exampleEnvironmentConfiguration,
  exampleErrorHandling
};
