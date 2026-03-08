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
  features: any;
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
        console.error('Erro ao buscar plano:', error);
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
      
      // Find plan by billing_interval
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('billing_interval', plan_type)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      if (planError || !plan) throw new Error('Plano não encontrado');
      
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_type,
          plan_id: plan.id,
          status: 'pending',
          payment_method,
        })
        .select()
        .single();
      
      if (subError || !subscription) {
        throw new Error(`Erro ao criar assinatura: ${subError?.message}`);
      }
      
      return { success: true, subscription };
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
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);
      
      if (error) throw new Error(`Erro ao cancelar assinatura: ${error.message}`);
      return { success: true };
    },
    onSuccess: (data, subscriptionId) => {
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
