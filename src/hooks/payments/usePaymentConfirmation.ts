import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { notifyQuotePayment } from "@/services/payments/payment-confirmation-service";

interface UsePaymentConfirmationOptions {
  quoteId: string;
  amount: number;
}

export function usePaymentConfirmation({ quoteId, amount }: UsePaymentConfirmationOptions) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => notifyQuotePayment({ quoteId, amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote-tracking", quoteId] });
      toast({
        title: "Confirmacao enviada!",
        description: "Avisamos o admin. Aguarde a confirmacao.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao confirmar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    notifyPaid: mutation.mutate,
    isPending: mutation.isPending,
  };
}
