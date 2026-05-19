/**
 * Hook para processar compra de personagens
 * 
 * Integra com sistema de coins e valida saldo
 * 
 * Spec: contextual-pricing-system
 * Task: 5.7 (Sistema de Coins - Purchase)
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { userCoinsKeys } from "./useUserCoins";
import { PriceInCoins } from "@/types/contextual-pricing";
import { log } from "@/lib/logger";

// =====================================================
// TYPES
// =====================================================

export interface PurchaseCharacterParams {
  characterId: string;
  userId: string;
}

export interface PurchaseCharacterResponse {
  success: boolean;
  message: string;
  new_balance?: PriceInCoins;
  error_details?: {
    required: PriceInCoins;
    available: PriceInCoins;
    missing: PriceInCoins;
  };
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Hook para comprar personagem com coins
 * 
 * Valida saldo e processa compra atomicamente:
 * 1. Valida saldo suficiente
 * 2. Debita coins
 * 3. Registra transação
 * 4. Adiciona personagem ao usuário
 * 
 * Se qualquer etapa falhar, rollback automático
 * 
 * @returns Mutation para processar compra
 */
export function usePurchaseCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: PurchaseCharacterParams): Promise<PurchaseCharacterResponse> => {
      const { characterId, userId } = params;

      const { data, error } = await supabase.rpc("purchase_character_with_coins", {
        p_user_id: userId,
        p_character_id: characterId,
      });

      if (error) throw error;

      // A função retorna um array com um objeto
      const result = Array.isArray(data) ? data[0] : data;

      return {
        success: result.success,
        message: result.message,
        new_balance: result.new_balance,
      };
    },
    onSuccess: (data, variables) => {
      // Invalidar caches relevantes
      queryClient.invalidateQueries({ queryKey: userCoinsKeys.balance(variables.userId) });
      queryClient.invalidateQueries({ queryKey: ["user-characters"] });
      queryClient.invalidateQueries({ queryKey: ["coin-transactions"] });

      // Mostrar toast de sucesso
      toast({
        title: "Compra realizada!",
        description: data.message,
        variant: "default",
      });
    },
    onError: (error: Error, variables) => {
      log.error("Failed to purchase character with coins", {
        error,
        characterId: variables.characterId,
        userId: variables.userId,
      });

      // Verificar se é erro de saldo insuficiente
      const errorMessage = error.message || "Erro ao processar compra";
      const isInsufficientBalance = errorMessage.includes("saldo insuficiente") || 
                                    errorMessage.includes("Insufficient balance");

      if (isInsufficientBalance) {
        toast({
          title: "Saldo insuficiente",
          description: "Você não tem coins suficientes para esta compra.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro na compra",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });
}

/**
 * Hook para validar se usuário pode comprar personagem
 * 
 * Verifica:
 * - Saldo suficiente
 * - Personagem não possui ainda
 * - Personagem existe
 * 
 * @param userId - ID do usuário
 * @param characterId - ID do personagem
 * @param price - Preço do personagem
 * @returns Validação e mensagens de erro
 */
export async function validatePurchase(
  userId: string,
  characterId: string,
  price: PriceInCoins
): Promise<{ canPurchase: boolean; reason?: string }> {
  // Verificar saldo
  const { data: coinsData } = await supabase
    .from("user_coins")
    .select("balance")
    .eq("user_id", userId)
    .single();

  if (!coinsData || coinsData.balance < price) {
    return {
      canPurchase: false,
      reason: `Saldo insuficiente. Necessário: ${price} coins, Disponível: ${coinsData?.balance || 0} coins`,
    };
  }

  // Verificar se já possui
  const { data: existingCharacter } = await supabase
    .from("user_characters")
    .select("id")
    .eq("user_id", userId)
    .eq("character_id", characterId)
    .single();

  if (existingCharacter) {
    return {
      canPurchase: false,
      reason: "Você já possui este personagem",
    };
  }

  return { canPurchase: true };
}
