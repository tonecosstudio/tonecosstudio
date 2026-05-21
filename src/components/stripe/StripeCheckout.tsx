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
 *   onSuccess={handlePaymentSuccess}
 *   onError={handlePaymentError}
 * />
 * ```
 */

import { useState } from "react";
import type { FormEvent } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import type { PaymentIntent } from "@stripe/stripe-js";
import { stripePromise } from "@/lib/stripe/stripe-client";
import { logInfo, logError } from "@/lib/logger";
import { useStripePaymentIntent } from "@/hooks/payments/useStripePaymentIntent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

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
  onSuccess?: (paymentIntent: PaymentIntent) => void;
  /** Callback de erro */
  onError?: (error: Error) => void;
}

/**
 * Formulário de pagamento interno
 */
function toError(error: unknown, fallbackMessage: string): Error {
  return error instanceof Error ? error : new Error(fallbackMessage);
}

function CheckoutForm({ amount, currency, onSuccess, onError }: StripeCheckoutProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
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
    } catch (error) {
      const normalizedError = toError(error, "Erro ao processar pagamento");
      logError('Payment failed', normalizedError, 'stripe-checkout');
      setErrorMessage(normalizedError.message);
      onError?.(normalizedError);
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
  const { amount, currency, description, metadata, onError } = props;
  const { clientSecret, isLoading, error } = useStripePaymentIntent(
    { amount, currency, description, metadata },
    onError
  );

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
          {description || 'Complete os dados do cartão para finalizar o pagamento'}
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
