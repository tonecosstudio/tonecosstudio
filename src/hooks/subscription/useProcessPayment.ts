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
import { coinsBalanceKeys, invalidateCoinsBalance } from '../coins/useCoinsBalance';
import { invalidateCoinsTransactions } from '../coins/useCoinsTransactions';
import type {
  ProcessSubscriptionPaymentParams,
  ProcessPaymentResponse,
  SubscriptionPayment,
  UserId,
} from '@/types/subscription';
import type { CoinsAmount } from '@/types/coins';

type RpcError = { message?: string } | null;

interface SubscriptionPaymentRpcClient {
  rpc(functionName: "admin_process_subscription_payment", args: {
    p_subscription_id: string;
    p_amount: number;
    p_payment_method: string;
    p_external_reference: string | null;
  }): PromiseLike<{ data: unknown; error: RpcError }>;
  rpc(functionName: "admin_add_coins_to_user", args: {
    p_user_id: string;
    p_amount: number;
    p_description: string;
    p_reference_id: string | null;
    p_reference_type: string;
  }): PromiseLike<{ data: unknown; error: RpcError }>;
}

type ProcessSubscriptionPaymentRpcResult = ProcessPaymentResponse;

interface SubscriptionPaymentsQueryClient {
  from(table: "subscription_payments"): {
    select(columns: "*"): {
      eq(column: "subscription_id", value: string): {
        order(
          column: "created_at",
          options: { ascending: boolean }
        ): PromiseLike<{ data: SubscriptionPayment[] | null; error: RpcError }>;
      };
    };
  };
}

const subscriptionPaymentRpc = supabase as unknown as SubscriptionPaymentRpcClient;
const subscriptionPaymentsQuery = supabase as unknown as SubscriptionPaymentsQueryClient;

function mapSubscriptionPaymentRpcError(message: string | undefined): string {
  const value = message ?? "";

  if (value.includes("FORBIDDEN")) return "Apenas admins podem processar pagamentos";
  if (value.includes("SUBSCRIPTION_NOT_FOUND")) return "Assinatura nao encontrada";
  if (value.includes("INVALID_PAYMENT_AMOUNT")) return "Valor de pagamento invalido";
  if (value.includes("INVALID_PAYMENT_METHOD")) return "Metodo de pagamento invalido";
  if (value.includes("INVALID_EXTERNAL_REFERENCE")) return "Referencia externa invalida";
  if (value.includes("INVALID_SUBSCRIPTION_STATUS")) return "Status da assinatura invalido";
  if (value.includes("SUBSCRIPTION_CREDITS_NOT_CONFIGURED")) {
    return "Creditos da assinatura nao configurados";
  }
  if (value.includes("USER_NOT_FOUND")) return "Usuario nao encontrado";
  if (value.includes("INVALID_COINS_AMOUNT")) return "Quantidade de coins invalida";
  if (value.includes("COINS_DESCRIPTION_REQUIRED")) return "Motivo obrigatorio";

  return value || "Erro ao processar pagamento";
}

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

      const { data, error } = await subscriptionPaymentRpc.rpc(
        "admin_process_subscription_payment",
        {
          p_subscription_id: subscription_id,
          p_amount: amount,
          p_payment_method: payment_method,
          p_external_reference: external_reference ?? null,
        },
      );

      if (error) {
        throw new Error(mapSubscriptionPaymentRpcError(error.message));
      }

      return data as ProcessSubscriptionPaymentRpcResult;
    },
    onSuccess: (data) => {
      // Invalida caches
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: coinsBalanceKeys.all,
      });
      invalidateCoinsTransactions(queryClient);

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

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Não autenticado');
      }

      const { error: coinsError } = await subscriptionPaymentRpc.rpc("admin_add_coins_to_user", {
        p_user_id: user_id,
        p_amount: amount,
        p_description: `Ajuste manual: ${reason}`,
        p_reference_id: user.id,
        p_reference_type: 'admin_adjustment',
      });

      if (coinsError) {
        throw new Error(mapSubscriptionPaymentRpcError(coinsError.message));
      }

      return { success: true, amount };
    },
    onSuccess: (data, variables) => {
      invalidateCoinsBalance(queryClient, variables.user_id);
      invalidateCoinsTransactions(queryClient);

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
      const { data, error } = await subscriptionPaymentsQuery
        .from('subscription_payments')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Erro ao buscar pagamentos: ${error.message}`);
      }

      return data || [];
    },
    staleTime: 60 * 1000, // 1 minuto
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

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
