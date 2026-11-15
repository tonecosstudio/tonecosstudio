import { describe, expect, it } from "vitest";
import { decodeTonartCommercialOffer } from "./tonart-commercial-offer";

const validOffer = {
  id: "8c10a7c6-46f0-49a6-99be-820c43a9e6f0",
  catalog_model_slug: "published-model-variant",
  scale: "1/10",
  finishing: "painted",
  contents_description: "Peça pintada, com base incluída.",
  item_price_brl: "237.50",
  shipping_mode: "quote_required",
  shipping_amount_brl: null,
  delivery_terms: "Prazo informado após confirmação do CEP.",
  coins_eligible: true,
  subscriber_discount_eligible: true,
  subscriber_discount_basis_points: 500,
  is_active: true,
  updated_at: "2026-11-15T20:00:00.000Z",
};

describe("TONART commercial offer decoding", () => {
  it("preserves exact BRL cents and the configured eligibility flags", () => {
    expect(decodeTonartCommercialOffer(validOffer)).toMatchObject({
      catalogModelSlug: "published-model-variant",
      itemPriceBrl: 237.5,
      shippingMode: "quote_required",
      shippingAmountBrl: null,
      coinsEligible: true,
      subscriberDiscountEligible: true,
      subscriberDiscountBasisPoints: 500,
      isActive: true,
    });
  });

  it("rejects a price with fractional cents and an inconsistent freight mode", () => {
    expect(() =>
      decodeTonartCommercialOffer({ ...validOffer, item_price_brl: "237.501" }),
    ).toThrow("commercial_offer_price_invalid");
    expect(() =>
      decodeTonartCommercialOffer({
        ...validOffer,
        shipping_mode: "fixed",
        shipping_amount_brl: null,
      }),
    ).toThrow("commercial_offer_shipping_invalid");
  });

  it("preserves the active flag and rejects malformed model rows", () => {
    expect(
      decodeTonartCommercialOffer({ ...validOffer, is_active: false }).isActive,
    ).toBe(false);
    expect(() =>
      decodeTonartCommercialOffer({
        ...validOffer,
        catalog_model_slug: "../other",
      }),
    ).toThrow("commercial_offer_row_invalid");
  });

  it("rejects an enabled subscriber benefit without a valid configured rate", () => {
    expect(() =>
      decodeTonartCommercialOffer({
        ...validOffer,
        subscriber_discount_basis_points: 0,
      }),
    ).toThrow("commercial_offer_row_invalid");
    expect(() =>
      decodeTonartCommercialOffer({
        ...validOffer,
        subscriber_discount_basis_points: 10_001,
      }),
    ).toThrow("commercial_offer_row_invalid");
  });
});
