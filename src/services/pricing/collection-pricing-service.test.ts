import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCollectionPricing,
  getGlobalPricingSettings,
} from "./collection-pricing-service";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  fetchPricingSettings: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

vi.mock("./pricing-settings-service", () => ({
  fetchPricingSettings: mocks.fetchPricingSettings,
}));

const authoritative = {
  defaultPriceFull: 500,
  defaultPricePix: 475,
  defaultDepositAmount: 100,
  pixDiscountPercentage: 5,
  monthlyProductionLimit: 25,
  salesOpenDay: 14,
};

describe("collection commercial pricing uses one SSOT", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ eq: mocks.eq, maybeSingle: mocks.maybeSingle });
    mocks.maybeSingle.mockResolvedValue({
      data: { id: "col-1", is_price_custom: false },
      error: null,
    });
    mocks.fetchPricingSettings.mockResolvedValue(authoritative);
  });

  it("delegates global prices to a fresh canonical read without a second Supabase query", async () => {
    const values = await getGlobalPricingSettings();
    expect(values).toEqual({
      default_price_full: 500,
      default_price_pix: 475,
      default_deposit_amount: 100,
      pix_discount_percentage: 5,
    });
    expect(mocks.fetchPricingSettings).toHaveBeenCalledExactlyOnceWith({
      forceRefresh: true,
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("retains a valid collection quote with exact balances and source", async () => {
    const result = await getCollectionPricing("col-1");
    expect(result).toEqual({
      price_full: 500,
      price_pix: 475,
      deposit_amount: 100,
      remaining_full: 400,
      remaining_pix: 375,
      is_custom: false,
      tier_id: null,
      tier_name: null,
      pricing_source: "default",
    });
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("collections");
    expect(mocks.select).toHaveBeenCalledExactlyOnceWith("id, is_price_custom");
    expect(mocks.eq).toHaveBeenNthCalledWith(1, "id", "col-1");
    expect(mocks.eq).toHaveBeenNthCalledWith(2, "is_active", true);
    expect(mocks.fetchPricingSettings).toHaveBeenCalledExactlyOnceWith({
      forceRefresh: true,
    });
  });

  it("rejects an unavailable collection without reading prices", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(getCollectionPricing("missing")).rejects.toThrow(
      "Coleção indisponível.",
    );
    expect(mocks.fetchPricingSettings).not.toHaveBeenCalled();
  });

  it("propagates collection lookup errors without a fallback", async () => {
    const failure = { message: "collection access denied" };
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: failure });
    await expect(getCollectionPricing("col-1")).rejects.toEqual(failure);
    expect(mocks.fetchPricingSettings).not.toHaveBeenCalled();
  });

  it("rejects custom pricing when the server price authority is not configured", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({
      data: { id: "col-1", is_price_custom: true },
      error: null,
    });
    await expect(getCollectionPricing("col-1")).rejects.toThrow(
      "Preço customizado da coleção não possui uma fronteira pública canônica configurada.",
    );
    expect(mocks.fetchPricingSettings).not.toHaveBeenCalled();
  });

  it.each([
    [
      { defaultPriceFull: 500, defaultPricePix: 501 },
      "Configuração de preço inválida.",
    ],
    [
      {
        defaultPriceFull: 500,
        defaultPricePix: 475,
        defaultDepositAmount: 476,
      },
      "Configuração de preço inválida.",
    ],
    [
      { defaultPriceFull: -1, defaultPricePix: 475 },
      "Configuração de preço inválida.",
    ],
  ])(
    "refuses an inconsistent upstream price instead of quoting it",
    async (values, error) => {
      mocks.fetchPricingSettings.mockResolvedValueOnce({
        ...authoritative,
        ...values,
      });
      await expect(getCollectionPricing("col-1")).rejects.toThrow(error);
    },
  );

  it("does not invent the missing canonical amount", async () => {
    mocks.fetchPricingSettings.mockResolvedValueOnce({
      ...authoritative,
      defaultPriceFull: undefined,
    });
    await expect(getCollectionPricing("col-1")).rejects.toThrow(
      "Preço padrão da coleção não configurado.",
    );
  });

  it("propagates a canonical pricing outage without a legacy fallback", async () => {
    mocks.fetchPricingSettings.mockRejectedValueOnce(
      new Error("authoritative pricing offline"),
    );
    await expect(getCollectionPricing("col-1")).rejects.toThrow(
      "authoritative pricing offline",
    );
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("collections");
  });
});
