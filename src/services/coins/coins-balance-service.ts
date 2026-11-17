import { assertCurrentUserId } from "@/services/auth/current-user";
import { getTonecosCurrentUser } from "@/services/customer/tonecos-account-service";
import { getMyTonecosCoinBalance } from "@/services/coins/tonecos-coins-service";
import type { CoinsBalanceResponse, UserId } from "@/types/coins";

/** Compatibility adapter: all customer balances now come from the TONART ledger. */
export async function fetchCoinsBalance(userId?: UserId | null): Promise<CoinsBalanceResponse> {
  if (userId) await assertCurrentUserId(userId);
  const identity = await getTonecosCurrentUser();
  if (!identity) throw new Error("tonecos_login_required");
  const balance = await getMyTonecosCoinBalance();
  return {
    user_id: identity.id,
    balance: balance.balance,
    total_earned: balance.totalEarned,
    total_spent: balance.totalSpent,
    last_updated: balance.updatedAt,
    updated_at: balance.updatedAt,
  };
}
