import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasTonecosAdminAccess, requireTonecosAdminAccess } from "./tonecos-admin-access";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), user: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc },
}));
vi.mock("@/services/customer/tonecos-account-service", () => ({
  getTonecosCurrentUser: mocks.user,
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_TONECOS_COMMERCIAL_MVP", "true");
  vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "false");
  vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
  vi.stubEnv("VITE_SUPABASE_URL", "https://icmtmaakjucmuzxnofkd.supabase.co");
  mocks.user.mockResolvedValue({ id: "user-1", email: "admin@example.com" });
});
afterEach(() => vi.unstubAllEnvs());

describe("Tonecos administrative access SSOT", () => {
  it("returns admin only when the real Supabase role function returns true", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    await expect(hasTonecosAdminAccess()).resolves.toBe(true);
    await expect(requireTonecosAdminAccess()).resolves.toBeUndefined();
    expect(mocks.rpc).toHaveBeenCalledWith("is_tonecos_admin");
  });

  it("fails closed for nonadmins and unexpected null response", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
    await expect(requireTonecosAdminAccess()).rejects.toThrow("Admin access required");
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(hasTonecosAdminAccess()).resolves.toBe(false);
  });

  it("does not query Supabase without a current authenticated identity", async () => {
    mocks.user.mockRejectedValue(new Error("User not authenticated"));
    await expect(hasTonecosAdminAccess()).rejects.toThrow("User not authenticated");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("distinguishes a verification outage from an actual signed-out session", async () => {
    mocks.user.mockRejectedValueOnce(new Error("network unavailable"));
    await expect(hasTonecosAdminAccess()).rejects.toThrow(
      "network unavailable",
    );
    mocks.user.mockResolvedValueOnce(null);
    await expect(hasTonecosAdminAccess()).rejects.toThrow(
      "User not authenticated",
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("cannot check administrator access in readonly public preview", async () => {
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "true");
    await expect(requireTonecosAdminAccess()).rejects.toThrow("tonecos_commercial_mvp_disabled");
    expect(mocks.user).not.toHaveBeenCalled();
  });

  it("propagates database failures rather than treating them as a valid admin", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "offline" } });
    await expect(requireTonecosAdminAccess()).rejects.toMatchObject({ message: "offline" });
  });
});
