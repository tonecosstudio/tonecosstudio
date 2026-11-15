import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import { requireAdminRpcMatchingId } from "@/services/admin/rpc/admin-rpc-results";
import { validCatalogSlug } from "@/services/catalog/public-catalog-gateway";
import { decodeTonartCommercialOffer } from "@/services/commercial/tonart-commercial-offer";
import type {
  TonartCommercialOfferDirectory,
  TonartCommercialOfferDraft,
} from "@/services/commercial/tonart-commercial-offer";

export type {
  TonartCommercialOffer,
  TonartCommercialOfferDirectory,
  TonartCommercialOfferDraft,
  TonartOfferFinishing,
  TonartOfferScale,
  TonartOfferShippingMode,
} from "@/services/commercial/tonart-commercial-offer";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PRICE_BRL = 99_999_999.99;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
  if (
    !Number.isSafeInteger(draft.subscriberDiscountBasisPoints) ||
    draft.subscriberDiscountBasisPoints < 0 ||
    draft.subscriberDiscountBasisPoints > 10_000 ||
    (draft.subscriberDiscountEligible &&
      draft.subscriberDiscountBasisPoints === 0)
  ) {
    throw new Error("commercial_offer_subscriber_discount_invalid");
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
    subscriber_discount_basis_points: draft.subscriberDiscountBasisPoints,
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
    rows: result.rows.map(decodeTonartCommercialOffer),
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
