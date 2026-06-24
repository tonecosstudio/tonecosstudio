import { supabase } from "@/integrations/supabase/client";
import { requireAuthenticatedUserId } from "@/services/auth/current-user";
import type {
  CreateTierWithPlansInput,
  CreateTierWithPlansResult,
  UpdateTierAndRecalculateResult,
} from "@/types/pricing-restructure";

type PricingTierRpcError = {
  message: string;
};

interface PricingTierPlanRpcClient {
  rpc(
    name: "create_tier_with_plans",
    args: {
      p_name: string;
      p_description: string | null;
      p_price_full: number;
      p_deposit_amount: number;
      p_pix_discount_percentage?: number;
      p_is_default?: boolean;
      p_display_order?: number;
      p_created_by: string;
    },
  ): Promise<{ data: CreateTierWithPlansResult | null; error: PricingTierRpcError | null }>;
  rpc(
    name: "update_tier_and_recalculate_plans",
    args: {
      p_tier_id: string;
      p_price_full?: number;
      p_deposit_amount?: number;
      p_pix_discount_percentage?: number;
      p_updated_by: string;
    },
  ): Promise<{ data: unknown; error: PricingTierRpcError | null }>;
}

const pricingTierPlanRpc = supabase as unknown as PricingTierPlanRpcClient;

export async function createTierWithPlans(
  input: CreateTierWithPlansInput,
): Promise<CreateTierWithPlansResult> {
  const userId = await requireAuthenticatedUserId();

  const { data, error } = await pricingTierPlanRpc.rpc("create_tier_with_plans", {
    p_name: input.name,
    p_description: input.description || null,
    p_price_full: input.price_full,
    p_deposit_amount: input.deposit_amount,
    p_pix_discount_percentage: input.pix_discount_percentage,
    p_is_default: input.is_default,
    p_display_order: input.display_order,
    p_created_by: userId,
  });

  if (error) {
    throw new Error(`Erro ao criar nivel com planos: ${error.message}`);
  }

  if (!data) {
    throw new Error("Nenhum resultado retornado");
  }

  return data;
}

export async function updateTierAndRecalculatePlans(params: {
  tierId: string;
  priceFull?: number;
  depositAmount?: number;
  pixDiscountPercentage?: number;
}): Promise<UpdateTierAndRecalculateResult> {
  const userId = await requireAuthenticatedUserId();

  const { data, error } = await pricingTierPlanRpc.rpc("update_tier_and_recalculate_plans", {
    p_tier_id: params.tierId,
    p_price_full: params.priceFull ?? undefined,
    p_deposit_amount: params.depositAmount ?? undefined,
    p_pix_discount_percentage: params.pixDiscountPercentage ?? undefined,
    p_updated_by: userId,
  });

  if (error) {
    throw new Error(`Erro ao atualizar nivel: ${error.message}`);
  }

  return data as UpdateTierAndRecalculateResult;
}
