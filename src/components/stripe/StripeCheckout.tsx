/**
 * Stripe Checkout Component
 * 
 * Componente profissional de checkout com Stripe:
 * - Formulário de pagamento seguro
 * - Validação de cartão
 * - Suporte a 3D Secure
 * - Loading states
 * - Error handling
 * - Confirmação de pagamento
 * 
 * @example
 * ```tsx
 * <StripeCheckout
 *   amount={10000}
 *   onSuccess={(paymentIntent) => console.log('Pagamento aprovado', paymentIntent)}
 *   onError={(error) => console.error('Erro no pagamento', error)}
 * />
 * ```
 */

import { useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe/stripe-client';
import { stripeService } from '@/lib/stripe/stripe-service';
import { logInfo, logError } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface StripeCheckoutProps {
  /** Valor em centavos (ex: 10000 = R$ 100.00) */
  amount: number;
  /** Moeda (padrão: brl) */
  currency?: string;
  /** Descrição do pagamento */
  description?: string;
  /** Metadata adicional */
  metadata?: Record<string, string>;
  /** Callback de sucesso */
  onSuccess?: (paymentIntent: any) => void;
  /** Callback de erro */
  onError?: (error: Error) => void;
}

/**
 * Formulário de pagamento interno
 */
function CheckoutForm({ amount, currency, description, metadata, onSuccess, onError }: StripeCheckoutProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      logInfo('Processing payment', { amount, currency }, 'stripe-checkout');

      // Confirmar pagamento
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        throw new Error(error.message);
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        logInfo('Payment succeeded', { paymentIntentId: paymentIntent.id }, 'stripe-checkout');
        onSuccess?.(paymentIntent);
      }
    } catch (error: any) {
      logError('Payment failed', error, 'stripe-checkout');
      setErrorMessage(error.message || 'Erro ao processar pagamento');
      onError?.(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando...
          </>
        ) : (
          `Pagar ${new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: currency || 'BRL',
          }).format(amount / 100)}`
        )}
      </Button>
    </form>
  );
}

/**
 * Componente principal de checkout
 */
export function StripeCheckout(props: StripeCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Criar Payment Intent ao montar o componente
  useState(() => {
    const createPaymentIntent = async () => {
      try {
        logInfo('Creating payment intent', {
          amount: props.amount,
          currency: props.currency
        }, 'stripe-checkout');

        const paymentIntent = await stripeService.createPaymentIntent({
          amount: props.amount,
          currency: props.currency || 'brl',
          description: props.description,
          metadata: props.metadata,
        });

        setClientSecret(paymentIntent.client_secret);
        setIsLoading(false);
      } catch (error: any) {
        logError('Failed to create payment intent', error, 'stripe-checkout');
        setError(error.message || 'Erro ao inicializar pagamento');
        setIsLoading(false);
        props.onError?.(error);
      }
    };

    createPaymentIntent();
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error || !clientSecret) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertDescription>
              {error || 'Erro ao carregar formulário de pagamento'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#0070f3',
      },
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pagamento Seguro</CardTitle>
        <CardDescription>
          {props.description || 'Complete os dados do cartão para finalizar o pagamento'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Elements stripe={stripePromise} options={options}>
          <CheckoutForm {...props} />
        </Elements>
      </CardContent>
    </Card>
  );
}
