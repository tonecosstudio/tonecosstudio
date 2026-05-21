import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";

interface NotifyQuotePaymentInput {
  quoteId: string;
  amount: number;
}

export async function notifyQuotePayment(input: NotifyQuotePaymentInput): Promise<void> {
  const { error } = await supabase
    .from("quotes")
    .update({
      customer_paid_notification_at: new Date().toISOString(),
    })
    .eq("id", input.quoteId);

  if (error) throw error;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    log.warn("Payment confirmation notification skipped without authenticated user", {
      quoteId: input.quoteId,
    });
    return;
  }

  const { error: notificationError } = await supabase.from("notifications").insert({
    user_id: user.id,
    title: "Cliente Confirmou Pagamento",
    message: `O cliente informou que realizou o pagamento de R$ ${input.amount.toFixed(2)}`,
    type: "payment",
  });

  if (notificationError) {
    log.warn("Failed to create payment confirmation notification", {
      error: notificationError,
      quoteId: input.quoteId,
    });
  }
}
