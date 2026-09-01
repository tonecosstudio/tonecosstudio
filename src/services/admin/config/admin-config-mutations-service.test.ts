import { beforeEach, describe, expect, it, vi } from "vitest";
import { upsertAdminSystemSettings } from "./admin-config-mutations-service";

const mocks = vi.hoisted(() => ({
  callAdminRpc: vi.fn(),
}));

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: mocks.callAdminRpc,
}));

describe("admin-config-mutations-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.callAdminRpc.mockResolvedValue(null);
  });

  it("envia configuracoes publicas permitidas ao RPC administrativo", async () => {
    await expect(
      upsertAdminSystemSettings({
        company_name: "OrdaX",
        shipping_business_days: "5",
      }),
    ).resolves.toBeUndefined();

    expect(mocks.callAdminRpc).toHaveBeenCalledWith("admin_upsert_system_settings", {
      p_updates: {
        company_name: "OrdaX",
        shipping_business_days: "5",
      },
    });
  });

  it.each([
    "stripe_secret",
    "stripe_secret_key",
    "api_key",
    "provider_api_key_v2",
    "service_role_key",
    "access_token",
    "refresh_token",
    "client_secret",
    "database_password",
    "integration_credential",
  ])("bloqueia chave sensivel antes de chamar o RPC: %s", async (key) => {
    await expect(upsertAdminSystemSettings({ [key]: "sensitive-value" })).rejects.toThrow(
      "Configuracao sensivel nao pode ser salva em system_settings publico",
    );

    expect(mocks.callAdminRpc).not.toHaveBeenCalled();
  });
});
