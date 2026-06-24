import { supabase } from "@/integrations/supabase/client";
import { parseSystemSettingNumber } from "@/lib/system-settings-values";

export interface CollectionPricing {
  price_full: number;
  price_pix: number;
  deposit_amount: number;
  remaining_full: number;
  remaining_pix: number;
  is_custom: boolean;
  tier_id?: string | null;
  tier_name?: string | null;
  pricing_source: "custom" | "tier" | "default";
}

export async function getCollectionPricing(collectionId: string): Promise<CollectionPricing> {
  const { data, error } = await supabase.rpc("get_collection_pricing", {
    p_collection_id: collectionId,
  });

  if (error) throw error;
  return data?.[0] as CollectionPricing;
}

export async function getGlobalPricingSettings(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("system_settings")
    .select("key, value")
    .in("key", [
      "default_price_full",
      "default_price_pix",
      "default_deposit_amount",
      "pix_discount_percentage",
    ]);

  if (error) throw error;

  return data.reduce(
    (acc, setting) => {
      acc[setting.key] = parseSystemSettingNumber(setting.key, setting.value);
      return acc;
    },
    {} as Record<string, number>,
  );
}
