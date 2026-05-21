import { supabase } from "@/integrations/supabase/client";

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
  const { data, error } = await supabase.functions.invoke("create-payment-intent", {
    body: {
      amount,
      currency: currency || "brl",
      description,
      metadata,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.clientSecret) {
    throw new Error("Resposta de pagamento invalida");
  }

  return data.clientSecret;
}
