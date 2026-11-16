import { decimalToHundredths } from "@/services/commercial/tonart-commerce-rules";
import { validCatalogSlug } from "@/services/catalog/public-catalog-gateway";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TonartExtraOrderSnapshot = {
  schemaVersion: 1;
  offerId: string;
  catalogModelSlug: string;
  scale: "1/10" | "1/6";
  finishing: "painted" | "unpainted";
  contentsDescription: string;
  itemListPriceBrl: number;
  itemDiscountBrl: number;
  itemPriceBrl: number;
  subscriberDiscountEligible: boolean;
  subscriberDiscountApplied: boolean;
  subscriberDiscountBasisPoints: number;
  shippingMode: "fixed" | "quote_required";
  configuredShippingAmountBrl: number | null;
  deliveryTerms: string;
  coinsEligible: boolean;
  coinsRequested: number;
  coinsApplied: number;
  initialCashAmountDueBrl: number;
  currency: "BRL";
};

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function money(value: unknown, allowZero = false): number {
  const parsed =
    typeof value === "number" || typeof value === "string" ? value : NaN;
  let hundredths: number;
  try {
    hundredths = decimalToHundredths(parsed);
  } catch {
    throw new Error("tonart_extra_order_snapshot_invalid");
  }
  if (hundredths < (allowZero ? 0 : 1) || hundredths > 9_999_999_999) {
    throw new Error("tonart_extra_order_snapshot_invalid");
  }
  return hundredths / 100;
}

/** Strictly decodes the immutable per-order terms returned by the quotes authority. */
export function decodeTonartExtraOrderSnapshot(
  value: unknown,
): TonartExtraOrderSnapshot {
  if (!object(value)) throw new Error("tonart_extra_order_snapshot_invalid");
  const itemListPriceBrl = money(value.itemListPriceBrl);
  const itemDiscountBrl = money(value.itemDiscountBrl, true);
  const itemPriceBrl = money(value.itemPriceBrl);
  const configuredShippingAmountBrl =
    value.configuredShippingAmountBrl === null
      ? null
      : money(value.configuredShippingAmountBrl, true);
  const coinsRequested = money(value.coinsRequested, true);
  const coinsApplied = money(value.coinsApplied, true);
  const initialCashAmountDueBrl = money(value.initialCashAmountDueBrl, true);
  const itemListPriceHundredths = decimalToHundredths(itemListPriceBrl);
  const itemDiscountHundredths = decimalToHundredths(itemDiscountBrl);
  const itemPriceHundredths = decimalToHundredths(itemPriceBrl);
  const coinsRequestedHundredths = decimalToHundredths(coinsRequested);
  const coinsAppliedHundredths = decimalToHundredths(coinsApplied);
  const initialCashAmountDueHundredths = decimalToHundredths(
    initialCashAmountDueBrl,
  );
  const discountBasisPoints = value.subscriberDiscountBasisPoints;
  const validDiscountBasisPoints =
    Number.isSafeInteger(discountBasisPoints) &&
    (discountBasisPoints as number) >= 0 &&
    (discountBasisPoints as number) <= 10_000;
  const expectedItemPriceHundredths = validDiscountBasisPoints
    ? Math.floor(
        (itemListPriceHundredths *
          (value.subscriberDiscountApplied === true
            ? 10_000 - (discountBasisPoints as number)
            : 10_000) +
          5_000) /
          10_000,
      )
    : -1;

  if (
    value.schemaVersion !== 1 ||
    typeof value.offerId !== "string" ||
    !uuidPattern.test(value.offerId) ||
    typeof value.catalogModelSlug !== "string" ||
    !validCatalogSlug(value.catalogModelSlug) ||
    (value.scale !== "1/10" && value.scale !== "1/6") ||
    (value.finishing !== "painted" && value.finishing !== "unpainted") ||
    typeof value.contentsDescription !== "string" ||
    value.contentsDescription.trim().length < 1 ||
    value.contentsDescription.length > 1000 ||
    typeof value.subscriberDiscountEligible !== "boolean" ||
    typeof value.subscriberDiscountApplied !== "boolean" ||
    !Number.isSafeInteger(value.subscriberDiscountBasisPoints) ||
    (value.subscriberDiscountBasisPoints as number) < 0 ||
    (value.subscriberDiscountBasisPoints as number) > 10_000 ||
    (value.subscriberDiscountApplied &&
      (!value.subscriberDiscountEligible ||
        (value.subscriberDiscountBasisPoints as number) < 1)) ||
    (!value.subscriberDiscountApplied &&
      value.subscriberDiscountBasisPoints !== 0) ||
    (value.shippingMode !== "fixed" &&
      value.shippingMode !== "quote_required") ||
    (value.shippingMode === "fixed" && configuredShippingAmountBrl === null) ||
    (value.shippingMode === "quote_required" &&
      configuredShippingAmountBrl !== null) ||
    typeof value.deliveryTerms !== "string" ||
    value.deliveryTerms.trim().length < 1 ||
    value.deliveryTerms.length > 500 ||
    typeof value.coinsEligible !== "boolean" ||
    value.currency !== "BRL" ||
    itemListPriceHundredths - itemDiscountHundredths !== itemPriceHundredths ||
    itemPriceHundredths !== expectedItemPriceHundredths ||
    coinsAppliedHundredths > coinsRequestedHundredths ||
    coinsAppliedHundredths > itemPriceHundredths ||
    (!value.coinsEligible && coinsApplied !== 0) ||
    (!value.coinsEligible && coinsRequested !== 0) ||
    coinsRequestedHundredths > 100_000_000 ||
    initialCashAmountDueHundredths !==
      itemPriceHundredths - coinsAppliedHundredths
  ) {
    throw new Error("tonart_extra_order_snapshot_invalid");
  }

  return {
    schemaVersion: 1,
    offerId: value.offerId,
    catalogModelSlug: value.catalogModelSlug,
    scale: value.scale,
    finishing: value.finishing,
    contentsDescription: value.contentsDescription,
    itemListPriceBrl,
    itemDiscountBrl,
    itemPriceBrl,
    subscriberDiscountEligible: value.subscriberDiscountEligible,
    subscriberDiscountApplied: value.subscriberDiscountApplied,
    subscriberDiscountBasisPoints:
      value.subscriberDiscountBasisPoints as number,
    shippingMode: value.shippingMode,
    configuredShippingAmountBrl,
    deliveryTerms: value.deliveryTerms,
    coinsEligible: value.coinsEligible,
    coinsRequested,
    coinsApplied,
    initialCashAmountDueBrl,
    currency: "BRL",
  };
}
