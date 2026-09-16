import { supabase } from "@/integrations/supabase/client";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import type { PricingTierWithPlans, SubscriptionPlanWithTier } from "@/types/pricing-restructure";

export interface AssignmentPricingTier {
  id: string;
  name: string;
  price_full: number;
  price_pix: number;
  deposit_amount: number;
  is_active: boolean;
}

export interface CollectionTierAssignmentWithTier {
  id: string;
  collection_id: string;
  tier_id: string;
  created_at: string;
  pricing_tiers: AssignmentPricingTier | null;
}

export interface CollectionByTierAssignment {
  id: string;
  collection_id: string;
  tier_id: string;
  created_at: string;
  collections: {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    is_price_custom: boolean;
  } | null;
}

export interface AvailableCollectionForTier {
  id: string;
  name: string;
  slug: string;
  is_price_custom: boolean;
}

type PricingTierRow = {
  id: string;
  name: string;
  description: string | null;
  price_brl: number;
  price_full: number | null;
  price_pix: number | null;
  deposit_amount: number | null;
  is_active: boolean | null;
  is_default: boolean;
  display_order: number | null;
};

type SubscriptionPlanQueryRow = {
  id: string;
  pricing_tier_id: string | null;
  name: string;
  description: string | null;
  price: number;
  price_full: number | null;
  price_pix: number | null;
  plan_type: string | null;
  billing_interval: string | null;
  collections_count: number;
  deliveries_total: number | null;
  deliveries_per_cycle: number | null;
  is_active: boolean;
  display_order: number | null;
  created_at: string;
  updated_at: string;
};

type PurchaseModeRow = {
  mode_key: "standalone" | "trimestral" | "semestral" | "anual";
  price_multiplier: number;
  collections_count: number;
  deliveries_total: number;
  includes_bonus: boolean;
};

type TierCountRow = {
  tier_id: string;
  count: number;
};

type PlanCountRow = {
  plan_id: string;
  count: number;
};

type PricingSnapshot = {
  tiers: PricingTierRow[];
  plans: SubscriptionPlanQueryRow[];
  purchase_modes: PurchaseModeRow[];
  assignment_counts: TierCountRow[];
  active_subscription_counts: PlanCountRow[];
};

type PlanMode = SubscriptionPlanWithTier["plan_mode"];

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} returned invalid data`);
  }

  return value as Record<string, unknown>;
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} returned invalid data`);
  }

  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} returned invalid data`);
  }

  return value;
}

function requireNullableString(value: unknown, label: string): string | null {
  if (value === null) return null;
  return requireString(value, label);
}

function requireNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} returned invalid data`);
  }

  return value;
}

function requireNullableNumber(value: unknown, label: string): number | null {
  if (value === null) return null;
  return requireNumber(value, label);
}

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${label} returned invalid data`);
  }

  return value;
}

function requireNullableBoolean(value: unknown, label: string): boolean | null {
  if (value === null) return null;
  return requireBoolean(value, label);
}

function requireInteger(value: unknown, label: string): number {
  const parsed = requireNumber(value, label);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} returned invalid data`);
  }

  return parsed;
}

function parsePricingTierRow(value: unknown): PricingTierRow {
  const row = requireRecord(value, "Pricing tier snapshot");

  return {
    id: requireString(row.id, "Pricing tier id"),
    name: requireString(row.name, "Pricing tier name"),
    description: requireNullableString(row.description, "Pricing tier description"),
    price_brl: requireNumber(row.price_brl, "Pricing tier price_brl"),
    price_full: requireNullableNumber(row.price_full, "Pricing tier price_full"),
    price_pix: requireNullableNumber(row.price_pix, "Pricing tier price_pix"),
    deposit_amount: requireNullableNumber(row.deposit_amount, "Pricing tier deposit_amount"),
    is_active: requireNullableBoolean(row.is_active, "Pricing tier is_active"),
    is_default: requireBoolean(row.is_default, "Pricing tier is_default"),
    display_order: requireNullableNumber(row.display_order, "Pricing tier display_order"),
  };
}

function parseSubscriptionPlanRow(value: unknown): SubscriptionPlanQueryRow {
  const row = requireRecord(value, "Subscription plan snapshot");

  return {
    id: requireString(row.id, "Subscription plan id"),
    pricing_tier_id: requireNullableString(row.pricing_tier_id, "Subscription plan pricing_tier_id"),
    name: requireString(row.name, "Subscription plan name"),
    description: requireNullableString(row.description, "Subscription plan description"),
    price: requireNumber(row.price, "Subscription plan price"),
    price_full: requireNullableNumber(row.price_full, "Subscription plan price_full"),
    price_pix: requireNullableNumber(row.price_pix, "Subscription plan price_pix"),
    plan_type: requireNullableString(row.plan_type, "Subscription plan plan_type"),
    billing_interval: requireNullableString(row.billing_interval, "Subscription plan billing_interval"),
    collections_count: requireInteger(row.collections_count, "Subscription plan collections_count"),
    deliveries_total: requireNullableNumber(row.deliveries_total, "Subscription plan deliveries_total"),
    deliveries_per_cycle: requireNullableNumber(
      row.deliveries_per_cycle,
      "Subscription plan deliveries_per_cycle",
    ),
    is_active: requireBoolean(row.is_active, "Subscription plan is_active"),
    display_order: requireNullableNumber(row.display_order, "Subscription plan display_order"),
    created_at: requireString(row.created_at, "Subscription plan created_at"),
    updated_at: requireString(row.updated_at, "Subscription plan updated_at"),
  };
}

function parsePurchaseModeRow(value: unknown): PurchaseModeRow {
  const row = requireRecord(value, "Purchase mode snapshot");
  const modeKey = requireString(row.mode_key, "Purchase mode key");

  if (!["standalone", "trimestral", "semestral", "anual"].includes(modeKey)) {
    throw new Error("Purchase mode snapshot returned invalid data");
  }

  return {
    mode_key: modeKey as PurchaseModeRow["mode_key"],
    price_multiplier: requireNumber(row.price_multiplier, "Purchase mode price_multiplier"),
    collections_count: requireInteger(row.collections_count, "Purchase mode collections_count"),
    deliveries_total: requireInteger(row.deliveries_total, "Purchase mode deliveries_total"),
    includes_bonus: requireBoolean(row.includes_bonus, "Purchase mode includes_bonus"),
  };
}

function parseTierCountRow(value: unknown): TierCountRow {
  const row = requireRecord(value, "Pricing tier assignment count");
  return {
    tier_id: requireString(row.tier_id, "Pricing tier assignment id"),
    count: requireInteger(row.count, "Pricing tier assignment count"),
  };
}

function parsePlanCountRow(value: unknown): PlanCountRow {
  const row = requireRecord(value, "Pricing tier subscription count");
  return {
    plan_id: requireString(row.plan_id, "Pricing tier subscription plan id"),
    count: requireInteger(row.count, "Pricing tier subscription count"),
  };
}

function parsePricingSnapshot(value: unknown): PricingSnapshot {
  const snapshot = requireRecord(value, "Pricing snapshot");

  return {
    tiers: requireArray(snapshot.tiers, "Pricing snapshot tiers").map(parsePricingTierRow),
    plans: requireArray(snapshot.plans, "Pricing snapshot plans").map(parseSubscriptionPlanRow),
    purchase_modes: requireArray(snapshot.purchase_modes, "Pricing snapshot purchase modes").map(
      parsePurchaseModeRow,
    ),
    assignment_counts: requireArray(
      snapshot.assignment_counts,
      "Pricing snapshot assignment counts",
    ).map(parseTierCountRow),
    active_subscription_counts: requireArray(
      snapshot.active_subscription_counts,
      "Pricing snapshot active subscription counts",
    ).map(parsePlanCountRow),
  };
}

async function loadPricingSnapshot(tierId?: string | null): Promise<PricingSnapshot> {
  const data = await callAdminRpc<unknown>("admin_get_pricing_tiers_snapshot", {
    p_tier_id: tierId ?? null,
  });

  return parsePricingSnapshot(data);
}

function requireText(value: string | null | undefined, fieldName: string): string {
  if (!value) {
    throw new Error(`Invalid pricing tier row: missing ${fieldName}`);
  }

  return value;
}

function normalizePlanMode(value: string | null | undefined): PlanMode {
  switch (value) {
    case "avulso":
    case "standalone":
      return "standalone";
    case "trimestral":
    case "semestral":
    case "anual":
      return value;
    default:
      throw new Error(`Modalidade de plano nao suportada no nivel: ${value ?? "ausente"}`);
  }
}

function buildPurchaseModeMap(rows: PurchaseModeRow[]): Map<PlanMode, PurchaseModeRow> {
  return new Map(rows.map((row) => [row.mode_key, row]));
}

function toSubscriptionPlanWithTier(
  row: SubscriptionPlanQueryRow,
  purchaseModes: Map<PlanMode, PurchaseModeRow>,
): SubscriptionPlanWithTier {
  const tierId = requireText(row.pricing_tier_id, "plan.pricing_tier_id");
  const planMode = normalizePlanMode(row.plan_type ?? row.billing_interval);
  const mode = purchaseModes.get(planMode);
  const priceFull = row.price_full ?? row.price;

  return {
    id: row.id,
    tier_id: tierId,
    plan_mode: planMode,
    plan_type: row.plan_type ?? row.billing_interval ?? planMode,
    name: row.name,
    description: row.description,
    price_full: priceFull,
    price_pix: row.price_pix ?? priceFull,
    price_multiplier: mode?.price_multiplier ?? 1,
    collections_count: row.collections_count ?? mode?.collections_count ?? 1,
    deliveries_total:
      row.deliveries_total ?? row.deliveries_per_cycle ?? mode?.deliveries_total ?? 1,
    includes_bonus: mode?.includes_bonus ?? false,
    is_active: row.is_active,
    display_order: row.display_order ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toPricingTierWithPlans(
  tier: PricingTierRow,
  plans: SubscriptionPlanWithTier[],
  assignedCollectionsCount: number,
  activeSubscriptionsCount: number,
): PricingTierWithPlans {
  const tierPriceBase = tier.price_full ?? tier.price_brl;

  return {
    tier_id: tier.id,
    tier_name: tier.name,
    tier_description: tier.description,
    tier_price_base: tierPriceBase,
    tier_price_pix_base: tier.price_pix ?? tierPriceBase,
    tier_deposit: tier.deposit_amount ?? 0,
    tier_is_active: tier.is_active ?? true,
    tier_is_default: tier.is_default,
    plans,
    assigned_collections_count: assignedCollectionsCount,
    total_active_subscriptions: activeSubscriptionsCount,
  };
}

export async function getCollectionTierAssignment(
  collectionId: string | null | undefined,
): Promise<CollectionTierAssignmentWithTier | null> {
  if (!collectionId) return null;

  const { data, error } = await supabase
    .from("collection_tier_assignments")
    .select(`
      id,
      collection_id,
      tier_id,
      created_at,
      pricing_tiers (
        id,
        name,
        price_full,
        price_pix,
        deposit_amount,
        is_active
      )
    `)
    .eq("collection_id", collectionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar atribuicao: ${error.message}`);
  }

  return data as unknown as CollectionTierAssignmentWithTier | null;
}

export async function listCollectionsByTier(
  tierId: string | null | undefined,
): Promise<CollectionByTierAssignment[]> {
  if (!tierId) return [];

  const { data, error } = await supabase
    .from("collection_tier_assignments")
    .select(`
      id,
      collection_id,
      tier_id,
      created_at,
      collections (
        id,
        name,
        slug,
        is_active,
        is_price_custom
      )
    `)
    .eq("tier_id", tierId);

  if (error) {
    throw new Error(`Erro ao buscar colecoes do nivel: ${error.message}`);
  }

  return (data ?? []) as unknown as CollectionByTierAssignment[];
}

export async function listAvailableCollectionsForTier(): Promise<AvailableCollectionForTier[]> {
  const { data, error } = await supabase
    .from("collections")
    .select("id, name, slug, is_price_custom")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar colecoes disponiveis: ${error.message}`);
  }

  return (data ?? []) as AvailableCollectionForTier[];
}

export async function getTierWithPlans(
  tierId: string | null | undefined,
): Promise<PricingTierWithPlans | null> {
  if (!tierId) return null;

  const snapshot = await loadPricingSnapshot(tierId);
  const tier = snapshot.tiers[0];
  if (!tier) return null;

  const purchaseModes = buildPurchaseModeMap(snapshot.purchase_modes);
  const plans = snapshot.plans.map((row) => toSubscriptionPlanWithTier(row, purchaseModes));
  const assignedCollectionsCount = snapshot.assignment_counts[0]?.count ?? 0;
  const activeSubscriptionsByPlan = new Map(
    snapshot.active_subscription_counts.map((row) => [row.plan_id, row.count]),
  );
  const activeSubscriptionsCount = snapshot.plans.reduce(
    (total, row) => total + (activeSubscriptionsByPlan.get(row.id) ?? 0),
    0,
  );

  return toPricingTierWithPlans(
    tier,
    plans,
    assignedCollectionsCount,
    activeSubscriptionsCount,
  );
}

export async function listAllTiersWithPlans(): Promise<PricingTierWithPlans[]> {
  const snapshot = await loadPricingSnapshot();
  const purchaseModes = buildPurchaseModeMap(snapshot.purchase_modes);
  const plansByTier = new Map<string, SubscriptionPlanWithTier[]>();
  const activeSubscriptionsByPlan = new Map(
    snapshot.active_subscription_counts.map((row) => [row.plan_id, row.count]),
  );
  const activeSubscriptionsByTier = new Map<string, number>();

  for (const row of snapshot.plans) {
    if (!row.pricing_tier_id) continue;

    const plan = toSubscriptionPlanWithTier(row, purchaseModes);
    const tierPlans = plansByTier.get(row.pricing_tier_id) ?? [];
    tierPlans.push(plan);
    plansByTier.set(row.pricing_tier_id, tierPlans);

    const activeCount = activeSubscriptionsByPlan.get(row.id) ?? 0;
    activeSubscriptionsByTier.set(
      row.pricing_tier_id,
      (activeSubscriptionsByTier.get(row.pricing_tier_id) ?? 0) + activeCount,
    );
  }

  const assignedCollectionsByTier = new Map(
    snapshot.assignment_counts.map((row) => [row.tier_id, row.count]),
  );

  return snapshot.tiers.map((tier) =>
    toPricingTierWithPlans(
      tier,
      plansByTier.get(tier.id) ?? [],
      assignedCollectionsByTier.get(tier.id) ?? 0,
      activeSubscriptionsByTier.get(tier.id) ?? 0,
    ),
  );
}
