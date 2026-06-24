import { supabase } from "@/integrations/supabase/client";
import { assertCurrentUserId, requireAuthenticatedUserId } from "@/services/auth/current-user";
import type { CoinsBalanceResponse, UserId } from "@/types/coins";

export async function fetchCoinsBalance(userId?: UserId | null): Promise<CoinsBalanceResponse> {
  let targetUserId = userId;

  if (!targetUserId) {
    targetUserId = await requireAuthenticatedUserId();
  } else {
    await assertCurrentUserId(targetUserId);
  }

  const { data, error } = await supabase
    .from("user_coins")
    .select("balance, total_earned, total_spent, updated_at")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar saldo de coins: ${error.message}`);
  }

  if (!data) {
    const now = new Date().toISOString();

    return {
      user_id: targetUserId,
      balance: 0,
      total_earned: 0,
      total_spent: 0,
      last_updated: now,
      updated_at: now,
    };
  }

  return {
    user_id: targetUserId,
    balance: data.balance,
    total_earned: data.total_earned,
    total_spent: data.total_spent,
    last_updated: data.updated_at,
    updated_at: data.updated_at,
  };
}
