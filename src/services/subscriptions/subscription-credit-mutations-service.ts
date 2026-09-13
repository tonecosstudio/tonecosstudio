import { z } from "zod";
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

const characterSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  price_cash: z.number().finite().nonnegative(),
  price_credits: z.number().int().nonnegative(),
  is_exclusive_semestral: z.boolean(),
  is_active: z.boolean(),
  is_standard_collection: z.boolean(),
  image_url: z.string().nullable(),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
});

const productionCycleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  capacity_limit: z.number().int().positive(),
  current_count: z.number().int().nonnegative(),
  status: z.enum(["open", "full", "closed"]),
  close_date: z.string().min(1),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
  closed_at: z.string().nullable(),
});

const creditAdjustmentSchema = z.object({
  subscription_id: z.string().uuid(),
  total_credits: z.number().int().nonnegative(),
  available_credits: z.number().int().nonnegative(),
});

const productionCycleCloseSchema = z.object({
  cycleId: z.string().uuid(),
  confirmedOrders: z.number().int().nonnegative(),
  pendingOrders: z.number().int().nonnegative(),
  totalCreditsDebited: z.number().int().nonnegative(),
});

function parseCharacter(value: unknown, fallback: string): Character {
  const parsed = characterSchema.safeParse(value);
  if (!parsed.success) throw new Error(fallback);
  return parsed.data;
}

function requireCharacterId(value: unknown, expectedId: string, fallback: string): Character {
  const character = parseCharacter(value, fallback);
  if (character.id !== expectedId) throw new Error(fallback);
  return character;
}

function parseProductionCycle(value: unknown, fallback: string): ProductionCycle {
  const parsed = productionCycleSchema.safeParse(value);
  if (!parsed.success || parsed.data.current_count > parsed.data.capacity_limit) {
    throw new Error(fallback);
  }
  return parsed.data;
}

export async function adjustSubscriptionCreditCreditsRpc(
  subscriptionId: string,
  amount: number,
  reason: string
): Promise<void> {
  const value = await callAdminRpc<unknown>("admin_adjust_subscription_credit_credits", {
    p_subscription_id: subscriptionId,
    p_amount: amount,
    p_reason: reason,
  });

  const parsed = creditAdjustmentSchema.safeParse(value);
  if (!parsed.success || parsed.data.subscription_id !== subscriptionId) {
    throw new Error("Credit adjustment did not return confirmed data");
  }
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
  const character = await callAdminRpc<unknown>(
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

  return parseCharacter(character, "Character creation did not return valid data");
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

  const character = await callAdminRpc<unknown>(
    "admin_update_subscription_credit_character",
    {
      p_character_id: id,
      p_patch: patch,
    },
  );

  return requireCharacterId(character, id, "Character update did not return matching data");
}

export async function deactivateSubscriptionCreditCharacterRpc(
  id: string
): Promise<Character> {
  const value = await callAdminRpc<unknown>(
    "admin_deactivate_subscription_credit_character",
    { p_character_id: id }
  );

  const character = requireCharacterId(
    value,
    id,
    "Character deactivation did not return matching data",
  );

  if (character.is_active) {
    throw new Error("Character deactivation was not confirmed");
  }

  return character;
}

export async function createSubscriptionCreditProductionCycleRpc(data: {
  name: string;
  capacityLimit: number;
  closeDate: string;
}): Promise<ProductionCycle> {
  const value = await callAdminRpc<unknown>(
    "admin_create_subscription_credit_production_cycle",
    {
      p_name: data.name,
      p_capacity_limit: data.capacityLimit,
      p_close_date: data.closeDate,
    },
  );

  return parseProductionCycle(value, "Production cycle creation did not return valid data");
}

export async function closeSubscriptionCreditProductionCycleRpc(
  id: string
): Promise<ProductionCycleCloseResponse> {
  const value = await callAdminRpc<unknown>(
    "admin_close_subscription_credit_production_cycle",
    { p_cycle_id: id }
  );

  const parsed = productionCycleCloseSchema.safeParse(value);
  if (!parsed.success || parsed.data.cycleId !== id) {
    throw new Error("Production cycle closing did not return matching data");
  }

  return parsed.data;
}
