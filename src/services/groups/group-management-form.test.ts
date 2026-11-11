import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createGroupFromForm,
  getGroupMemberProfile,
  importGroupMembersFromCsv,
  listCollectionsForGroupRules,
  sendGroupBroadcastMessage,
} from "./group-management-service";

const mocks = vi.hoisted(() => ({
  createGroup: vi.fn(),
  sendBroadcastMessage: vi.fn(),
  requireAdmin: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/services/groups/group-service", () => ({
  groupService: { createGroup: mocks.createGroup },
}));
vi.mock("@/services/support/message-service", () => ({
  messageService: { sendBroadcastMessage: mocks.sendBroadcastMessage },
}));
vi.mock("@/services/auth/current-user", () => ({
  requireCurrentUserAdminAccess: mocks.requireAdmin,
}));
vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: mocks.rpc,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

type Result = { data: unknown; error: { message: string } | null };

function query(response: Result) {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
    in: vi.fn(),
    then: (
      resolve: (value: Result) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(response).then(resolve, reject),
  };
  [q.select, q.eq, q.order, q.single, q.in].forEach((fn) =>
    fn.mockReturnValue(q),
  );
  mocks.from.mockReturnValue(q);
  return q;
}

function csvFile(content: string): File {
  return { text: async () => content } as File;
}

describe("group management — form, access and CSV edge cases", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.createGroup.mockImplementation(async (payload) => ({
      id: "group-1",
      ...payload,
    }));
    mocks.requireAdmin.mockResolvedValue("admin-1");
  });

  it("creates a manual group without automatic criteria", async () => {
    await createGroupFromForm({ name: "Clube", type: "manual" }, "admin-1");
    expect(mocks.createGroup).toHaveBeenCalledExactlyOnceWith({
      name: "Clube",
      type: "manual",
      membership_criteria: null,
      created_by: "admin-1",
    });
  });

  it("limits subscriber rules to the requested collection and plan", async () => {
    await createGroupFromForm({
      name: "Assinantes",
      type: "assinantes",
      subscriptionCollectionId: "collection-1",
      subscriptionPlan: "premium",
    }, "admin-1");
    expect(mocks.createGroup).toHaveBeenCalledWith(expect.objectContaining({
      membership_criteria: {
        type: "assinantes",
        subscriptionStatus: "active",
        collectionId: "collection-1",
        plan: "premium",
      },
    }));
  });

  it("does not invent optional subscription filters", async () => {
    await createGroupFromForm({ name: "Assinantes", type: "assinantes" }, "admin-1");
    expect(mocks.createGroup).toHaveBeenCalledWith(expect.objectContaining({
      membership_criteria: { type: "assinantes", subscriptionStatus: "active" },
    }));
  });

  it("requires a collection before creating an automatic collection group", async () => {
    await expect(createGroupFromForm({
      name: "Coleção", type: "colecao",
    }, "admin-1")).rejects.toThrow("Selecione uma colecao");
    expect(mocks.createGroup).not.toHaveBeenCalled();
  });

  it("builds a collection rule from its explicit source", async () => {
    await createGroupFromForm({
      name: "Coleção", type: "colecao", collectionId: "collection-2",
    }, "admin-1");
    expect(mocks.createGroup).toHaveBeenCalledWith(expect.objectContaining({
      membership_criteria: { type: "colecao", collectionId: "collection-2" },
    }));
  });

  it("requires launch criteria rather than selecting every customer silently", async () => {
    await expect(createGroupFromForm({
      name: "Lançamentos", type: "lancamentos",
    }, "admin-1")).rejects.toThrow("Selecione um criterio de lancamento");
    expect(mocks.createGroup).not.toHaveBeenCalled();
  });

  it("maps a previous-buyer launch rule without converting it to all users", async () => {
    await createGroupFromForm({
      name: "Lançamentos", type: "lancamentos",
      launchCriteria: "previous_buyers",
    }, "admin-1");
    expect(mocks.createGroup).toHaveBeenCalledWith(expect.objectContaining({
      membership_criteria: {
        type: "lancamentos",
        criteria: "previous_buyers",
      },
    }));
  });

  it("preserves status and date constraints in order-based groups", async () => {
    await createGroupFromForm({
      name: "Pedidos", type: "pedidos",
      orderStatuses: ["confirmed", "shipped"],
      orderDateFrom: "2026-11-01",
      orderDateTo: "2026-11-30",
    }, "admin-1");
    expect(mocks.createGroup).toHaveBeenCalledWith(expect.objectContaining({
      membership_criteria: {
        type: "pedidos",
        status: ["confirmed", "shipped"],
        dateFrom: "2026-11-01",
        dateTo: "2026-11-30",
      },
    }));
  });

  it("reads collection rule options from the existing collections authority", async () => {
    const q = query({ data: [{ id: "collection-1", name: "Clássicos" }], error: null });
    await expect(listCollectionsForGroupRules()).resolves.toEqual([
      { id: "collection-1", name: "Clássicos" },
    ]);
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("collections");
    expect(q.order).toHaveBeenCalledWith("name");
  });

  it("propagates failures from authoritative group collection reads", async () => {
    query({ data: null, error: { message: "permission denied" } });
    await expect(listCollectionsForGroupRules()).rejects.toMatchObject({
      message: "permission denied",
    });
  });

  it("requires admin authorization before requesting a member profile", async () => {
    mocks.requireAdmin.mockRejectedValueOnce(new Error("Admin access required"));
    await expect(getGroupMemberProfile("user-1")).rejects.toThrow(
      "Admin access required",
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("loads the exact requested member only after checking admin permissions", async () => {
    const q = query({
      data: { id: "user-1", full_name: "Ana", created_at: "2026-11-01" },
      error: null,
    });
    await expect(getGroupMemberProfile("user-1")).resolves.toMatchObject({
      id: "user-1", full_name: "Ana",
    });
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(q.eq).toHaveBeenCalledWith("id", "user-1");
    expect(q.single).toHaveBeenCalledOnce();
  });

  it("passes group broadcasting through the existing message service", async () => {
    const attachments = [] as File[];
    mocks.sendBroadcastMessage.mockResolvedValueOnce({
      id: "message-1", attachments: [],
    });
    await expect(sendGroupBroadcastMessage({
      groupId: "group-1", senderId: "admin-1", message: "Aviso",
      richFields: { link_text: "Catálogo" }, attachments,
    })).resolves.toMatchObject({ id: "message-1" });
    expect(mocks.sendBroadcastMessage).toHaveBeenCalledWith(
      "group-1", "admin-1", "Aviso",
      { link_text: "Catálogo" }, attachments,
    );
  });

  it.each([
    "",
    "email",
    "nome,outra\nAna,123",
  ])("refuses empty or headerless group imports before database access", async (csv) => {
    await expect(importGroupMembersFromCsv({
      groupId: "group-1", importedBy: "admin-1", file: csvFile(csv),
    })).rejects.toThrow();
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("reports invalid emails without sending a member mutation", async () => {
    const result = await importGroupMembersFromCsv({
      groupId: "group-1", importedBy: "admin-1",
      file: csvFile("email,nome\ninvalid,Ana"),
    });
    expect(result).toMatchObject({
      total: 0, success: 0, failed: 0,
    });
    expect(result.errors[0]).toContain("Email invalido");
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
