import { callAuthenticatedEdgeFunction } from "@/services/supabase/edge-function-client";

export interface CreatePaymentIntentInput {
  amount: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export async function createStripePaymentIntent({
  amount,
  currency,
  description,
  metadata,
}: CreatePaymentIntentInput): Promise<string> {
  const data = await callAuthenticatedEdgeFunction<{ clientSecret?: string }>(
    "create-payment-intent",
    {
      amount,
      currency: currency || "brl",
      description,
      metadata,
    },
    "Erro ao criar pagamento",
  );

  if (!data?.clientSecret) {
    throw new Error("Resposta de pagamento invalida");
  }

  return data.clientSecret;
}
