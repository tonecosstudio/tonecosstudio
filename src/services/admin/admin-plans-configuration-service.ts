import { adminPlansGateway } from "@/services/admin/admin-plans-gateway";

export interface PricingTierPlan {
  id: string;
  plan_type: string | null;
  name: string | null;
  price: number | null;
  price_full: number | null;
  pieces_per_subscription: number | null;
  base_credits: number | null;
  bonus_credits: number | null;
  deposit_amount: number | null;
  is_active: boolean;
  bonus_type: "pieces" | "coins" | null;
}

export interface CoinExchangeRate {
  id: string | null;
  reais_amount: number;
  coins_amount: number;
}

export interface PricingTierPlanSaveData {
  name: string;
  display_name: string;
  price_coins: number;
  price_brl: number;
  price_full: number;
  price_pix: number;
  deposit_amount: number;
  is_active: boolean;
  description: string;
}

export interface SavePricingTierPlanInput {
  id?: string;
  data: PricingTierPlanSaveData;
}

export async function fetchAdminPricingTierPlans(): Promise<PricingTierPlan[]> {
  const { data, error } = await adminPlansGateway
    .from("pricing_tiers")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as PricingTierPlan[];
}

export async function fetchCoinExchangeRate(): Promise<CoinExchangeRate> {
  const { data, error } = await adminPlansGateway
    .from("price_categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .limit(1);

  if (error) {
    throw error;
  }

  const category = data?.[0];

  return {
    id: category?.id ?? null,
    reais_amount: category ? (category.coin_value_in_cents / 100) * 100 : 500,
    coins_amount: 100,
  };
}

export async function savePricingTierPlan(input: SavePricingTierPlanInput): Promise<void> {
  if (input.id) {
    const { error } = await adminPlansGateway
      .from("pricing_tiers")
      .update(input.data)
      .eq("id", input.id);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await adminPlansGateway
    .from("pricing_tiers")
    .insert([input.data]);

  if (error) {
    throw error;
  }
}
