import { useMutation, useQueryClient } from "@tanstack/react-query";
import { subscriptionCreditAPI } from "@/services/subscription-credit-api";
import type {
  CancelWithRefundResponse,
  NoRenewalResponse,
  PlanChangeResponse,
  PlanType,
} from "@/types/subscription-credit-system";

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

export function useScheduleSubscriptionPlanChange(
  subscriptionId: string,
  newPlanType: PlanType,
  callbacks: MutationCallbacks<PlanChangeResponse> = {}
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => subscriptionCreditAPI.schedulePlanChange(subscriptionId, newPlanType),
    onSuccess: (data) => {
      invalidateSubscriptionCreditQueries(queryClient);
      callbacks.onSuccess?.(data);
    },
    onError: (error: unknown) => {
      callbacks.onError?.(toError(error));
    },
  });
}

export function useCancelSubscriptionWithRefund(
  subscriptionId: string,
  callbacks: MutationCallbacks<CancelWithRefundResponse> = {}
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => subscriptionCreditAPI.cancelWithRefund(subscriptionId),
    onSuccess: (data) => {
      invalidateSubscriptionCreditQueries(queryClient);
      callbacks.onSuccess?.(data);
    },
    onError: (error: unknown) => {
      callbacks.onError?.(toError(error));
    },
  });
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
