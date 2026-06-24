import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import { assertCurrentUserId } from "@/services/auth/current-user";
import type { CollectionPriceResponse } from "@/types/contextual-pricing";

interface CollectionPriceRpcClient {
  rpc(
    functionName: "get_collection_price",
    args: { p_collection_id: string; p_user_id: string | null },
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

const collectionPriceRpc = supabase as unknown as CollectionPriceRpcClient;

async function resolvePricingUserId(
  userId?: string | null,
): Promise<string | null> {
  if (!userId) {
    return null;
  }

  return assertCurrentUserId(userId);
}

async function fetchCollectionPrice(
  collectionId: string,
  userId: string | null,
): Promise<CollectionPriceResponse> {
  const { data, error } = await collectionPriceRpc.rpc("get_collection_price", {
    p_collection_id: collectionId,
    p_user_id: userId,
  });

  if (error) {
    throw new Error(`Erro ao calcular preco: ${error.message}`);
  }

  return data as CollectionPriceResponse;
}

export async function getCollectionPrice(params: {
  collectionId: string;
  userId?: string | null;
}): Promise<CollectionPriceResponse> {
  const userId = await resolvePricingUserId(params.userId);
  return fetchCollectionPrice(params.collectionId, userId);
}

export async function getCollectionPrices(
  collectionIds: string[],
  userId?: string | null,
): Promise<Record<string, CollectionPriceResponse | null>> {
  const resolvedUserId = await resolvePricingUserId(userId);

  const pricePromises = collectionIds.map(async (collectionId) => {
    try {
      const price = await fetchCollectionPrice(collectionId, resolvedUserId);
      return { collectionId, price, error: null };
    } catch (error) {
      log.error("Failed to calculate collection price", {
        error,
        collectionId,
        userId,
      });
      return {
        collectionId,
        price: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  const results = await Promise.all(pricePromises);

  return results.reduce(
    (acc, result) => {
      acc[result.collectionId] = result.price;
      return acc;
    },
    {} as Record<string, CollectionPriceResponse | null>,
  );
}

export async function hasCollectionDiscount(
  collectionId: string,
  userId?: string | null,
): Promise<boolean> {
  const resolvedUserId = await resolvePricingUserId(userId);

  if (!resolvedUserId) return false;

  const { data, error } = await supabase
    .from("subscription_collections")
    .select("id")
    .eq("collection_id", collectionId)
    .limit(1);

  if (error) {
    log.error("Failed to check collection discount", {
      error,
      collectionId,
      userId: resolvedUserId,
    });
    return false;
  }

  return data && data.length > 0;
}
