/**
 * Payment Service Unit Tests
 * 
 * Testes para o serviço de integração com gateway de pagamento.
 * 
 * Testa:
 * - Processamento de pagamentos (stub mode)
 * - Processamento de reembolsos (stub mode)
 * - Configuração de gateway
 * - Validação de parâmetros
 */

import { processPayment, processRefund, handlePaymentWebhook } from './payment.service';

describe('Payment Service', () => {
  // Salva variáveis de ambiente originais
  const originalEnv = process.env;

  beforeEach(() => {
    // Reseta variáveis de ambiente antes de cada teste
    jest.resetModules();
    process.env = { ...originalEnv };
    // Força modo stub para testes
    process.env.PAYMENT_GATEWAY_PROVIDER = 'stub';
  });

  afterAll(() => {
    // Restaura variáveis de ambiente originais
    process.env = originalEnv;
  });

  describe('processPayment', () => {
    it('should process payment successfully in stub mode', async () => {
      const result = await processPayment(99.90, 'pm_test_123', {
        description: 'Test payment',
        metadata: { userId: '1', planType: 'trimestral' }
      });

      expect(result.success).toBe(true);
      expect(result.amount).toBe(99.90);
      expect(result.transactionId).toContain('stub_');
      expect(result.transactionId).toContain('pm_test_123');
      expect(result.currency).toBe('brl');
      expect(result.paymentMethod).toBe('pm_test_123');
    });

    it('should use default currency BRL when not specified', async () => {
      const result = await processPayment(50.00, 'pm_test_456');

      expect(result.success).toBe(true);
      expect(result.currency).toBe('brl');
    });

    it('should accept custom currency', async () => {
      const result = await processPayment(100.00, 'pm_test_789', {
        currency: 'usd'
      });

      expect(result.success).toBe(true);
      expect(result.currency).toBe('usd');
    });

    it('should include metadata in payment', async () => {
      const metadata = {
        userId: '123',
        planType: 'semestral',
        subscriptionId: '456'
      };

      const result = await processPayment(189.90, 'pm_test_meta', {
        description: 'Subscription payment',
        metadata
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeTruthy();
    });

    it('should handle zero amount', async () => {
      const result = await processPayment(0, 'pm_test_zero');

      expect(result.success).toBe(true);
      expect(result.amount).toBe(0);
    });

    it('should handle large amounts', async () => {
      const result = await processPayment(9999.99, 'pm_test_large');

      expect(result.success).toBe(true);
      expect(result.amount).toBe(9999.99);
    });
  });

  describe('processRefund', () => {
    it('should process refund successfully in stub mode', async () => {
      const result = await processRefund('pi_original_123', 49.95, {
        reason: 'Cancelamento com extorno',
        metadata: { userId: '1', subscriptionId: '10' }
      });

      expect(result.success).toBe(true);
      expect(result.amount).toBe(49.95);
      expect(result.transactionId).toContain('refund_');
      expect(result.transactionId).toContain('pi_original_123');
      expect(result.currency).toBe('brl');
    });

    it('should handle partial refund', async () => {
      const result = await processRefund('pi_original_456', 25.00, {
        reason: 'Partial refund'
      });

      expect(result.success).toBe(true);
      expect(result.amount).toBe(25.00);
    });

    it('should handle full refund', async () => {
      const result = await processRefund('pi_original_789', 189.90, {
        reason: 'Full refund'
      });

      expect(result.success).toBe(true);
      expect(result.amount).toBe(189.90);
    });

    it('should include metadata in refund', async () => {
      const metadata = {
        userId: '123',
        subscriptionId: '456',
        reason: 'customer_request'
      };

      const result = await processRefund('pi_original_meta', 99.90, {
        reason: 'Customer requested',
        metadata
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeTruthy();
    });

    it('should handle zero refund amount', async () => {
      const result = await processRefund('pi_original_zero', 0);

      expect(result.success).toBe(true);
      expect(result.amount).toBe(0);
    });
  });

  describe('handlePaymentWebhook', () => {
    it('should process webhook successfully in stub mode', async () => {
      const rawBody = JSON.stringify({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123', amount: 9990 } }
      });

      const result = await handlePaymentWebhook(rawBody, 'stub_signature');

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('payment.succeeded');
      expect(result.transactionId).toContain('stub_webhook_');
      expect(result.message).toContain('Webhook processed successfully');
    });

    it('should handle webhook with Buffer body', async () => {
      const rawBody = Buffer.from(JSON.stringify({
        type: 'payment_intent.succeeded'
      }));

      const result = await handlePaymentWebhook(rawBody, 'stub_signature');

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('payment.succeeded');
    });

    it('should return transaction ID from webhook', async () => {
      const rawBody = JSON.stringify({
        type: 'charge.refunded'
      });

      const result = await handlePaymentWebhook(rawBody, 'stub_signature');

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeTruthy();
    });
  });

  describe('Gateway Configuration', () => {
    it('should use stub provider by default', async () => {
      delete process.env.PAYMENT_GATEWAY_PROVIDER;

      const result = await processPayment(50.00, 'pm_default');

      expect(result.success).toBe(true);
      expect(result.transactionId).toContain('stub_');
    });

    it('should use stub provider when explicitly set', async () => {
      process.env.PAYMENT_GATEWAY_PROVIDER = 'stub';

      const result = await processPayment(50.00, 'pm_stub');

      expect(result.success).toBe(true);
      expect(result.transactionId).toContain('stub_');
    });

    it('should throw error for mercadopago without implementation', async () => {
      process.env.PAYMENT_GATEWAY_PROVIDER = 'mercadopago';

      await expect(
        processPayment(50.00, 'pm_mercadopago')
      ).rejects.toThrow('Mercado Pago integration not yet implemented');
    });
  });

  describe('Payment Scenarios', () => {
    it('should process subscription activation payment', async () => {
      const result = await processPayment(99.90, 'pm_subscription', {
        description: 'Ativação Plano Trimestral',
        metadata: {
          userId: '1',
          planType: 'trimestral',
          action: 'activation'
        }
      });

      expect(result.success).toBe(true);
      expect(result.amount).toBe(99.90);
    });

    it('should process subscription renewal payment', async () => {
      const result = await processPayment(189.90, 'pm_renewal', {
        description: 'Renovação Plano Semestral',
        metadata: {
          userId: '2',
          planType: 'semestral',
          action: 'renewal',
          subscriptionId: '20'
        }
      });

      expect(result.success).toBe(true);
      expect(result.amount).toBe(189.90);
    });

    it('should process complement payment', async () => {
      const result = await processPayment(15.50, 'pm_complement', {
        description: 'Complemento de compra',
        metadata: {
          userId: '3',
          characterId: '5',
          creditsUsed: '150',
          action: 'complement'
        }
      });

      expect(result.success).toBe(true);
      expect(result.amount).toBe(15.50);
    });

    it('should process proportional refund', async () => {
      const result = await processRefund('pi_subscription_123', 66.60, {
        reason: 'Cancelamento com extorno proporcional',
        metadata: {
          userId: '1',
          subscriptionId: '10',
          daysRemaining: '60',
          totalDays: '90'
        }
      });

      expect(result.success).toBe(true);
      expect(result.amount).toBe(66.60);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small amounts', async () => {
      const result = await processPayment(0.01, 'pm_small');

      expect(result.success).toBe(true);
      expect(result.amount).toBe(0.01);
    });

    it('should handle amounts with many decimal places', async () => {
      const result = await processPayment(99.999, 'pm_decimal');

      expect(result.success).toBe(true);
      expect(result.amount).toBe(99.999);
    });

    it('should handle empty metadata', async () => {
      const result = await processPayment(50.00, 'pm_no_meta', {
        metadata: {}
      });

      expect(result.success).toBe(true);
    });

    it('should handle missing optional parameters', async () => {
      const result = await processPayment(50.00, 'pm_minimal');

      expect(result.success).toBe(true);
      expect(result.amount).toBe(50.00);
    });
  });
});
