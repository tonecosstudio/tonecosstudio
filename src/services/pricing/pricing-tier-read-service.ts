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
  assigned_at?: string;
  assigned_by?: string | null;
  previous_tier_id?: string | null;
  pricing_tiers: AssignmentPricingTier | null;
}

export interface CollectionByTierAssignment {
  id: string;
  collection_id: string;
  tier_id: string;
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

type PricingTierViewRow = {
  tier_id: string | null;
  tier_name: string | null;
  tier_description: string | null;
  tier_price_base?: number | null;
  tier_base_price?: number | null;
  tier_price_pix_base?: number | null;
  tier_deposit?: number | null;
  tier_is_active: boolean | null;
  tier_is_default: boolean | null;
  tier_display_order?: number | null;
  assigned_collections_count?: number | null;
  active_subscriptions_count?: number | null;
};

type SubscriptionPlanQueryRow = Partial<SubscriptionPlanWithTier> & {
  id: string;
  tier_id: string | null;
  name: string;
  description: string | null;
  price?: number | null;
  plan_type?: string | null;
  billing_interval?: string | null;
  deliveries_per_cycle?: number | null;
};

function requireText(value: string | null | undefined, fieldName: string): string {
  if (!value) {
    throw new Error(`Invalid pricing tier row: missing ${fieldName}`);
  }

  return value;
}

function toSubscriptionPlanWithTier(row: SubscriptionPlanQueryRow): SubscriptionPlanWithTier {
  const priceFull = row.price_full ?? row.price ?? 0;
  const planMode = row.plan_mode ?? row.plan_type ?? row.billing_interval ?? "standalone";

  return {
    id: row.id,
    tier_id: requireText(row.tier_id, "plan.tier_id"),
    plan_mode: planMode as SubscriptionPlanWithTier["plan_mode"],
    plan_type: row.plan_type ?? planMode,
    name: row.name,
    description: row.description,
    price_full: priceFull,
    price_pix: row.price_pix ?? priceFull,
    price_multiplier: row.price_multiplier ?? 1,
    collections_count: row.collections_count ?? 1,
    deliveries_total: row.deliveries_total ?? row.deliveries_per_cycle ?? 1,
    includes_bonus: row.includes_bonus ?? false,
    can_switch: row.can_switch ?? true,
    switch_limit: row.switch_limit ?? null,
    switch_cutoff_days: row.switch_cutoff_days ?? 15,
    max_installments: row.max_installments ?? 1,
    is_active: row.is_active ?? true,
    display_order: row.display_order ?? 0,
    created_at: requireText(row.created_at, "plan.created_at"),
    updated_at: requireText(row.updated_at, "plan.updated_at"),
  };
}

function toPricingTierWithPlans(
  tier: PricingTierViewRow,
  plans: SubscriptionPlanWithTier[],
): PricingTierWithPlans {
  const tierPriceBase = tier.tier_price_base ?? tier.tier_base_price ?? 0;

  return {
    tier_id: requireText(tier.tier_id, "tier_id"),
    tier_name: requireText(tier.tier_name, "tier_name"),
    tier_description: tier.tier_description,
    tier_price_base: tierPriceBase,
    tier_price_pix_base: tier.tier_price_pix_base ?? tierPriceBase,
    tier_deposit: tier.tier_deposit ?? 0,
    tier_is_active: tier.tier_is_active ?? true,
    tier_is_default: tier.tier_is_default ?? false,
    plans,
    assigned_collections_count: tier.assigned_collections_count ?? 0,
    total_active_subscriptions: tier.active_subscriptions_count ?? 0,
  };
}

export async function getCollectionTierAssignment(
  collectionId: string | null | undefined,
): Promise<CollectionTierAssignmentWithTier | null> {
  if (!collectionId) return null;

  const { data, error } = await supabase
    .from("collection_tier_assignments")
    .select(`
      *,
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

  return data as CollectionTierAssignmentWithTier | null;
}

export async function listCollectionsByTier(
  tierId: string | null | undefined,
): Promise<CollectionByTierAssignment[]> {
  if (!tierId) return [];

  const { data, error } = await supabase
    .from("collection_tier_assignments")
    .select(`
      *,
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

  return (data ?? []) as CollectionByTierAssignment[];
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

  const { data: viewData, error: viewError } = await supabase
    .from("pricing_tiers_with_plans")
    .select("*")
    .eq("tier_id", tierId)
    .limit(1);

  if (viewError) {
    throw new Error(`Erro ao buscar nivel: ${viewError.message}`);
  }

  const tierRows = (viewData ?? []) as unknown as PricingTierViewRow[];

  if (tierRows.length === 0) {
    return null;
  }

  const { data: plansData, error: plansError } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("tier_id", tierId)
    .order("display_order", { ascending: true });

  if (plansError) {
    throw new Error(`Erro ao buscar planos: ${plansError.message}`);
  }

  const plans = ((plansData ?? []) as unknown as SubscriptionPlanQueryRow[])
    .map(toSubscriptionPlanWithTier);

  return toPricingTierWithPlans(tierRows[0], plans);
}

export async function listAllTiersWithPlans(): Promise<PricingTierWithPlans[]> {
  const { data: tiersData, error: tiersError } = await supabase
    .from("pricing_tiers_with_plans")
    .select("*")
    .order("tier_display_order", { ascending: true });

  if (tiersError) {
    throw new Error(`Erro ao buscar niveis: ${tiersError.message}`);
  }

  const { data: plansData, error: plansError } = await supabase
    .from("subscription_plans")
    .select("*")
    .not("tier_id", "is", null)
    .order("tier_id", { ascending: true })
    .order("display_order", { ascending: true });

  if (plansError) {
    throw new Error(`Erro ao buscar planos: ${plansError.message}`);
  }

  const plans = ((plansData ?? []) as unknown as SubscriptionPlanQueryRow[])
    .map(toSubscriptionPlanWithTier);

  const plansByTier = plans.reduce<Record<string, SubscriptionPlanWithTier[]>>((acc, plan) => {
    if (!acc[plan.tier_id]) {
      acc[plan.tier_id] = [];
    }
    acc[plan.tier_id].push(plan);
    return acc;
  }, {});

  const tierRows = (tiersData ?? []) as unknown as PricingTierViewRow[];
  const tierStatsMap = new Map<string, PricingTierViewRow>();

  tierRows.forEach((row) => {
    if (!row.tier_id) return;
    if (!tierStatsMap.has(row.tier_id)) {
      tierStatsMap.set(row.tier_id, row);
    }
  });

  return Array.from(tierStatsMap.entries()).map(([tierId, tier]) =>
    toPricingTierWithPlans(tier, plansByTier[tierId] || []),
  );
}
