import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

interface JsonObject {
  [key: string]: JsonValue | undefined;
}

interface SubscriptionPlanLimitResult {
  id: string;
  collections_count: number;
}

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} invalido`);
  }
}

function compactPayload(input: Record<string, JsonValue | undefined>): JsonObject {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as JsonObject;
}

export async function upsertAdminSystemSettings(updates: Record<string, string>): Promise<void> {
  await callAdminRpc("admin_upsert_system_settings", {
    p_updates: updates,
  });
}

export async function updateAdminPaymentSetting(input: { key: string; value: string }): Promise<void> {
  await callAdminRpc("admin_update_payment_setting", {
    p_key: input.key,
    p_value: input.value,
  });
}

export async function updateAdminProductionSetting(input: { key: string; value: string }): Promise<void> {
  await callAdminRpc("admin_update_production_setting", {
    p_key: input.key,
    p_value: input.value,
  });
}

export async function updateSubscriptionPlanCollectionLimitRpc(
  planId: string,
  newLimit: number
): Promise<SubscriptionPlanLimitResult> {
  if (!Number.isInteger(newLimit)) {
    throw new Error("Limite de colecoes invalido");
  }

  const data = await callAdminRpc<SubscriptionPlanLimitResult[]>(
    "admin_update_subscription_plan_collection_limit",
    {
    p_plan_id: planId,
    p_collections_count: newLimit,
    }
  );

  const result = data?.[0];
  if (!result) {
    throw new Error("Plano nao encontrado");
  }

  return result;
}

export async function updateStandalonePricingRpc(input: {
  updates: Array<{ id?: string; price: number }>;
  pixDiscount: number;
}): Promise<void> {
  assertFiniteNumber(input.pixDiscount, "Desconto PIX");

  const updates = input.updates
    .filter((update): update is { id: string; price: number } => Boolean(update.id))
    .map((update) => {
      assertFiniteNumber(update.price, "Preco avulso");
      return { id: update.id, price: update.price };
    });

  await callAdminRpc("admin_update_standalone_pricing", {
    p_updates: updates,
    p_pix_discount: input.pixDiscount,
  });
}

export async function updateCollectionBasePricesRpc(params: {
  subscriptionPrice: number;
  standardPrice: number;
  premiumPrice: number;
}): Promise<void> {
  assertFiniteNumber(params.subscriptionPrice, "Preco subscription");
  assertFiniteNumber(params.standardPrice, "Preco standard");
  assertFiniteNumber(params.premiumPrice, "Preco premium");

  await callAdminRpc("admin_update_collection_base_prices", {
    p_subscription_price: params.subscriptionPrice,
    p_standard_price: params.standardPrice,
    p_premium_price: params.premiumPrice,
  });
}

export async function updatePricingContextMultipliersRpc(params: {
  chosenMultiplier: number;
  notChosenMultiplier: number;
  noSubscriptionMultiplier: number;
}): Promise<void> {
  assertFiniteNumber(params.chosenMultiplier, "Multiplicador escolhida");
  assertFiniteNumber(params.notChosenMultiplier, "Multiplicador nao escolhida");
  assertFiniteNumber(params.noSubscriptionMultiplier, "Multiplicador sem assinatura");

  await callAdminRpc("admin_update_pricing_context_multipliers", {
    p_chosen_multiplier: params.chosenMultiplier,
    p_not_chosen_multiplier: params.notChosenMultiplier,
    p_no_subscription_multiplier: params.noSubscriptionMultiplier,
  });
}

export async function savePricingTierPlanRpc(input: {
  id?: string;
  data: JsonObject;
}): Promise<void> {
  await callAdminRpc("admin_save_pricing_tier_plan", {
    p_tier_id: input.id ?? null,
    p_data: input.data,
  });
}

export async function saveSubscriptionPlanConfigurationRpc(input: {
  id?: string;
  data: Record<string, JsonValue | undefined>;
}): Promise<void> {
  await callAdminRpc("admin_save_subscription_plan_configuration", {
    p_plan_id: input.id ?? null,
    p_data: compactPayload(input.data),
  });
}

export async function deletePricingTierRpc(tierId: string): Promise<void> {
  await callAdminRpc("admin_delete_pricing_tier", {
    p_tier_id: tierId,
  });
}

export async function assignCollectionsToTierRpc(input: {
  tierId: string;
  collectionIds: string[];
}): Promise<void> {
  await callAdminRpc("admin_assign_collections_to_tier", {
    p_tier_id: input.tierId,
    p_collection_ids: input.collectionIds,
  });
}

export async function updatePurchaseModeRpc(
  modeKey: string,
  input: Record<string, JsonValue | undefined>
): Promise<void> {
  const payload = compactPayload(input);
  await callAdminRpc("admin_update_purchase_mode", {
    p_mode_key: modeKey,
    p_updates: payload,
  });
}

export async function saveCollectionTypeRpc<T>(input: {
  id?: string | null;
  data: Record<string, JsonValue | undefined>;
}): Promise<T> {
  const data = await callAdminRpc<JsonObject>("admin_save_collection_type", {
    p_type_id: input.id ?? null,
    p_data: compactPayload(input.data),
  });
  return data as T;
}

export async function deleteCollectionTypeRpc(typeId: string): Promise<void> {
  await callAdminRpc("admin_delete_collection_type", {
    p_type_id: typeId,
  });
}

export async function assignCollectionToTierRpc(input: {
  collectionId: string;
  tierId: string;
}): Promise<void> {
  await callAdminRpc("admin_assign_collection_to_tier", {
    p_collection_id: input.collectionId,
    p_tier_id: input.tierId,
  });
}

export async function unassignCollectionFromTierRpc(collectionId: string): Promise<void> {
  await callAdminRpc("admin_unassign_collection_from_tier", {
    p_collection_id: collectionId,
  });
}

export async function bulkAssignCollectionsToTierRpc<T>(input: {
  tierId: string;
  collectionIds: string[];
}): Promise<T> {
  const data = await callAdminRpc<JsonObject>("admin_bulk_assign_collections_to_tier", {
    p_tier_id: input.tierId,
    p_collection_ids: input.collectionIds,
  });
  return data as T;
}

export async function updateCharacterPriceMultiplierRpc<T>(input: {
  characterId: string;
  newMultiplier: number | null;
}): Promise<T> {
  const data = await callAdminRpc<JsonObject>("admin_update_character_price_multiplier", {
    p_character_id: input.characterId,
    p_new_multiplier: input.newMultiplier,
  });
  return data as T;
}

export async function bulkUpdateCharacterPriceMultipliersRpc(input: {
  characterIds: string[];
  newMultiplier: number | null;
}): Promise<{ updated: number }> {
  const data = await callAdminRpc<{ updated: number }>("admin_bulk_update_character_price_multipliers", {
    p_character_ids: input.characterIds,
    p_new_multiplier: input.newMultiplier,
  });
  return data;
}
