import { adminPlansGateway } from "@/services/admin/config/admin-plans-gateway";
import { saveSubscriptionPlanConfigurationRpc } from "@/services/admin/config/admin-config-mutations-service";
import { TONART_PLAN_PIECE_COUNTS, decimalToHundredths, type TonartPlanPieceCount } from "@/services/commercial/tonart-commerce-rules";

export type AdminPlanType = "avulso" | "bimestral" | "trimestral" | "semestral" | "anual";

export interface PricingTierPlan {
  id: string;
  plan_type: AdminPlanType | null;
  name: string | null;
  price: number | null;
  price_full: number | null;
  pieces_per_subscription: number | null;
  coin_bonus_per_shipment: number;
  coin_bonus_cap: number;
  deposit_amount: number | null;
  is_active: boolean;
  bonus_type: "pieces" | "coins" | null;
  model_selection_limit: TonartPlanPieceCount | null;
}

export interface PricingTierPlanSaveData {
  name: string;
  price_brl: number;
  price_full: number;
  coin_bonus_per_shipment: number;
  coin_bonus_cap: number;
  deliveries_total: number;
  is_active: boolean;
  description: string;
  model_selection_limit: TonartPlanPieceCount;
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
  total_credits: number | null;
  coin_bonus_per_shipment: number | null;
  coin_bonus_cap: number | null;
  deliveries_per_cycle: number | null;
  deliveries_total: number | null;
  is_active: boolean | null;
  description: string | null;
  model_selection_limit: number | null;
}

interface SubscriptionPlansQueryBuilder {
  select(columns: string): {
    order(
      column: string,
      options?: { ascending?: boolean },
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

function normalizeNonNegativeAmount(value: number | null, label: string, planId: string): number {
  const normalized = value ?? 0;
  try {
    decimalToHundredths(String(normalized));
  } catch {
    throw new Error(`Configuracao de ${label} invalida no plano ${planId}.`);
  }
  if (normalized < 0) throw new Error(`Configuracao de ${label} invalida no plano ${planId}.`);
  return normalized;
}

function mapSubscriptionPlan(row: SubscriptionPlanConfigurationRow): PricingTierPlan {
  const planType = normalizePlanType(row.plan_type ?? row.billing_interval);
  const priceFull = row.price_full ?? row.price;
  const deliveriesTotal = row.deliveries_total ?? row.deliveries_per_cycle;
  const bonusPerShipment = normalizeNonNegativeAmount(row.coin_bonus_per_shipment, "coin_bonus_per_shipment", row.id);
  const bonusCap = normalizeNonNegativeAmount(row.coin_bonus_cap, "coin_bonus_cap", row.id);
  const selectionLimit = row.model_selection_limit;

  if (selectionLimit !== null && !TONART_PLAN_PIECE_COUNTS.includes(selectionLimit as TonartPlanPieceCount)) {
    throw new Error(`Limite de modelos invalido no plano ${row.id}.`);
  }
  if (bonusCap < bonusPerShipment) {
    throw new Error(`Limite de bônus inferior ao bônus por envio no plano ${row.id}.`);
  }

  return {
    id: row.id,
    plan_type: planType,
    name: row.name,
    price: row.price,
    price_full: priceFull,
    pieces_per_subscription: deliveriesTotal,
    coin_bonus_per_shipment: bonusPerShipment,
    coin_bonus_cap: bonusCap,
    deposit_amount: 0,
    is_active: row.is_active ?? false,
    bonus_type: "coins",
    model_selection_limit: selectionLimit as TonartPlanPieceCount | null,
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
      total_credits,
      coin_bonus_per_shipment,
      coin_bonus_cap,
      deliveries_per_cycle,
      deliveries_total,
      is_active,
      description,
      model_selection_limit
    `)
    .order("price", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapSubscriptionPlan);
}

export async function savePricingTierPlan(input: SavePricingTierPlanInput): Promise<void> {
  decimalToHundredths(String(input.data.price_full));
  decimalToHundredths(String(input.data.coin_bonus_per_shipment));
  decimalToHundredths(String(input.data.coin_bonus_cap));
  if (input.data.coin_bonus_cap < input.data.coin_bonus_per_shipment) {
    throw new Error("O limite de bônus não pode ser menor que o bônus por envio.");
  }
  if (!TONART_PLAN_PIECE_COUNTS.includes(input.data.model_selection_limit)) {
    throw new Error("Quantidade de peças do plano inválida.");
  }
  if (input.planType === "anual" && input.data.is_active) {
    throw new Error("O plano anual deve permanecer desativado até liberação específica.");
  }

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
      price_pix: input.data.price_full,
      coins_included: 0,
      coin_bonus_per_shipment: input.data.coin_bonus_per_shipment,
      coin_bonus_cap: input.data.coin_bonus_cap,
      deliveries_per_cycle: input.data.deliveries_total,
      deliveries_total: input.data.deliveries_total,
      is_active: input.data.is_active,
      model_selection_limit: input.data.model_selection_limit,
    },
  });
}
