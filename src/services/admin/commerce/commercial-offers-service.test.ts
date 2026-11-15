import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  listAdminTonartCommercialOffers,
  validateCommercialOfferDraft,
  type TonartCommercialOfferDraft,
} from "./commercial-offers-service";

const callAdminRpc = vi.fn();

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: (...args: unknown[]) => callAdminRpc(...args),
}));

const validDraft: TonartCommercialOfferDraft = {
  catalogModelSlug: "published-model-variant",
  scale: "1/10",
  finishing: "painted",
  contentsDescription: "Peça pintada conforme oferta.",
  itemPriceBrl: "237,50",
  shippingMode: "quote_required",
  shippingAmountBrl: "",
  deliveryTerms: "Prazo informado após confirmação do CEP.",
  coinsEligible: true,
  subscriberDiscountEligible: true,
  subscriberDiscountBasisPoints: 500,
  isActive: false,
};

describe("commercial-offers-service", () => {
  beforeEach(() => callAdminRpc.mockReset());

  it("normalizes BRL cents without manufacturing freight or enabling sales", () => {
    expect(validateCommercialOfferDraft(validDraft, false)).toMatchObject({
      catalog_model_slug: "published-model-variant",
      item_price_brl: "237.50",
      shipping_mode: "quote_required",
      shipping_amount_brl: null,
      coins_eligible: true,
      subscriber_discount_eligible: true,
      subscriber_discount_basis_points: 500,
      is_active: false,
    });
  });

  it("blocks activation while the server commerce gate is closed", () => {
    expect(() =>
      validateCommercialOfferDraft({ ...validDraft, isActive: true }, false),
    ).toThrow("TONART_EXTRA_COMMERCE_DISABLED");
  });

  it("requires cent precision and a real fixed freight value when selected", () => {
    expect(() =>
      validateCommercialOfferDraft(
        { ...validDraft, itemPriceBrl: "237,501" },
        false,
      ),
    ).toThrow("commercial_offer_price_invalid");
    expect(() =>
      validateCommercialOfferDraft(
        {
          ...validDraft,
          shippingMode: "fixed",
          shippingAmountBrl: "",
        },
        false,
      ),
    ).toThrow("commercial_offer_shipping_invalid");
  });

  it("sends a configured subscriber rate in basis points and requires a positive rate when eligible", () => {
    expect(
      validateCommercialOfferDraft(
        { ...validDraft, subscriberDiscountBasisPoints: 575 },
        false,
      ),
    ).toMatchObject({ subscriber_discount_basis_points: 575 });
    expect(() =>
      validateCommercialOfferDraft(
        { ...validDraft, subscriberDiscountBasisPoints: 0 },
        false,
      ),
    ).toThrow("commercial_offer_subscriber_discount_invalid");
    expect(() =>
      validateCommercialOfferDraft(
        { ...validDraft, subscriberDiscountBasisPoints: 10_001 },
        false,
      ),
    ).toThrow("commercial_offer_subscriber_discount_invalid");
  });

  it("reads the backend gate alongside an empty offer list", async () => {
    callAdminRpc.mockResolvedValue({ commerce_enabled: false, rows: [] });
    await expect(listAdminTonartCommercialOffers()).resolves.toEqual({
      commerceEnabled: false,
      rows: [],
    });
    expect(callAdminRpc).toHaveBeenCalledWith(
      "tonart_admin_commercial_offers_directory",
    );
  });
});
