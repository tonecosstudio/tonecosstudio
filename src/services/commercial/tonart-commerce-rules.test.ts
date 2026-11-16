import { describe, expect, it } from "vitest";
import {
  applyBasisPointDiscountCents,
  bonusForConfirmedShipment,
  calculateCoinPayment,
  canChangeScheduledModel,
  decimalToHundredths,
  getDeliveryMonthOffsets,
  priceEligibleExtra,
} from "./tonart-commerce-rules";

describe("TONART collection and Coins commercial rules", () => {
  it("parses BRL and Coin hundredths without floating point drift", () => {
    expect(decimalToHundredths("237.50")).toBe(23_750);
    expect(decimalToHundredths(30.5)).toBe(3_050);
    expect(() => decimalToHundredths("30.555")).toThrow("tonart_amount_invalid");
  });

  it("calculates the proposed 5% extra discount in exact cents", () => {
    expect(applyBasisPointDiscountCents(25_000, 500)).toBe(23_750);
    expect(applyBasisPointDiscountCents(40_000, 500)).toBe(38_000);
    expect(applyBasisPointDiscountCents(1, 5_000)).toBe(1);
  });

  it("prices a R$250 eligible extra at R$237,50 and applies 30 Coins before freight", () => {
    const result = priceEligibleExtra({
      listPriceCents: 25_000,
      subscriber: true,
      subscriberDiscountEligible: true,
      subscriberDiscountBasisPoints: 500,
      coinsEligible: true,
      coinBalanceHundredths: 3_000,
      shippingCents: 1_299,
    });
    expect(result).toMatchObject({
      itemPriceCents: 23_750,
      coinsPriceHundredths: 23_750,
      coinsAppliedHundredths: 3_000,
      shippingCents: 1_299,
      amountDueCents: 22_049,
      discountCents: 1_250,
      discountSource: "subscriber",
    });
  });

  it("applies only the better eligible discount and never stacks promotion with membership", () => {
    const price = priceEligibleExtra({
      listPriceCents: 40_000,
      promotionalPriceCents: 36_000,
      subscriber: true,
      subscriberDiscountEligible: true,
      subscriberDiscountBasisPoints: 500,
      coinsEligible: true,
      coinBalanceHundredths: 0,
    });

    expect(price).toMatchObject({
      itemPriceCents: 36_000,
      discountCents: 4_000,
      discountSource: "promotion",
      coinsPriceHundredths: 36_000,
    });
  });

  it("supports mixed Coins and BRL payment while keeping shipping outside the wallet", () => {
    const result = calculateCoinPayment({
      itemPriceCents: 23_750,
      shippingCents: 2_450,
      coinsEligible: true,
      coinBalanceHundredths: 3_000,
    });

    expect(result).toEqual({
      itemPriceCents: 23_750,
      shippingCents: 2_450,
      coinsPriceHundredths: 23_750,
      coinsAppliedHundredths: 3_000,
      amountDueCents: 23_200,
    });
  });

  it("does not spend Coins on ineligible offers or freight", () => {
    const result = priceEligibleExtra({
      listPriceCents: 40_000,
      subscriber: true,
      subscriberDiscountEligible: false,
      subscriberDiscountBasisPoints: 500,
      coinsEligible: false,
      coinBalanceHundredths: 50_000,
      shippingCents: 1_500,
    });

    expect(result).toMatchObject({
      itemPriceCents: 40_000,
      coinsPriceHundredths: 0,
      coinsAppliedHundredths: 0,
      amountDueCents: 41_500,
    });
  });

  it("caps an idempotent bonus at each confirmed PIX shipment", () => {
    const input = {
      paymentConfirmed: true,
      paidInFull: true,
      paymentMethod: "pix" as const,
      shipmentConfirmed: true,
      operationAlreadyApplied: false,
      bonusPerShipmentHundredths: 500,
      bonusCapHundredths: 1_500,
      bonusAlreadyGrantedHundredths: 1_000,
    };
    expect(bonusForConfirmedShipment(input)).toBe(500);
    expect(bonusForConfirmedShipment({ ...input, operationAlreadyApplied: true })).toBe(0);
    expect(bonusForConfirmedShipment({ ...input, paymentMethod: "credit_card" })).toBe(0);
    expect(bonusForConfirmedShipment({ ...input, bonusAlreadyGrantedHundredths: 1_500 })).toBe(0);
  });

  it("starts scheduled deliveries in month 2 and keeps the full piece count", () => {
    expect(getDeliveryMonthOffsets(1)).toEqual([2]);
    expect(getDeliveryMonthOffsets(3)).toEqual([2, 3, 4]);
    expect(getDeliveryMonthOffsets(6)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(getDeliveryMonthOffsets(12)).toHaveLength(12);
    expect(getDeliveryMonthOffsets(12).at(-1)).toBe(13);
    expect(() => getDeliveryMonthOffsets(2)).toThrow("tonart_plan_piece_count_invalid");
  });

  it("allows a model change through the exact configured cutoff and closes it after production starts", () => {
    const now = new Date(2026, 10, 15, 12);
    const shipping = new Date(2026, 11, 15, 12);
    expect(
      canChangeScheduledModel({ now, plannedShippingAt: shipping, cutoffDays: 30, status: "scheduled" }),
    ).toBe(true);
    expect(
      canChangeScheduledModel({
        now: new Date("2026-11-16T03:00:00.000Z"),
        plannedShippingAt: shipping,
        cutoffDays: 30,
        status: "scheduled",
      }),
    ).toBe(false);
    expect(
      canChangeScheduledModel({
        now: new Date("2026-11-16T02:30:00.000Z"),
        plannedShippingAt: shipping,
        cutoffDays: 30,
        status: "scheduled",
      }),
    ).toBe(true);
    expect(
      canChangeScheduledModel({
        now: new Date("2026-11-16T03:00:00.000Z"),
        plannedShippingAt: shipping,
        cutoffDays: 30,
        status: "scheduled",
      }),
    ).toBe(false);
    expect(
      canChangeScheduledModel({ now, plannedShippingAt: shipping, cutoffDays: 30, status: "in_production" }),
    ).toBe(false);
    expect(
      canChangeScheduledModel({
        now: new Date("2026-11-16T02:59:59.999Z"),
        plannedShippingAt: shipping,
        cutoffDays: 30,
        status: "scheduled",
      }),
    ).toBe(true);
    expect(
      canChangeScheduledModel({
        now: new Date("2026-11-16T03:00:00.000Z"),
        plannedShippingAt: shipping,
        cutoffDays: 30,
        status: "scheduled",
      }),
    ).toBe(false);
    expect(() => canChangeScheduledModel({ now, plannedShippingAt: shipping, cutoffDays: 0, status: "scheduled" }))
      .toThrow("tonart_delivery_cutoff_invalid");
  });
});
