import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  requireAdminRpcIntegerField,
  requireAdminRpcMatchingId,
  requireAdminRpcRecord,
  requireAdminRpcRecordMatchingId,
  requireAdminRpcUuid,
} from "@/services/admin/rpc/admin-rpc-results";

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

interface JsonObject {
  [key: string]: JsonValue | undefined;
}

interface SubscriptionPlanLimitResult {
  id: string;
  collections_count: number;
}

const SENSITIVE_PUBLIC_SETTING_KEY_PATTERN =
  /(^|_)(secret|token|password|private_key|service[_-]?role|credential|api_key|client_secret|access_token|refresh_token)($|_)/i;

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} invalido`);
  }
}

function normalizeSettingKey(key: string): string {
  return key.trim().toLowerCase();
}

function assertPublicSystemSettingKeys(updates: Record<string, string>): void {
  for (const rawKey of Object.keys(updates)) {
    const key = normalizeSettingKey(rawKey);

    if (!key || SENSITIVE_PUBLIC_SETTING_KEY_PATTERN.test(key)) {
      throw new Error(
        `Configuracao sensivel nao pode ser salva em system_settings publico: ${rawKey}`,
      );
    }
  }
}

function compactPayload(input: Record<string, JsonValue | undefined>): JsonObject {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as JsonObject;
}

function requireUuidArrayField(
  record: Record<string, unknown>,
  field: string,
  operation: string,
): string[] {
  const value = record[field];
  if (!Array.isArray(value)) {
    throw new Error(`${operation} returned an invalid ${field}`);
  }

  return value.map((item) => requireAdminRpcUuid(item, operation));
}

function requireCollectionTypeResult(
  value: unknown,
  expectedId?: string | null,
): Record<string, unknown> {
  const operation = "Collection type save";
  const record = requireAdminRpcRecord(value, operation);
  const id = requireAdminRpcUuid(record.id, operation);

  if (expectedId) {
    requireAdminRpcMatchingId(id, expectedId, operation);
  }

  if (
    typeof record.name !== "string" ||
    !record.name.trim() ||
    typeof record.display_name !== "string" ||
    !record.display_name.trim() ||
    !Number.isInteger(record.sort_order) ||
    (record.sort_order as number) < 0 ||
    typeof record.is_active !== "boolean"
  ) {
    throw new Error(`${operation} returned invalid data`);
  }

  return record;
}

export async function upsertAdminSystemSettings(updates: Record<string, string>): Promise<void> {
  assertPublicSystemSettingKeys(updates);
  const expectedCount = Object.keys(updates).length;

  if (expectedCount === 0) {
    throw new Error("Nenhuma configuracao fornecida");
  }

  const result = await callAdminRpc<unknown>("admin_upsert_system_settings", {
    p_updates: updates,
  });

  requireAdminRpcIntegerField(result, "updated", "System settings update", expectedCount);
}

export async function updateAdminPaymentSetting(input: {
  key: string;
  value: string;
}): Promise<void> {
  const result = await callAdminRpc<unknown>("admin_update_payment_setting", {
    p_key: input.key,
    p_value: input.value,
  });

  const expectedKey = normalizeSettingKey(input.key);
  if (result !== expectedKey) {
    throw new Error("Payment setting update returned an unexpected key");
  }
}

export async function updateAdminProductionSetting(input: {
  key: string;
  value: string;
}): Promise<void> {
  const result = await callAdminRpc<unknown>("admin_update_production_setting", {
    p_key: input.key,
    p_value: input.value,
  });

  const expectedKey = normalizeSettingKey(input.key);
  if (result !== expectedKey) {
    throw new Error("Production setting update returned an unexpected key");
  }
}

export async function updateSubscriptionPlanCollectionLimitRpc(
  planId: string,
  newLimit: number,
): Promise<SubscriptionPlanLimitResult> {
  if (!Number.isInteger(newLimit)) {
    throw new Error("Limite de colecoes invalido");
  }

  const data = await callAdminRpc<unknown>("admin_update_subscription_plan_collection_limit", {
    p_plan_id: planId,
    p_collections_count: newLimit,
  });

  if (!Array.isArray(data) || data.length !== 1) {
    throw new Error("Subscription plan limit update returned invalid data");
  }

  const result = requireAdminRpcRecordMatchingId(
    data[0],
    planId,
    "Subscription plan limit update",
  );

  if (result.collections_count !== newLimit) {
    throw new Error("Subscription plan limit update returned an unexpected collections_count");
  }

  return {
    id: planId,
    collections_count: newLimit,
  };
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

  if (updates.length === 0) {
    throw new Error("Nenhum preco avulso fornecido");
  }

  const result = await callAdminRpc<unknown>("admin_update_standalone_pricing", {
    p_updates: updates,
    p_pix_discount: input.pixDiscount,
  });

  requireAdminRpcIntegerField(result, "updated", "Standalone pricing update", updates.length);
}

export async function updateCollectionBasePricesRpc(params: {
  subscriptionPrice: number;
  standardPrice: number;
  premiumPrice: number;
}): Promise<void> {
  assertFiniteNumber(params.subscriptionPrice, "Preco subscription");
  assertFiniteNumber(params.standardPrice, "Preco standard");
  assertFiniteNumber(params.premiumPrice, "Preco premium");

  const result = await callAdminRpc<unknown>("admin_update_collection_base_prices", {
    p_subscription_price: params.subscriptionPrice,
    p_standard_price: params.standardPrice,
    p_premium_price: params.premiumPrice,
  });

  const updated = requireAdminRpcIntegerField(
    result,
    "updated",
    "Collection base pricing update",
  );
  if (updated < 3) {
    throw new Error("Collection base pricing update returned an unexpected updated");
  }
}

export async function updatePricingContextMultipliersRpc(params: {
  chosenMultiplier: number;
  notChosenMultiplier: number;
  noSubscriptionMultiplier: number;
}): Promise<void> {
  assertFiniteNumber(params.chosenMultiplier, "Multiplicador escolhida");
  assertFiniteNumber(params.notChosenMultiplier, "Multiplicador nao escolhida");
  assertFiniteNumber(params.noSubscriptionMultiplier, "Multiplicador sem assinatura");

  const result = await callAdminRpc<unknown>("admin_update_pricing_context_multipliers", {
    p_chosen_multiplier: params.chosenMultiplier,
    p_not_chosen_multiplier: params.notChosenMultiplier,
    p_no_subscription_multiplier: params.noSubscriptionMultiplier,
  });

  requireAdminRpcIntegerField(result, "updated", "Pricing context update", 3);
}

export async function savePricingTierPlanRpc(input: {
  id?: string;
  data: JsonObject;
}): Promise<void> {
  const result = await callAdminRpc<unknown>("admin_save_pricing_tier_plan", {
    p_tier_id: input.id ?? null,
    p_data: input.data,
  });

  if (input.id) {
    requireAdminRpcMatchingId(result, input.id, "Pricing tier plan save");
  } else {
    requireAdminRpcUuid(result, "Pricing tier plan save");
  }
}

export async function saveSubscriptionPlanConfigurationRpc(input: {
  id?: string;
  data: Record<string, JsonValue | undefined>;
}): Promise<void> {
  const result = await callAdminRpc<unknown>("admin_save_subscription_plan_configuration", {
    p_plan_id: input.id ?? null,
    p_data: compactPayload(input.data),
  });

  if (input.id) {
    requireAdminRpcMatchingId(result, input.id, "Subscription plan configuration save");
  } else {
    requireAdminRpcUuid(result, "Subscription plan configuration save");
  }
}

export async function deletePricingTierRpc(tierId: string): Promise<void> {
  const result = await callAdminRpc<unknown>("admin_delete_pricing_tier", {
    p_tier_id: tierId,
  });

  requireAdminRpcMatchingId(result, tierId, "Pricing tier deletion");
}

export async function assignCollectionsToTierRpc(input: {
  tierId: string;
  collectionIds: string[];
}): Promise<void> {
  const result = await callAdminRpc<unknown>("admin_assign_collections_to_tier", {
    p_tier_id: input.tierId,
    p_collection_ids: input.collectionIds,
  });

  requireAdminRpcIntegerField(
    result,
    "assigned",
    "Collection tier assignment",
    input.collectionIds.length,
  );
}

export async function updatePurchaseModeRpc(
  modeKey: string,
  input: Record<string, JsonValue | undefined>,
): Promise<void> {
  const payload = compactPayload(input);
  const result = await callAdminRpc<unknown>("admin_update_purchase_mode", {
    p_mode_key: modeKey,
    p_updates: payload,
  });
  const record = requireAdminRpcRecord(result, "Purchase mode update");

  requireAdminRpcUuid(record.id, "Purchase mode update");
  if (record.mode_key !== modeKey) {
    throw new Error("Purchase mode update returned an unexpected mode_key");
  }
}

export async function saveCollectionTypeRpc<T>(input: {
  id?: string | null;
  data: Record<string, JsonValue | undefined>;
}): Promise<T> {
  const data = await callAdminRpc<unknown>("admin_save_collection_type", {
    p_type_id: input.id ?? null,
    p_data: compactPayload(input.data),
  });

  return requireCollectionTypeResult(data, input.id) as unknown as T;
}

export async function deleteCollectionTypeRpc(typeId: string): Promise<void> {
  const result = await callAdminRpc<unknown>("admin_delete_collection_type", {
    p_type_id: typeId,
  });

  requireAdminRpcMatchingId(result, typeId, "Collection type deletion");
}

export async function assignCollectionToTierRpc(input: {
  collectionId: string;
  tierId: string;
}): Promise<void> {
  const result = await callAdminRpc<unknown>("admin_assign_collection_to_tier", {
    p_collection_id: input.collectionId,
    p_tier_id: input.tierId,
  });

  requireAdminRpcMatchingId(result, input.collectionId, "Collection tier assignment");
}

export async function unassignCollectionFromTierRpc(collectionId: string): Promise<void> {
  const result = await callAdminRpc<unknown>("admin_unassign_collection_from_tier", {
    p_collection_id: collectionId,
  });

  requireAdminRpcMatchingId(result, collectionId, "Collection tier removal");
}

export async function bulkAssignCollectionsToTierRpc<T>(input: {
  tierId: string;
  collectionIds: string[];
}): Promise<T> {
  const data = await callAdminRpc<unknown>("admin_bulk_assign_collections_to_tier", {
    p_tier_id: input.tierId,
    p_collection_ids: input.collectionIds,
  });
  const record = requireAdminRpcRecord(data, "Bulk collection tier assignment");

  if (record.ok !== true) {
    throw new Error("Bulk collection tier assignment returned invalid data");
  }

  const success = requireUuidArrayField(record, "success", "Bulk collection tier assignment");
  const failed = record.failed;

  if (!Array.isArray(failed) || failed.length !== 0 || success.length !== input.collectionIds.length) {
    throw new Error("Bulk collection tier assignment returned inconsistent results");
  }

  success.forEach((id, index) => {
    requireAdminRpcMatchingId(id, input.collectionIds[index], "Bulk collection tier assignment");
  });

  return record as unknown as T;
}

export async function updateCharacterPriceMultiplierRpc<T>(input: {
  characterId: string;
  newMultiplier: number | null;
}): Promise<T> {
  const data = await callAdminRpc<unknown>("admin_update_character_price_multiplier", {
    p_character_id: input.characterId,
    p_new_multiplier: input.newMultiplier,
  });
  const record = requireAdminRpcRecordMatchingId(
    data,
    input.characterId,
    "Character price multiplier update",
  );

  if (record.price_multiplier !== input.newMultiplier) {
    throw new Error("Character price multiplier update returned an unexpected price_multiplier");
  }

  return record as unknown as T;
}

export async function bulkUpdateCharacterPriceMultipliersRpc(input: {
  characterIds: string[];
  newMultiplier: number | null;
}): Promise<{ updated: number }> {
  const data = await callAdminRpc<unknown>("admin_bulk_update_character_price_multipliers", {
    p_character_ids: input.characterIds,
    p_new_multiplier: input.newMultiplier,
  });

  return {
    updated: requireAdminRpcIntegerField(
      data,
      "updated",
      "Bulk character price multiplier update",
      input.characterIds.length,
    ),
  };
}
