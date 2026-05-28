import { supabase } from "@/integrations/supabase/client";

interface NotifyQuotePaymentInput {
  quoteId: string;
  amount: number;
}

interface QuotePaymentNotificationRpcError {
  message: string;
}

interface QuotePaymentNotificationRpcClient {
  rpc(
    name: "notify_quote_payment_for_current_user",
    args: { p_quote_id: string; p_amount: number }
  ): Promise<{ data: null; error: QuotePaymentNotificationRpcError | null }>;
}

const quotePaymentNotificationRpc = supabase as unknown as QuotePaymentNotificationRpcClient;

export async function notifyQuotePayment(input: NotifyQuotePaymentInput): Promise<void> {
  const { error } = await quotePaymentNotificationRpc.rpc("notify_quote_payment_for_current_user", {
    p_quote_id: input.quoteId,
    p_amount: input.amount,
  });

  if (error) throw error;
}
