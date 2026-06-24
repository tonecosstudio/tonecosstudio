import { adminPlansGateway } from "@/services/admin/config/admin-plans-gateway";
import { PRICING } from "@/config/constants";
import { saveSubscriptionPlanConfigurationRpc } from "@/services/admin/config/admin-config-mutations-service";

export type AdminPlanType = "avulso" | "bimestral" | "trimestral" | "semestral" | "anual";

export interface PricingTierPlan {
  id: string;
  plan_type: AdminPlanType | null;
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
  coins_included: number;
  deliveries_total: number;
  is_active: boolean;
  description: string;
}

export interface SavePricingTierPlanInput {
  id?: string;
  planType: AdminPlanType;
  data: PricingTierPlanSaveData;
}

interface SubscriptionPlanConfigurationRow {
  id: string;
  plan_type: string | null;
  billing_interval: string | null;
  name: string | null;
  price: number | null;
  price_full: number | null;
  price_pix: number | null;
  coins_included: number | null;
  deliveries_per_cycle: number | null;
  deliveries_total: number | null;
  is_active: boolean | null;
  description: string | null;
}

interface SubscriptionPlansQueryBuilder {
  select(columns: string): {
    order(
      column: string,
      options?: { ascending?: boolean }
    ): Promise<{ data: SubscriptionPlanConfigurationRow[] | null; error: Error | null }>;
  };
}

interface SubscriptionPlansGateway {
  from(table: "subscription_plans"): SubscriptionPlansQueryBuilder;
}

const subscriptionPlansGateway = adminPlansGateway as unknown as SubscriptionPlansGateway;

const PLAN_TYPE_SET = new Set<AdminPlanType>([
  "avulso",
  "bimestral",
  "trimestral",
  "semestral",
  "anual",
]);

function normalizePlanType(value: string | null): AdminPlanType | null {
  if (!value) return null;
  return PLAN_TYPE_SET.has(value as AdminPlanType) ? (value as AdminPlanType) : null;
}

function mapSubscriptionPlan(row: SubscriptionPlanConfigurationRow): PricingTierPlan {
  const planType = normalizePlanType(row.plan_type ?? row.billing_interval);
  const priceFull = row.price_full ?? row.price;
  const deliveriesTotal = row.deliveries_total ?? row.deliveries_per_cycle;
  const coinsIncluded = row.coins_included ?? 0;

  return {
    id: row.id,
    plan_type: planType,
    name: row.name,
    price: row.price,
    price_full: priceFull,
    pieces_per_subscription: deliveriesTotal,
    base_credits: coinsIncluded,
    bonus_credits: 0,
    deposit_amount: 0,
    is_active: row.is_active ?? false,
    bonus_type: "coins",
  };
}

export async function fetchAdminPricingTierPlans(): Promise<PricingTierPlan[]> {
  const { data, error } = await subscriptionPlansGateway
    .from("subscription_plans")
    .select(`
      id,
      plan_type,
      billing_interval,
      name,
      price,
      price_full,
      price_pix,
      coins_included,
      deliveries_per_cycle,
      deliveries_total,
      is_active,
      description
    `)
    .order("price", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapSubscriptionPlan);
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
    reais_amount: category
      ? (category.coin_value_in_cents / 100) * PRICING.COIN_EXCHANGE_REFERENCE_COINS
      : PRICING.DEFAULT_PRICE_FULL,
    coins_amount: PRICING.COIN_EXCHANGE_REFERENCE_COINS,
  };
}

export async function savePricingTierPlan(input: SavePricingTierPlanInput): Promise<void> {
  await saveSubscriptionPlanConfigurationRpc({
    id: input.id,
    data: {
      name: input.data.name,
      description: input.data.description,
      billing_interval: input.planType,
      plan_type: input.planType,
      slug: input.planType,
      price: input.data.price_brl,
      price_full: input.data.price_full,
      price_pix: input.data.price_pix,
      coins_included: input.data.coins_included,
      deliveries_per_cycle: input.data.deliveries_total,
      deliveries_total: input.data.deliveries_total,
      is_active: input.data.is_active,
    },
  });
}
