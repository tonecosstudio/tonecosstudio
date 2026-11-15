import { validCatalogSlug } from "@/services/catalog/public-catalog-gateway";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PRICE_BRL = 99_999_999.99;

export type TonartOfferScale = "1/10" | "1/6";
export type TonartOfferFinishing = "painted" | "unpainted";
export type TonartOfferShippingMode = "fixed" | "quote_required";

export type TonartCommercialOffer = {
  id: string;
  catalogModelSlug: string;
  scale: TonartOfferScale;
  finishing: TonartOfferFinishing;
  contentsDescription: string;
  itemPriceBrl: number;
  shippingMode: TonartOfferShippingMode;
  shippingAmountBrl: number | null;
  deliveryTerms: string;
  coinsEligible: boolean;
  subscriberDiscountEligible: boolean;
  subscriberDiscountBasisPoints: number;
  isActive: boolean;
  updatedAt: string;
};

export type TonartCommercialOfferDraft = Omit<
  TonartCommercialOffer,
  "id" | "itemPriceBrl" | "shippingAmountBrl" | "updatedAt"
> & {
  id?: string | null;
  itemPriceBrl: string;
  shippingAmountBrl: string;
};

export type TonartCommercialOfferDirectory = {
  commerceEnabled: boolean;
  rows: TonartCommercialOffer[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readMoney(value: unknown, field: string): number {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_PRICE_BRL) {
    throw new Error(`commercial_offer_${field}_invalid`);
  }
  if (Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001) {
    throw new Error(`commercial_offer_${field}_invalid`);
  }
  return Math.round(amount * 100) / 100;
}

function readShipping(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const amount = typeof value === "number" ? value : Number(value);
  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    amount > MAX_PRICE_BRL ||
    Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001
  ) {
    throw new Error("commercial_offer_shipping_invalid");
  }
  return Math.round(amount * 100) / 100;
}

export function decodeTonartCommercialOffer(
  value: unknown,
): TonartCommercialOffer {
  if (!isObject(value)) throw new Error("commercial_offer_row_invalid");
  if (
    typeof value.id !== "string" ||
    !UUID_PATTERN.test(value.id) ||
    typeof value.catalog_model_slug !== "string" ||
    !validCatalogSlug(value.catalog_model_slug) ||
    (value.scale !== "1/10" && value.scale !== "1/6") ||
    (value.finishing !== "painted" && value.finishing !== "unpainted") ||
    typeof value.contents_description !== "string" ||
    value.contents_description.trim().length < 1 ||
    value.contents_description.length > 1000 ||
    (value.shipping_mode !== "fixed" &&
      value.shipping_mode !== "quote_required") ||
    typeof value.delivery_terms !== "string" ||
    value.delivery_terms.trim().length < 1 ||
    value.delivery_terms.length > 500 ||
    typeof value.coins_eligible !== "boolean" ||
    typeof value.subscriber_discount_eligible !== "boolean" ||
    typeof value.subscriber_discount_basis_points !== "number" ||
    !Number.isSafeInteger(value.subscriber_discount_basis_points) ||
    value.subscriber_discount_basis_points < 0 ||
    value.subscriber_discount_basis_points > 10_000 ||
    (value.subscriber_discount_eligible &&
      value.subscriber_discount_basis_points === 0) ||
    typeof value.is_active !== "boolean" ||
    typeof value.updated_at !== "string" ||
    Number.isNaN(Date.parse(value.updated_at))
  ) {
    throw new Error("commercial_offer_row_invalid");
  }

  const itemPriceBrl = readMoney(value.item_price_brl, "price");
  const shippingAmountBrl = readShipping(value.shipping_amount_brl);
  if (
    (value.shipping_mode === "fixed" && shippingAmountBrl === null) ||
    (value.shipping_mode === "quote_required" && shippingAmountBrl !== null)
  ) {
    throw new Error("commercial_offer_shipping_invalid");
  }

  return {
    id: value.id,
    catalogModelSlug: value.catalog_model_slug,
    scale: value.scale,
    finishing: value.finishing,
    contentsDescription: value.contents_description,
    itemPriceBrl,
    shippingMode: value.shipping_mode,
    shippingAmountBrl,
    deliveryTerms: value.delivery_terms,
    coinsEligible: value.coins_eligible,
    subscriberDiscountEligible: value.subscriber_discount_eligible,
    subscriberDiscountBasisPoints: value.subscriber_discount_basis_points,
    isActive: value.is_active,
    updatedAt: value.updated_at,
  };
}

export function validateTonartCommercialOfferSlug(slug: string): string {
  const normalized = slug.trim();
  if (!validCatalogSlug(normalized)) {
    throw new Error("commercial_offer_model_invalid");
  }
  return normalized;
}
