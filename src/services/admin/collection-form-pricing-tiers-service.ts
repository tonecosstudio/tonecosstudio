import { supabase } from "@/integrations/supabase/client";

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

export async function fetchCollectionFormPricingTiers(): Promise<CollectionFormPricingTier[]> {
  const { data, error } = await supabase
    .from("pricing_tiers")
    .select("*")
    .eq("is_active", true)
    .order("display_order");

  if (error) throw error;
  return (data || []) as CollectionFormPricingTier[];
}
