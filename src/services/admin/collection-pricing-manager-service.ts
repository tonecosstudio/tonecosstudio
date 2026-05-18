import { supabase } from "@/integrations/supabase/client";

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

interface TierQueryRow extends Omit<PricingTier, "collections_count"> {
  collections?: Array<{ count: number }> | null;
}

export async function fetchCollectionPricingTiers(): Promise<PricingTier[]> {
  const { data, error } = await supabase
    .from("pricing_tiers")
    .select(
      `
      *,
      collections:collection_tier_assignments(count)
    `
    )
    .order("price_full", { ascending: true });

  if (error) throw error;

  return (data as TierQueryRow[]).map((tier) => ({
    ...tier,
    collections_count: tier.collections?.[0]?.count || 0,
  }));
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
    price_pix: input.price_pix,
    pix_discount_percentage: input.pix_discount_percentage,
    is_default: false,
  };

  if (input.id) {
    const { error } = await supabase.from("pricing_tiers").update(tierData).eq("id", input.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("pricing_tiers").insert([tierData]);
  if (error) throw error;
}

export async function deleteCollectionPricingTier(tierId: string): Promise<void> {
  const { error } = await supabase.from("pricing_tiers").delete().eq("id", tierId);
  if (error) throw error;
}
