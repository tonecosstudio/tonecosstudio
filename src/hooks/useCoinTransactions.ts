/**
 * Hook para gerenciar histórico de transações de coins
 * 
 * Busca e exibe transações de coins do usuário
 * 
 * Spec: contextual-pricing-system
 * Task: 5.8 (Sistema de Coins - Transactions)
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { assertCurrentUserId } from "@/services/auth/current-user";
import { PriceInCoins } from "@/types/contextual-pricing";

// =====================================================
// TYPES
// =====================================================

export type TransactionType = 
  | "purchase"              // Compra de pacote de coins
  | "spend"                 // Gasto em personagem
  | "refund"                // Reembolso
  | "bonus"                 // Bônus/presente
  | "subscription_credit"   // Crédito de assinatura mensal
  | "adjustment";           // Ajuste manual do admin

export interface CoinTransaction {
  id: string;
  user_id: string;
  amount: PriceInCoins;
  transaction_type: TransactionType;
  reference_id?: string;
  reference_type?: string;
  description: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

// =====================================================
// QUERY KEYS
// =====================================================

export const coinTransactionsKeys = {
  all: ["coin-transactions"] as const,
  list: (userId: string, limit?: number) => 
    [...coinTransactionsKeys.all, "list", userId, limit || "all"] as const,
};

// =====================================================
// QUERIES
// =====================================================

/**
 * Hook para buscar histórico de transações de coins
 * 
 * @param userId - ID do usuário
 * @param limit - Limite de transações (padrão: 50)
 * @returns Lista de transações ordenadas por data (DESC)
 */
export function useCoinTransactions(userId?: string | null, limit: number = 50) {
  return useQuery({
    queryKey: userId ? coinTransactionsKeys.list(userId, limit) : ["coin-transactions", "anonymous"],
    queryFn: async () => {
      if (!userId) {
        return [];
      }

      await assertCurrentUserId(userId);

      const { data, error } = await supabase
        .from("coin_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []) as CoinTransaction[];
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para calcular total gasto em coins
 * 
 * @param userId - ID do usuário
 * @returns Total de coins gastos (valor absoluto)
 */
export function useTotalCoinsSpent(userId?: string | null) {
  const { data: transactions } = useCoinTransactions(userId);

  if (!transactions) {
    return 0;
  }

  return transactions
    .filter((t) => t.amount < 0) // Apenas transações negativas (gastos)
    .reduce((total, t) => total + Math.abs(t.amount), 0);
}

/**
 * Hook para calcular total de coins adquiridos
 * 
 * @param userId - ID do usuário
 * @returns Total de coins adquiridos
 */
export function useTotalCoinsEarned(userId?: string | null) {
  const { data: transactions } = useCoinTransactions(userId);

  if (!transactions) {
    return 0;
  }

  return transactions
    .filter((t) => t.amount > 0) // Apenas transações positivas (ganhos)
    .reduce((total, t) => total + t.amount, 0);
}

/**
 * Formata tipo de transação para exibição
 */
export function formatTransactionType(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
    purchase: "Compra de Coins",
    spend: "Compra de Personagem",
    refund: "Reembolso",
    bonus: "Bônus",
    subscription_credit: "Crédito de Assinatura",
    adjustment: "Ajuste Manual",
  };

  return labels[type] || type;
}

/**
 * Retorna cor baseada no tipo de transação
 */
export function getTransactionColor(amount: number): string {
  return amount >= 0 ? "text-green-600" : "text-red-600";
}
