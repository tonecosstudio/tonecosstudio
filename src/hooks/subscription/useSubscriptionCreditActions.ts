import { useMutation, useQueryClient } from "@tanstack/react-query";
import { subscriptionCreditAPI } from "@/services/subscriptions/subscription-credit-api";
import type { NoRenewalResponse } from "@/types/subscription-credit-system";

type MutationCallbacks<TData> = {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
};

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error("Erro inesperado");
}

function invalidateSubscriptionCreditQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["subscription-credit"] });
}

export function useDisableSubscriptionRenewal(
  subscriptionId: string,
  callbacks: MutationCallbacks<NoRenewalResponse> = {}
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => subscriptionCreditAPI.setNoRenewal(subscriptionId),
    onSuccess: (data) => {
      invalidateSubscriptionCreditQueries(queryClient);
      callbacks.onSuccess?.(data);
    },
    onError: (error: unknown) => {
      callbacks.onError?.(toError(error));
    },
  });
}

export function useReactivateSubscriptionRenewal(
  subscriptionId: string,
  callbacks: MutationCallbacks<NoRenewalResponse> = {}
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => subscriptionCreditAPI.reactivateRenewal(subscriptionId),
    onSuccess: (data) => {
      invalidateSubscriptionCreditQueries(queryClient);
      callbacks.onSuccess?.(data);
    },
    onError: (error: unknown) => {
      callbacks.onError?.(toError(error));
    },
  });
}
