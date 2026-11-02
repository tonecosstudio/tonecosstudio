import { beforeEach, describe, expect, it, vi } from "vitest";
import { groupService } from "./group-service";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  callAdminRpc: vi.fn(),
  admin: vi.fn(),
  authenticated: vi.fn(),
  assertUser: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: mocks.callAdminRpc,
}));
vi.mock("@/services/auth/current-user", () => ({
  requireCurrentUserAdminAccess: mocks.admin,
  requireAuthenticatedUserId: mocks.authenticated,
  assertCurrentUserId: mocks.assertUser,
}));
vi.mock("@/lib/logger", () => ({ log: { error: mocks.error } }));

type ReadResult = { data?: unknown; error?: unknown; count?: number | null };
const calls: Array<{ table: string; query: ReturnType<typeof makeQuery> }> = [];

function makeQuery(result: ReadResult) {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    in: vi.fn(),
    gt: vi.fn(),
    range: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    then: (
      resolve: (value: ReadResult) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  for (const fn of [
    q.select, q.eq, q.is, q.order, q.in, q.gt, q.range,
    q.limit, q.single, q.maybeSingle,
  ]) fn.mockReturnValue(q);
  return q;
}

function mockReads(responses: Record<string, ReadResult | ReadResult[]>) {
  const indexes = new Map<string, number>();
  mocks.from.mockImplementation((table: string) => {
    const index = indexes.get(table) ?? 0;
    indexes.set(table, index + 1);
    const candidates = responses[table];
    const result = Array.isArray(candidates) ? candidates[index] : candidates;
    const query = makeQuery(result ?? { data: null, error: null });
    calls.push({ table, query });
    return query;
  });
}

const group = {
  id: "group-1",
  name: "Equipe Tonecos",
  type: "manual",
  membership_criteria: null,
  created_by: "admin-1",
  created_at: "2026-11-01T09:00:00Z",
  updated_at: "2026-11-02T09:00:00Z",
  deleted_at: null,
  deleted_by: null,
};

const manualInput = () => ({
  name: "Equipe Tonecos",
  type: "manual" as const,
  created_by: "admin-1",
});

describe("GroupService — authority, RLS and group behavior", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    calls.length = 0;
    mocks.admin.mockResolvedValue("admin-1");
    mocks.authenticated.mockResolvedValue("user-1");
    mocks.assertUser.mockImplementation(async (userId: string) => userId);
  });

  it("creates groups using the canonical admin RPC only", async () => {
    mocks.callAdminRpc.mockResolvedValueOnce(group);
    await expect(groupService.createGroup(manualInput())).resolves.toMatchObject(group);
    expect(mocks.callAdminRpc).toHaveBeenCalledExactlyOnceWith(
      "admin_create_chat_group",
      {
        p_name: "Equipe Tonecos",
        p_type: "manual",
        p_membership_criteria: null,
        p_created_by: "admin-1",
      },
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("rejects forged administrator IDs before sending writes", async () => {
    await expect(groupService.createGroup({
      ...manualInput(), created_by: "other",
    })).rejects.toThrow("Acesso negado");
    await expect(groupService.deleteGroup("group-1", "other"))
      .rejects.toThrow("Acesso negado");
    expect(mocks.callAdminRpc).not.toHaveBeenCalled();
  });

  it("requires a valid name and explicit criteria for automatic groups", async () => {
    await expect(groupService.createGroup({ ...manualInput(), name: "x" }))
      .rejects.toThrow("pelo menos 3 caracteres");
    await expect(groupService.createGroup({
      ...manualInput(), type: "assinantes",
    })).rejects.toThrow("Critérios de associação são obrigatórios");
    await expect(groupService.createGroup({
      ...manualInput(),
      membership_criteria: { type: "colecao", collectionId: "collection-1" },
    })).rejects.toThrow("não devem ter critérios automáticos");
    expect(mocks.callAdminRpc).not.toHaveBeenCalled();
  });

  it("reports server-side group-name conflicts", async () => {
    mocks.callAdminRpc.mockRejectedValueOnce(new Error("GROUP_NAME_EXISTS"));
    await expect(groupService.createGroup(manualInput()))
      .rejects.toThrow("Ja existe um grupo com este nome");
    expect(mocks.error).toHaveBeenCalledOnce();
  });

  it("soft deletes via authenticated admin RPC", async () => {
    mocks.callAdminRpc.mockResolvedValueOnce({ success: true });
    await expect(groupService.deleteGroup("group-1", "admin-1"))
      .resolves.toBeUndefined();
    expect(mocks.callAdminRpc).toHaveBeenCalledExactlyOnceWith(
      "admin_soft_delete_chat_group",
      { p_group_id: "group-1", p_deleted_by: "admin-1" },
    );
  });

  it("adds and removes members without direct browser table mutations", async () => {
    const membership = {
      id: "membership-1", group_id: "group-1", user_id: "user-1",
      joined_at: "2026-11-01", last_viewed_at: null,
    };
    mocks.callAdminRpc.mockResolvedValueOnce(membership).mockResolvedValueOnce(null);
    await expect(groupService.addMember("group-1", "user-1"))
      .resolves.toEqual(membership);
    await expect(groupService.removeMember("group-1", "user-1"))
      .resolves.toBeUndefined();
    expect(mocks.callAdminRpc).toHaveBeenNthCalledWith(
      1, "admin_add_chat_group_member",
      { p_group_id: "group-1", p_user_id: "user-1" },
    );
    expect(mocks.callAdminRpc).toHaveBeenNthCalledWith(
      2, "admin_remove_chat_group_member",
      { p_group_id: "group-1", p_user_id: "user-1" },
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("denies manual member changes blocked by server criteria", async () => {
    mocks.callAdminRpc.mockRejectedValueOnce(new Error("GROUP_MANUAL_MEMBERS_ONLY"));
    await expect(groupService.removeMember("group-1", "user-1"))
      .rejects.toThrow("Apenas grupos manuais permitem alteracao manual de membros");
  });

  it("blocks group reads before any query if admin privileges fail", async () => {
    mocks.admin.mockRejectedValueOnce(new Error("Admin access required"));
    await expect(groupService.listGroups()).rejects.toThrow("Admin access required");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("filters soft-deleted rows unless explicitly requested", async () => {
    mockReads({ chat_groups: { data: [group], error: null } });
    await expect(groupService.listGroups()).resolves.toMatchObject([group]);
    expect(calls[0].query.is).toHaveBeenCalledWith("deleted_at", null);
    await groupService.listGroups(true);
    expect(calls[1].query.is).not.toHaveBeenCalled();
  });

  it("rejects unexpected group types rather than coercing them", async () => {
    mockReads({ chat_groups: {
      data: [{ ...group, type: "unexpected" }], error: null,
    } });
    await expect(groupService.listGroups()).rejects.toThrow("Tipo de grupo invalido");
  });

  it("fails closed when the group read returns an RLS error", async () => {
    mockReads({ chat_groups: {
      data: null, error: { message: "denied" },
    } });
    await expect(groupService.listGroups()).rejects.toThrow("Erro ao carregar grupos");
    expect(mocks.error).toHaveBeenCalledOnce();
  });

  it("does not scan group member tables for an empty list", async () => {
    mockReads({ chat_groups: { data: [], error: null } });
    await expect(groupService.listGroupsWithMetrics()).resolves.toEqual([]);
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("chat_groups");
  });

  it("aggregates counts and latest messages only for displayed groups", async () => {
    mockReads({
      chat_groups: {
        data: [group, { ...group, id: "group-2", name: "Outro" }],
        error: null,
      },
      chat_group_members: {
        data: [{ group_id: "group-1" }, { group_id: "group-1" }],
        error: null,
      },
      chat_group_messages: {
        data: [
          { group_id: "group-1", created_at: "2026-11-02T11:00:00Z" },
          { group_id: "group-1", created_at: "2026-11-02T10:00:00Z" },
        ],
        error: null,
      },
    });
    const result = await groupService.listGroupsWithMetrics();
    expect(result).toMatchObject([
      { id: "group-1", member_count: 2, message_count: 2, last_message_at: "2026-11-02T11:00:00Z" },
      { id: "group-2", member_count: 0, message_count: 0, last_message_at: null },
    ]);
    expect(calls.find(({ table }) => table === "chat_group_members")?.query.in)
      .toHaveBeenCalledWith("group_id", ["group-1", "group-2"]);
  });

  it("paginates members and uses a safe missing-profile display name", async () => {
    mockReads({
      chat_group_members: [
        { count: 3, error: null },
        { data: [
          { user_id: "user-1", joined_at: "2026-11-01", last_viewed_at: null },
          { user_id: "user-2", joined_at: "2026-11-02", last_viewed_at: null },
        ], error: null },
      ],
      profiles: {
        data: [{ id: "user-1", full_name: "Ana", email: "ana@example.com" }],
        error: null,
      },
    });
    const result = await groupService.listMembers("group-1", { page: 2, limit: 2 });
    expect(result.pagination).toEqual({
      page: 2, limit: 2, total: 3, total_pages: 2,
    });
    expect(result.members.map((member) => member.user_name)).toEqual(["Ana", "Usuario"]);
    expect(calls[1].query.range).toHaveBeenCalledWith(2, 3);
  });

  it("never loads member profiles after a failed member query", async () => {
    mockReads({ chat_group_members: [
      { count: 1, error: null },
      { data: null, error: { message: "denied" } },
    ] });
    await expect(groupService.listMembers("group-1"))
      .rejects.toThrow("Erro ao carregar membros");
    expect(mocks.from).not.toHaveBeenCalledWith("profiles");
  });

  it("requires authentication before looking up a specific group", async () => {
    mocks.authenticated.mockRejectedValueOnce(new Error("User not authenticated"));
    await expect(groupService.getGroupById("group-1"))
      .rejects.toThrow("User not authenticated");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("reads only an undeleted group after authentication", async () => {
    mockReads({ chat_groups: { data: group, error: null } });
    await expect(groupService.getGroupById("group-1")).resolves.toMatchObject(group);
    expect(calls[0].query.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("rejects membership reads for a different authenticated user", async () => {
    mocks.assertUser.mockRejectedValueOnce(new Error("Acesso negado"));
    await expect(groupService.getMemberGroups("other-user"))
      .rejects.toThrow("Acesso negado");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("does not load group details when a member has no memberships", async () => {
    mockReads({ chat_group_members: { data: [], error: null } });
    await expect(groupService.getMemberGroups("user-1")).resolves.toEqual([]);
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("chat_group_members");
  });

  it("counts messages since the user's last viewed timestamp", async () => {
    mockReads({
      chat_group_members: {
        data: [{
          group_id: "group-1", joined_at: "2026-11-01",
          last_viewed_at: "2026-11-02T10:00:00Z",
        }],
        error: null,
      },
      chat_groups: { data: [group], error: null },
      chat_group_messages: [
        { count: 2, error: null },
        { data: { message: "Novo aviso", created_at: "2026-11-02T11:00:00Z" }, error: null },
      ],
    });
    const result = await groupService.getMemberGroups("user-1");
    expect(result).toMatchObject([{
      id: "group-1", unread_count: 2,
      last_message: { message: "Novo aviso" },
      last_viewed_at: "2026-11-02T10:00:00Z",
    }]);
    expect(calls.find(({ table, query }) =>
      table === "chat_group_messages" && query.gt.mock.calls.length > 0,
    )?.query.gt).toHaveBeenCalledWith("created_at", "2026-11-02T10:00:00Z");
  });

  it("returns zero view rate when no group messages exist", async () => {
    mockReads({
      chat_group_members: { count: 3, error: null },
      chat_group_messages: [
        { count: 10, error: null },
        { data: [], error: null },
      ],
    });
    await expect(groupService.getGroupMetrics("group-1")).resolves.toEqual({
      total_members: 3,
      total_messages: 10,
      estimated_view_rate: 0,
    });
  });
});
