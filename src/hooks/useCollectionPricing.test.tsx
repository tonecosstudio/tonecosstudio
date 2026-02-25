/**
 * Testes para useCollectionPricing hook
 */

import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCollectionPricing, useGlobalPricingSettings } from "./useCollectionPricing";
import React from "react";

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(() =>
      Promise.resolve({
        data: [
          {
            price_full: 100,
            price_pix: 90,
            deposit_amount: 30,
            remaining_full: 70,
            remaining_pix: 60,
            is_custom: false,
          },
        ],
        error: null,
      })
    ),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn(() =>
          Promise.resolve({
            data: [
              { key: "default_price_full", value: "100" },
              { key: "default_price_pix", value: "90" },
              { key: "default_deposit_amount", value: "30" },
              { key: "pix_discount_percentage", value: "10" },
            ],
            error: null,
          })
        ),
      })),
    })),
  },
}));

// Helper para criar wrapper com QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return Wrapper;
};

describe("useCollectionPricing", () => {
  it("deve retornar pricing de coleção", async () => {
    const { result } = renderHook(() => useCollectionPricing("test-collection-id"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data).toHaveProperty("price_full");
    expect(result.current.data).toHaveProperty("price_pix");
    expect(result.current.data).toHaveProperty("deposit_amount");
    expect(result.current.data).toHaveProperty("remaining_full");
    expect(result.current.data).toHaveProperty("remaining_pix");
    expect(result.current.data).toHaveProperty("is_custom");
  });

  it("deve ter valores numéricos corretos", async () => {
    const { result } = renderHook(() => useCollectionPricing("test-collection-id"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    const data = result.current.data!;
    expect(typeof data.price_full).toBe("number");
    expect(typeof data.price_pix).toBe("number");
    expect(typeof data.deposit_amount).toBe("number");
    expect(typeof data.remaining_full).toBe("number");
    expect(typeof data.remaining_pix).toBe("number");
    expect(typeof data.is_custom).toBe("boolean");
  });

  it("deve validar lógica de preços", async () => {
    const { result } = renderHook(() => useCollectionPricing("test-collection-id"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    const data = result.current.data!;

    // Preço PIX deve ser menor ou igual ao preço cheio
    expect(data.price_pix).toBeLessThanOrEqual(data.price_full);

    // Entrada deve ser menor que preço total
    expect(data.deposit_amount).toBeLessThan(data.price_full);

    // Restante deve ser preço total menos entrada
    expect(data.remaining_full).toBe(data.price_full - data.deposit_amount);
  });

  it("não deve fazer query sem collectionId", () => {
    const { result } = renderHook(() => useCollectionPricing(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it("deve cachear resultados", async () => {
    const { result, rerender } = renderHook(() => useCollectionPricing("test-collection-id"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    const firstData = result.current.data;

    rerender();

    // Dados devem ser os mesmos (cache)
    expect(result.current.data).toBe(firstData);
  });
});

describe("useGlobalPricingSettings", () => {
  it("deve retornar configurações globais de preços", async () => {
    const { result } = renderHook(() => useGlobalPricingSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data).toHaveProperty("default_price_full");
    expect(result.current.data).toHaveProperty("default_price_pix");
    expect(result.current.data).toHaveProperty("default_deposit_amount");
    expect(result.current.data).toHaveProperty("pix_discount_percentage");
  });

  it("deve converter valores para números", async () => {
    const { result } = renderHook(() => useGlobalPricingSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    const data = result.current.data!;
    Object.values(data).forEach((value) => {
      expect(typeof value).toBe("number");
      expect(isNaN(value)).toBe(false);
    });
  });

  it("deve ter valores positivos", async () => {
    const { result } = renderHook(() => useGlobalPricingSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

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

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    const data = result.current.data!;

    // Desconto deve estar entre 0 e 100
    expect(data.pix_discount_percentage).toBeGreaterThanOrEqual(0);
    expect(data.pix_discount_percentage).toBeLessThanOrEqual(100);
  });

  it("deve cachear resultados", async () => {
    const { result, rerender } = renderHook(() => useGlobalPricingSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    const firstData = result.current.data;

    rerender();

    // Dados devem ser os mesmos (cache)
    expect(result.current.data).toBe(firstData);
  });
});
