import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertCurrentUserId,
  getCurrentAuthUser,
  getCurrentUserId,
  requireAuthenticatedUserId,
} from "./current-user";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("canonical authenticated user boundary", () => {
  it("returns the verified user and permits only the current identity", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "customer-1" } },
      error: null,
    });
    await expect(getCurrentUserId()).resolves.toBe("customer-1");
    await expect(requireAuthenticatedUserId()).resolves.toBe("customer-1");
    await expect(assertCurrentUserId("customer-1")).resolves.toBe("customer-1");
    await expect(assertCurrentUserId("other-user")).rejects.toThrow(
      "Acesso negado ao usuario informado",
    );
  });

  it("treats a missing session as a visitor, never as a verified user", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    await expect(getCurrentAuthUser()).resolves.toBeNull();
    await expect(requireAuthenticatedUserId()).rejects.toThrow(
      "User not authenticated",
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("accepts only Supabase's explicit missing-session error as signed out", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { name: "AuthSessionMissingError", message: "no session" },
    });
    await expect(getCurrentUserId()).resolves.toBeNull();
  });

  it("propagates authentication outages instead of falsely signing out", async () => {
    const outage = new Error("authentication network unavailable");
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: outage,
    });
    await expect(getCurrentAuthUser()).rejects.toThrow(
      "authentication network unavailable",
    );
    await expect(assertCurrentUserId("customer-1")).rejects.toThrow(
      "authentication network unavailable",
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("preserves a thrown authentication transport failure", async () => {
    mocks.getUser.mockRejectedValue(new Error("temporary gateway failure"));
    await expect(getCurrentUserId()).rejects.toThrow(
      "temporary gateway failure",
    );
  });
});
