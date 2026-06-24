import { supabase } from "@/integrations/supabase/client";
import type { PricingTierWithStats } from "@/types/pricing-tiers";
import { inferPixDiscountPercentage } from "@/lib/validations/pricing-tiers";
import { deletePricingTierRpc } from "@/services/admin/config/admin-config-mutations-service";

export interface SubscriptionPlanRow {
  id: string;
  tier_id: string | null;
  plan_mode: string | null;
  price_multiplier: number | null;
  price_full: number;
  name: string | null;
}

interface PricingTierRow {
  id: string;
  name: string;
  description: string | null;
  price_full: number;
  deposit_amount: number;
  price_pix: number;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface SubscriptionPlanQueryRow {
  id: string;
  tier_id: string | null;
  billing_interval: string;
  price: number;
  name: string | null;
}

export interface CollectionByTierRow {
  collection_id: string;
  tier_id: string;
  collections: {
    id: string;
    name: string;
    is_active?: boolean;
  } | null;
}

export interface PricingHierarchyData {
  tiers: PricingTierWithStats[];
  plans: SubscriptionPlanRow[];
  collections: CollectionByTierRow[];
}

export async function fetchPricingHierarchyData(): Promise<PricingHierarchyData> {
  const [tiersResponse, plansResponse, collectionsResponse] = await Promise.all([
    supabase.from("pricing_tiers").select("*").order("price_full", { ascending: true }),
    supabase
      .from("subscription_plans")
      .select(
        `
          id,
          tier_id,
          billing_interval,
          price,
          name
        `
      )
      .not("tier_id", "is", null)
      .order("price_full"),
    supabase.from("collection_tier_assignments").select(
      `
        collection_id,
        tier_id,
        collections (
          id,
          name,
          is_active
        )
      `
    ),
  ]);

  if (tiersResponse.error) throw tiersResponse.error;
  if (plansResponse.error) throw plansResponse.error;
  if (collectionsResponse.error) throw collectionsResponse.error;

  const tierRows = (tiersResponse.data || []) as PricingTierRow[];
  const collectionRows = (collectionsResponse.data || []) as CollectionByTierRow[];
  const collectionCounts = new Map<string, { total: number; active: number }>();

  collectionRows.forEach((assignment) => {
    const current = collectionCounts.get(assignment.tier_id) || { total: 0, active: 0 };
    collectionCounts.set(assignment.tier_id, {
      total: current.total + 1,
      active: current.active + (assignment.collections?.is_active ? 1 : 0),
    });
  });

  const tiers = tierRows.map((tier): PricingTierWithStats => {
    const counts = collectionCounts.get(tier.id) || { total: 0, active: 0 };

    return {
      ...tier,
      pix_discount_percentage: inferPixDiscountPercentage(tier.price_full, tier.price_pix),
      created_by: null,
      updated_by: null,
      collections_count: counts.total,
      active_collections_count: counts.active,
    };
  });

  const tiersById = new Map(tierRows.map((tier) => [tier.id, tier]));
  const plans = ((plansResponse.data || []) as SubscriptionPlanQueryRow[]).map((plan) => {
    const tier = plan.tier_id ? tiersById.get(plan.tier_id) : null;
    const priceMultiplier = tier && tier.price_full > 0 ? plan.price / tier.price_full : 1;

    return {
      id: plan.id,
      tier_id: plan.tier_id,
      plan_mode: plan.billing_interval,
      price_multiplier: priceMultiplier,
      price_full: plan.price,
      name: plan.name,
    };
  });

  return {
    tiers,
    plans,
    collections: collectionRows,
  };
}

export async function deletePricingTier(tierId: string): Promise<void> {
  await deletePricingTierRpc(tierId);
}
