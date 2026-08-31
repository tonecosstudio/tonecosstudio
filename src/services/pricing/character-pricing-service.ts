import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import { assertCurrentUserId } from "@/services/auth/current-user";
import {
  isValidMultiplier,
  isValidPriceInCoins,
  type PriceInCoins,
} from "@/types/contextual-pricing";

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
  if (!isValidPriceInCoins(value as number)) {
    throw new Error(`Preco do personagem indisponivel: ${context}`);
  }

  return value as PriceInCoins;
}

function requireBasePrice(
  rows: BasePriceReferenceRow[],
  acceptedNames: readonly string[],
  label: string,
): PriceInCoins {
  const rawValue = rows.find((row) =>
    acceptedNames.includes(row.collection_types?.name ?? ""),
  )?.base_price_coins;

  if (!isValidPriceInCoins(rawValue as number)) {
    throw new Error(`Configuracao oficial de preco ausente ou invalida: ${label}`);
  }

  return rawValue as PriceInCoins;
}

function requireContextMultiplier(
  rows: PricingContextMultiplierRow[],
  context: string,
): number {
  const rawValue = rows.find((row) => row.user_context === context)?.multiplier;

  if (
    typeof rawValue !== "number" ||
    !Number.isFinite(rawValue) ||
    !isValidMultiplier(rawValue) ||
    rawValue > 10
  ) {
    throw new Error(
      `Configuracao oficial de multiplicador ausente ou invalida: ${context}`,
    );
  }

  return rawValue;
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
  const multiplier = character.price_multiplier ?? 1;

  if (!isValidMultiplier(multiplier) || multiplier > 10) {
    throw new Error("Multiplicador do personagem invalido.");
  }

  const finalPrice = requirePriceInCoins(
    Math.round(basePrice * multiplier),
    characterId,
  );

  return {
    character_id: character.id,
    character_name: character.name,
    collection_price: basePrice,
    price_multiplier: multiplier,
    final_price: finalPrice,
    has_multiplier:
      character.price_multiplier !== null && character.price_multiplier !== 1,
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

  return data?.price_multiplier !== null && data?.price_multiplier !== 1;
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

  const activeBasePrices = basePrices ?? [];
  const activeMultipliers = multipliers ?? [];

  const subscriptionBase = requireBasePrice(
    activeBasePrices,
    ["subscription"],
    "subscription",
  );
  const standardBase = requireBasePrice(
    activeBasePrices,
    ["standard_catalog", "standard"],
    "standard_catalog",
  );
  const premiumBase = requireBasePrice(
    activeBasePrices,
    ["premium_catalog", "premium"],
    "premium_catalog",
  );

  const chosenMultiplier = requireContextMultiplier(
    activeMultipliers,
    "subscribed_chosen",
  );
  const notChosenMultiplier = requireContextMultiplier(
    activeMultipliers,
    "subscribed_not_chosen",
  );
  const noSubscriptionMultiplier = requireContextMultiplier(
    activeMultipliers,
    "no_subscription",
  );

  const activeCollectionPrice = requirePriceInCoins(
    Math.round(subscriptionBase * chosenMultiplier),
    "subscription/subscribed_chosen",
  );
  const secondaryCollectionPrice = requirePriceInCoins(
    Math.round(subscriptionBase * notChosenMultiplier),
    "subscription/subscribed_not_chosen",
  );

  return {
    colecaoAtiva: activeCollectionPrice,
    colecaoSecundaria: secondaryCollectionPrice,
    catalogoGeral: standardBase,
    premium: premiumBase,
    baseReference: subscriptionBase,
    multipliers: {
      chosen: chosenMultiplier,
      notChosen: notChosenMultiplier,
      noSubscription: noSubscriptionMultiplier,
    },
  };
}
