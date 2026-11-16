export const TONART_PLAN_PIECE_COUNTS = [1, 3, 6, 12] as const;

export type TonartPlanPieceCount = (typeof TONART_PLAN_PIECE_COUNTS)[number];

export type CoinPaymentBreakdown = {
  itemPriceCents: number;
  shippingCents: number;
  coinsPriceHundredths: number;
  coinsAppliedHundredths: number;
  amountDueCents: number;
};

export type ExtraOfferPriceInput = {
  listPriceCents: number;
  promotionalPriceCents?: number | null;
  subscriber: boolean;
  subscriberDiscountEligible: boolean;
  subscriberDiscountBasisPoints?: number;
  coinsEligible: boolean;
  coinBalanceHundredths: number;
  shippingCents?: number;
};

export type ExtraOfferPrice = CoinPaymentBreakdown & {
  priceAfterAllowedDiscountCents: number;
  discountCents: number;
  discountSource: "none" | "promotion" | "subscriber";
};

export type DeliveryBonusInput = {
  paymentConfirmed: boolean;
  paidInFull: boolean;
  paymentMethod: "pix" | "credit_card" | "other";
  shipmentConfirmed: boolean;
  operationAlreadyApplied: boolean;
  bonusPerShipmentHundredths: number;
  bonusCapHundredths: number;
  bonusAlreadyGrantedHundredths: number;
};

export type DeliveryChangeInput = {
  now: Date;
  plannedShippingAt: Date;
  cutoffDays: number;
  status: string;
  productionStartedAt?: Date | null;
};

function nonNegativeSafeInteger(value: number, code: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(code);
  return value;
}

/** Converts configured BRL/Coins decimal strings to integer hundredths. */
export function decimalToHundredths(value: string | number): number {
  const raw = typeof value === "number" ? String(value) : value.trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(raw);
  if (!match) throw new Error("tonart_amount_invalid");

  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  const result = whole * 100 + fraction;
  if (!Number.isSafeInteger(result)) throw new Error("tonart_amount_invalid");
  return result;
}

/** Round half up at the cent, using integer arithmetic. */
export function applyBasisPointDiscountCents(
  amountCents: number,
  discountBasisPoints: number,
): number {
  nonNegativeSafeInteger(amountCents, "tonart_price_invalid");
  if (!Number.isInteger(discountBasisPoints) || discountBasisPoints < 0 || discountBasisPoints > 10_000) {
    throw new Error("tonart_discount_invalid");
  }

  const amount = BigInt(amountCents);
  const retainedBasisPoints = BigInt(10_000 - discountBasisPoints);
  const discounted = (amount * retainedBasisPoints + 5_000n) / 10_000n;
  const result = Number(discounted);
  if (!Number.isSafeInteger(result)) throw new Error("tonart_price_invalid");
  return result;
}

/** Apply one best permitted discount; promotion and member discount never stack. */
export function priceEligibleExtra(input: ExtraOfferPriceInput): ExtraOfferPrice {
  const listPriceCents = nonNegativeSafeInteger(input.listPriceCents, "tonart_price_invalid");
  const shippingCents = nonNegativeSafeInteger(input.shippingCents ?? 0, "tonart_shipping_invalid");
  const coinBalanceHundredths = nonNegativeSafeInteger(
    input.coinBalanceHundredths,
    "tonart_coin_balance_invalid",
  );
  if (listPriceCents <= 0) throw new Error("tonart_price_invalid");

  const promotionalPriceCents = input.promotionalPriceCents ?? null;
  if (
    promotionalPriceCents !== null &&
    (!Number.isSafeInteger(promotionalPriceCents) || promotionalPriceCents <= 0 || promotionalPriceCents > listPriceCents)
  ) {
    throw new Error("tonart_promotion_invalid");
  }

  const promoPrice = promotionalPriceCents ?? listPriceCents;
  const memberEligible = input.subscriber && input.subscriberDiscountEligible;
  const memberDiscountPrice = memberEligible
    ? applyBasisPointDiscountCents(
        listPriceCents,
        input.subscriberDiscountBasisPoints ?? 0,
      )
    : listPriceCents;
  const memberPriceWins = memberEligible && memberDiscountPrice < promoPrice;
  const finalPrice = memberPriceWins ? memberDiscountPrice : promoPrice;
  const discountSource = memberPriceWins
    ? "subscriber"
    : promotionalPriceCents !== null
      ? "promotion"
      : "none";
  const coinsPriceHundredths = input.coinsEligible ? finalPrice : 0;
  const coinsAppliedHundredths = input.coinsEligible
    ? Math.min(coinBalanceHundredths, finalPrice)
    : 0;

  return {
    itemPriceCents: finalPrice,
    shippingCents,
    coinsPriceHundredths,
    coinsAppliedHundredths,
    amountDueCents: finalPrice - coinsAppliedHundredths + shippingCents,
    priceAfterAllowedDiscountCents: finalPrice,
    discountCents: listPriceCents - finalPrice,
    discountSource,
  };
}

/** Coins are a 1:1 value reference; only the eligible item subtotal is redeemable. */
export function calculateCoinPayment(input: {
  itemPriceCents: number;
  shippingCents: number;
  coinsEligible: boolean;
  coinBalanceHundredths: number;
}): CoinPaymentBreakdown {
  const itemPriceCents = nonNegativeSafeInteger(input.itemPriceCents, "tonart_price_invalid");
  const shippingCents = nonNegativeSafeInteger(input.shippingCents, "tonart_shipping_invalid");
  const coinBalanceHundredths = nonNegativeSafeInteger(
    input.coinBalanceHundredths,
    "tonart_coin_balance_invalid",
  );
  const coinsPriceHundredths = input.coinsEligible ? itemPriceCents : 0;
  const coinsAppliedHundredths = input.coinsEligible
    ? Math.min(coinBalanceHundredths, itemPriceCents)
    : 0;

  return {
    itemPriceCents,
    shippingCents,
    coinsPriceHundredths,
    coinsAppliedHundredths,
    amountDueCents: itemPriceCents - coinsAppliedHundredths + shippingCents,
  };
}

/** Bonuses vest only after a full PIX purchase and an actual shipment. */
export function bonusForConfirmedShipment(input: DeliveryBonusInput): number {
  const perShipment = nonNegativeSafeInteger(
    input.bonusPerShipmentHundredths,
    "tonart_bonus_invalid",
  );
  const cap = nonNegativeSafeInteger(input.bonusCapHundredths, "tonart_bonus_invalid");
  const alreadyGranted = nonNegativeSafeInteger(
    input.bonusAlreadyGrantedHundredths,
    "tonart_bonus_invalid",
  );
  if (alreadyGranted > cap) throw new Error("tonart_bonus_invalid");
  if (
    !input.paymentConfirmed ||
    !input.paidInFull ||
    input.paymentMethod !== "pix" ||
    !input.shipmentConfirmed ||
    input.operationAlreadyApplied
  ) {
    return 0;
  }
  return Math.min(perShipment, cap - alreadyGranted);
}

/** Delivery offsets are relative to the confirmed purchase month. */
export function getDeliveryMonthOffsets(pieceCount: number): number[] {
  if (!TONART_PLAN_PIECE_COUNTS.includes(pieceCount as TonartPlanPieceCount)) {
    throw new Error("tonart_plan_piece_count_invalid");
  }
  return Array.from({ length: pieceCount }, (_, index) => index + 2);
}

const CHANGEABLE_DELIVERY_STATES = new Set([
  "scheduled",
  "pending_choice",
  "confirmed",
]);

const PRODUCTION_STARTED_STATES = new Set([
  "in_production",
  "shipped",
  "in_transit",
  "delivered",
  "completed",
  "cancelled",
]);

function saoPauloCalendarDate(date: Date): readonly [number, number, number] {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: "year" | "month" | "day") => Number(parts.find((item) => item.type === type)?.value);
  return [part("year"), part("month"), part("day")];
}

/** True through the configured cutoff date, unless production has started. */
export function canChangeScheduledModel(input: DeliveryChangeInput): boolean {
  if (
    !Number.isInteger(input.cutoffDays) ||
    input.cutoffDays < 1 ||
    Number.isNaN(input.now.getTime()) ||
    Number.isNaN(input.plannedShippingAt.getTime())
  ) {
    throw new Error("tonart_delivery_cutoff_invalid");
  }
  if (input.productionStartedAt != null) return false;
  const status = input.status.toLowerCase();
  if (!CHANGEABLE_DELIVERY_STATES.has(status) || PRODUCTION_STARTED_STATES.has(status)) {
    return false;
  }
  // Shipping values are calendar dates; evaluate both ends on the business
  // calendar, independent of the customer's device timezone.
  const shippingYear = input.plannedShippingAt.getFullYear();
  const shippingMonth = input.plannedShippingAt.getMonth();
  const shippingDay = input.plannedShippingAt.getDate();
  const cutoff = new Date(Date.UTC(shippingYear, shippingMonth, shippingDay - input.cutoffDays));
  const [year, month, day] = saoPauloCalendarDate(input.now);
  return Date.UTC(year, month - 1, day) <= cutoff.getTime();
}
