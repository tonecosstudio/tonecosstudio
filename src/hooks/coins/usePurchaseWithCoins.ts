/**
 * Hook para compras com coins
 *
 * Fornece funcionalidade para comprar personagens e coleções
 * usando coins, com validação de saldo e tratamento de erros.
 *
 * @module hooks/coins/usePurchaseWithCoins
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { assertCurrentUserId } from '@/services/auth/current-user';
import { refundCoinPurchaseForCurrentUserRpc } from '@/services/coins-mutations-service';
import type {
  CoinsAmount,
  UserId,
  PurchaseCharacterParams,
  PurchaseWithCoinsResponse,
} from '@/types/coins';
import { invalidateCoinsBalance } from './useCoinsBalance';
import { coinsTransactionsKeys } from './useCoinsTransactions';

// ============================================================================
// TIPOS
// ============================================================================

type PurchaseCoinsRpcResult = {
  success: boolean;
  message: string;
  new_balance: CoinsAmount;
  transaction_id?: string | null;
};

function firstPurchaseRpcResult(data: PurchaseCoinsRpcResult | PurchaseCoinsRpcResult[] | null) {
  return Array.isArray(data) ? data[0] : data;
}

/**
 * Parâmetros para compra de coleção
 */
export interface PurchaseCollectionParams {
  /** ID do usuário */
  user_id: UserId;
  /** ID da coleção */
  collection_id: string;
}

/**
 * Parâmetros para reembolso
 */
export interface RefundPurchaseParams {
  /** ID do usuário */
  user_id: UserId;
  /** ID do item (character ou collection) */
  item_id: string;
  /** Tipo do item */
  item_type: 'character' | 'collection';
  /** Motivo do reembolso */
  reason: string;
}

/**
 * Resultado de validação de compra
 */
export interface PurchaseValidation {
  /** Compra é válida? */
  is_valid: boolean;
  /** Saldo suficiente? */
  has_sufficient_balance: boolean;
  /** Saldo atual */
  current_balance: CoinsAmount;
  /** Preço do item */
  item_price: CoinsAmount;
  /** Saldo após compra */
  balance_after: CoinsAmount;
  /** Mensagem de erro (se houver) */
  error_message?: string;
}

// ============================================================================
// HOOK DE COMPRA DE PERSONAGEM
// ============================================================================

/**
 * Hook para comprar personagem com coins
 *
 * Executa compra atômica:
 * 1. Valida saldo
 * 2. Debita coins
 * 3. Adiciona personagem ao usuário
 * 4. Registra transação
 *
 * @returns Mutation para comprar personagem
 *
 * @example
 * ```tsx
 * function CharacterCard({ character }: { character: Character }) {
 *   const purchaseCharacter = usePurchaseCharacter();
 *
 *   const handlePurchase = () => {
 *     purchaseCharacter.mutate({
 *       user_id: user.id,
 *       character_id: character.id
 *     });
 *   };
 *
 *   return (
 *     <button
 *       onClick={handlePurchase}
 *       disabled={purchaseCharacter.isPending}
 *     >
 *       {purchaseCharacter.isPending ? 'Comprando...' : 'Comprar'}
 *     </button>
 *   );
 * }
 * ```
 */
export function usePurchaseCharacter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      params: PurchaseCharacterParams
    ): Promise<PurchaseWithCoinsResponse> => {
      const { user_id, character_id } = params;
      await assertCurrentUserId(user_id);

      // Chamar função RPC que faz compra atômica
      const { data, error } = await supabase.rpc('purchase_character_with_coins', {
        p_user_id: user_id,
        p_character_id: character_id,
      });

      if (error) {
        throw new Error(error.message);
      }

      const result = firstPurchaseRpcResult(data);
      if (!result?.success) {
        throw new Error(result?.message ?? 'Compra de personagem nao retornou resultado.');
      }

      return {
        success: result.success,
        message: result.message,
        new_balance: result.new_balance,
        item_id: character_id,
        transaction_id: result.transaction_id || '',
      };
    },
    onSuccess: (data, variables) => {
      // Invalida cache de saldo e transações
      invalidateCoinsBalance(queryClient, variables.user_id);
      queryClient.invalidateQueries({
        queryKey: coinsTransactionsKeys.user(variables.user_id),
      });

      // Invalida cache de personagens do usuário
      queryClient.invalidateQueries({
        queryKey: ['user-characters', variables.user_id],
      });

      toast({
        title: 'Compra realizada!',
        description: data.message,
      });
    },
    onError: (error: Error) => {
      let errorMessage = error.message;

      // Mensagens de erro mais amigáveis
      if (errorMessage.includes('insufficient')) {
        errorMessage = 'Saldo insuficiente para esta compra.';
      } else if (errorMessage.includes('already owns')) {
        errorMessage = 'Você já possui este personagem.';
      } else if (errorMessage.includes('not found')) {
        errorMessage = 'Personagem não encontrado.';
      }

      toast({
        title: 'Erro na compra',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// HOOK DE COMPRA DE COLEÇÃO
// ============================================================================

/**
 * Hook para comprar coleção com coins
 *
 * Similar ao purchase_character, mas para coleções completas
 *
 * @returns Mutation para comprar coleção
 *
 * @example
 * ```tsx
 * function CollectionCard({ collection }: { collection: Collection }) {
 *   const purchaseCollection = usePurchaseCollection();
 *
 *   const handlePurchase = () => {
 *     purchaseCollection.mutate({
 *       user_id: user.id,
 *       collection_id: collection.id
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handlePurchase}>
 *       Comprar Coleção
 *     </button>
 *   );
 * }
 * ```
 */
export function usePurchaseCollection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      params: PurchaseCollectionParams
    ): Promise<PurchaseWithCoinsResponse> => {
      const { user_id, collection_id } = params;
      await assertCurrentUserId(user_id);

      // Chamar função RPC (assumindo que existe)
      const { data, error } = await supabase.rpc('purchase_collection_with_coins', {
        p_user_id: user_id,
        p_collection_id: collection_id,
      });

      if (error) {
        throw new Error(error.message);
      }

      const result = firstPurchaseRpcResult(data);
      if (!result?.success) {
        throw new Error(result?.message ?? 'Compra de colecao nao retornou resultado.');
      }

      return {
        success: result.success,
        message: result.message,
        new_balance: result.new_balance,
        item_id: collection_id,
        transaction_id: result.transaction_id || '',
      };
    },
    onSuccess: (data, variables) => {
      // Invalida cache
      invalidateCoinsBalance(queryClient, variables.user_id);
      queryClient.invalidateQueries({
        queryKey: coinsTransactionsKeys.user(variables.user_id),
      });
      queryClient.invalidateQueries({
        queryKey: ['user-collections', variables.user_id],
      });

      toast({
        title: 'Compra realizada!',
        description: data.message,
      });
    },
    onError: (error: Error) => {
      let errorMessage = error.message;

      if (errorMessage.includes('insufficient')) {
        errorMessage = 'Saldo insuficiente para esta compra.';
      } else if (errorMessage.includes('already owns')) {
        errorMessage = 'Você já possui esta coleção.';
      } else if (errorMessage.includes('not found')) {
        errorMessage = 'Coleção não encontrada.';
      }

      toast({
        title: 'Erro na compra',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// HOOK DE VALIDAÇÃO DE COMPRA
// ============================================================================

/**
 * Hook para validar se compra pode ser realizada
 *
 * Verifica saldo e retorna informações detalhadas
 *
 * @param userId - ID do usuário
 * @param itemPrice - Preço do item
 * @returns Mutation para validar compra
 *
 * @example
 * ```tsx
 * function PurchaseButton({ price }: { price: number }) {
 *   const validatePurchase = useValidatePurchase();
 *
 *   const handleClick = async () => {
 *     const validation = await validatePurchase.mutateAsync({
 *       userId: user.id,
 *       itemPrice: price
 *     });
 *
 *     if (validation.is_valid) {
 *       // Prosseguir com compra
 *     } else {
 *       alert(validation.error_message);
 *     }
 *   };
 *
 *   return <button onClick={handleClick}>Validar Compra</button>;
 * }
 * ```
 */
export function useValidatePurchase() {
  return useMutation({
    mutationFn: async (params: {
      userId: UserId;
      itemPrice: CoinsAmount;
    }): Promise<PurchaseValidation> => {
      const { userId, itemPrice } = params;
      await assertCurrentUserId(userId);

      // Buscar saldo atual
      const { data: balanceData, error } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        throw new Error(`Erro ao validar compra: ${error.message}`);
      }

      const currentBalance = balanceData?.balance || 0;
      const hasSufficient = currentBalance >= itemPrice;
      const balanceAfter = currentBalance - itemPrice;

      return {
        is_valid: hasSufficient,
        has_sufficient_balance: hasSufficient,
        current_balance: currentBalance,
        item_price: itemPrice,
        balance_after: balanceAfter >= 0 ? balanceAfter : 0,
        error_message: hasSufficient
          ? undefined
          : `Saldo insuficiente. Você tem ${currentBalance} coins, mas precisa de ${itemPrice} coins.`,
      };
    },
  });
}

// ============================================================================
// HOOK DE REEMBOLSO
// ============================================================================

/**
 * Hook para reembolsar compra
 *
 * Reverte compra e devolve coins ao usuário
 *
 * @returns Mutation para reembolsar
 *
 * @example
 * ```tsx
 * function RefundButton({ purchaseId }: { purchaseId: string }) {
 *   const refund = useRefundPurchase();
 *
 *   const handleRefund = () => {
 *     refund.mutate({
 *       user_id: user.id,
 *       item_id: purchaseId,
 *       item_type: 'character',
 *       reason: 'Cliente solicitou reembolso'
 *     });
 *   };
 *
 *   return <button onClick={handleRefund}>Solicitar Reembolso</button>;
 * }
 * ```
 */
export function useRefundPurchase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      params: RefundPurchaseParams
    ): Promise<PurchaseWithCoinsResponse> => {
      const { user_id, item_id, item_type, reason } = params;
      await assertCurrentUserId(user_id);

      return refundCoinPurchaseForCurrentUserRpc({
        itemId: item_id,
        itemType: item_type,
        reason,
      });
    },
    onSuccess: (data, variables) => {
      // Invalida cache
      invalidateCoinsBalance(queryClient, variables.user_id);
      queryClient.invalidateQueries({
        queryKey: coinsTransactionsKeys.user(variables.user_id),
      });

      if (variables.item_type === 'character') {
        queryClient.invalidateQueries({
          queryKey: ['user-characters', variables.user_id],
        });
      } else {
        queryClient.invalidateQueries({
          queryKey: ['user-collections', variables.user_id],
        });
      }

      toast({
        title: 'Reembolso realizado!',
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro no reembolso',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// HOOK GENÉRICO DE COMPRA
// ============================================================================

/**
 * Hook genérico para comprar qualquer item com coins
 *
 * Detecta automaticamente o tipo de item e chama a função apropriada
 *
 * @returns Mutation para comprar item
 *
 * @example
 * ```tsx
 * function BuyButton({ item }: { item: Character | Collection }) {
 *   const purchase = usePurchaseItem();
 *
 *   const handlePurchase = () => {
 *     purchase.mutate({
 *       userId: user.id,
 *       itemId: item.id,
 *       itemType: 'type' in item ? 'character' : 'collection'
 *     });
 *   };
 *
 *   return <button onClick={handlePurchase}>Comprar</button>;
 * }
 * ```
 */
export function usePurchaseItem() {
  const purchaseCharacter = usePurchaseCharacter();
  const purchaseCollection = usePurchaseCollection();

  return useMutation({
    mutationFn: async (params: {
      userId: UserId;
      itemId: string;
      itemType: 'character' | 'collection';
    }) => {
      const { userId, itemId, itemType } = params;

      if (itemType === 'character') {
        return purchaseCharacter.mutateAsync({
          user_id: userId,
          character_id: itemId,
        });
      } else {
        return purchaseCollection.mutateAsync({
          user_id: userId,
          collection_id: itemId,
        });
      }
    },
  });
}
