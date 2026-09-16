import { supabase } from "@/integrations/supabase/client";
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

type AssignmentCountRow = { tier_id: string };
type ActiveSubscriptionRow = { plan_id: string };

type PlanMode = SubscriptionPlanWithTier["plan_mode"];

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

async function fetchPurchaseModes(): Promise<Map<PlanMode, PurchaseModeRow>> {
  const { data, error } = await supabase
    .from("purchase_modes")
    .select("mode_key, price_multiplier, collections_count, deliveries_total, includes_bonus");

  if (error) {
    throw new Error(`Erro ao buscar modalidades: ${error.message}`);
  }

  return buildPurchaseModeMap((data ?? []) as PurchaseModeRow[]);
}

async function countActiveSubscriptionsByPlanIds(planIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (planIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan_id")
    .eq("status", "active")
    .in("plan_id", planIds);

  if (error) {
    throw new Error(`Erro ao buscar assinaturas ativas: ${error.message}`);
  }

  for (const row of (data ?? []) as ActiveSubscriptionRow[]) {
    counts.set(row.plan_id, (counts.get(row.plan_id) ?? 0) + 1);
  }

  return counts;
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

  const { data: tierData, error: tierError } = await supabase
    .from("pricing_tiers")
    .select("id, name, description, price_brl, price_full, price_pix, deposit_amount, is_active, is_default, display_order")
    .eq("id", tierId)
    .maybeSingle();

  if (tierError) {
    throw new Error(`Erro ao buscar nivel: ${tierError.message}`);
  }

  if (!tierData) return null;

  const [plansResponse, modes, assignmentsResponse] = await Promise.all([
    supabase
      .from("subscription_plans")
      .select("id, pricing_tier_id, name, description, price, price_full, price_pix, plan_type, billing_interval, collections_count, deliveries_total, deliveries_per_cycle, is_active, display_order, created_at, updated_at")
      .eq("pricing_tier_id", tierId)
      .order("display_order", { ascending: true }),
    fetchPurchaseModes(),
    supabase
      .from("collection_tier_assignments")
      .select("tier_id")
      .eq("tier_id", tierId),
  ]);

  if (plansResponse.error) {
    throw new Error(`Erro ao buscar planos: ${plansResponse.error.message}`);
  }
  if (assignmentsResponse.error) {
    throw new Error(`Erro ao contar colecoes do nivel: ${assignmentsResponse.error.message}`);
  }

  const planRows = (plansResponse.data ?? []) as SubscriptionPlanQueryRow[];
  const plans = planRows.map((row) => toSubscriptionPlanWithTier(row, modes));
  const activeSubscriptionsByPlan = await countActiveSubscriptionsByPlanIds(
    planRows.map((row) => row.id),
  );
  const activeSubscriptionsCount = planRows.reduce(
    (total, row) => total + (activeSubscriptionsByPlan.get(row.id) ?? 0),
    0,
  );

  return toPricingTierWithPlans(
    tierData as PricingTierRow,
    plans,
    assignmentsResponse.data?.length ?? 0,
    activeSubscriptionsCount,
  );
}

export async function listAllTiersWithPlans(): Promise<PricingTierWithPlans[]> {
  const [tiersResponse, plansResponse, modes, assignmentsResponse] = await Promise.all([
    supabase
      .from("pricing_tiers")
      .select("id, name, description, price_brl, price_full, price_pix, deposit_amount, is_active, is_default, display_order")
      .order("display_order", { ascending: true }),
    supabase
      .from("subscription_plans")
      .select("id, pricing_tier_id, name, description, price, price_full, price_pix, plan_type, billing_interval, collections_count, deliveries_total, deliveries_per_cycle, is_active, display_order, created_at, updated_at")
      .not("pricing_tier_id", "is", null)
      .order("pricing_tier_id", { ascending: true })
      .order("display_order", { ascending: true }),
    fetchPurchaseModes(),
    supabase.from("collection_tier_assignments").select("tier_id"),
  ]);

  if (tiersResponse.error) {
    throw new Error(`Erro ao buscar niveis: ${tiersResponse.error.message}`);
  }
  if (plansResponse.error) {
    throw new Error(`Erro ao buscar planos: ${plansResponse.error.message}`);
  }
  if (assignmentsResponse.error) {
    throw new Error(`Erro ao contar colecoes por nivel: ${assignmentsResponse.error.message}`);
  }

  const tiers = (tiersResponse.data ?? []) as PricingTierRow[];
  const planRows = (plansResponse.data ?? []) as SubscriptionPlanQueryRow[];
  const activeSubscriptionsByPlan = await countActiveSubscriptionsByPlanIds(
    planRows.map((row) => row.id),
  );

  const plansByTier = new Map<string, SubscriptionPlanWithTier[]>();
  const activeSubscriptionsByTier = new Map<string, number>();

  for (const row of planRows) {
    if (!row.pricing_tier_id) continue;

    const plan = toSubscriptionPlanWithTier(row, modes);
    const tierPlans = plansByTier.get(row.pricing_tier_id) ?? [];
    tierPlans.push(plan);
    plansByTier.set(row.pricing_tier_id, tierPlans);

    const activeCount = activeSubscriptionsByPlan.get(row.id) ?? 0;
    activeSubscriptionsByTier.set(
      row.pricing_tier_id,
      (activeSubscriptionsByTier.get(row.pricing_tier_id) ?? 0) + activeCount,
    );
  }

  const assignedCollectionsByTier = new Map<string, number>();
  for (const row of (assignmentsResponse.data ?? []) as AssignmentCountRow[]) {
    assignedCollectionsByTier.set(
      row.tier_id,
      (assignedCollectionsByTier.get(row.tier_id) ?? 0) + 1,
    );
  }

  return tiers.map((tier) =>
    toPricingTierWithPlans(
      tier,
      plansByTier.get(tier.id) ?? [],
      assignedCollectionsByTier.get(tier.id) ?? 0,
      activeSubscriptionsByTier.get(tier.id) ?? 0,
    ),
  );
}
