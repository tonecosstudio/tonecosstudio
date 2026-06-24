import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendPaymentLink } from "@/services/admin/payments/send-payment-link-service";

export function useSendPaymentLink(quoteId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: sendPaymentLink,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-preorders"] });
      qc.invalidateQueries({ queryKey: ["quote-tracking", quoteId] });
    },
  });
}
