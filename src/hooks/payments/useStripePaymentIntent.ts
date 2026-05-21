import { useEffect, useState } from "react";
import { logError, logInfo } from "@/lib/logger";
import {
  createStripePaymentIntent,
  type CreatePaymentIntentInput,
} from "@/services/payments/stripe-checkout-service";

function toError(error: unknown, fallbackMessage: string): Error {
  return error instanceof Error ? error : new Error(fallbackMessage);
}

export function useStripePaymentIntent(
  input: CreatePaymentIntentInput,
  onError?: (error: Error) => void
) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { amount, currency, description, metadata } = input;

  useEffect(() => {
    let isMounted = true;

    async function createPaymentIntent() {
      try {
        setIsLoading(true);
        setError(null);

        logInfo("Creating payment intent", { amount, currency }, "stripe-checkout");

        const paymentIntentClientSecret = await createStripePaymentIntent({
          amount,
          currency,
          description,
          metadata,
        });

        if (!isMounted) return;
        setClientSecret(paymentIntentClientSecret);
      } catch (error) {
        if (!isMounted) return;
        const normalizedError = toError(error, "Erro ao inicializar pagamento");
        logError("Failed to create payment intent", normalizedError, "stripe-checkout");
        setError(normalizedError.message);
        onError?.(normalizedError);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    createPaymentIntent();

    return () => {
      isMounted = false;
    };
  }, [amount, currency, description, metadata, onError]);

  return { clientSecret, isLoading, error };
}
