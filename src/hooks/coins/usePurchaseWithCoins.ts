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

/**
 * Parâmetros para compra de coleção
 */
export interface PurchaseCollectionParams {
  /** ID do usuário */
  user_id: UserId;
  /** ID da coleção */
  collection_id: string;
  /** Quantidade de coins (para validação) */
  coins_amount: CoinsAmount;
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
 *       character_id: character.id,
 *       coins_amount: character.price
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
      const { user_id, character_id, coins_amount } = params;

      // Chamar função RPC que faz compra atômica
      const { data, error } = await supabase.rpc('purchase_character_with_coins', {
        p_user_id: user_id,
        p_character_id: character_id,
        p_coins_amount: coins_amount,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Buscar novo saldo
      const { data: balanceData } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', user_id)
        .single();

      return {
        success: true,
        message: 'Personagem adquirido com sucesso!',
        new_balance: balanceData?.balance || 0,
        item_id: character_id,
        transaction_id: data?.transaction_id || '',
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
 *       collection_id: collection.id,
 *       coins_amount: collection.price
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
      const { user_id, collection_id, coins_amount } = params;

      // Chamar função RPC (assumindo que existe)
      const { data, error } = await supabase.rpc('purchase_collection_with_coins', {
        p_user_id: user_id,
        p_collection_id: collection_id,
        p_coins_amount: coins_amount,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Buscar novo saldo
      const { data: balanceData } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', user_id)
        .single();

      return {
        success: true,
        message: 'Coleção adquirida com sucesso!',
        new_balance: balanceData?.balance || 0,
        item_id: collection_id,
        transaction_id: data?.transaction_id || '',
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

      // Buscar compra original para saber quanto reembolsar
      const table = item_type === 'character' ? 'user_characters' : 'user_collections';

      const { data: purchaseData, error: fetchError } = await supabase
        .from(table)
        .select('price_paid')
        .eq('user_id', user_id)
        .eq(item_type === 'character' ? 'character_id' : 'collection_id', item_id)
        .single();

      if (fetchError || !purchaseData) {
        throw new Error('Compra não encontrada');
      }

      const refundAmount = purchaseData.price_paid;

      if (!refundAmount || refundAmount <= 0) {
        throw new Error('Valor de reembolso inválido');
      }

      // Adicionar coins de volta
      const { error: addError } = await supabase.rpc('add_coins_to_user', {
        p_user_id: user_id,
        p_amount: refundAmount,
        p_description: `Reembolso: ${reason}`,
        p_reference_id: item_id,
        p_reference_type: item_type,
      });

      if (addError) {
        throw new Error(`Erro ao reembolsar: ${addError.message}`);
      }

      // Remover item do usuário
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq('user_id', user_id)
        .eq(item_type === 'character' ? 'character_id' : 'collection_id', item_id);

      if (deleteError) {
        throw new Error(`Erro ao remover item: ${deleteError.message}`);
      }

      // Buscar novo saldo
      const { data: balanceData } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', user_id)
        .single();

      return {
        success: true,
        message: `Reembolso de ${refundAmount} coins realizado com sucesso!`,
        new_balance: balanceData?.balance || 0,
        item_id,
        transaction_id: '', // Não há transaction_id específico para reembolso
      };
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
 *       itemType: 'type' in item ? 'character' : 'collection',
 *       price: item.price
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
      price: CoinsAmount;
    }) => {
      const { userId, itemId, itemType, price } = params;

      if (itemType === 'character') {
        return purchaseCharacter.mutateAsync({
          user_id: userId,
          character_id: itemId,
          coins_amount: price,
        });
      } else {
        return purchaseCollection.mutateAsync({
          user_id: userId,
          collection_id: itemId,
          coins_amount: price,
        });
      }
    },
  });
}
