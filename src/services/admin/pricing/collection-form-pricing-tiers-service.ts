import { supabase } from "@/integrations/supabase/client";
import { inferPixDiscountPercentage } from "@/lib/validations/pricing-tiers";

export interface CollectionFormPricingTier {
  id: string;
  name: string;
  description: string | null;
  price_full: number;
  deposit_amount: number;
  price_pix: number;
  pix_discount_percentage: number;
  is_default: boolean;
}

type CollectionFormPricingTierRow = Omit<CollectionFormPricingTier, "pix_discount_percentage">;

interface CollectionFormPricingTiersQuery extends PromiseLike<{
  data: CollectionFormPricingTierRow[] | null;
  error: { message: string } | null;
}> {
  eq(column: "is_active", value: boolean): CollectionFormPricingTiersQuery;
  order(column: "display_order"): CollectionFormPricingTiersQuery;
}

interface CollectionFormPricingTiersGateway {
  from(table: "pricing_tiers"): {
    select(columns: "*"): CollectionFormPricingTiersQuery;
  };
}

const collectionFormPricingTiersGateway = supabase as unknown as CollectionFormPricingTiersGateway;

function toCollectionFormPricingTier(row: CollectionFormPricingTierRow): CollectionFormPricingTier {
  return {
    ...row,
    pix_discount_percentage: inferPixDiscountPercentage(row.price_full, row.price_pix),
  };
}

export async function fetchCollectionFormPricingTiers(): Promise<CollectionFormPricingTier[]> {
  const { data, error } = await collectionFormPricingTiersGateway
    .from("pricing_tiers")
    .select("*")
    .eq("is_active", true)
    .order("display_order");

  if (error) throw error;
  return (data || []).map(toCollectionFormPricingTier);
}
