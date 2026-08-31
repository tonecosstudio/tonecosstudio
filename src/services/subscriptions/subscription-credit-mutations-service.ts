import { supabase } from "@/integrations/supabase/client";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import type {
  Character,
  NoRenewalResponse,
  PlanChangeResponse,
  PlanType,
  ProductionCycle,
} from "@/types/subscription-credit-system";

type RpcError = {
  message: string;
};

type RpcResult<T> = Promise<{
  data: T | null;
  error: RpcError | null;
}>;

type IndividualOrderResponse = {
  order_id: string;
  credits_debited: number;
  production_cycle_id: string;
};

type AutomaticOrderUpdateResponse = {
  order_id: string;
  characters: Character[];
  total_credits: number;
};

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

interface SubscriptionCreditMutationRpcClient {
  rpc(
    fn: "schedule_subscription_credit_plan_change",
    args: { p_subscription_id: string; p_new_plan_type: PlanType }
  ): RpcResult<PlanChangeResponse>;
  rpc(
    fn: "set_subscription_credit_no_renewal",
    args: { p_subscription_id: string }
  ): RpcResult<NoRenewalResponse>;
  rpc(
    fn: "reactivate_subscription_credit_renewal",
    args: { p_subscription_id: string }
  ): RpcResult<NoRenewalResponse>;
  rpc(
    fn: "create_subscription_credit_individual_order",
    args: { p_character_id: string }
  ): RpcResult<IndividualOrderResponse>;
  rpc(
    fn: "update_subscription_credit_automatic_order",
    args: { p_order_id: string; p_character_ids: string[] }
  ): RpcResult<AutomaticOrderUpdateResponse>;
}

const subscriptionCreditMutationRpc =
  supabase as unknown as SubscriptionCreditMutationRpcClient;

function unwrapRpcData<T>(data: T | null, error: RpcError | null, fallback: string): T {
  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error(fallback);
  }

  return data;
}

export async function scheduleSubscriptionCreditPlanChangeRpc(
  subscriptionId: string,
  newPlanType: PlanType
): Promise<PlanChangeResponse> {
  const { data, error } = await subscriptionCreditMutationRpc.rpc(
    "schedule_subscription_credit_plan_change",
    {
      p_subscription_id: subscriptionId,
      p_new_plan_type: newPlanType,
    }
  );

  return unwrapRpcData(data, error, "Plan change did not return data");
}

export async function setSubscriptionCreditNoRenewalRpc(
  subscriptionId: string
): Promise<NoRenewalResponse> {
  const { data, error } = await subscriptionCreditMutationRpc.rpc(
    "set_subscription_credit_no_renewal",
    { p_subscription_id: subscriptionId }
  );

  return unwrapRpcData(data, error, "Renewal update did not return data");
}

export async function reactivateSubscriptionCreditRenewalRpc(
  subscriptionId: string
): Promise<NoRenewalResponse> {
  const { data, error } = await subscriptionCreditMutationRpc.rpc(
    "reactivate_subscription_credit_renewal",
    { p_subscription_id: subscriptionId }
  );

  return unwrapRpcData(data, error, "Renewal reactivation did not return data");
}

export async function createSubscriptionCreditIndividualOrderRpc(
  characterId: string
): Promise<IndividualOrderResponse> {
  const { data, error } = await subscriptionCreditMutationRpc.rpc(
    "create_subscription_credit_individual_order",
    { p_character_id: characterId }
  );

  return unwrapRpcData(data, error, "Individual order creation did not return data");
}

export async function updateSubscriptionCreditAutomaticOrderRpc(
  orderId: string,
  characterIds: string[]
): Promise<AutomaticOrderUpdateResponse> {
  const { data, error } = await subscriptionCreditMutationRpc.rpc(
    "update_subscription_credit_automatic_order",
    {
      p_order_id: orderId,
      p_character_ids: characterIds,
    }
  );

  return unwrapRpcData(data, error, "Automatic order update did not return data");
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

  return unwrapRpcData(character, null, "Character creation did not return data");
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

  return unwrapRpcData(character, null, "Character update did not return data");
}

export async function deactivateSubscriptionCreditCharacterRpc(
  id: string
): Promise<Character> {
  const data = await callAdminRpc<Character | null>(
    "admin_deactivate_subscription_credit_character",
    { p_character_id: id }
  );

  return unwrapRpcData(data, null, "Character deactivation did not return data");
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

  return unwrapRpcData(cycle, null, "Production cycle creation did not return data");
}

export async function closeSubscriptionCreditProductionCycleRpc(
  id: string
): Promise<ProductionCycleCloseResponse> {
  const data = await callAdminRpc<ProductionCycleCloseResponse | null>(
    "admin_close_subscription_credit_production_cycle",
    { p_cycle_id: id }
  );

  return unwrapRpcData(data, null, "Production cycle closing did not return data");
}
