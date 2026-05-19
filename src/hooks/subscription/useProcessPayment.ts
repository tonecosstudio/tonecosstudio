/**
 * Hook para processar pagamentos de assinatura e adicionar coins
 *
 * Este hook integra o sistema de pagamentos com o sistema de coins,
 * creditando automaticamente os coins quando um pagamento é aprovado.
 *
 * @module hooks/subscription/useProcessPayment
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { subscriptionKeys } from './useSubscription';
import { coinsBalanceKeys } from '../coins/useCoinsBalance';
import { log } from '@/lib/logger';
import type {
  ProcessSubscriptionPaymentParams,
  ProcessPaymentResponse,
  SubscriptionPayment,
  UserId,
} from '@/types/subscription';
import type { CoinsAmount } from '@/types/coins';

// ============================================================================
// HOOK: PROCESSAR PAGAMENTO
// ============================================================================

/**
 * Hook para processar pagamento de assinatura
 *
 * Fluxo:
 * 1. Registra pagamento
 * 2. Atualiza status da assinatura
 * 3. Adiciona coins ao usuário
 * 4. Registra transação de coins
 * 5. Notifica usuário
 *
 * @returns Mutation para processar pagamento
 *
 * @example
 * ```tsx
 * function PaymentConfirmation({ subscriptionId }: { subscriptionId: string }) {
 *   const processPayment = useProcessSubscriptionPayment();
 *
 *   const handleConfirm = () => {
 *     processPayment.mutate({
 *       subscription_id: subscriptionId,
 *       amount: 50.00,
 *       payment_method: 'pix',
 *       external_reference: 'PIX-123456',
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleConfirm} disabled={processPayment.isPending}>
 *       Confirmar Pagamento
 *     </button>
 *   );
 * }
 * ```
 */
export function useProcessSubscriptionPayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      params: ProcessSubscriptionPaymentParams
    ): Promise<ProcessPaymentResponse> => {
      const { subscription_id, amount, payment_method, external_reference } = params;

      // 1. Busca assinatura
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscription_id)
        .single();

      if (subError || !subscription) {
        throw new Error('Assinatura não encontrada');
      }

      // 2. Registra pagamento
      const { data: payment, error: paymentError } = await supabase
        .from('subscription_payments')
        .insert({
          subscription_id,
          user_id: subscription.user_id,
          amount,
          status: 'approved',
          payment_method,
          external_reference,
          coins_credited: subscription.coins_per_month,
          paid_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (paymentError || !payment) {
        throw new Error(`Erro ao registrar pagamento: ${paymentError?.message}`);
      }

      // 3. Atualiza status da assinatura para ativa
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          next_billing_date: calculateNextBillingDate(subscription.plan_type),
        })
        .eq('id', subscription_id);

      if (updateError) {
        throw new Error(`Erro ao atualizar assinatura: ${updateError.message}`);
      }

      // 4. Adiciona coins ao usuário
      const { error: coinsError } = await supabase.rpc('add_coins_to_user', {
        p_user_id: subscription.user_id,
        p_amount: subscription.coins_per_month,
        p_description: `Crédito de assinatura - ${subscription.plan_type}`,
        p_reference_id: payment.id,
        p_reference_type: 'subscription_payment',
      });

      if (coinsError) {
        throw new Error(`Erro ao adicionar coins: ${coinsError.message}`);
      }

      // 5. Atualiza total de coins recebidos
      const { error: totalError } = await supabase
        .from('subscriptions')
        .update({
          total_coins_received: subscription.total_coins_received + subscription.coins_per_month,
        })
        .eq('id', subscription_id);

      if (totalError) {
        log.error('Failed to update subscription total coins received', {
          error: totalError,
          subscriptionId: subscription_id,
        });
      }

      // 6. Busca novo saldo
      const { data: newBalance, error: balanceError } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', subscription.user_id)
        .single();

      if (balanceError) {
        log.error('Failed to fetch updated subscription coin balance', {
          error: balanceError,
          userId: subscription.user_id,
        });
      }

      return {
        success: true,
        payment: payment as SubscriptionPayment,
        coins_credited: subscription.coins_per_month,
        new_balance: newBalance?.balance || 0,
        message: `Pagamento aprovado! Você recebeu ${subscription.coins_per_month} coins.`,
      };
    },
    onSuccess: (data) => {
      // Invalida caches
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: coinsBalanceKeys.all,
      });

      toast({
        title: 'Pagamento aprovado!',
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao processar pagamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// HOOK: ADICIONAR COINS MANUALMENTE (ADMIN)
// ============================================================================

/**
 * Hook para admin adicionar coins manualmente a uma assinatura
 *
 * Útil para:
 * - Bônus promocionais
 * - Compensações
 * - Ajustes manuais
 *
 * @returns Mutation para adicionar coins
 *
 * @example
 * ```tsx
 * function AdminAddCoins({ userId }: { userId: string }) {
 *   const addCoins = useAdminAddSubscriptionCoins();
 *
 *   const handleAdd = () => {
 *     addCoins.mutate({
 *       user_id: userId,
 *       amount: 1000,
 *       reason: 'Bônus promocional',
 *     });
 *   };
 *
 *   return <button onClick={handleAdd}>Adicionar 1000 coins</button>;
 * }
 * ```
 */
export function useAdminAddSubscriptionCoins() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      user_id: UserId;
      amount: CoinsAmount;
      reason: string;
    }) => {
      const { user_id, amount, reason } = params;

      // Verifica se usuário é admin
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Não autenticado');
      }

      const { data: isAdmin, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError || !isAdmin) {
        throw new Error('Apenas admins podem adicionar coins manualmente');
      }

      // Adiciona coins
      const { error: coinsError } = await supabase.rpc('add_coins_to_user', {
        p_user_id: user_id,
        p_amount: amount,
        p_description: `Ajuste manual: ${reason}`,
        p_reference_id: user.id,
        p_reference_type: 'admin_adjustment',
      });

      if (coinsError) {
        throw new Error(`Erro ao adicionar coins: ${coinsError.message}`);
      }

      return { success: true, amount };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: coinsBalanceKeys.user(variables.user_id),
      });

      toast({
        title: 'Coins adicionados!',
        description: `${data.amount} coins foram creditados.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao adicionar coins',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// HOOK: HISTÓRICO DE PAGAMENTOS
// ============================================================================

/**
 * Hook para buscar histórico de pagamentos de uma assinatura
 *
 * @param subscriptionId - ID da assinatura
 * @returns Query com lista de pagamentos
 *
 * @example
 * ```tsx
 * function PaymentHistory({ subscriptionId }: { subscriptionId: string }) {
 *   const { data: payments } = useSubscriptionPayments(subscriptionId);
 *
 *   return (
 *     <ul>
 *       {payments?.map(payment => (
 *         <li key={payment.id}>
 *           {payment.amount} - {payment.status} - {payment.paid_at}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useSubscriptionPayments(subscriptionId: string) {
  return useQuery({
    queryKey: ['subscription', 'payments', subscriptionId],
    queryFn: async (): Promise<SubscriptionPayment[]> => {
      const { data, error } = await supabase
        .from('subscription_payments')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Erro ao buscar pagamentos: ${error.message}`);
      }

      return (data as SubscriptionPayment[]) || [];
    },
    staleTime: 60 * 1000, // 1 minuto
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Calcula próxima data de cobrança baseado no tipo de plano
 */
function calculateNextBillingDate(planType: string): string {
  const now = new Date();

  switch (planType) {
    case 'bimestral':
      now.setMonth(now.getMonth() + 2);
      break;
    case 'trimestral':
      now.setMonth(now.getMonth() + 3);
      break;
    case 'semestral':
      now.setMonth(now.getMonth() + 6);
      break;
    case 'anual':
      now.setFullYear(now.getFullYear() + 1);
      break;
    default:
      now.setMonth(now.getMonth() + 1);
  }

  return now.toISOString();
}

/**
 * Formata valor em reais
 */
export function formatBRL(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

/**
 * Formata data de pagamento
 */
export function formatPaymentDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}
