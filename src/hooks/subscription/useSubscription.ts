// @ts-nocheck
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
import type {
  Subscription,
  SubscriptionPlan,
  UserId,
  SubscriptionStatus,
} from '@/types/subscription';

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
  /** Tempo que dados são considerados "frescos" (30 segundos) */
  STALE_TIME: 30 * 1000,
  /** Tempo que dados ficam em cache (5 minutos) */
  CACHE_TIME: 5 * 60 * 1000,
};

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

/**
 * Hook para buscar assinatura do usuário
 * 
 * @param userId - ID do usuário (opcional, usa usuário logado se não fornecido)
 * @returns Query com assinatura do usuário
 * 
 * @example
 * ```tsx
 * function MySubscription() {
 *   const { data: subscription, isLoading } = useSubscription();
 *   
 *   if (isLoading) return <Loading />;
 *   
 *   return (
 *     <div>
 *       {subscription ? `Plano: ${subscription.plan_type}` : 'Sem assinatura'}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSubscription(userId?: UserId | null) {
  return useQuery({
    queryKey: userId ? subscriptionKeys.user(userId) : subscriptionKeys.all,
    queryFn: async (): Promise<Subscription | null> => {
      // Se userId não foi fornecido, busca usuário logado
      let targetUserId = userId;
      
      if (!targetUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          throw new Error('Usuário não autenticado');
        }
        
        targetUserId = user.id;
      }
      
      // Busca assinatura ativa
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('status', 'active')
        .maybeSingle();
      
      if (error) {
        throw new Error(`Erro ao buscar assinatura: ${error.message}`);
      }
      
      return data as Subscription | null;
    },
    enabled: true,
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
    retry: 2,
  });
}

/**
 * Hook para verificar se usuário é assinante
 * 
 * @param userId - ID do usuário (opcional, usa usuário logado se não fornecido)
 * @returns Query com boolean indicando se usuário é assinante
 * 
 * @example
 * ```tsx
 * function PremiumContent() {
 *   const { data: isSubscriber } = useIsSubscriber();
 *   
 *   if (!isSubscriber) {
 *     return <UpgradePrompt />;
 *   }
 *   
 *   return <PremiumContent />;
 * }
 * ```
 */
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

/**
 * Hook para buscar plano de assinatura
 * 
 * @param userId - ID do usuário (opcional, usa usuário logado se não fornecido)
 * @returns Query com plano de assinatura
 * 
 * @example
 * ```tsx
 * function PlanDetails() {
 *   const { data: plan } = useSubscriptionPlan();
 *   
 *   if (!plan) return <NoPlan />;
 *   
 *   return (
 *     <div>
 *       <h3>{plan.name}</h3>
 *       <p>{plan.description}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSubscriptionPlan(userId?: UserId | null) {
  const { data: subscription } = useSubscription(userId);
  
  return useQuery({
    queryKey: ['subscription', 'plan', userId],
    queryFn: async (): Promise<SubscriptionPlan | null> => {
      if (!subscription) return null;
      
      // Busca detalhes do plano
      const { data: plan, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('type', subscription.plan_type)
        .maybeSingle();
      
      if (error) {
        console.error('Erro ao buscar plano:', error);
        return null;
      }
      
      return plan as SubscriptionPlan | null;
    },
    enabled: !!subscription,
    staleTime: CACHE_CONFIG.STALE_TIME,
  });
}

/**
 * Hook para listar planos disponíveis
 * 
 * @returns Query com lista de planos disponíveis
 * 
 * @example
 * ```tsx
 * function PlanSelector() {
 *   const { data: plans } = useAvailablePlans();
 *   
 *   return (
 *     <div>
 *       {plans?.map(plan => (
 *         <PlanCard key={plan.id} plan={plan} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAvailablePlans() {
  return useQuery({
    queryKey: ['subscription', 'available-plans'],
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });
      
      if (error) {
        throw new Error(`Erro ao buscar planos: ${error.message}`);
      }
      
      return (data as SubscriptionPlan[]) || [];
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
  });
}

/**
 * Hook para criar nova assinatura
 * 
 * @returns Mutation para criar assinatura
 * 
 * @example
 * ```tsx
 * function SubscribeButton({ planId }: { planId: string }) {
 *   const createSubscription = useCreateSubscription();
 *   
 *   const handleSubscribe = () => {
 *     createSubscription.mutate({
 *       plan_type: 'mensal',
 *       payment_method: 'pix',
 *     });
 *   };
 *   
 *   return <button onClick={handleSubscribe}>Assinar</button>;
 * }
 * ```
 */
export function useCreateSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (params: {
      plan_type: string;
      payment_method: string;
    }) => {
      const { plan_type, payment_method } = params;
      
      // Busca usuário logado
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Usuário não autenticado');
      }
      
      // Busca plano
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('type', plan_type)
        .eq('is_active', true)
        .single();
      
      if (planError || !plan) {
        throw new Error('Plano não encontrado');
      }
      
      // Cria assinatura
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_type,
          status: 'pending_payment',
          coins_per_month: plan.coins_per_month,
          total_coins_received: 0,
        })
        .select()
        .single();
      
      if (subError || !subscription) {
        throw new Error(`Erro ao criar assinatura: ${subError?.message}`);
      }
      
      return { success: true, subscription };
    },
    onSuccess: (data) => {
      // Invalida cache de assinatura
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.all,
      });
      
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

/**
 * Hook para cancelar assinatura
 * 
 * @returns Mutation para cancelar assinatura
 * 
 * @example
 * ```tsx
 * function CancelSubscriptionButton({ subscriptionId }: { subscriptionId: string }) {
 *   const cancelSubscription = useCancelSubscription();
 *   
 *   const handleCancel = () => {
 *     cancelSubscription.mutate(subscriptionId);
 *   };
 *   
 *   return <button onClick={handleCancel}>Cancelar Assinatura</button>;
 * }
 * ```
 */
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
      
      if (error) {
        throw new Error(`Erro ao cancelar assinatura: ${error.message}`);
      }
      
      return { success: true };
    },
    onSuccess: (data, subscriptionId) => {
      // Invalida cache de assinatura
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.details(subscriptionId),
      });
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.all,
      });
      
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

/**
 * Invalida cache de assinatura
 * 
 * Útil após operações que modificam assinatura
 * 
 * @param queryClient - Cliente do React Query
 * @param userId - ID do usuário (opcional, invalida todos se não fornecido)
 */
export function invalidateSubscription(
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: UserId
) {
  if (userId) {
    queryClient.invalidateQueries({
      queryKey: subscriptionKeys.user(userId),
    });
  } else {
    queryClient.invalidateQueries({
      queryKey: subscriptionKeys.all,
    });
  }
}