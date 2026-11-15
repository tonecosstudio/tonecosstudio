import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import { requireAdminRpcMatchingId } from "@/services/admin/rpc/admin-rpc-results";
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

function decodeOffer(value: unknown): TonartCommercialOffer {
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
    isActive: value.is_active,
    updatedAt: value.updated_at,
  };
}

function parseBrazilianMoney(value: string, field: string): string {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`commercial_offer_${field}_invalid`);
  }
  const amount = Number(normalized);
  if (
    !Number.isFinite(amount) ||
    amount > MAX_PRICE_BRL ||
    (field === "price" ? amount <= 0 : amount < 0)
  ) {
    throw new Error(`commercial_offer_${field}_invalid`);
  }
  return amount.toFixed(2);
}

export function validateCommercialOfferDraft(
  draft: TonartCommercialOfferDraft,
  commerceEnabled: boolean,
): Record<string, unknown> {
  if (draft.id && !UUID_PATTERN.test(draft.id)) {
    throw new Error("commercial_offer_id_invalid");
  }
  if (!validCatalogSlug(draft.catalogModelSlug)) {
    throw new Error("commercial_offer_model_invalid");
  }
  if (draft.scale !== "1/10" && draft.scale !== "1/6") {
    throw new Error("commercial_offer_scale_invalid");
  }
  if (draft.finishing !== "painted" && draft.finishing !== "unpainted") {
    throw new Error("commercial_offer_finishing_invalid");
  }
  const contents = draft.contentsDescription.trim();
  const deliveryTerms = draft.deliveryTerms.trim();
  if (!contents || contents.length > 1000) {
    throw new Error("commercial_offer_contents_invalid");
  }
  if (!deliveryTerms || deliveryTerms.length > 500) {
    throw new Error("commercial_offer_delivery_terms_invalid");
  }
  const itemPriceBrl = parseBrazilianMoney(draft.itemPriceBrl, "price");
  const shippingAmountBrl =
    draft.shippingMode === "fixed"
      ? parseBrazilianMoney(draft.shippingAmountBrl, "shipping")
      : null;
  if (
    draft.shippingMode !== "fixed" &&
    draft.shippingMode !== "quote_required"
  ) {
    throw new Error("commercial_offer_shipping_mode_invalid");
  }
  if (draft.isActive && !commerceEnabled) {
    throw new Error("TONART_EXTRA_COMMERCE_DISABLED");
  }

  return {
    catalog_model_slug: draft.catalogModelSlug,
    scale: draft.scale,
    finishing: draft.finishing,
    contents_description: contents,
    item_price_brl: itemPriceBrl,
    shipping_mode: draft.shippingMode,
    shipping_amount_brl: shippingAmountBrl,
    delivery_terms: deliveryTerms,
    coins_eligible: draft.coinsEligible,
    subscriber_discount_eligible: draft.subscriberDiscountEligible,
    is_active: draft.isActive,
  };
}

export async function listAdminTonartCommercialOffers(): Promise<TonartCommercialOfferDirectory> {
  const result = await callAdminRpc<unknown>(
    "tonart_admin_commercial_offers_directory",
  );
  if (
    !isObject(result) ||
    typeof result.commerce_enabled !== "boolean" ||
    !Array.isArray(result.rows)
  ) {
    throw new Error("commercial_offer_directory_invalid");
  }
  return {
    commerceEnabled: result.commerce_enabled,
    rows: result.rows.map(decodeOffer),
  };
}

export async function saveAdminTonartCommercialOffer(
  draft: TonartCommercialOfferDraft,
  commerceEnabled: boolean,
): Promise<string> {
  const id = draft.id ?? null;
  const data = validateCommercialOfferDraft(draft, commerceEnabled);
  const result = await callAdminRpc<unknown>(
    "admin_save_tonart_commercial_offer",
    {
      p_offer_id: id,
      p_data: data,
    },
  );
  const savedId =
    typeof result === "string"
      ? result
      : isObject(result) && typeof result.id === "string"
        ? result.id
        : null;
  if (!savedId || !UUID_PATTERN.test(savedId)) {
    throw new Error("commercial_offer_save_result_invalid");
  }
  if (id) {
    requireAdminRpcMatchingId(savedId, id, "TONART commercial offer");
  }
  return savedId;
}
