import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  approveChoice,
  extendDeadline,
  fetchActiveChoiceCollections,
  fetchPendingChoices,
  getChoiceHistory,
  rejectChoice,
} from "./choice-service";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  callAdminRpc: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));
vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: mocks.callAdminRpc,
}));

type ReadResult = { data: unknown; error: { message: string } | null };

function makeQuery(response: ReadResult) {
  const query = {
    select: vi.fn(),
    order: vi.fn(),
    in: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    eq: vi.fn(),
    then: (
      resolve: (value: ReadResult) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(response).then(resolve, reject),
  };
  [
    query.select,
    query.order,
    query.in,
    query.gte,
    query.lte,
    query.eq,
  ].forEach((method) => method.mockReturnValue(query));
  mocks.from.mockReturnValue(query);
  return query;
}

const validRow = {
  id: "choice-1",
  order_id: "order-1",
  order_type: "subscription_delivery",
  user_id: "user-1",
  customer_name: "Ana Costa",
  customer_email: "ana@example.com",
  collection_id: "collection-1",
  collection_name: "Clássicos",
  character_id: "character-1",
  character_name: "Lion-O",
  character_image_url: "https://cdn.example.com/liono.png",
  status: "pending",
  submitted_at: null,
  approved_at: null,
  approved_by: null,
  approved_by_name: null,
  rejected_at: null,
  rejection_reason: null,
  deadline: "2026-11-10T12:00:00Z",
  reminders_sent: 0,
  last_reminder_at: null,
  previous_choice_id: null,
  change_reason: null,
  change_count: 0,
  created_at: "2026-11-01T12:00:00Z",
  updated_at: "2026-11-02T12:00:00Z",
};

describe("character choice authority — admin read and RPC flows", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.callAdminRpc.mockResolvedValue(null);
  });

  it("maps canonical order and character details without changing the source", async () => {
    const query = makeQuery({ data: [validRow], error: null });
    const choices = await fetchPendingChoices();
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("character_choices");
    expect(query.order).toHaveBeenCalledExactlyOnceWith("deadline", { ascending: true });
    expect(choices).toEqual([{
      id: "choice-1",
      orderId: "order-1",
      orderType: "subscription_delivery",
      userId: "user-1",
      customerName: "Ana Costa",
      customerEmail: "ana@example.com",
      collectionId: "collection-1",
      collectionName: "Clássicos",
      characterId: "character-1",
      characterName: "Lion-O",
      characterImageUrl: "https://cdn.example.com/liono.png",
      status: "pending",
      submittedAt: null,
      approvedAt: null,
      approvedBy: null,
      approvedByName: null,
      rejectedAt: null,
      rejectionReason: null,
      deadline: "2026-11-10T12:00:00Z",
      remindersSent: 0,
      lastReminderAt: null,
      previousChoiceId: null,
      changeReason: null,
      changeCount: 0,
      createdAt: "2026-11-01T12:00:00Z",
      updatedAt: "2026-11-02T12:00:00Z",
    }]);
  });

  it("applies explicit status, collection and deadline filters to the database", async () => {
    const query = makeQuery({ data: [validRow], error: null });
    await fetchPendingChoices({
      statuses: ["pending", "submitted"],
      collections: ["collection-1"],
      dateFrom: "2026-11-01",
      dateTo: "2026-11-30",
    });
    expect(query.in).toHaveBeenCalledWith("status", ["pending", "submitted"]);
    expect(query.in).toHaveBeenCalledWith("collection_id", ["collection-1"]);
    expect(query.gte).toHaveBeenCalledWith("deadline", "2026-11-01");
    expect(query.lte).toHaveBeenCalledWith("deadline", "2026-11-30");
  });

  it("does not send empty filters as restrictive queries", async () => {
    const query = makeQuery({ data: [validRow], error: null });
    await fetchPendingChoices({ statuses: [], collections: [], searchQuery: " " });
    expect(query.in).not.toHaveBeenCalled();
    expect(query.gte).not.toHaveBeenCalled();
    expect(query.lte).not.toHaveBeenCalled();
  });

  it.each([
    ["ana", ["choice-1"]],
    ["@example.com", ["choice-1"]],
    ["NÃO EXISTE", []],
  ])("searches customer names and email case-insensitively: %s", async (searchQuery, ids) => {
    makeQuery({ data: [validRow], error: null });
    const result = await fetchPendingChoices({ searchQuery });
    expect(result.map((row) => row.id)).toEqual(ids);
  });

  it("uses safe presentation defaults only for optional customer labels", async () => {
    makeQuery({
      data: [{
        ...validRow,
        customer_name: null,
        customer_email: null,
        collection_name: null,
        reminders_sent: null,
        change_count: null,
        order_type: "standalone_purchase",
      }],
      error: null,
    });
    const [row] = await fetchPendingChoices();
    expect(row).toMatchObject({
      customerName: "Unknown",
      customerEmail: "",
      collectionName: "Unknown Collection",
      remindersSent: 0,
      changeCount: 0,
      orderType: "standalone_purchase",
    });
  });

  it.each(["pending", "submitted", "approved", "rejected", "locked", "expired"])(
    "accepts the canonical choice status %s",
    async (status) => {
      makeQuery({ data: [{ ...validRow, status }], error: null });
      await expect(fetchPendingChoices()).resolves.toMatchObject([
        { id: "choice-1", status },
      ]);
    },
  );

  it.each([
    [{ ...validRow, order_id: null }, "missing order_id"],
    [{ ...validRow, order_type: "invalid" }, "invalid order_type"],
    [{ ...validRow, status: "invalid" }, "invalid status"],
    [{ ...validRow, deadline: null }, "missing deadline"],
  ])("fails closed on malformed authoritative rows %#", async (row, reason) => {
    makeQuery({ data: [row], error: null });
    await expect(fetchPendingChoices()).rejects.toThrow(reason);
  });

  it("propagates database errors and does not create placeholder choices", async () => {
    makeQuery({ data: null, error: { message: "permission denied" } });
    await expect(fetchPendingChoices()).rejects.toThrow(
      "Error fetching character choices: permission denied",
    );
  });

  it("returns an empty list when no choice records exist", async () => {
    makeQuery({ data: null, error: null });
    await expect(fetchPendingChoices()).resolves.toEqual([]);
  });

  it("reads only active collections for the admin filter", async () => {
    const query = makeQuery({
      data: [{ id: "collection-1", name: "Clássicos" }],
      error: null,
    });
    await expect(fetchActiveChoiceCollections()).resolves.toEqual([
      { id: "collection-1", name: "Clássicos" },
    ]);
    expect(mocks.from).toHaveBeenCalledWith("collections");
    expect(query.eq).toHaveBeenCalledWith("is_active", true);
    expect(query.order).toHaveBeenCalledWith("name");
  });

  it("fails when the collection filter read is denied", async () => {
    makeQuery({ data: null, error: { message: "access denied" } });
    await expect(fetchActiveChoiceCollections()).rejects.toThrow(
      "Error fetching choice collections: access denied",
    );
  });

  it.each([
    ["approve", "admin_approve_character_choice"],
    ["reject", "admin_reject_character_choice"],
    ["extend", "admin_extend_character_choice_deadline"],
  ] as const)("updates a choice with the authenticated %s RPC", async (action, rpc) => {
    makeQuery({ data: [{ ...validRow, status: "approved" }], error: null });
    let result;
    if (action === "approve") result = await approveChoice("choice-1");
    else if (action === "reject") result = await rejectChoice("choice-1", "wrong choice");
    else result = await extendDeadline("choice-1", "2026-11-20T12:00:00Z");
    expect(result).toMatchObject({ id: "choice-1", status: "approved" });
    expect(mocks.callAdminRpc).toHaveBeenCalledOnce();
    expect(mocks.callAdminRpc.mock.calls[0][0]).toBe(rpc);
    expect(mocks.callAdminRpc.mock.calls[0][1]).toMatchObject({
      p_choice_id: "choice-1",
    });
    if (action === "reject") {
      expect(mocks.callAdminRpc.mock.calls[0][1]).toMatchObject({
        p_reason: "wrong choice",
      });
    }
    if (action === "extend") {
      expect(mocks.callAdminRpc.mock.calls[0][1]).toMatchObject({
        p_new_deadline: "2026-11-20T12:00:00Z",
      });
    }
  });

  it("does not claim a successful update when the confirmed choice cannot be read", async () => {
    makeQuery({ data: [], error: null });
    await expect(approveChoice("missing")).rejects.toThrow(
      "Failed to fetch updated choice",
    );
  });

  it("does not swallow an administrative mutation failure", async () => {
    mocks.callAdminRpc.mockRejectedValueOnce(new Error("Admin access required"));
    await expect(rejectChoice("choice-1", "reason")).rejects.toThrow(
      "Admin access required",
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("loads history for only the requested order in newest-first order", async () => {
    const query = makeQuery({
      data: [{ ...validRow, order_type: "standalone_purchase" }],
      error: null,
    });
    await expect(getChoiceHistory("order-1")).resolves.toMatchObject([
      { id: "choice-1", orderType: "standalone_purchase" },
    ]);
    expect(query.eq).toHaveBeenCalledWith("order_id", "order-1");
    expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("fails when historical choices cannot be retrieved", async () => {
    makeQuery({ data: null, error: { message: "offline" } });
    await expect(getChoiceHistory("order-1")).rejects.toThrow(
      "Error fetching choice history: offline",
    );
  });
});
