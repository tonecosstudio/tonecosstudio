// @ts-nocheck
/**
 * Hook para gerenciar saldo de coins do usuário
 * 
 * Busca e monitora o saldo de coins do usuário
 * 
 * Spec: contextual-pricing-system
 * Task: 5.6 (Sistema de Coins)
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PriceInCoins } from "@/types/contextual-pricing";

// =====================================================
// TYPES
// =====================================================

export interface UserCoinsBalance {
  user_id: string;
  balance: PriceInCoins;
  total_earned: PriceInCoins;
  total_spent: PriceInCoins;
  created_at: string;
  updated_at: string;
}

// =====================================================
// QUERY KEYS
// =====================================================

export const userCoinsKeys = {
  all: ["user-coins"] as const,
  balance: (userId: string) => [...userCoinsKeys.all, "balance", userId] as const,
};

// =====================================================
// QUERIES
// =====================================================

/**
 * Hook para buscar saldo de coins do usuário
 * 
 * Cache: 30 segundos (atualiza frequentemente para refletir compras)
 * 
 * @param userId - ID do usuário
 * @returns Saldo em coins
 */
export function useUserCoins(userId?: string | null) {
  return useQuery({
    queryKey: userId ? userCoinsKeys.balance(userId) : ["user-coins", "anonymous"],
    queryFn: async () => {
      if (!userId) {
        return { balance: 0, user_id: "", updated_at: "" };
      }

      const { data, error } = await supabase
        .from("user_coins")
        .select("*")
        .eq("user_id", userId)
        .single();

      // Se não existe registro, retornar saldo zero (será criado automaticamente)
      if (error) {
        if (error.code === 'PGRST116') {
          return {
            user_id: userId,
            balance: 0,
            total_earned: 0,
            total_spent: 0,
            updated_at: new Date().toISOString(),
          } as UserCoinsBalance;
        }
        throw error;
      }

      return data as UserCoinsBalance;
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook helper para verificar se usuário tem saldo suficiente
 * 
 * @param userId - ID do usuário
 * @param requiredAmount - Quantidade necessária de coins
 * @returns true se saldo >= requiredAmount
 */
export function useHasSufficientBalance(userId?: string | null, requiredAmount?: PriceInCoins) {
  const { data: coinsData } = useUserCoins(userId);

  if (!coinsData || requiredAmount === undefined) {
    return {
      hasSufficient: false,
      balance: 0,
      required: requiredAmount || 0,
      missing: requiredAmount || 0,
    };
  }

  const hasSufficient = coinsData.balance >= requiredAmount;
  const missing = hasSufficient ? 0 : requiredAmount - coinsData.balance;

  return {
    hasSufficient,
    balance: coinsData.balance,
    required: requiredAmount,
    missing,
  };
}

/**
 * Hook para calcular saldo após compra
 * 
 * @param userId - ID do usuário
 * @param price - Preço da compra
 * @returns Saldo após compra (ou null se insuficiente)
 */
export function useBalanceAfterPurchase(userId?: string | null, price?: PriceInCoins) {
  const { data: coinsData } = useUserCoins(userId);

  if (!coinsData || price === undefined) {
    return null;
  }

  const balanceAfter = coinsData.balance - price;
  return balanceAfter >= 0 ? balanceAfter : null;
}
