import type React from "react";
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
  rpc: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  loggerError: vi.fn(),
  upsertAdminSystemSettings: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: mocks.rpc,
    from: mocks.from,
  },
}));

vi.mock("@/lib/logger", () => ({
  log: {
    error: mocks.loggerError,
  },
}));

vi.mock("@/services/admin/config/admin-config-mutations-service", () => ({
  upsertAdminSystemSettings: mocks.upsertAdminSystemSettings,
}));

const validCommercialSettings = {
  default_price_full: "150",
  default_price_pix: "142.50",
  default_deposit_amount: "30",
  pix_discount_percentage: "5",
};

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

function mockViewResponse(
  response: { data: unknown; error: { message: string } | null } = {
    data: null,
    error: null,
  },
) {
  mocks.single.mockResolvedValue(response);
  mocks.select.mockReturnValue({ single: mocks.single });
  mocks.from.mockReturnValue({ select: mocks.select });
}

describe("useSystemSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.rpc.mockResolvedValue({
      data: {
        company_name: "Ordax Test",
        contact_email: "contato@ordax.test",
        ...validCommercialSettings,
      },
      error: null,
    });
    mockViewResponse();
    mocks.upsertAdminSystemSettings.mockResolvedValue(undefined);
  });

  it("retorna configuracoes vindas da RPC e normaliza valores oficiais", async () => {
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
    });
    expect(result.current.data?.support_email).toBeTruthy();
    expect(mocks.rpc).toHaveBeenCalledWith("get_system_settings");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("usa a view agrupada quando a RPC falha e desembrulha o campo settings", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "rpc unavailable" } });
    mockViewResponse({
      data: {
        settings: {
          company_name: "View Company",
          shipping_business_days: "12",
          ...validCommercialSettings,
        },
      },
      error: null,
    });

    const settings = await fetchSystemSettings();

    expect(settings.company_name).toBe("View Company");
    expect(settings.default_price_pix).toBe(142.5);
    expect(settings.shipping_business_days).toBe(12);
    expect(mocks.from).toHaveBeenCalledWith("system_settings_grouped");
    expect(mocks.select).toHaveBeenCalledWith("settings");
  });

  it("falha fechado quando RPC e view estao indisponiveis", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "rpc unavailable" } });
    mockViewResponse({ data: null, error: { message: "view unavailable" } });

    await expect(fetchSystemSettings()).rejects.toThrow(
      "Configurações oficiais do sistema estão indisponíveis.",
    );
    expect(mocks.loggerError).toHaveBeenCalledWith(
      "Failed to fetch system settings from both canonical sources",
      {
        rpcError: { message: "rpc unavailable" },
        viewError: { message: "view unavailable" },
      },
    );
  });

  it("rejeita payload comercial incompleto em vez de inventar precos", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: {
        company_name: "Incomplete",
        default_price_full: "150",
      },
      error: null,
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
    mocks.rpc.mockReturnValueOnce(new Promise(() => undefined));

    const { result } = renderHook(() => useSystemSetting("contact_email"), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeUndefined();
  });

  it("centraliza atualizacao de uma configuracao no servico admin", async () => {
    await expect(updateSystemSetting("company_name", "Nova Ordax")).resolves.toEqual({
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

    await expect(updateSystemSettings(payload)).resolves.toEqual({ success: true });

    expect(mocks.upsertAdminSystemSettings).toHaveBeenCalledWith(payload);
  });

  it("propaga falhas de atualizacao como contrato de erro", async () => {
    mocks.upsertAdminSystemSettings.mockRejectedValueOnce(new Error("sem permissao"));

    await expect(updateSystemSetting("company_name", "Nova Ordax")).resolves.toEqual({
      success: false,
      error: "sem permissao",
    });
  });
});
