/**
 * Compatibility wrapper for the canonical coin balance hook.
 *
 * New code should import from "@/hooks/coins". This module remains only for
 * older screens that still expect the userCoinsKeys/useUserCoins names.
 */

import { coinsBalanceKeys, useCoinsBalance } from "@/hooks/coins/useCoinsBalance";
import type { CoinsAmount, CoinsBalanceResponse, UserId } from "@/types/coins";

export type UserCoinsBalance = CoinsBalanceResponse;

export const userCoinsKeys = {
  all: coinsBalanceKeys.all,
  balance: (userId: UserId) => coinsBalanceKeys.user(userId),
};

export function useUserCoins(userId?: UserId | null) {
  return useCoinsBalance(userId ?? null, { enabled: !!userId });
}

export function useHasSufficientBalance(userId?: UserId | null, requiredAmount?: CoinsAmount) {
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

export function useBalanceAfterPurchase(userId?: UserId | null, price?: CoinsAmount) {
  const { data: coinsData } = useUserCoins(userId);

  if (!coinsData || price === undefined) {
    return null;
  }

  const balanceAfter = coinsData.balance - price;
  return balanceAfter >= 0 ? balanceAfter : null;
}
