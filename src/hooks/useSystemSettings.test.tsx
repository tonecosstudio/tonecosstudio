import type React from "react";
import { CONTACT } from "@/config/constants";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchSystemSettings,
  updateSystemSetting,
  updateSystemSettings,
  useSystemSetting,
  useSystemSettings,
  useSystemSettingsMultiple,
} from "./useSystemSettings";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  in: vi.fn(),
  upsertAdminSystemSettings: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
  },
}));

vi.mock("@/services/admin/config/admin-config-mutations-service", () => ({
  upsertAdminSystemSettings: mocks.upsertAdminSystemSettings,
}));

const validOfficialSettings = {
  default_price_full: "150",
  default_price_pix: "142.50",
  default_deposit_amount: "30",
  pix_discount_percentage: "5",
  max_installments_no_interest: "3",
  max_installments_with_interest: "12",
  production_days_min: "15",
  production_days_max: "20",
  shipping_business_days: "5",
  sales_duration_days: "30",
  delivery_interval_days: "90",
  character_choice_days: "7",
  balance_payment_days: "5",
  exchange_deadline_days: "7",
  days_to_next_delivery: "90",
};

function asRows(settings: Record<string, string>) {
  return Object.entries(settings).map(([key, value]) => ({ key, value }));
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 0,
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function mockSettingsResponse(
  settings: Record<string, string> = {
    company_name: "Ordax Test",
    contact_email: "contato@ordax.test",
    ...validOfficialSettings,
  },
) {
  mocks.in.mockResolvedValue({ data: asRows(settings), error: null });
  mocks.select.mockReturnValue({ in: mocks.in });
  mocks.from.mockReturnValue({ select: mocks.select });
}

describe("useSystemSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettingsResponse();
    mocks.upsertAdminSystemSettings.mockResolvedValue(undefined);
  });

  it("does not request system settings in a read-only preview", () => {
    const { result } = renderHook(
      () => useSystemSettings({ enabled: false }),
      { wrapper: createWrapper() },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("busca somente chaves publicas allowlisted e normaliza valores oficiais", async () => {
    const { result } = renderHook(() => useSystemSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toMatchObject({
      company_name: "Ordax Test",
      contact_email: "contato@ordax.test",
      default_price_full: 150,
      default_price_pix: 142.5,
      default_deposit_amount: 30,
      pix_discount_percentage: 5,
      character_choice_days: 7,
      balance_payment_days: 5,
    });
    expect(result.current.data?.support_email).toBe(CONTACT.SUPPORT_EMAIL);
    expect(mocks.from).toHaveBeenCalledWith("system_settings");
    expect(mocks.select).toHaveBeenCalledWith("key,value");

    const requestedKeys = mocks.in.mock.calls[0]?.[1] as string[];
    expect(requestedKeys).toContain("default_price_full");
    expect(requestedKeys).toContain("character_choice_days");
    expect(requestedKeys).not.toContain("pix_key_voucher");
    expect(requestedKeys).not.toContain("payment_link_voucher");
  });

  it("falha fechado quando a leitura oficial esta indisponivel", async () => {
    mocks.in.mockResolvedValueOnce({
      data: null,
      error: { message: "database unavailable" },
    });

    await expect(fetchSystemSettings()).rejects.toThrow(
      "Configurações oficiais do sistema estão indisponíveis: database unavailable",
    );
  });

  it("rejeita payload comercial incompleto em vez de inventar precos", async () => {
    mockSettingsResponse({
      company_name: "Incomplete",
      default_price_full: "150",
    });

    await expect(fetchSystemSettings()).rejects.toThrow(
      "Configuração oficial inválida ou ausente: default_price_pix",
    );
  });

  it("retorna uma configuracao especifica atraves do hook derivado", async () => {
    const { result } = renderHook(() => useSystemSetting("company_name"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current).toBe("Ordax Test"));
  });

  it("retorna multiplas configuracoes especificas atraves do hook derivado", async () => {
    const { result } = renderHook(
      () => useSystemSettingsMultiple(["company_name", "default_price_full"]),
      { wrapper: createWrapper() },
    );

    await waitFor(() =>
      expect(result.current).toEqual({
        company_name: "Ordax Test",
        default_price_full: 150,
      }),
    );
  });

  it("mantem undefined enquanto a configuracao especifica ainda esta carregando", () => {
    mocks.in.mockReturnValueOnce(new Promise(() => undefined));

    const { result } = renderHook(() => useSystemSetting("contact_email"), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeUndefined();
  });

  it("centraliza atualizacao de uma configuracao no servico admin", async () => {
    await expect(
      updateSystemSetting("company_name", "Nova Ordax"),
    ).resolves.toEqual({
      success: true,
    });

    expect(mocks.upsertAdminSystemSettings).toHaveBeenCalledWith({
      company_name: "Nova Ordax",
    });
  });

  it("centraliza atualizacao em lote no servico admin", async () => {
    const payload = {
      company_name: "Nova Ordax",
      contact_email: "novo@ordax.test",
    };

    await expect(updateSystemSettings(payload)).resolves.toEqual({
      success: true,
    });

    expect(mocks.upsertAdminSystemSettings).toHaveBeenCalledWith(payload);
  });

  it("propaga falhas de atualizacao como contrato de erro", async () => {
    mocks.upsertAdminSystemSettings.mockRejectedValueOnce(
      new Error("sem permissao"),
    );

    await expect(
      updateSystemSetting("company_name", "Nova Ordax"),
    ).resolves.toEqual({
      success: false,
      error: "sem permissao",
    });
  });
});
