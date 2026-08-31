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

export async function getCollectionPricing(
  collectionId: string,
): Promise<CollectionPricing> {
  const { data, error } = await supabase.rpc("get_collection_pricing", {
    p_collection_id: collectionId,
  });

  if (error) throw error;

  const row = data?.[0] as Partial<CollectionPricing> | undefined;
  if (!row) {
    throw new Error("Preço da coleção não configurado.");
  }

  const pricing: CollectionPricing = {
    ...row,
    price_full: Number(row.price_full),
    price_pix: Number(row.price_pix),
    deposit_amount: Number(row.deposit_amount),
    remaining_full: Number(row.remaining_full),
    remaining_pix: Number(row.remaining_pix),
    is_custom: Boolean(row.is_custom),
    pricing_source: row.pricing_source ?? "default",
  };

  const moneyValues = [
    pricing.price_full,
    pricing.price_pix,
    pricing.deposit_amount,
    pricing.remaining_full,
    pricing.remaining_pix,
  ];
  const hasInvalidMoney = moneyValues.some(
    (value) => !Number.isFinite(value) || value < 0,
  );
  const hasInvalidTotal =
    pricing.price_full <= 0 ||
    pricing.price_pix <= 0 ||
    pricing.price_pix > pricing.price_full ||
    pricing.deposit_amount > Math.min(pricing.price_full, pricing.price_pix);

  if (hasInvalidMoney || hasInvalidTotal) {
    throw new Error("Configuração de preço inválida.");
  }

  return pricing;
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
