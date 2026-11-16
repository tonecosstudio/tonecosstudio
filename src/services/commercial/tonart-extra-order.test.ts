import { describe, expect, it } from "vitest";
import { decodeTonartExtraOrderSnapshot } from "./tonart-extra-order";

const snapshot = {
  schemaVersion: 1,
  offerId: "22222222-2222-4222-8222-222222222222",
  catalogModelSlug: "terror-monster",
  scale: "1/10",
  finishing: "painted",
  contentsDescription: "Escultura pintada conforme a oferta.",
  itemListPriceBrl: 250,
  itemDiscountBrl: 12.5,
  itemPriceBrl: 237.5,
  subscriberDiscountEligible: true,
  subscriberDiscountApplied: true,
  subscriberDiscountBasisPoints: 500,
  shippingMode: "fixed",
  configuredShippingAmountBrl: 20.25,
  deliveryTerms: "Prazo informado na oferta.",
  coinsEligible: true,
  coinsRequested: 30,
  coinsApplied: 30,
  initialCashAmountDueBrl: 207.5,
  currency: "BRL",
} as const;

describe("TONART extra order snapshot", () => {
  it("decodes the captured price, discount, Coins and shipping terms", () => {
    expect(decodeTonartExtraOrderSnapshot(snapshot)).toEqual(snapshot);
  });

  it("keeps quote-required freight unpriced until the admin response", () => {
    expect(
      decodeTonartExtraOrderSnapshot({
        ...snapshot,
        shippingMode: "quote_required",
        configuredShippingAmountBrl: null,
      }),
    ).toMatchObject({
      shippingMode: "quote_required",
      configuredShippingAmountBrl: null,
      itemPriceBrl: 237.5,
    });
  });

  it("rejects inconsistent centi-Coin and item totals", () => {
    expect(() =>
      decodeTonartExtraOrderSnapshot({ ...snapshot, coinsApplied: 237.51 }),
    ).toThrow("tonart_extra_order_snapshot_invalid");
    expect(() =>
      decodeTonartExtraOrderSnapshot({ ...snapshot, itemPriceBrl: 237.49 }),
    ).toThrow("tonart_extra_order_snapshot_invalid");
    expect(() =>
      decodeTonartExtraOrderSnapshot({ ...snapshot, coinsRequested: 30.001 }),
    ).toThrow("tonart_extra_order_snapshot_invalid");
    expect(() =>
      decodeTonartExtraOrderSnapshot({
        ...snapshot,
        itemDiscountBrl: 10,
        itemPriceBrl: 240,
      }),
    ).toThrow("tonart_extra_order_snapshot_invalid");
    expect(() =>
      decodeTonartExtraOrderSnapshot({
        ...snapshot,
        coinsEligible: false,
      }),
    ).toThrow("tonart_extra_order_snapshot_invalid");
  });
});
