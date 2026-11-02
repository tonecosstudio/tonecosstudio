import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateNetValues,
  calculatePixPrice,
  calculateRemaining,
  clearPricingCache,
  fetchPricingSettings,
} from "./pricing-settings-service";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  in: vi.fn(),
  rpc: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from, rpc: mocks.rpc },
}));

vi.mock("@/lib/logger", () => ({
  log: { error: mocks.error },
}));

const official = {
  default_price_full: "500",
  default_price_pix: "475",
  default_deposit_amount: "100",
  pix_discount_percentage: "5",
  monthly_production_limit: "25",
  sales_open_day: "14",
};

function rows(source: Record<string, unknown> = official) {
  return Object.entries(source).map(([key, value]) => ({ key, value }));
}

describe("commercial pricing settings — single authority", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPricingCache();
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ in: mocks.in });
    mocks.in.mockResolvedValue({ data: rows(), error: null });
    mocks.rpc.mockResolvedValue({ data: null, error: null });
  });

  it("reads only required and operational keys from system_settings", async () => {
    const pricing = await fetchPricingSettings();
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("system_settings");
    expect(mocks.select).toHaveBeenCalledExactlyOnceWith("key, value");
    expect(mocks.in).toHaveBeenCalledExactlyOnceWith("key", [
      "default_price_full",
      "default_price_pix",
      "default_deposit_amount",
      "pix_discount_percentage",
      "monthly_production_limit",
      "sales_open_day",
    ]);
    expect(pricing).toMatchObject({
      defaultPriceFull: 500,
      defaultPricePix: 475,
      defaultDepositAmount: 100,
      pixDiscountPercentage: 5,
      monthlyProductionLimit: 25,
      salesOpenDay: 14,
    });
  });

  it("keeps commercial values authoritative when optional production metrics fail", async () => {
    mocks.rpc.mockRejectedValueOnce(new Error("metrics offline"));
    const result = await fetchPricingSettings();
    expect(result.defaultPricePix).toBe(475);
    expect(result.currentMonthLimit).toBeUndefined();
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      "get_current_production_limit",
    );
  });

  it("accepts only finite production metrics in the optional response", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [
        {
          prod_global_limit: 25,
          prod_units_sold: 6,
          prod_available: 19,
          prod_percentage_sold: 24,
        },
      ],
      error: null,
    });
    const result = await fetchPricingSettings();
    expect(result).toMatchObject({
      currentMonthLimit: 25,
      currentMonthSold: 6,
      currentMonthAvailable: 19,
      currentMonthPercentage: 24,
    });
  });

  it("ignores incomplete production metrics without changing prices", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [
        {
          prod_global_limit: 25,
          prod_units_sold: "NaN",
          prod_available: 19,
          prod_percentage_sold: 24,
        },
      ],
      error: null,
    });
    const result = await fetchPricingSettings();
    expect(result.currentMonthSold).toBeUndefined();
    expect(result.defaultPriceFull).toBe(500);
  });

  it("caches a successful canonical read until invalidated", async () => {
    const first = await fetchPricingSettings();
    const again = await fetchPricingSettings();
    expect(again).toBe(first);
    expect(mocks.in).toHaveBeenCalledTimes(1);
    clearPricingCache();
    const updated = await fetchPricingSettings();
    expect(updated).not.toBe(first);
    expect(mocks.in).toHaveBeenCalledTimes(2);
  });

  it("does not cache a failed commercial lookup", async () => {
    mocks.in.mockResolvedValueOnce({
      data: null,
      error: { message: "permission denied" },
    });
    await expect(fetchPricingSettings()).rejects.toThrow(
      "Falha ao carregar configuração comercial: permission denied",
    );
    expect(mocks.error).toHaveBeenCalledTimes(1);
    await expect(fetchPricingSettings()).resolves.toMatchObject({
      defaultPriceFull: 500,
    });
    expect(mocks.in).toHaveBeenCalledTimes(2);
  });

  it.each([
    "default_price_full",
    "default_price_pix",
    "default_deposit_amount",
    "pix_discount_percentage",
  ])("fails closed when official field %s is absent", async (key) => {
    const input = { ...official };
    delete (input as Record<string, unknown>)[key];
    mocks.in.mockResolvedValueOnce({ data: rows(input), error: null });
    await expect(fetchPricingSettings()).rejects.toThrow(
      "Configuração comercial ausente: " + key,
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["default_price_full", "0", "default_price_full"],
    ["default_price_pix", "501", "default_price_pix"],
    ["default_deposit_amount", "476", "default_deposit_amount"],
    ["pix_discount_percentage", "101", "pix_discount_percentage"],
    ["monthly_production_limit", "0", "monthly_production_limit"],
    ["sales_open_day", "32", "sales_open_day"],
    ["monthly_production_limit", "2.5", "operacional"],
    ["sales_open_day", "2.2", "operacional"],
  ])(
    "refuses invalid or inconsistent commercial value %s",
    async (key, raw, reason) => {
      mocks.in.mockResolvedValueOnce({
        data: rows({ ...official, [key]: raw }),
        error: null,
      });
      await expect(fetchPricingSettings()).rejects.toThrow(reason);
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );

  it("uses canonical operational defaults only when optional fields are absent", async () => {
    const {
      monthly_production_limit: _m,
      sales_open_day: _s,
      ...values
    } = official;
    mocks.in.mockResolvedValueOnce({ data: rows(values), error: null });
    const result = await fetchPricingSettings();
    expect(result.monthlyProductionLimit).toBe(20);
    expect(result.salesOpenDay).toBe(15);
  });

  it("calculates a Pix discount, remaining balance and payment fee transparently", () => {
    expect(calculatePixPrice(500, 5)).toBe(475);
    expect(calculateRemaining(500, 100)).toBe(400);
    const result = calculateNetValues(500, 5);
    expect(result.pix.clientPays).toBe(475);
    expect(result.pix.tax).toBeCloseTo(4.75, 5);
    expect(result.pix.youReceive).toBeCloseTo(470.25, 5);
    expect(result.installment6x.installmentValue).toBeCloseTo(500 / 6, 5);
    expect(result.installment10xStore.youReceive).toBeLessThan(500);
    expect(result.installment10xClient.clientPays).toBeGreaterThan(500);
  });

  it("returns safe zero percentages instead of NaN on a zero-value preview", () => {
    const result = calculateNetValues(0, 0);
    expect(result.pix.percentage).toBe(0);
    expect(result.installment6x.percentage).toBe(0);
    expect(result.installment10xStore.percentage).toBe(0);
    expect(result.installment10xClient.percentage).toBe(0);
  });

  it("forces a fresh commercial read when a collection needs an authoritative quote", async () => {
    clearPricingCache();
    const from = await fetchPricingSettings();
    expect(from.defaultPriceFull).toBe(500);
    mocks.in.mockResolvedValueOnce({
      data: rows({
        ...official,
        default_price_full: "600",
        default_price_pix: "560",
      }),
      error: null,
    });
    const updated = await fetchPricingSettings({ forceRefresh: true });
    expect(updated.defaultPriceFull).toBe(600);
    expect(updated.defaultPricePix).toBe(560);
    expect(mocks.in).toHaveBeenCalledTimes(2);
    expect(await fetchPricingSettings()).toBe(updated);
  });
});
