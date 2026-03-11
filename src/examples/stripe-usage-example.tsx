/**
 * Stripe Usage Examples
 * 
 * Exemplos completos de uso da integração Stripe
 */

import { useState } from 'react';
import { stripeService } from '@/lib/stripe/stripe-service';
import { StripeCheckout } from '@/components/stripe/StripeCheckout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logInfo, logError } from '@/lib/logger';

/**
 * Exemplo 1: Checkout Simples
 */
export function SimpleCheckoutExample() {
  const [isSuccess, setIsSuccess] = useState(false);

  return (
    <div className="max-w-md mx-auto p-6">
      {!isSuccess ? (
        <StripeCheckout
          amount={10000} // R$ 100.00
          description="Compra de produto"
          metadata={{
            productId: '123',
            productName: 'Produto Exemplo'
          }}
          onSuccess={(paymentIntent) => {
            logInfo('Pagamento aprovado!', { paymentIntent }, 'checkout');
            setIsSuccess(true);
          }}
          onError={(error) => {
            logError('Erro no pagamento', error, 'checkout');
          }}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pagamento Aprovado!</CardTitle>
            <CardDescription>
              Seu pagamento foi processado com sucesso.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

/**
 * Exemplo 2: Criar Payment Intent Manualmente
 */
export function ManualPaymentIntentExample() {
  const [loading, setLoading] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);

  const createPayment = async () => {
    setLoading(true);
    try {
      const pi = await stripeService.createPaymentIntent({
        amount: 5000, // R$ 50.00
        currency: 'brl',
        description: 'Pagamento manual',
        metadata: {
          orderId: '456',
          userId: 'user_123'
        }
      });

      setPaymentIntent(pi);
      logInfo('Payment Intent criado', { id: pi.id }, 'manual-payment');
    } catch (error) {
      logError('Erro ao criar Payment Intent', error, 'manual-payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar Payment Intent</CardTitle>
        <CardDescription>
          Exemplo de criação manual de Payment Intent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={createPayment} disabled={loading}>
          {loading ? 'Criando...' : 'Criar Payment Intent'}
        </Button>

        {paymentIntent && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-mono">
              ID: {paymentIntent.id}
            </p>
            <p className="text-sm font-mono">
              Status: {paymentIntent.status}
            </p>
            <p className="text-sm font-mono">
              Valor: R$ {(paymentIntent.amount / 100).toFixed(2)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Exemplo 3: Gerenciar Cliente
 */
export function CustomerManagementExample() {
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<any>(null);

  const createCustomer = async () => {
    setLoading(true);
    try {
      const cust = await stripeService.createCustomer({
        email: 'cliente@example.com',
        name: 'Cliente Exemplo',
        phone: '+5511999999999',
        metadata: {
          userId: 'user_123'
        }
      });

      setCustomer(cust);
      logInfo('Cliente criado', { id: cust.id }, 'customer');
    } catch (error) {
      logError('Erro ao criar cliente', error, 'customer');
    } finally {
      setLoading(false);
    }
  };

  const getOrCreateCustomer = async () => {
    setLoading(true);
    try {
      const cust = await stripeService.getOrCreateCustomer(
        'cliente@example.com',
        'user_123'
      );

      setCustomer(cust);
      logInfo('Cliente obtido/criado', { id: cust.id }, 'customer');
    } catch (error) {
      logError('Erro ao obter/criar cliente', error, 'customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Cliente</CardTitle>
        <CardDescription>
          Exemplo de criação e gerenciamento de clientes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={createCustomer} disabled={loading}>
            Criar Cliente
          </Button>
          <Button onClick={getOrCreateCustomer} disabled={loading} variant="outline">
            Obter ou Criar
          </Button>
        </div>

        {customer && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-mono">ID: {customer.id}</p>
            <p className="text-sm font-mono">Email: {customer.email}</p>
            <p className="text-sm font-mono">Nome: {customer.name}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Exemplo 4: Criar Assinatura
 */
export function SubscriptionExample() {
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);

  const createSubscription = async () => {
    setLoading(true);
    try {
      // Primeiro, criar ou obter cliente
      const customer = await stripeService.getOrCreateCustomer(
        'assinante@example.com',
        'user_123'
      );

      // Criar assinatura
      const sub = await stripeService.createSubscription({
        customerId: customer.id,
        priceId: 'price_xxx', // Substitua pelo ID do preço real
        trialPeriodDays: 7,
        metadata: {
          planId: 'premium',
          userId: 'user_123'
        }
      });

      setSubscription(sub);
      logInfo('Assinatura criada', { id: sub.id }, 'subscription');
    } catch (error) {
      logError('Erro ao criar assinatura', error, 'subscription');
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async () => {
    if (!subscription) return;

    setLoading(true);
    try {
      const sub = await stripeService.cancelSubscription(
        subscription.id,
        false // false = cancelar no fim do período
      );

      setSubscription(sub);
      logInfo('Assinatura cancelada', { id: sub.id }, 'subscription');
    } catch (error) {
      logError('Erro ao cancelar assinatura', error, 'subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Assinatura</CardTitle>
        <CardDescription>
          Exemplo de criação e cancelamento de assinaturas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={createSubscription} disabled={loading || !!subscription}>
            Criar Assinatura
          </Button>
          {subscription && (
            <Button onClick={cancelSubscription} disabled={loading} variant="destructive">
              Cancelar
            </Button>
          )}
        </div>

        {subscription && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-mono">ID: {subscription.id}</p>
            <p className="text-sm font-mono">Status: {subscription.status}</p>
            <p className="text-sm font-mono">
              Cancelar no fim: {subscription.cancel_at_period_end ? 'Sim' : 'Não'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Exemplo 5: Criar Reembolso
 */
export function RefundExample() {
  const [loading, setLoading] = useState(false);
  const [refund, setRefund] = useState<any>(null);
  const [paymentIntentId, setPaymentIntentId] = useState('');

  const createFullRefund = async () => {
    if (!paymentIntentId) return;

    setLoading(true);
    try {
      const ref = await stripeService.createRefund(
        paymentIntentId,
        undefined, // undefined = reembolso total
        'requested_by_customer'
      );

      setRefund(ref);
      logInfo('Reembolso criado', { id: ref.id }, 'refund');
    } catch (error) {
      logError('Erro ao criar reembolso', error, 'refund');
    } finally {
      setLoading(false);
    }
  };

  const createPartialRefund = async () => {
    if (!paymentIntentId) return;

    setLoading(true);
    try {
      const ref = await stripeService.createRefund(
        paymentIntentId,
        5000, // R$ 50.00
        'requested_by_customer'
      );

      setRefund(ref);
      logInfo('Reembolso parcial criado', { id: ref.id }, 'refund');
    } catch (error) {
      logError('Erro ao criar reembolso', error, 'refund');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar Reembolso</CardTitle>
        <CardDescription>
          Exemplo de criação de reembolsos totais e parciais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="text"
          placeholder="Payment Intent ID (pi_xxx)"
          value={paymentIntentId}
          onChange={(e) => setPaymentIntentId(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        />

        <div className="flex gap-2">
          <Button onClick={createFullRefund} disabled={loading || !paymentIntentId}>
            Reembolso Total
          </Button>
          <Button onClick={createPartialRefund} disabled={loading || !paymentIntentId} variant="outline">
            Reembolso Parcial (R$ 50)
          </Button>
        </div>

        {refund && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-mono">ID: {refund.id}</p>
            <p className="text-sm font-mono">Status: {refund.status}</p>
            <p className="text-sm font-mono">
              Valor: R$ {(refund.amount / 100).toFixed(2)}
            </p>
            <p className="text-sm font-mono">Motivo: {refund.reason}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Página de Exemplos Completa
 */
export function StripeExamplesPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Exemplos de Integração Stripe</h1>
        <p className="text-muted-foreground">
          Exemplos práticos de uso da integração Stripe
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <SimpleCheckoutExample />
        <ManualPaymentIntentExample />
        <CustomerManagementExample />
        <SubscriptionExample />
        <RefundExample />
      </div>
    </div>
  );
}
