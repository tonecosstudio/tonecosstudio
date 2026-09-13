import { beforeEach, describe, expect, it, vi } from "vitest";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  importGroupMembersFromCsv,
  syncAllAutomaticGroups,
} from "./group-management-service";

const mocks = vi.hoisted(() => ({
  inProfiles: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        in: mocks.inProfiles,
      })),
    })),
  },
}));

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: vi.fn(),
}));

vi.mock("@/services/groups/group-service", () => ({
  groupService: { createGroup: vi.fn() },
}));

vi.mock("@/services/support/message-service", () => ({
  messageService: { sendBroadcastMessage: vi.fn() },
}));

vi.mock("@/services/auth/current-user", () => ({
  requireCurrentUserAdminAccess: vi.fn(),
}));

const callAdminRpcMock = vi.mocked(callAdminRpc);
const groupId = "11111111-1111-4111-8111-111111111111";
const adminId = "22222222-2222-4222-8222-222222222222";
const user1 = "33333333-3333-4333-8333-333333333333";
const user2 = "44444444-4444-4444-8444-444444444444";

function csvFile(content: string): File {
  return { text: async () => content } as unknown as File;
}

describe("group-management-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts automatic group sync only when summary and results are coherent", async () => {
    callAdminRpcMock.mockResolvedValue({
      success: true,
      message: "Auto-sync completed",
      summary: {
        groupsProcessed: 2,
        totalAdded: 3,
        totalRemoved: 1,
        errors: 0,
      },
      results: [
        { groupId, added: 2, removed: 0 },
        { groupId: adminId, added: 1, removed: 1 },
      ],
    });

    await expect(syncAllAutomaticGroups()).resolves.toBeUndefined();
  });

  it.each([
    null,
    {},
    {
      success: false,
      summary: { groupsProcessed: 0, totalAdded: 0, totalRemoved: 0, errors: 0 },
      results: [],
    },
    {
      success: true,
      summary: { groupsProcessed: 2, totalAdded: 0, totalRemoved: 0, errors: 0 },
      results: [],
    },
    {
      success: true,
      summary: { groupsProcessed: 1, totalAdded: 0, totalRemoved: 0, errors: 1 },
      results: [{ groupId, added: 0, removed: 0, error: "failed" }],
    },
  ])("rejects malformed or partially failed automatic group sync %#", async (value) => {
    callAdminRpcMock.mockResolvedValue(value as never);
    await expect(syncAllAutomaticGroups()).rejects.toThrow();
  });

  it("uses validated add/existing/invalid counts for CSV import", async () => {
    mocks.inProfiles.mockResolvedValue({
      data: [
        { id: user1, email: "a@example.com" },
        { id: user2, email: "b@example.com" },
      ],
      error: null,
    });
    callAdminRpcMock.mockResolvedValue({ added: 1, existing: 1, invalid: 0 });

    await expect(
      importGroupMembersFromCsv({
        groupId,
        importedBy: adminId,
        file: csvFile("email,nome\na@example.com,A\nb@example.com,B"),
      }),
    ).resolves.toEqual({ total: 2, success: 2, failed: 0, errors: [] });

    expect(callAdminRpcMock).toHaveBeenCalledWith("admin_add_chat_group_members", {
      p_group_id: groupId,
      p_user_ids: [user1, user2],
      p_added_by: adminId,
    });
  });

  it("treats inconsistent backend import counts as a failed batch", async () => {
    mocks.inProfiles.mockResolvedValue({
      data: [
        { id: user1, email: "a@example.com" },
        { id: user2, email: "b@example.com" },
      ],
      error: null,
    });
    callAdminRpcMock.mockResolvedValue({ added: 1, existing: 0, invalid: 0 });

    const result = await importGroupMembersFromCsv({
      groupId,
      importedBy: adminId,
      file: csvFile("email\na@example.com\nb@example.com"),
    });

    expect(result.success).toBe(0);
    expect(result.failed).toBe(2);
    expect(result.errors[0]).toContain("Group member import returned inconsistent counts");
  });

  it("reports emails not found in the system without calling the member RPC", async () => {
    mocks.inProfiles.mockResolvedValue({ data: [], error: null });

    const result = await importGroupMembersFromCsv({
      groupId,
      importedBy: adminId,
      file: csvFile("email\nmissing@example.com"),
    });

    expect(result).toMatchObject({ total: 1, success: 0, failed: 1 });
    expect(result.errors[0]).toContain("Email nao encontrado no sistema");
    expect(callAdminRpcMock).not.toHaveBeenCalled();
  });
});
