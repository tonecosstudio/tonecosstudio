/**
 * Hook unificado para gerenciar saldo de coins
 * 
 * Este hook substitui implementações duplicadas e fornece
 * uma interface consistente para acessar o saldo de coins.
 * 
 * @module hooks/coins/useCoinsBalance
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  CoinsBalance,
  CoinsAmount,
  UserId,
  CoinsBalanceResponse,
} from '@/types/coins';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const coinsBalanceKeys = {
  all: ['coins', 'balance'] as const,
  user: (userId: UserId) => [...coinsBalanceKeys.all, userId] as const,
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
 * Hook para buscar saldo de coins de um usuário
 * 
 * @param userId - ID do usuário (opcional, usa usuário logado se não fornecido)
 * @returns Query com saldo de coins
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data: balance, isLoading } = useCoinsBalance();
 *   
 *   if (isLoading) return <Loading />;
 *   
 *   return <div>Você tem {balance?.balance} coins</div>;
 * }
 * ```
 */
export function useCoinsBalance(userId?: UserId | null) {
  return useQuery({
    queryKey: userId ? coinsBalanceKeys.user(userId) : coinsBalanceKeys.all,
    queryFn: async (): Promise<{ balance: number; last_updated: string }> => {
      // Se userId não foi fornecido, busca usuário logado
      let targetUserId = userId;
      
      if (!targetUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          throw new Error('Usuário não autenticado');
        }
        
        targetUserId = user.id;
      }
      
      // Busca saldo de coins
      const { data, error } = await supabase
        .from('user_coins')
        .select('balance, updated_at')
        .eq('user_id', targetUserId)
        .maybeSingle();
      
      if (error) {
        throw new Error(`Erro ao buscar saldo de coins: ${error.message}`);
      }
      
      // Se usuário não tem registro de coins, retorna saldo zero
      if (!data) {
        return {
          balance: 0,
          last_updated: new Date().toISOString(),
        };
      }
      
      return {
        balance: data.balance,
        last_updated: data.updated_at,
      };
    },
    enabled: true,
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
    retry: 2,
  });
}

// ============================================================================
// HOOK DE VALIDAÇÃO
// ============================================================================

/**
 * Hook para verificar se usuário tem saldo suficiente
 * 
 * @param userId - ID do usuário
 * @param requiredAmount - Quantidade de coins necessária
 * @returns Query com resultado da validação
 * 
 * @example
 * ```tsx
 * function PurchaseButton({ price }: { price: number }) {
 *   const { data: hasSufficient } = useHasSufficientBalance(null, price);
 *   
 *   return (
 *     <button disabled={!hasSufficient}>
 *       Comprar ({price} coins)
 *     </button>
 *   );
 * }
 * ```
 */
export function useHasSufficientBalance(
  userId: UserId | null,
  requiredAmount: CoinsAmount
) {
  const { data: balance } = useCoinsBalance(userId);
  
  return useQuery({
    queryKey: ['coins', 'sufficient', userId, requiredAmount],
    queryFn: async (): Promise<boolean> => {
      if (!balance) return false;
      return balance.balance >= requiredAmount;
    },
    enabled: !!balance && requiredAmount > 0,
    staleTime: CACHE_CONFIG.STALE_TIME,
  });
}

// ============================================================================
// HOOK DE SALDO APÓS COMPRA (PREVIEW)
// ============================================================================

/**
 * Hook para calcular saldo após uma compra (preview)
 * 
 * Útil para mostrar ao usuário quanto sobrará após a compra
 * 
 * @param userId - ID do usuário
 * @param price - Preço do item
 * @returns Saldo após compra (ou null se insuficiente)
 * 
 * @example
 * ```tsx
 * function PurchasePreview({ price }: { price: number }) {
 *   const { data: balanceAfter } = useBalanceAfterPurchase(null, price);
 *   
 *   if (balanceAfter === null) {
 *     return <div>Saldo insuficiente</div>;
 *   }
 *   
 *   return <div>Após a compra você terá {balanceAfter} coins</div>;
 * }
 * ```
 */
export function useBalanceAfterPurchase(
  userId: UserId | null,
  price: CoinsAmount
) {
  const { data: balance } = useCoinsBalance(userId);
  
  return useQuery({
    queryKey: ['coins', 'balance-after', userId, price],
    queryFn: async (): Promise<CoinsAmount | null> => {
      if (!balance) return null;
      
      const balanceAfter = balance.balance - price;
      
      // Se saldo ficaria negativo, retorna null
      if (balanceAfter < 0) return null;
      
      return balanceAfter;
    },
    enabled: !!balance && price > 0,
    staleTime: CACHE_CONFIG.STALE_TIME,
  });
}

// ============================================================================
// HOOK DE INICIALIZAÇÃO DE SALDO
// ============================================================================

/**
 * Hook para inicializar saldo de coins de um usuário
 * 
 * Usado quando usuário se cadastra ou faz primeira compra
 * 
 * @returns Mutation para inicializar saldo
 * 
 * @example
 * ```tsx
 * function WelcomeBonus() {
 *   const initBalance = useInitializeBalance();
 *   
 *   const handleClaim = () => {
 *     initBalance.mutate({
 *       userId: user.id,
 *       initialAmount: 1000,
 *       description: 'Bônus de boas-vindas'
 *     });
 *   };
 *   
 *   return <button onClick={handleClaim}>Resgatar 1000 coins</button>;
 * }
 * ```
 */
export function useInitializeBalance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (params: {
      userId: UserId;
      initialAmount: CoinsAmount;
      description: string;
    }) => {
      const { userId, initialAmount, description } = params;
      
      // Verifica se usuário já tem saldo
      const { data: existing } = await supabase
        .from('user_coins')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (existing) {
        throw new Error('Usuário já possui saldo de coins');
      }
      
      // Cria registro de saldo
      const { error: insertError } = await supabase
        .from('user_coins')
        .insert({
          user_id: userId,
          balance: initialAmount,
        } as any);
      
      if (insertError) {
        throw new Error(`Erro ao inicializar saldo: ${insertError.message}`);
      }
      
      // Registra transação
      const { error: txError } = await supabase
        .from('coin_transactions')
        .insert({
          user_id: userId,
          amount: initialAmount,
          transaction_type: 'bonus',
          description,
        });
      
      if (txError) {
        throw new Error(`Erro ao registrar transação: ${txError.message}`);
      }
      
      return { success: true, balance: initialAmount };
    },
    onSuccess: (data, variables) => {
      // Invalida cache do saldo
      queryClient.invalidateQueries({
        queryKey: coinsBalanceKeys.user(variables.userId),
      });
      
      toast({
        title: 'Saldo inicializado!',
        description: `Você recebeu ${data.balance} coins.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao inicializar saldo',
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
 * Invalida cache de saldo de coins
 * 
 * Útil após operações que modificam o saldo
 * 
 * @param queryClient - Cliente do React Query
 * @param userId - ID do usuário (opcional, invalida todos se não fornecido)
 */
export function invalidateCoinsBalance(
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: UserId
) {
  if (userId) {
    queryClient.invalidateQueries({
      queryKey: coinsBalanceKeys.user(userId),
    });
  } else {
    queryClient.invalidateQueries({
      queryKey: coinsBalanceKeys.all,
    });
  }
}

/**
 * Atualiza cache de saldo otimisticamente
 * 
 * Útil para feedback imediato ao usuário
 * 
 * @param queryClient - Cliente do React Query
 * @param userId - ID do usuário
 * @param newBalance - Novo saldo
 */
export function updateCoinsBalanceCache(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: UserId,
  newBalance: CoinsAmount
) {
  queryClient.setQueryData<{ balance: number; last_updated: string }>(
    coinsBalanceKeys.user(userId),
    (old) => {
      if (!old) return old;
      
      return {
        ...old,
        balance: newBalance,
        last_updated: new Date().toISOString(),
      };
    }
  );
}
