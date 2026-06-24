import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import { assertCurrentUserId } from "@/services/auth/current-user";
import type { PriceInCoins } from "@/types/contextual-pricing";

export interface CharacterPriceParams {
  characterId: string;
  userId?: string | null;
}

export interface CharacterPriceResponse {
  price: PriceInCoins;
  collection_price: PriceInCoins;
  price_multiplier: number;
  has_multiplier: boolean;
}

export interface CharacterPriceDetails {
  character_id: string;
  character_name: string;
  collection_price: PriceInCoins;
  price_multiplier: number;
  final_price: PriceInCoins;
  has_multiplier: boolean;
  formula: string;
}

export interface CharacterPricesReference {
  colecaoAtiva: number;
  colecaoSecundaria: number;
  catalogoGeral: number;
  premium: number;
  baseReference: number;
  multipliers: {
    chosen: number;
    notChosen: number;
    noSubscription: number;
  };
}

type RpcError = { message: string } | null;

type CharacterPricingRow = {
  id: string;
  name: string;
  collection_id: string | null;
  price_multiplier: number | null;
};

interface BasePriceReferenceRow {
  base_price_coins: number;
  collection_types: {
    name: string;
  } | null;
}

interface PricingContextMultiplierRow {
  user_context: string;
  multiplier: number;
}

interface CharacterPricingSupabaseClient {
  rpc(
    functionName: "get_character_price",
    args: {
      p_character_id: string;
      p_user_id: string | null;
    },
  ): PromiseLike<{ data: number | null; error: RpcError }>;
  rpc(
    functionName: "get_collection_price",
    args: {
      p_collection_id: string;
      p_user_id: string | null;
    },
  ): PromiseLike<{ data: number | null; error: RpcError }>;
  from(table: "characters"): {
    select(columns: string): {
      eq(
        column: "id",
        value: string,
      ): {
        single(): PromiseLike<{
          data: CharacterPricingRow | null;
          error: RpcError;
        }>;
      };
    };
  };
  from(table: "collection_base_pricing"): {
    select(columns: string): {
      eq(
        column: "is_active",
        value: true,
      ): PromiseLike<{
        data: BasePriceReferenceRow[] | null;
        error: RpcError;
      }>;
    };
  };
  from(table: "pricing_context_multipliers"): {
    select(columns: string): {
      eq(
        column: "is_active",
        value: true,
      ): PromiseLike<{
        data: PricingContextMultiplierRow[] | null;
        error: RpcError;
      }>;
    };
  };
}

const characterPricingSupabase =
  supabase as unknown as CharacterPricingSupabaseClient;

function requirePriceInCoins(
  value: number | null,
  context: string,
): PriceInCoins {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Preco do personagem indisponivel: ${context}`);
  }

  return value;
}

async function resolvePricingUserId(
  userId?: string | null,
): Promise<string | null> {
  if (!userId) {
    return null;
  }

  return assertCurrentUserId(userId);
}

async function fetchCharacterPrice(
  characterId: string,
  userId: string | null,
): Promise<PriceInCoins> {
  const { data, error } = await characterPricingSupabase.rpc(
    "get_character_price",
    {
      p_character_id: characterId,
      p_user_id: userId,
    },
  );

  if (error) {
    throw new Error(`Erro ao calcular preco do personagem: ${error.message}`);
  }

  return requirePriceInCoins(data, characterId);
}

export async function getCharacterPrice(
  params: CharacterPriceParams,
): Promise<PriceInCoins> {
  const userId = await resolvePricingUserId(params.userId);
  return fetchCharacterPrice(params.characterId, userId);
}

export async function listCharacterPrices(
  characterIds: string[],
  userId?: string | null,
): Promise<Record<string, PriceInCoins | null>> {
  const resolvedUserId = await resolvePricingUserId(userId);

  const pricePromises = characterIds.map(async (characterId) => {
    try {
      return {
        characterId,
        price: await fetchCharacterPrice(characterId, resolvedUserId),
      };
    } catch (error) {
      log.error("Failed to calculate character price", {
        error,
        characterId,
        userId,
      });
      return { characterId, price: null };
    }
  });

  const results = await Promise.all(pricePromises);

  return results.reduce<Record<string, PriceInCoins | null>>((acc, result) => {
    acc[result.characterId] = result.price;
    return acc;
  }, {});
}

export async function getCharacterPriceDetails(
  characterId: string,
  userId?: string | null,
): Promise<CharacterPriceDetails> {
  const resolvedUserId = await resolvePricingUserId(userId);

  const { data: character, error: charError } = await characterPricingSupabase
    .from("characters")
    .select("id, name, price_multiplier, collection_id")
    .eq("id", characterId)
    .single();

  if (charError) {
    throw new Error(`Erro ao buscar personagem: ${charError.message}`);
  }

  if (!character?.collection_id) {
    throw new Error("Personagem sem colecao associada");
  }

  const { data: collectionPrice, error: priceError } =
    await characterPricingSupabase.rpc("get_collection_price", {
      p_collection_id: character.collection_id,
      p_user_id: resolvedUserId,
    });

  if (priceError) {
    throw new Error(`Erro ao calcular preco da colecao: ${priceError.message}`);
  }

  const basePrice = requirePriceInCoins(
    collectionPrice,
    character.collection_id,
  );
  const multiplier = character.price_multiplier ?? 1.0;
  const finalPrice = Math.round(basePrice * multiplier) as PriceInCoins;

  return {
    character_id: character.id,
    character_name: character.name,
    collection_price: basePrice,
    price_multiplier: multiplier,
    final_price: finalPrice,
    has_multiplier:
      character.price_multiplier !== null && character.price_multiplier !== 1.0,
    formula: `${basePrice} x ${multiplier} = ${finalPrice} coins`,
  };
}

export async function hasCharacterMultiplier(
  characterId: string,
): Promise<boolean> {
  const { data, error } = await characterPricingSupabase
    .from("characters")
    .select("price_multiplier")
    .eq("id", characterId)
    .single();

  if (error) {
    log.error("Failed to check character multiplier", { error, characterId });
    return false;
  }

  return data?.price_multiplier !== null && data?.price_multiplier !== 1.0;
}

export async function getCharacterPricesReference(): Promise<CharacterPricesReference> {
  const { data: basePrices, error: basePricesError } =
    await characterPricingSupabase
      .from("collection_base_pricing")
      .select(
        `
      base_price_coins,
      collection_types (name)
    `,
      )
      .eq("is_active", true);

  if (basePricesError) {
    throw basePricesError;
  }

  const { data: multipliers, error: multipliersError } =
    await characterPricingSupabase
      .from("pricing_context_multipliers")
      .select("*")
      .eq("is_active", true);

  if (multipliersError) {
    throw multipliersError;
  }

  const activeBasePrices = basePrices || [];
  const activeMultipliers = multipliers || [];

  const subscriptionBase =
    activeBasePrices.find((p) => p.collection_types?.name === "subscription")
      ?.base_price_coins || 200;
  const standardBase =
    activeBasePrices.find(
      (p) => p.collection_types?.name === "standard_catalog",
    )?.base_price_coins || 300;
  const premiumBase =
    activeBasePrices.find((p) => p.collection_types?.name === "premium_catalog")
      ?.base_price_coins || 450;

  const chosenMultiplier =
    activeMultipliers.find((m) => m.user_context === "subscribed_chosen")
      ?.multiplier || 1.0;
  const notChosenMultiplier =
    activeMultipliers.find((m) => m.user_context === "subscribed_not_chosen")
      ?.multiplier || 1.2;
  const noSubscriptionMultiplier =
    activeMultipliers.find((m) => m.user_context === "no_subscription")
      ?.multiplier || 1.5;

  const baseReference = subscriptionBase;

  return {
    colecaoAtiva: Math.round(baseReference * chosenMultiplier),
    colecaoSecundaria: Math.round(baseReference * notChosenMultiplier),
    catalogoGeral: standardBase,
    premium: premiumBase,
    baseReference,
    multipliers: {
      chosen: chosenMultiplier,
      notChosen: notChosenMultiplier,
      noSubscription: noSubscriptionMultiplier,
    },
  };
}
