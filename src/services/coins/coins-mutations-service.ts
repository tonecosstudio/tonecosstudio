import { supabase } from "@/integrations/supabase/client";
import { assertCurrentUserId } from "@/services/auth/current-user";
import type { CoinsAmount, PurchaseWithCoinsResponse, UserId } from "@/types/coins";

type RpcError = {
  message: string;
};

type InitializeCoinBalanceResponse = {
  success: boolean;
  balance: CoinsAmount;
  transaction_id: string | null;
};

function unwrapRpcData<T>(data: T | null, error: RpcError | null, fallback: string): T {
  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error(fallback);
  }

  return data;
}

export async function initializeCurrentUserCoinBalanceRpc(input: {
  description?: string | null;
} = {}): Promise<InitializeCoinBalanceResponse> {
  const { data, error } = await supabase.rpc("initialize_current_user_coin_balance", {
    p_initial_amount: 0,
    p_description: input.description ?? undefined,
  });

  return unwrapRpcData(
    data as InitializeCoinBalanceResponse | null,
    error,
    "Coin balance initialization did not return data",
  );
}

export async function refundCoinPurchaseForCurrentUserRpc(input: {
  userId?: UserId;
  itemId: string;
  itemType: "character" | "collection";
  reason: string;
}): Promise<PurchaseWithCoinsResponse> {
  if (input.userId) {
    await assertCurrentUserId(input.userId);
  }

  const { data, error } = await supabase.rpc("refund_coin_purchase_for_current_user", {
    p_item_id: input.itemId,
    p_item_type: input.itemType,
    p_reason: input.reason,
  });

  return unwrapRpcData(
    data as PurchaseWithCoinsResponse | null,
    error,
    "Coin refund did not return data",
  );
}
