import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  cancelSubscriptionById,
  createPendingSubscriptionForCurrentUser,
  fetchSubscriptionForUser,
  fetchSubscriptionPlan,
  listAvailableSubscriptionPlans,
  type DbSubscription,
  type DbSubscriptionPlan,
} from "@/services/subscriptions/subscription-service";

type UserId = string;

export const subscriptionKeys = {
  all: ["subscription"] as const,
  user: (userId: UserId) => [...subscriptionKeys.all, userId] as const,
  details: (subscriptionId: string) => [...subscriptionKeys.all, subscriptionId] as const,
};

const CACHE_CONFIG = {
  STALE_TIME: 30 * 1000,
  CACHE_TIME: 5 * 60 * 1000,
};

export function useSubscription(userId?: UserId | null) {
  return useQuery({
    queryKey: userId ? subscriptionKeys.user(userId) : subscriptionKeys.all,
    queryFn: async (): Promise<DbSubscription | null> => fetchSubscriptionForUser(userId),
    enabled: true,
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
    retry: 2,
  });
}

export function useIsSubscriber(userId?: UserId | null) {
  const { data: subscription } = useSubscription(userId);

  return useQuery({
    queryKey: ["subscription", "is-subscriber", userId],
    queryFn: async (): Promise<boolean> => {
      return !!subscription && subscription.status === "active";
    },
    enabled: !!subscription,
    staleTime: CACHE_CONFIG.STALE_TIME,
  });
}

export function useSubscriptionPlan(userId?: UserId | null) {
  const { data: subscription } = useSubscription(userId);

  return useQuery({
    queryKey: ["subscription", "plan", userId],
    queryFn: async (): Promise<DbSubscriptionPlan | null> => {
      if (!subscription?.plan_id) return null;
      return fetchSubscriptionPlan(subscription.plan_id, { userId });
    },
    enabled: !!subscription?.plan_id,
    staleTime: CACHE_CONFIG.STALE_TIME,
  });
}

export function useAvailablePlans() {
  return useQuery({
    queryKey: ["subscription", "available-plans"],
    queryFn: listAvailableSubscriptionPlans,
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createPendingSubscriptionForCurrentUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
      toast({
        title: "Assinatura criada!",
        description: "Agora realize o pagamento para ativar sua assinatura.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar assinatura",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: cancelSubscriptionById,
    onSuccess: (_data, subscriptionId) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.details(subscriptionId) });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
      toast({
        title: "Assinatura cancelada",
        description: "Sua assinatura foi cancelada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao cancelar assinatura",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function invalidateSubscription(
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: UserId,
) {
  if (userId) {
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.user(userId) });
  } else {
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
  }
}
