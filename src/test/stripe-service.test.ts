/**
 * Stripe Service Tests
 * 
 * Testes automatizados para o serviço de pagamentos Stripe
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { stripeService, StripeServiceError } from '@/lib/stripe/stripe-service';
import Stripe from 'stripe';

// Mock do Stripe
vi.mock('@/lib/stripe/stripe-client', () => ({
  stripe: {
    paymentIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
      confirm: vi.fn(),
      cancel: vi.fn(),
    },
    customers: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
    refunds: {
      create: vi.fn(),
    },
    subscriptions: {
      create: vi.fn(),
      cancel: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  },
}));

// Mock do Logger
vi.mock('@/lib/logger', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

describe('StripeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPaymentIntent', () => {
    it('deve criar um payment intent com sucesso', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        amount: 10000,
        currency: 'brl',
        status: 'requires_payment_method',
        client_secret: 'pi_test_123_secret',
      };

      const { stripe } = await import('@/lib/stripe/stripe-client');
      (stripe.paymentIntents.create as any).mockResolvedValue(mockPaymentIntent);

      const result = await stripeService.createPaymentIntent({
        amount: 10000,
        currency: 'brl',
      });

      expect(result).toEqual(mockPaymentIntent);
      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 10000,
          currency: 'brl',
        })
      );
    });

    it('deve incluir customer_id quando fornecido', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        amount: 10000,
        currency: 'brl',
        status: 'requires_payment_method',
        customer: 'cus_test_123',
      };

      const { stripe } = await import('@/lib/stripe/stripe-client');
      (stripe.paymentIntents.create as any).mockResolvedValue(mockPaymentIntent);

      await stripeService.createPaymentIntent({
        amount: 10000,
        customerId: 'cus_test_123',
      });

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_test_123',
        })
      );
    });

    it('deve incluir metadata quando fornecido', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        amount: 10000,
        currency: 'brl',
        status: 'requires_payment_method',
        metadata: { orderId: '123' },
      };

      const { stripe } = await import('@/lib/stripe/stripe-client');
      (stripe.paymentIntents.create as any).mockResolvedValue(mockPaymentIntent);

      await stripeService.createPaymentIntent({
        amount: 10000,
        metadata: { orderId: '123' },
      });

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { orderId: '123' },
        })
      );
    });

    it('deve lançar StripeServiceError em caso de erro', async () => {
      const { stripe } = await import('@/lib/stripe/stripe-client');
      const stripeError = new Stripe.errors.StripeCardError({
        type: 'card_error',
        code: 'card_declined',
        message: 'Your card was declined',
      });
      (stripe.paymentIntents.create as any).mockRejectedValue(stripeError);

      await expect(
        stripeService.createPaymentIntent({ amount: 10000 })
      ).rejects.toThrow(StripeServiceError);
    });
  });

  describe('getPaymentIntent', () => {
    it('deve recuperar um payment intent', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        amount: 10000,
        currency: 'brl',
        status: 'succeeded',
      };

      const { stripe } = await import('@/lib/stripe/stripe-client');
      (stripe.paymentIntents.retrieve as any).mockResolvedValue(mockPaymentIntent);

      const result = await stripeService.getPaymentIntent('pi_test_123');

      expect(result).toEqual(mockPaymentIntent);
      expect(stripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_test_123');
    });
  });

  describe('confirmPaymentIntent', () => {
    it('deve confirmar um payment intent', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        amount: 10000,
        currency: 'brl',
        status: 'succeeded',
      };

      const { stripe } = await import('@/lib/stripe/stripe-client');
      (stripe.paymentIntents.confirm as any).mockResolvedValue(mockPaymentIntent);

      const result = await stripeService.confirmPaymentIntent(
        'pi_test_123',
        'pm_test_123'
      );

      expect(result).toEqual(mockPaymentIntent);
      expect(stripe.paymentIntents.confirm).toHaveBeenCalledWith(
        'pi_test_123',
        { payment_method: 'pm_test_123' }
      );
    });
  });

  describe('cancelPaymentIntent', () => {
    it('deve cancelar um payment intent', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        amount: 10000,
        currency: 'brl',
        status: 'canceled',
      };

      const { stripe } = await import('@/lib/stripe/stripe-client');
      (stripe.paymentIntents.cancel as any).mockResolvedValue(mockPaymentIntent);

      const result = await stripeService.cancelPaymentIntent('pi_test_123');

      expect(result).toEqual(mockPaymentIntent);
      expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_test_123');
    });
  });

  describe('createCustomer', () => {
    it('deve criar um cliente', async () => {
      const mockCustomer = {
        id: 'cus_test_123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const { stripe } = await import('@/lib/stripe/stripe-client');
      (stripe.customers.create as any).mockResolvedValue(mockCustomer);

      const result = await stripeService.createCustomer({
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(result).toEqual(mockCustomer);
      expect(stripe.customers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          name: 'Test User',
        })
      );
    });
  });

  describe('createRefund', () => {
    it('deve criar um reembolso total', async () => {
      const mockRefund = {
        id: 'ref_test_123',
        payment_intent: 'pi_test_123',
        amount: 10000,
        currency: 'brl',
        status: 'succeeded',
      };

      const { stripe } = await import('@/lib/stripe/stripe-client');
      (stripe.refunds.create as any).mockResolvedValue(mockRefund);

      const result = await stripeService.createRefund('pi_test_123');

      expect(result).toEqual(mockRefund);
      expect(stripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent: 'pi_test_123',
        })
      );
    });

    it('deve criar um reembolso parcial', async () => {
      const mockRefund = {
        id: 'ref_test_123',
        payment_intent: 'pi_test_123',
        amount: 5000,
        currency: 'brl',
        status: 'succeeded',
      };

      const { stripe } = await import('@/lib/stripe/stripe-client');
      (stripe.refunds.create as any).mockResolvedValue(mockRefund);

      const result = await stripeService.createRefund('pi_test_123', 5000);

      expect(result).toEqual(mockRefund);
      expect(stripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent: 'pi_test_123',
          amount: 5000,
        })
      );
    });
  });

  describe('createSubscription', () => {
    it('deve criar uma assinatura', async () => {
      const mockSubscription = {
        id: 'sub_test_123',
        customer: 'cus_test_123',
        status: 'active',
        items: {
          data: [{ price: { id: 'price_test_123' } }],
        },
      };

      const { stripe } = await import('@/lib/stripe/stripe-client');
      (stripe.subscriptions.create as any).mockResolvedValue(mockSubscription);

      const result = await stripeService.createSubscription({
        customerId: 'cus_test_123',
        priceId: 'price_test_123',
      });

      expect(result).toEqual(mockSubscription);
      expect(stripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_test_123',
          items: [{ price: 'price_test_123' }],
        })
      );
    });
  });

  describe('cancelSubscription', () => {
    it('deve cancelar assinatura no fim do período', async () => {
      const mockSubscription = {
        id: 'sub_test_123',
        customer: 'cus_test_123',
        status: 'active',
        cancel_at_period_end: true,
      };

      const { stripe } = await import('@/lib/stripe/stripe-client');
      (stripe.subscriptions.update as any).mockResolvedValue(mockSubscription);

      const result = await stripeService.cancelSubscription('sub_test_123', false);

      expect(result).toEqual(mockSubscription);
      expect(stripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_test_123',
        { cancel_at_period_end: true }
      );
    });

    it('deve cancelar assinatura imediatamente', async () => {
      const mockSubscription = {
        id: 'sub_test_123',
        customer: 'cus_test_123',
        status: 'canceled',
      };

      const { stripe } = await import('@/lib/stripe/stripe-client');
      (stripe.subscriptions.cancel as any).mockResolvedValue(mockSubscription);

      const result = await stripeService.cancelSubscription('sub_test_123', true);

      expect(result).toEqual(mockSubscription);
      expect(stripe.subscriptions.cancel).toHaveBeenCalledWith('sub_test_123');
    });
  });

  describe('StripeServiceError', () => {
    it('deve criar erro com mensagem e código', () => {
      const error = new StripeServiceError('Test error', 'test_error', 400);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('test_error');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('StripeServiceError');
    });

    it('deve incluir erro original', () => {
      const originalError = new Error('Original error');
      const error = new StripeServiceError(
        'Test error',
        'test_error',
        400,
        originalError
      );

      expect(error.originalError).toBe(originalError);
    });
  });
});
