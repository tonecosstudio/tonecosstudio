import { supabase } from "@/integrations/supabase/client";
import type { PricingTierWithStats } from "@/types/pricing-tiers";

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
          plan_mode,
          price_multiplier,
          price_full,
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
          name
        )
      `
    ),
  ]);

  if (tiersResponse.error) throw tiersResponse.error;
  if (plansResponse.error) throw plansResponse.error;
  if (collectionsResponse.error) throw collectionsResponse.error;

  return {
    tiers: (tiersResponse.data || []) as PricingTierWithStats[],
    plans: (plansResponse.data || []) as SubscriptionPlanRow[],
    collections: (collectionsResponse.data || []) as CollectionByTierRow[],
  };
}

export async function deletePricingTier(tierId: string): Promise<void> {
  const { error } = await supabase.from("pricing_tiers").delete().eq("id", tierId);
  if (error) throw error;
}
