import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isAdmin,
  isGroupMember,
  canManageGroup,
  canSendGroupMessage,
  canViewGroupMessages,
  canDeleteGroup,
  requireAdmin,
  requireGroupMember,
  requireGroupManagement,
} from "./groupPermissions";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe("groupPermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isAdmin", () => {
    it("returns true for admin users", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: "admin" },
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await isAdmin();
      expect(result).toBe(true);
    });

    it("returns false for non-admin users", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: "customer" },
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await isAdmin();
      expect(result).toBe(false);
    });

    it("returns false when user not found", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      const result = await isAdmin();
      expect(result).toBe(false);
    });
  });

  describe("isGroupMember", () => {
    it("returns true when user is a member", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "member-1" },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await isGroupMember("group-1");
      expect(result).toBe(true);
    });

    it("returns false when user is not a member", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: "PGRST116" },
              }),
            }),
          }),
        }),
      } as any);

      const result = await isGroupMember("group-1");
      expect(result).toBe(false);
    });
  });

  describe("requireAdmin", () => {
    it("does not throw for admin users", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: "admin" },
              error: null,
            }),
          }),
        }),
      } as any);

      await expect(requireAdmin()).resolves.not.toThrow();
    });

    it("throws for non-admin users", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: "customer" },
              error: null,
            }),
          }),
        }),
      } as any);

      await expect(requireAdmin()).rejects.toThrow("Acesso negado");
    });
  });

  describe("requireGroupMember", () => {
    it("does not throw for group members", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "member-1" },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      await expect(requireGroupMember("group-1")).resolves.not.toThrow();
    });

    it("throws for non-members", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: "PGRST116" },
              }),
            }),
          }),
        }),
      } as any);

      await expect(requireGroupMember("group-1")).rejects.toThrow("não é membro");
    });
  });
});
