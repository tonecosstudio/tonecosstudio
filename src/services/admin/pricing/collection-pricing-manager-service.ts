import { supabase } from "@/integrations/supabase/client";
import {
  calculatePixPrice,
  inferPixDiscountPercentage,
} from "@/lib/validations/pricing-tiers";
import {
  deletePricingTierRpc,
  savePricingTierPlanRpc,
} from "@/services/admin/config/admin-config-mutations-service";

export interface PricingTier {
  id: string;
  name: string;
  description?: string;
  price_full: number;
  deposit_amount: number;
  price_pix: number;
  pix_discount_percentage: number;
  is_default: boolean;
  collections_count?: number;
}

interface TierQueryRow extends Omit<PricingTier, "collections_count" | "pix_discount_percentage"> {
  pix_discount_percentage?: number | null;
  collections?: Array<{ count: number }> | null;
}

interface PricingTiersQuery extends PromiseLike<{
  data: TierQueryRow[] | null;
  error: { message: string } | null;
}> {
  order(column: "price_full", options?: { ascending?: boolean }): PricingTiersQuery;
}

interface CollectionPricingTiersGateway {
  from(table: "pricing_tiers"): {
    select(columns: string): PricingTiersQuery;
  };
}

const collectionPricingTiersGateway = supabase as unknown as CollectionPricingTiersGateway;

function toPricingTier(row: TierQueryRow): PricingTier {
  const { collections, ...tier } = row;

  return {
    ...tier,
    pix_discount_percentage:
      row.pix_discount_percentage ?? inferPixDiscountPercentage(row.price_full, row.price_pix),
    collections_count: collections?.[0]?.count || 0,
  };
}

export async function fetchCollectionPricingTiers(): Promise<PricingTier[]> {
  const { data, error } = await collectionPricingTiersGateway
    .from("pricing_tiers")
    .select(
      `
      *,
      collections:collection_tier_assignments(count)
    `
    )
    .order("price_full", { ascending: true });

  if (error) throw error;

  return (data || []).map(toPricingTier);
}

export async function saveCollectionPricingTier(input: {
  id?: string;
  name: string;
  description: string;
  price_full: number;
  deposit_amount: number;
  price_pix: number;
  pix_discount_percentage: number;
}): Promise<void> {
  const tierData = {
    name: input.name,
    description: input.description,
    price_full: input.price_full,
    deposit_amount: input.deposit_amount,
    price_pix: calculatePixPrice(input.price_full, input.pix_discount_percentage),
    is_default: false,
  };

  await savePricingTierPlanRpc({ id: input.id, data: tierData });
}

export async function deleteCollectionPricingTier(tierId: string): Promise<void> {
  await deletePricingTierRpc(tierId);
}
