import { supabase } from "@/integrations/supabase/client";
import { assertCurrentUserId } from "@/services/auth/current-user";
import type { CoinsAmount, PurchaseWithCoinsResponse } from "@/types/coins";
import type { PurchaseCharacterParams, UserId } from "@/types/coins";

type RpcError = {
  message: string;
};

type InitializeCoinBalanceResponse = {
  success: boolean;
  balance: CoinsAmount;
  transaction_id: string | null;
};

type PurchaseCoinsRpcResult = {
  success: boolean;
  message: string;
  new_balance: CoinsAmount;
  transaction_id?: string | null;
};

export interface PurchaseCollectionParams {
  user_id: UserId;
  collection_id: string;
}

function unwrapRpcData<T>(data: T | null, error: RpcError | null, fallback: string): T {
  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error(fallback);
  }

  return data;
}

function firstPurchaseRpcResult(data: PurchaseCoinsRpcResult | PurchaseCoinsRpcResult[] | null) {
  return Array.isArray(data) ? data[0] : data;
}

function toPurchaseResponse(
  result: PurchaseCoinsRpcResult | null | undefined,
  itemId: string,
  fallbackMessage: string,
): PurchaseWithCoinsResponse {
  if (!result?.success) {
    throw new Error(result?.message ?? fallbackMessage);
  }

  return {
    success: result.success,
    message: result.message,
    new_balance: result.new_balance,
    item_id: itemId,
    transaction_id: result.transaction_id || "",
  };
}

export async function initializeCurrentUserCoinBalanceRpc(input: {
  description?: string | null;
} = {}): Promise<InitializeCoinBalanceResponse> {
  const { data, error } = await supabase.rpc("initialize_current_user_coin_balance", {
    p_initial_amount: 0,
    p_description: input.description ?? null,
  });

  return unwrapRpcData(data, error, "Coin balance initialization did not return data");
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

  return unwrapRpcData(data, error, "Coin refund did not return data");
}

export async function purchaseCharacterWithCoinsForCurrentUser(
  params: PurchaseCharacterParams,
): Promise<PurchaseWithCoinsResponse> {
  const { user_id, character_id } = params;
  await assertCurrentUserId(user_id);

  const { data, error } = await supabase.rpc("purchase_character_with_coins", {
    p_user_id: user_id,
    p_character_id: character_id,
  });

  if (error) {
    throw new Error(error.message);
  }

  return toPurchaseResponse(
    firstPurchaseRpcResult(data),
    character_id,
    "Compra de personagem nao retornou resultado.",
  );
}

export async function purchaseCollectionWithCoinsForCurrentUser(
  params: PurchaseCollectionParams,
): Promise<PurchaseWithCoinsResponse> {
  const { user_id, collection_id } = params;
  await assertCurrentUserId(user_id);

  const { data, error } = await supabase.rpc("purchase_collection_with_coins", {
    p_user_id: user_id,
    p_collection_id: collection_id,
  });

  if (error) {
    throw new Error(error.message);
  }

  return toPurchaseResponse(
    firstPurchaseRpcResult(data),
    collection_id,
    "Compra de colecao nao retornou resultado.",
  );
}
