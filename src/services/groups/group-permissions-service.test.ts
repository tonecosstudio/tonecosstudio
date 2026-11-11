import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  canDeleteGroup,
  canManageGroup,
  canSendGroupMessage,
  canViewGroupMessages,
  isAdmin,
  isGroupMember,
  requireAdmin,
  requireGroupManagement,
  requireGroupMember,
} from "./group-permissions-service";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getCurrentUserId: vi.fn(),
  assertCurrentUserId: vi.fn(),
  currentUserHasAdminAccess: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));
vi.mock("@/services/auth/current-user", () => ({
  getCurrentUserId: mocks.getCurrentUserId,
  assertCurrentUserId: mocks.assertCurrentUserId,
  currentUserHasAdminAccess: mocks.currentUserHasAdminAccess,
}));
vi.mock("@/lib/logger", () => ({ log: { error: mocks.error } }));

function membership(data: unknown, error: { message: string } | null = null) {
  const response = { data, error };
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(response),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  mocks.from.mockReturnValue(query);
  return query;
}

describe("group permissions — deny-by-default access", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getCurrentUserId.mockResolvedValue("user-1");
    mocks.assertCurrentUserId.mockResolvedValue("user-1");
    mocks.currentUserHasAdminAccess.mockResolvedValue(true);
  });

  it("denies admin access without an authenticated user", async () => {
    mocks.getCurrentUserId.mockResolvedValueOnce(null);
    await expect(isAdmin()).resolves.toBe(false);
    expect(mocks.currentUserHasAdminAccess).not.toHaveBeenCalled();
  });

  it("uses the canonical admin authority for authenticated users", async () => {
    await expect(isAdmin()).resolves.toBe(true);
    expect(mocks.currentUserHasAdminAccess).toHaveBeenCalledOnce();
  });

  it("fails closed when the admin authority reports a denial", async () => {
    mocks.currentUserHasAdminAccess.mockResolvedValueOnce(false);
    await expect(isAdmin()).resolves.toBe(false);
  });

  it("fails closed when permission lookups throw", async () => {
    mocks.currentUserHasAdminAccess.mockRejectedValueOnce(new Error("offline"));
    await expect(isAdmin()).resolves.toBe(false);
    expect(mocks.error).toHaveBeenCalledOnce();
  });

  it("checks group membership for exactly the current user and group", async () => {
    const query = membership({ id: "membership-1" });
    await expect(isGroupMember("group-1")).resolves.toBe(true);
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("chat_group_members");
    expect(query.eq).toHaveBeenCalledWith("group_id", "group-1");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("verifies an explicitly requested identity before membership reads", async () => {
    const query = membership({ id: "membership-1" });
    await expect(isGroupMember("group-1", "user-1")).resolves.toBe(true);
    expect(mocks.assertCurrentUserId).toHaveBeenCalledExactlyOnceWith("user-1");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("denies membership if the requested identity belongs to someone else", async () => {
    mocks.assertCurrentUserId.mockRejectedValueOnce(new Error("identity mismatch"));
    await expect(isGroupMember("group-1", "other-user")).resolves.toBe(false);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledOnce();
  });

  it("denies group membership when the database returns no record", async () => {
    membership(null);
    await expect(isGroupMember("group-1")).resolves.toBe(false);
  });

  it("denies group membership when the database query fails", async () => {
    membership(null, { message: "permission denied" });
    await expect(isGroupMember("group-1")).resolves.toBe(false);
  });

  it("does not read a membership table without a logged-in user", async () => {
    mocks.getCurrentUserId.mockResolvedValueOnce(null);
    await expect(isGroupMember("group-1")).resolves.toBe(false);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it.each([
    ["canManageGroup", canManageGroup],
    ["canSendGroupMessage", canSendGroupMessage],
    ["canDeleteGroup", canDeleteGroup],
  ])("%s delegates to the canonical admin check", async (_name, check) => {
    await expect(check("group-1")).resolves.toBe(true);
    expect(mocks.currentUserHasAdminAccess).toHaveBeenCalledOnce();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it.each([
    ["canManageGroup", canManageGroup],
    ["canSendGroupMessage", canSendGroupMessage],
    ["canDeleteGroup", canDeleteGroup],
  ])("%s denies a nonadministrator", async (_name, check) => {
    mocks.currentUserHasAdminAccess.mockResolvedValueOnce(false);
    await expect(check("group-1")).resolves.toBe(false);
  });

  it("permits administrators to view messages without a membership query", async () => {
    await expect(canViewGroupMessages("group-1")).resolves.toBe(true);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("permits a verified member to view messages when not an administrator", async () => {
    mocks.currentUserHasAdminAccess.mockResolvedValueOnce(false);
    const query = membership({ id: "membership-1" });
    await expect(canViewGroupMessages("group-1", "user-1")).resolves.toBe(true);
    expect(query.eq).toHaveBeenCalledWith("group_id", "group-1");
  });

  it("denies message viewing when neither admin nor group membership is verified", async () => {
    mocks.currentUserHasAdminAccess.mockResolvedValueOnce(false);
    membership(null);
    await expect(canViewGroupMessages("group-1")).resolves.toBe(false);
  });

  it("throws an authorization error when administrative access is mandatory", async () => {
    mocks.currentUserHasAdminAccess.mockResolvedValueOnce(false);
    await expect(requireAdmin()).rejects.toThrow(
      "Acesso negado: apenas administradores",
    );
  });

  it("throws when an unverified user needs group membership", async () => {
    membership(null);
    await expect(requireGroupMember("group-1")).rejects.toThrow(
      "Acesso negado: voce nao e membro",
    );
  });

  it("throws when a nonadministrator attempts to manage the group", async () => {
    mocks.currentUserHasAdminAccess.mockResolvedValueOnce(false);
    await expect(requireGroupManagement("group-1")).rejects.toThrow(
      "Acesso negado: voce nao tem permissao",
    );
  });

  it("accepts a valid group management request with admin authority", async () => {
    await expect(requireGroupManagement("group-1")).resolves.toBeUndefined();
  });
});
