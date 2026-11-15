import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callEdge: vi.fn(),
  assertCommercialEnabled: vi.fn(),
  runtime: { localFallback: false, previewReadOnly: false },
}));

vi.mock("@/config/supabase-environment", () => ({
  get LOCAL_SUPABASE_FALLBACK() {
    return mocks.runtime.localFallback;
  },
  get PREVIEW_READ_ONLY() {
    return mocks.runtime.previewReadOnly;
  },
}));
vi.mock("@/config/tonecos-commercial-authority", () => ({
  assertTonecosCommercialEnabled: mocks.assertCommercialEnabled,
}));
vi.mock("@/services/supabase/edge-function-client", () => ({
  callAuthenticatedEdgeFunctionData: (...args: unknown[]) =>
    mocks.callEdge(...args),
}));

import { listTonartCommercialOffersForModel } from "./tonart-commercial-offers-service";

const activeOffer = {
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
  subscriber_discount_eligible: false,
  subscriber_discount_basis_points: 500,
  is_active: true,
  updated_at: "2026-11-15T20:00:00.000Z",
};

describe("tonart-commercial-offers-service", () => {
  beforeEach(() => {
    mocks.callEdge.mockReset();
    mocks.assertCommercialEnabled.mockReset();
    mocks.runtime.localFallback = false;
    mocks.runtime.previewReadOnly = false;
  });

  it("loads only the configured offer rows for the requested model", async () => {
    mocks.callEdge.mockResolvedValue([activeOffer]);

    await expect(
      listTonartCommercialOffersForModel("published-model-variant"),
    ).resolves.toMatchObject([
      {
        catalogModelSlug: "published-model-variant",
        itemPriceBrl: 237.5,
        coinsEligible: true,
        isActive: true,
      },
    ]);
    expect(mocks.callEdge).toHaveBeenCalledWith(
      "tonart-commercial-offers",
      { modelSlug: "published-model-variant" },
      "commercial_offers_unavailable",
    );
  });

  it("refuses local fallback access and never treats missing backend data as empty", async () => {
    mocks.runtime.localFallback = true;
    await expect(
      listTonartCommercialOffersForModel("published-model-variant"),
    ).rejects.toThrow("commercial_offers_preview_read_only");
    expect(mocks.callEdge).not.toHaveBeenCalled();

    mocks.runtime.localFallback = false;
    mocks.callEdge.mockResolvedValue(null);
    await expect(
      listTonartCommercialOffersForModel("published-model-variant"),
    ).rejects.toThrow("commercial_offers_unavailable");
  });

  it("rejects malformed slugs and any row outside the active requested model", async () => {
    await expect(
      listTonartCommercialOffersForModel("../other"),
    ).rejects.toThrow("commercial_offer_model_invalid");
    expect(mocks.callEdge).not.toHaveBeenCalled();

    mocks.callEdge.mockResolvedValue([{ ...activeOffer, is_active: false }]);
    await expect(
      listTonartCommercialOffersForModel("published-model-variant"),
    ).rejects.toThrow("commercial_offers_unavailable");
  });
});
