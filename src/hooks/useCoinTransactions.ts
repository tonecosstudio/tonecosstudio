/**
 * Compatibility wrapper for coin transaction history.
 *
 * New code should import from "@/hooks/coins". This module keeps the legacy
 * names while using the same ledger semantics as the canonical coin system.
 */

import { useQuery } from "@tanstack/react-query";
import { summarizeCoinLedger } from "@/lib/coins-ledger";
import { listLegacyCoinTransactions } from "@/services/coins/coins-transactions-service";
import type { CoinsAmount, UserId } from "@/types/coins";

export type TransactionType =
  | "purchase"
  | "spend"
  | "refund"
  | "bonus"
  | "subscription_credit"
  | "adjustment";

export interface CoinTransaction {
  id: string;
  user_id: UserId;
  amount: CoinsAmount;
  transaction_type: TransactionType;
  reference_id?: string | null;
  reference_type?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export const coinTransactionsKeys = {
  all: ["coin-transactions"] as const,
  list: (userId: UserId, limit?: number) =>
    [...coinTransactionsKeys.all, "list", userId, limit || "all"] as const,
};

export function useCoinTransactions(userId?: UserId | null, limit: number = 50) {
  return useQuery({
    queryKey: userId ? coinTransactionsKeys.list(userId, limit) : ["coin-transactions", "anonymous"],
    queryFn: (): Promise<CoinTransaction[]> => listLegacyCoinTransactions(userId, limit),
    enabled: !!userId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useTotalCoinsSpent(userId?: UserId | null) {
  const { data: transactions } = useCoinTransactions(userId);

  if (!transactions) {
    return 0;
  }

  return summarizeCoinLedger(transactions).totalSpent;
}

export function useTotalCoinsEarned(userId?: UserId | null) {
  const { data: transactions } = useCoinTransactions(userId);

  if (!transactions) {
    return 0;
  }

  return summarizeCoinLedger(transactions).totalEarned;
}

export function formatTransactionType(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
    purchase: "Compra de Coins",
    spend: "Compra de Personagem",
    refund: "Reembolso",
    bonus: "Bonus",
    subscription_credit: "Credito de Assinatura",
    adjustment: "Ajuste Manual",
  };

  return labels[type] || type;
}

export function getTransactionColor(amount: number): string {
  return amount >= 0 ? "text-green-600" : "text-red-600";
}
