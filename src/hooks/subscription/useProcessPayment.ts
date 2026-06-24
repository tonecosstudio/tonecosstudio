import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  adminAddSubscriptionCoins,
  listSubscriptionPayments,
  processSubscriptionPayment,
} from "@/services/subscriptions/subscription-payment-service";
import type {
  ProcessPaymentResponse,
  ProcessSubscriptionPaymentParams,
  SubscriptionPayment,
  UserId,
} from "@/types/subscription";
import type { CoinsAmount } from "@/types/coins";
import { invalidateCoinsBalance, coinsBalanceKeys } from "../coins/useCoinsBalance";
import { invalidateCoinsTransactions } from "../coins/useCoinsTransactions";
import { subscriptionKeys } from "./useSubscription";

export function useProcessSubscriptionPayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      params: ProcessSubscriptionPaymentParams,
    ): Promise<ProcessPaymentResponse> => {
      return processSubscriptionPayment(params);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
      queryClient.invalidateQueries({ queryKey: coinsBalanceKeys.all });
      invalidateCoinsTransactions(queryClient);

      toast({
        title: "Pagamento aprovado!",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao processar pagamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useAdminAddSubscriptionCoins() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: adminAddSubscriptionCoins,
    onSuccess: (data, variables) => {
      invalidateCoinsBalance(queryClient, variables.user_id);
      invalidateCoinsTransactions(queryClient);

      toast({
        title: "Coins adicionados!",
        description: `${data.amount} coins foram creditados.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar coins",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useSubscriptionPayments(subscriptionId: string) {
  return useQuery({
    queryKey: ["subscription", "payments", subscriptionId],
    queryFn: async (): Promise<SubscriptionPayment[]> => {
      return listSubscriptionPayments(subscriptionId);
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function formatBRL(amount: number): string {
  return formatCurrency(amount);
}

export function formatPaymentDate(date: string): string {
  return formatDate(date, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type { CoinsAmount, UserId };
