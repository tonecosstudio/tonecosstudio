import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ access: vi.fn(), rpc: vi.fn() }));
vi.mock("@/config/tonecos-commercial-authority", () => ({
  assertTonecosCommercialEnabled: vi.fn(),
}));
vi.mock("@/services/auth/tonecos-admin-access", () => ({
  requireTonecosAdminAccess: mocks.access,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc },
}));

import { getTonartAdminOverview } from "./tonart-admin-workspace-service";

const payload = {
  profileCount: 2,
  quoteCount: 0,
  pendingQuoteCount: 0,
  reviewingQuoteCount: 0,
  coinEntryCount: 0,
  recentProfiles: [{
    id: "11111111-1111-4111-8111-111111111111",
    email: "cliente@example.com",
    fullName: null,
    createdAt: "2026-11-11T12:00:00Z",
  }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.access.mockResolvedValue(undefined);
  mocks.rpc.mockResolvedValue({ data: payload, error: null });
});

describe("canonical TONART admin overview", () => {
  it("requires server-admin membership before loading any private figures", async () => {
    mocks.access.mockRejectedValue(new Error("Admin access required"));
    await expect(getTonartAdminOverview()).rejects.toThrow("Admin access required");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("reads a bounded projection from the existing protected database RPC", async () => {
    const result = await getTonartAdminOverview();
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("tonart_admin_workspace_overview");
    expect(result).toEqual(payload);
  });

  it("fails closed on malformed data and provider failures", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { ...payload, coinEntryCount: -2 }, error: null });
    await expect(getTonartAdminOverview()).rejects.toThrow("tonart_admin_overview_invalid");
    mocks.rpc.mockResolvedValueOnce({ data: { ...payload, recentProfiles: [{}] }, error: null });
    await expect(getTonartAdminOverview()).rejects.toThrow("tonart_admin_profile_invalid");
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error("Unavailable") });
    await expect(getTonartAdminOverview()).rejects.toThrow("Unavailable");
  });
});
