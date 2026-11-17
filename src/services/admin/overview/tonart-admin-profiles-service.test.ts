import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listTonartAdminProfiles } from "./tonart-admin-profiles-service";

const USER = "11111111-1111-4111-8111-111111111111";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc },
}));
vi.mock("@/services/auth/tonecos-admin-access", () => ({
  requireTonecosAdminAccess: mocks.requireAdmin,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_SUPABASE_URL", "https://icmtmaakjucmuzxnofkd.supabase.co");
  vi.stubEnv("VITE_TONECOS_COMMERCIAL_MVP", "true");
  vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "false");
  vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
  mocks.requireAdmin.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("TONART admin profile directory", () => {
  it("queries the bounded server-side directory after admin verification", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        total: 1,
        limit: 25,
        offset: 0,
        rows: [{
          id: USER,
          email: "cliente@example.com",
          fullName: "Cliente",
          phone: null,
          whatsapp: null,
          cpf: null,
          profileCompletion: 33,
          isAdmin: false,
          createdAt: "2026-11-13T09:00:00Z",
        }],
      },
      error: null,
    });

    await expect(listTonartAdminProfiles({ search: "  Cliente  " })).resolves.toEqual({
      total: 1,
      limit: 25,
      offset: 0,
      rows: [{
        id: USER,
        email: "cliente@example.com",
        fullName: "Cliente",
        phone: null,
        whatsapp: null,
        cpf: null,
        profileCompletion: 33,
        isAdmin: false,
        createdAt: "2026-11-13T09:00:00Z",
      }],
    });
    expect(mocks.requireAdmin).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      "tonart_admin_profiles_directory",
      { p_search: "Cliente", p_limit: 25, p_offset: 0 },
    );
  });

  it("paginates without loading the whole customer base in the browser", async () => {
    mocks.rpc.mockResolvedValue({
      data: { total: 50, limit: 10, offset: 20, rows: [] },
      error: null,
    });
    await expect(listTonartAdminProfiles({ limit: 10, offset: 20 })).resolves.toMatchObject({
      total: 50,
      limit: 10,
      offset: 20,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("tonart_admin_profiles_directory", {
      p_search: undefined,
      p_limit: 10,
      p_offset: 20,
    });
  });

  it("rejects invalid bounds before authentication or network I/O", async () => {
    await expect(listTonartAdminProfiles({ search: "x".repeat(161) }))
      .rejects.toThrow("tonart_admin_profiles_query_invalid");
    await expect(listTonartAdminProfiles({ limit: 101 }))
      .rejects.toThrow("tonart_admin_profiles_query_invalid");
    await expect(listTonartAdminProfiles({ offset: -1 }))
      .rejects.toThrow("tonart_admin_profiles_query_invalid");
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("fails closed on authorization, RPC and malformed response errors", async () => {
    mocks.requireAdmin.mockRejectedValueOnce(new Error("Admin access required"));
    await expect(listTonartAdminProfiles()).rejects.toThrow("Admin access required");
    expect(mocks.rpc).not.toHaveBeenCalled();

    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "RLS blocked" } });
    await expect(listTonartAdminProfiles()).rejects.toMatchObject({ message: "RLS blocked" });

    mocks.rpc.mockResolvedValueOnce({
      data: { total: 1, limit: 25, offset: 0, rows: [{ id: "bad" }] },
      error: null,
    });
    await expect(listTonartAdminProfiles()).rejects.toThrow("tonart_admin_profile_invalid");
  });
});
