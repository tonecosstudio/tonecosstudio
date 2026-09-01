import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import type {
  Character,
  ProductionCycle,
} from "@/types/subscription-credit-system";

type ProductionCycleCloseResponse = {
  cycleId: string;
  confirmedOrders: number;
  pendingOrders: number;
  totalCreditsDebited: number;
};

type CharacterPatch = {
  name?: string;
  description?: string | null;
  price_cash?: number;
  price_credits?: number;
  is_exclusive_semestral?: boolean;
  is_standard_collection?: boolean;
  is_active?: boolean;
  image_url?: string | null;
};

function requireRpcData<T>(data: T | null, fallback: string): T {
  if (data === null) throw new Error(fallback);
  return data;
}

export async function adjustSubscriptionCreditCreditsRpc(
  subscriptionId: string,
  amount: number,
  reason: string
): Promise<void> {
  await callAdminRpc("admin_adjust_subscription_credit_credits", {
    p_subscription_id: subscriptionId,
    p_amount: amount,
    p_reason: reason,
  });
}

export async function createSubscriptionCreditCharacterRpc(data: {
  name: string;
  description?: string;
  priceCash: number;
  priceCredits: number;
  isExclusiveSemestral?: boolean;
  isStandardCollection?: boolean;
  imageUrl?: string;
}): Promise<Character> {
  const character = await callAdminRpc<Character | null>(
    "admin_create_subscription_credit_character",
    {
      p_name: data.name,
      p_description: data.description ?? null,
      p_price_cash: data.priceCash,
      p_price_credits: data.priceCredits,
      p_is_exclusive_semestral: data.isExclusiveSemestral ?? false,
      p_is_standard_collection: data.isStandardCollection ?? false,
      p_image_url: data.imageUrl ?? null,
    },
  );

  return requireRpcData(character, "Character creation did not return data");
}

export async function updateSubscriptionCreditCharacterRpc(
  id: string,
  data: {
    name?: string;
    description?: string;
    priceCash?: number;
    priceCredits?: number;
    isExclusiveSemestral?: boolean;
    isStandardCollection?: boolean;
    isActive?: boolean;
    imageUrl?: string;
  }
): Promise<Character> {
  const patch: CharacterPatch = {};

  if (data.name !== undefined) patch.name = data.name;
  if (data.description !== undefined) patch.description = data.description;
  if (data.priceCash !== undefined) patch.price_cash = data.priceCash;
  if (data.priceCredits !== undefined) patch.price_credits = data.priceCredits;
  if (data.isExclusiveSemestral !== undefined) {
    patch.is_exclusive_semestral = data.isExclusiveSemestral;
  }
  if (data.isStandardCollection !== undefined) {
    patch.is_standard_collection = data.isStandardCollection;
  }
  if (data.isActive !== undefined) patch.is_active = data.isActive;
  if (data.imageUrl !== undefined) patch.image_url = data.imageUrl;

  const character = await callAdminRpc<Character | null>(
    "admin_update_subscription_credit_character",
    {
      p_character_id: id,
      p_patch: patch,
    },
  );

  return requireRpcData(character, "Character update did not return data");
}

export async function deactivateSubscriptionCreditCharacterRpc(
  id: string
): Promise<Character> {
  const data = await callAdminRpc<Character | null>(
    "admin_deactivate_subscription_credit_character",
    { p_character_id: id }
  );

  return requireRpcData(data, "Character deactivation did not return data");
}

export async function createSubscriptionCreditProductionCycleRpc(data: {
  name: string;
  capacityLimit: number;
  closeDate: string;
}): Promise<ProductionCycle> {
  const cycle = await callAdminRpc<ProductionCycle | null>(
    "admin_create_subscription_credit_production_cycle",
    {
      p_name: data.name,
      p_capacity_limit: data.capacityLimit,
      p_close_date: data.closeDate,
    },
  );

  return requireRpcData(cycle, "Production cycle creation did not return data");
}

export async function closeSubscriptionCreditProductionCycleRpc(
  id: string
): Promise<ProductionCycleCloseResponse> {
  const data = await callAdminRpc<ProductionCycleCloseResponse | null>(
    "admin_close_subscription_credit_production_cycle",
    { p_cycle_id: id }
  );

  return requireRpcData(data, "Production cycle closing did not return data");
}
