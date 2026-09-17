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

function requireTierAmount(
  value: number | null,
  field: string,
  tierId: string,
): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Pricing tier ${tierId} has invalid ${field}`);
  }
  return value;
}

export async function fetchPricingHierarchyData(): Promise<PricingHierarchyData> {
  const [tiersResponse, plansResponse, collectionsResponse] = await Promise.all([
    supabase.from("pricing_tiers").select("*").order("price_full", { ascending: true }),
    supabase
      .from("subscription_plans")
      .select(
        `
          id,
          pricing_tier_id,
          billing_interval,
          price,
          name
        `
      )
      .not("pricing_tier_id", "is", null)
      .order("price", { ascending: true }),
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

  const collectionRows: CollectionByTierRow[] = (collectionsResponse.data || []).map(
    (assignment) => ({
      collection_id: assignment.collection_id,
      tier_id: assignment.tier_id,
      collections: Array.isArray(assignment.collections)
        ? assignment.collections[0] ?? null
        : assignment.collections,
    }),
  );
  const collectionCounts = new Map<string, { total: number; active: number }>();

  collectionRows.forEach((assignment) => {
    const current = collectionCounts.get(assignment.tier_id) || { total: 0, active: 0 };
    collectionCounts.set(assignment.tier_id, {
      total: current.total + 1,
      active: current.active + (assignment.collections?.is_active ? 1 : 0),
    });
  });

  const tiers = (tiersResponse.data || []).map((tier): PricingTierWithStats => {
    const priceFull = requireTierAmount(tier.price_full, "price_full", tier.id);
    const pricePix = requireTierAmount(tier.price_pix, "price_pix", tier.id);
    const depositAmount = requireTierAmount(tier.deposit_amount, "deposit_amount", tier.id);
    const counts = collectionCounts.get(tier.id) || { total: 0, active: 0 };

    return {
      id: tier.id,
      name: tier.name,
      description: tier.description,
      price_full: priceFull,
      deposit_amount: depositAmount,
      pix_discount_percentage: inferPixDiscountPercentage(priceFull, pricePix),
      price_pix: pricePix,
      is_active: tier.is_active === true,
      is_default: tier.is_default,
      display_order: tier.display_order ?? 0,
      created_at: tier.created_at,
      updated_at: tier.updated_at,
      created_by: null,
      updated_by: null,
      collections_count: counts.total,
      active_collections_count: counts.active,
    };
  });

  const tiersById = new Map(tiers.map((tier) => [tier.id, tier]));
  const plans: SubscriptionPlanRow[] = (plansResponse.data || []).map((plan) => {
    const tierId = plan.pricing_tier_id;
    const tier = tierId ? tiersById.get(tierId) : null;
    const priceMultiplier = tier && tier.price_full > 0 ? plan.price / tier.price_full : 1;

    return {
      id: plan.id,
      tier_id: tierId,
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
