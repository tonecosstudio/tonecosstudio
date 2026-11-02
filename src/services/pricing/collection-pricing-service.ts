import { supabase } from "@/integrations/supabase/client";
import { fetchPricingSettings } from "@/services/pricing/pricing-settings-service";

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

function validatePricing(pricing: CollectionPricing): CollectionPricing {
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

export async function getCollectionPricing(
  collectionId: string,
): Promise<CollectionPricing> {
  const { data: collection, error: collectionError } = await supabase
    .from("collections")
    .select("id, is_price_custom")
    .eq("id", collectionId)
    .eq("is_active", true)
    .maybeSingle();

  if (collectionError) throw collectionError;
  if (!collection) {
    throw new Error("Coleção indisponível.");
  }

  if (collection.is_price_custom) {
    throw new Error(
      "Preço customizado da coleção não possui uma fronteira pública canônica configurada.",
    );
  }

  const settings = await getGlobalPricingSettings();
  const priceFull = settings.default_price_full;
  const pricePix = settings.default_price_pix;
  const depositAmount = settings.default_deposit_amount;

  if (
    priceFull === undefined ||
    pricePix === undefined ||
    depositAmount === undefined
  ) {
    throw new Error("Preço padrão da coleção não configurado.");
  }

  return validatePricing({
    price_full: priceFull,
    price_pix: pricePix,
    deposit_amount: depositAmount,
    remaining_full: priceFull - depositAmount,
    remaining_pix: pricePix - depositAmount,
    is_custom: false,
    tier_id: null,
    tier_name: null,
    pricing_source: "default",
  });
}

export async function getGlobalPricingSettings(): Promise<
  Record<string, number>
> {
  // Commercial prices require a fresh authoritative read; never reuse
  // the 5-minute presentation cache for a customer-facing quote.
  const settings = await fetchPricingSettings({ forceRefresh: true });
  return {
    default_price_full: settings.defaultPriceFull,
    default_price_pix: settings.defaultPricePix,
    default_deposit_amount: settings.defaultDepositAmount,
    pix_discount_percentage: settings.pixDiscountPercentage,
  };
}
