import { supabase } from "@/integrations/supabase/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isAdmin, isGroupMember, requireAdmin, requireGroupMember } from "./groupPermissions";

type AuthUserResponse = Awaited<ReturnType<typeof supabase.auth.getUser>>;
type SupabaseFromResult = ReturnType<typeof supabase.from>;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  log: {
    error: vi.fn(),
  },
}));

function mockCurrentUser(userId: string | null): void {
  vi.mocked(supabase.auth.getUser).mockResolvedValue({
    data: { user: userId ? { id: userId } : null },
    error: null,
  } as unknown as AuthUserResponse);
}

function mockProfileRole(role: "admin" | "customer"): void {
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { role },
          error: null,
        }),
      }),
    }),
  } as unknown as SupabaseFromResult);
}

function mockGroupMembership(memberId: string | null): void {
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: memberId ? { id: memberId } : null,
            error: memberId ? null : { code: "PGRST116" },
          }),
        }),
      }),
    }),
  } as unknown as SupabaseFromResult);
}

describe("groupPermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isAdmin", () => {
    it("returns true for admin users", async () => {
      mockCurrentUser("user-1");
      mockProfileRole("admin");

      await expect(isAdmin()).resolves.toBe(true);
    });

    it("returns false for non-admin users", async () => {
      mockCurrentUser("user-1");
      mockProfileRole("customer");

      await expect(isAdmin()).resolves.toBe(false);
    });

    it("returns false when user not found", async () => {
      mockCurrentUser(null);

      await expect(isAdmin()).resolves.toBe(false);
    });
  });

  describe("isGroupMember", () => {
    it("returns true when user is a member", async () => {
      mockCurrentUser("user-1");
      mockGroupMembership("member-1");

      await expect(isGroupMember("group-1")).resolves.toBe(true);
    });

    it("returns false when user is not a member", async () => {
      mockCurrentUser("user-1");
      mockGroupMembership(null);

      await expect(isGroupMember("group-1")).resolves.toBe(false);
    });
  });

  describe("requireAdmin", () => {
    it("does not throw for admin users", async () => {
      mockCurrentUser("user-1");
      mockProfileRole("admin");

      await expect(requireAdmin()).resolves.not.toThrow();
    });

    it("throws for non-admin users", async () => {
      mockCurrentUser("user-1");
      mockProfileRole("customer");

      await expect(requireAdmin()).rejects.toThrow("Acesso negado");
    });
  });

  describe("requireGroupMember", () => {
    it("does not throw for group members", async () => {
      mockCurrentUser("user-1");
      mockGroupMembership("member-1");

      await expect(requireGroupMember("group-1")).resolves.not.toThrow();
    });

    it("throws for non-members", async () => {
      mockCurrentUser("user-1");
      mockGroupMembership(null);

      await expect(requireGroupMember("group-1")).rejects.toThrow("não é membro");
    });
  });
});
