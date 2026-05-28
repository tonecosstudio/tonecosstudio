/**
 * Hook para gerenciar assinaturas
 * 
 * Este hook fornece funcionalidades para:
 * - Buscar assinatura do usuário
 * - Verificar se usuário é assinante
 * - Buscar plano de assinatura
 * - Listar planos disponíveis
 * - Criar nova assinatura
 * - Cancelar assinatura
 * 
 * @module hooks/subscription/useSubscription
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { log } from '@/lib/logger';

type RpcError = { message?: string } | null;

interface SubscriptionMutationRpcClient {
  rpc(functionName: "create_pending_subscription_for_current_user", args: {
    p_plan_type: string;
    p_payment_method: string;
  }): PromiseLike<{ data: unknown; error: RpcError }>;
}

const subscriptionMutationRpc = supabase as unknown as SubscriptionMutationRpcClient;

// ============================================================================
// TYPES (aligned with DB schema)
// ============================================================================

type UserId = string;

interface DbSubscription {
  id: string;
  user_id: string;
  plan_type: string | null;
  plan_id: string | null;
  status: string;
  started_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  payment_method: string | null;
  deliveries_completed: number;
  deliveries_total: number | null;
  total_paid: number | null;
  next_delivery_at: string | null;
  collection_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface DbSubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_interval: string;
  deliveries_per_cycle: number;
  is_active: boolean;
  slug: string | null;
  tier_id: string | null;
  features: unknown;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const subscriptionKeys = {
  all: ['subscription'] as const,
  user: (userId: UserId) => [...subscriptionKeys.all, userId] as const,
  details: (subscriptionId: string) => [...subscriptionKeys.all, subscriptionId] as const,
};

// ============================================================================
// CONFIGURAÇÃO DE CACHE
// ============================================================================

const CACHE_CONFIG = {
  STALE_TIME: 30 * 1000,
  CACHE_TIME: 5 * 60 * 1000,
};

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export function useSubscription(userId?: UserId | null) {
  return useQuery({
    queryKey: userId ? subscriptionKeys.user(userId) : subscriptionKeys.all,
    queryFn: async (): Promise<DbSubscription | null> => {
      let targetUserId = userId;
      
      if (!targetUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Usuário não autenticado');
        targetUserId = user.id;
      }
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('status', 'active')
        .maybeSingle();
      
      if (error) throw new Error(`Erro ao buscar assinatura: ${error.message}`);
      return data;
    },
    enabled: true,
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
    retry: 2,
  });
}

export function useIsSubscriber(userId?: UserId | null) {
  const { data: subscription } = useSubscription(userId);
  
  return useQuery({
    queryKey: ['subscription', 'is-subscriber', userId],
    queryFn: async (): Promise<boolean> => {
      return !!subscription && subscription.status === 'active';
    },
    enabled: !!subscription,
    staleTime: CACHE_CONFIG.STALE_TIME,
  });
}

export function useSubscriptionPlan(userId?: UserId | null) {
  const { data: subscription } = useSubscription(userId);
  
  return useQuery({
    queryKey: ['subscription', 'plan', userId],
    queryFn: async (): Promise<DbSubscriptionPlan | null> => {
      if (!subscription?.plan_id) return null;
      
      const { data: plan, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', subscription.plan_id)
        .maybeSingle();
      
      if (error) {
        log.error('Failed to fetch subscription plan', {
          error,
          userId,
          planId: subscription.plan_id,
        });
        return null;
      }
      
      return plan;
    },
    enabled: !!subscription?.plan_id,
    staleTime: CACHE_CONFIG.STALE_TIME,
  });
}

export function useAvailablePlans() {
  return useQuery({
    queryKey: ['subscription', 'available-plans'],
    queryFn: async (): Promise<DbSubscriptionPlan[]> => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });
      
      if (error) throw new Error(`Erro ao buscar planos: ${error.message}`);
      return data || [];
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
  });
}

function mapCreateSubscriptionError(message: string | undefined): string {
  const value = message ?? "";

  if (value.includes("INVALID_SUBSCRIPTION_PLAN_TYPE")) return "Plano invalido";
  if (value.includes("INVALID_SUBSCRIPTION_PAYMENT_METHOD")) {
    return "Forma de pagamento indisponivel";
  }
  if (value.includes("SUBSCRIPTION_PLAN_NOT_FOUND")) return "Plano nao encontrado";
  if (value.includes("SUBSCRIPTION_ALREADY_EXISTS")) {
    return "Voce ja possui uma assinatura ativa ou pendente";
  }

  return value || "Erro ao criar assinatura";
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (params: {
      plan_type: string;
      payment_method: string;
    }) => {
      const { plan_type, payment_method } = params;
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Usuário não autenticado');
      
      const { data, error } = await subscriptionMutationRpc.rpc(
        "create_pending_subscription_for_current_user",
        {
          p_plan_type: plan_type,
          p_payment_method: payment_method,
        },
      );
      
      if (error) {
        throw new Error(mapCreateSubscriptionError(error.message));
      }
      
      return { success: true, subscription: data as DbSubscription };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
      toast({
        title: 'Assinatura criada!',
        description: 'Agora realize o pagamento para ativar sua assinatura.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar assinatura',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { data, error } = await supabase.functions.invoke("cancel-subscription", {
        body: { subscriptionId },
      });

      if (error) throw new Error(`Erro ao cancelar assinatura: ${error.message}`);

      const result = data as { error?: string } | null;
      if (result?.error) throw new Error(result.error);

      return { success: true };
    },
    onSuccess: (data, subscriptionId) => {
      void data;
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.details(subscriptionId) });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
      toast({
        title: 'Assinatura cancelada',
        description: 'Sua assinatura foi cancelada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao cancelar assinatura',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

export function invalidateSubscription(
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: UserId
) {
  if (userId) {
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.user(userId) });
  } else {
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
  }
}
