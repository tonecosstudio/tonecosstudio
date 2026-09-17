/**
 * Testes para useCollectionPricing hook
 */

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCollectionPricing, useGlobalPricingSettings } from "./useCollectionPricing";

const pricingMocks = vi.hoisted(() => ({
  getCollectionPricing: vi.fn(),
  getGlobalPricingSettings: vi.fn(),
}));

vi.mock("@/services/pricing/collection-pricing-service", () => ({
  getCollectionPricing: pricingMocks.getCollectionPricing,
  getGlobalPricingSettings: pricingMocks.getGlobalPricingSettings,
}));

const collectionPricing = {
  price_full: 100,
  price_pix: 90,
  deposit_amount: 30,
  remaining_full: 70,
  remaining_pix: 60,
  is_custom: false,
  tier_id: null,
  tier_name: null,
  pricing_source: "default" as const,
};

const globalPricingSettings = {
  default_price_full: 100,
  default_price_pix: 90,
  default_deposit_amount: 30,
  pix_discount_percentage: 10,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useCollectionPricing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pricingMocks.getCollectionPricing.mockResolvedValue(collectionPricing);
    pricingMocks.getGlobalPricingSettings.mockResolvedValue(globalPricingSettings);
  });

  it("deve retornar pricing de coleção", async () => {
    const { result } = renderHook(() => useCollectionPricing("test-collection-id"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(collectionPricing);
    expect(pricingMocks.getCollectionPricing).toHaveBeenCalledWith("test-collection-id");
  });

  it("deve ter valores numéricos corretos", async () => {
    const { result } = renderHook(() => useCollectionPricing("test-collection-id"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    const data = result.current.data!;
    expect(typeof data.price_full).toBe("number");
    expect(typeof data.price_pix).toBe("number");
    expect(typeof data.deposit_amount).toBe("number");
    expect(typeof data.remaining_full).toBe("number");
    expect(typeof data.remaining_pix).toBe("number");
    expect(typeof data.is_custom).toBe("boolean");
  });

  it("deve validar lógica de preços exposta pelo serviço", async () => {
    const { result } = renderHook(() => useCollectionPricing("test-collection-id"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    const data = result.current.data!;
    expect(data.price_pix).toBeLessThanOrEqual(data.price_full);
    expect(data.deposit_amount).toBeLessThan(data.price_full);
    expect(data.remaining_full).toBe(data.price_full - data.deposit_amount);
  });

  it("não deve fazer query sem collectionId", () => {
    const { result } = renderHook(() => useCollectionPricing(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.fetchStatus).toBe("idle");
    expect(pricingMocks.getCollectionPricing).not.toHaveBeenCalled();
  });

  it("deve manter resultado em cache no rerender", async () => {
    const { result, rerender } = renderHook(() => useCollectionPricing("test-collection-id"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    const firstData = result.current.data;

    rerender();

    expect(result.current.data).toBe(firstData);
    expect(pricingMocks.getCollectionPricing).toHaveBeenCalledTimes(1);
  });
});

describe("useGlobalPricingSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pricingMocks.getCollectionPricing.mockResolvedValue(collectionPricing);
    pricingMocks.getGlobalPricingSettings.mockResolvedValue(globalPricingSettings);
  });

  it("deve retornar configurações globais de preços", async () => {
    const { result } = renderHook(() => useGlobalPricingSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(globalPricingSettings);
  });

  it("deve converter valores para números", async () => {
    const { result } = renderHook(() => useGlobalPricingSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    Object.values(result.current.data!).forEach((value) => {
      expect(typeof value).toBe("number");
      expect(Number.isNaN(value)).toBe(false);
    });
  });

  it("deve ter valores positivos", async () => {
    const { result } = renderHook(() => useGlobalPricingSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    const data = result.current.data!;
    expect(data.default_price_full).toBeGreaterThan(0);
    expect(data.default_price_pix).toBeGreaterThan(0);
    expect(data.default_deposit_amount).toBeGreaterThan(0);
    expect(data.pix_discount_percentage).toBeGreaterThanOrEqual(0);
  });

  it("deve validar desconto PIX", async () => {
    const { result } = renderHook(() => useGlobalPricingSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    const data = result.current.data!;
    expect(data.pix_discount_percentage).toBeGreaterThanOrEqual(0);
    expect(data.pix_discount_percentage).toBeLessThanOrEqual(100);
  });

  it("deve manter resultado em cache no rerender", async () => {
    const { result, rerender } = renderHook(() => useGlobalPricingSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    const firstData = result.current.data;

    rerender();

    expect(result.current.data).toBe(firstData);
    expect(pricingMocks.getGlobalPricingSettings).toHaveBeenCalledTimes(1);
  });
});
