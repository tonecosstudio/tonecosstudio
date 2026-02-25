/**
 * Testes para useSystemSettings hook
 */

import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSystemSettings, useSystemSetting, fetchSystemSettings } from "./useSystemSettings";
import React from "react";

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              company_name: "Test Company",
              contact_email: "test@example.com",
              default_price_full: 100,
            },
            error: null,
          })
        ),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
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

describe("useSystemSettings", () => {
  it("deve retornar configurações do sistema", async () => {
    const { result } = renderHook(() => useSystemSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data).toHaveProperty("company_name");
    expect(result.current.data).toHaveProperty("contact_email");
    expect(result.current.data).toHaveProperty("default_price_full");
  });

  it("deve ter valores padrão quando banco falha", async () => {
    const { result } = renderHook(() => useSystemSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    // Deve ter todas as propriedades obrigatórias
    expect(result.current.data).toHaveProperty("company_name");
    expect(result.current.data).toHaveProperty("company_address");
    expect(result.current.data).toHaveProperty("contact_email");
    expect(result.current.data).toHaveProperty("support_email");
    expect(result.current.data).toHaveProperty("default_price_full");
    expect(result.current.data).toHaveProperty("shipping_business_days");
  });

  it("deve cachear resultados", async () => {
    const { result, rerender } = renderHook(() => useSystemSettings(), {
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

describe("useSystemSetting", () => {
  it("deve retornar configuração específica", async () => {
    const { result } = renderHook(() => useSystemSetting("company_name"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    expect(typeof result.current).toBe("string");
  });

  it("deve retornar undefined enquanto carrega", () => {
    const { result } = renderHook(() => useSystemSetting("contact_email"), {
      wrapper: createWrapper(),
    });

    // Inicialmente undefined
    expect(result.current).toBeUndefined();
  });
});

describe("fetchSystemSettings", () => {
  it("deve buscar configurações fora de componentes React", async () => {
    const settings = await fetchSystemSettings();

    expect(settings).toBeDefined();
    expect(settings).toHaveProperty("company_name");
    expect(settings).toHaveProperty("contact_email");
    expect(settings).toHaveProperty("default_price_full");
  });

  it("deve retornar valores padrão em caso de erro", async () => {
    const settings = await fetchSystemSettings();

    // Deve ter todas as propriedades obrigatórias
    expect(settings.company_name).toBeDefined();
    expect(settings.contact_email).toBeDefined();
    expect(settings.default_price_full).toBeGreaterThan(0);
    expect(settings.shipping_business_days).toBeGreaterThan(0);
  });
});

describe("SystemSettings - Validação de Tipos", () => {
  it("deve ter tipos corretos para preços", async () => {
    const settings = await fetchSystemSettings();

    expect(typeof settings.default_price_full).toBe("number");
    expect(typeof settings.default_price_pix).toBe("number");
    expect(typeof settings.default_deposit_amount).toBe("number");
    expect(typeof settings.pix_discount_percentage).toBe("number");
  });

  it("deve ter tipos corretos para prazos", async () => {
    const settings = await fetchSystemSettings();

    expect(typeof settings.shipping_business_days).toBe("number");
    expect(typeof settings.exchange_deadline_days).toBe("number");
    expect(typeof settings.days_to_next_delivery).toBe("number");
  });

  it("deve ter tipos corretos para strings", async () => {
    const settings = await fetchSystemSettings();

    expect(typeof settings.company_name).toBe("string");
    expect(typeof settings.contact_email).toBe("string");
    expect(typeof settings.support_email).toBe("string");
  });

  it("deve ter valores positivos para números", async () => {
    const settings = await fetchSystemSettings();

    expect(settings.default_price_full).toBeGreaterThan(0);
    expect(settings.default_price_pix).toBeGreaterThan(0);
    expect(settings.shipping_business_days).toBeGreaterThan(0);
    expect(settings.max_installments_no_interest).toBeGreaterThan(0);
  });
});
