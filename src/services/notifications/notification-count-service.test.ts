import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchAdminNotificationCount,
  fetchCustomerNotificationCount,
  fetchNotificationCount,
  subscribeToNotificationCountChanges,
} from "./notification-count-service";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  createChannel: vi.fn(),
  removeChannel: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));
vi.mock("@/services/supabase/realtime-client", () => ({
  createRealtimeChannel: mocks.createChannel,
  removeRealtimeChannel: mocks.removeChannel,
}));
vi.mock("@/lib/logger", () => ({
  log: { error: mocks.error, warn: mocks.warn },
}));

type ReadResult = { data: unknown; error: { message: string } | null };

const observed: Array<{ table: string; query: ReturnType<typeof makeQuery> }> = [];

function makeQuery(result: ReadResult) {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    then: (
      resolve: (value: ReadResult) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  [q.select, q.eq, q.in].forEach((fn) => fn.mockReturnValue(q));
  return q;
}

function dbResponses(byTable: Record<string, ReadResult>) {
  mocks.from.mockImplementation((table: string) => {
    const q = makeQuery(byTable[table] ?? { data: null, error: null });
    observed.push({ table, query: q });
    return q;
  });
}

function setupRealtime() {
  const channels: Array<{
    name: string;
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
  }> = [];
  mocks.createChannel.mockImplementation((name: string) => {
    const c = { name, on: vi.fn(), subscribe: vi.fn() };
    c.on.mockReturnValue(c);
    c.subscribe.mockReturnValue(c);
    channels.push(c);
    return c;
  });
  return channels;
}

describe("notification counts — truthful owner-scoped queries and realtime invalidations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    observed.length = 0;
  });

  it("counts pending payments, payments under review and unread admin messages", async () => {
    dbResponses({
      manual_payments: { data: [
        { id: "payment-1", status: "pending" },
        { id: "payment-2", status: "under_review" },
        { id: "payment-3", status: "pending" },
      ], error: null },
      support_messages: { data: [{ id: "message-1" }], error: null },
    });
    await expect(fetchAdminNotificationCount("admin-1")).resolves.toEqual({
      total: 4, pendingPayments: 2, underReviewPayments: 1,
      requiresInfoPayments: 0, unreadMessages: 1, isAdmin: true,
    });
    expect(observed[0].table).toBe("manual_payments");
    expect(observed[0].query.in).toHaveBeenCalledWith(
      "status", ["pending", "under_review"],
    );
    expect(observed[1].table).toBe("support_messages");
    expect(observed[1].query.eq).toHaveBeenCalledWith("read_by_admin", false);
  });

  it("does not invent admin alerts from empty payment or message results", async () => {
    dbResponses({
      manual_payments: { data: null, error: null },
      support_messages: { data: null, error: null },
    });
    await expect(fetchAdminNotificationCount("admin-1")).resolves.toMatchObject({
      total: 0, pendingPayments: 0, underReviewPayments: 0, unreadMessages: 0,
    });
  });

  it("propagates permission errors reading admin payments", async () => {
    dbResponses({ manual_payments: {
      data: null, error: { message: "payments denied" },
    } });
    await expect(fetchAdminNotificationCount("admin-1"))
      .rejects.toMatchObject({ message: "payments denied" });
    expect(observed).toHaveLength(1);
    expect(mocks.error).toHaveBeenCalledOnce();
  });

  it("propagates permission errors reading admin support messages", async () => {
    dbResponses({
      manual_payments: { data: [], error: null },
      support_messages: { data: null, error: { message: "messages denied" } },
    });
    await expect(fetchAdminNotificationCount("admin-1"))
      .rejects.toMatchObject({ message: "messages denied" });
    expect(mocks.error).toHaveBeenCalledOnce();
  });

  it("counts only notifications from the customer's own conversations", async () => {
    dbResponses({
      manual_payments: { data: [{ id: "payment-1" }], error: null },
      support_messages: { data: [
        { id: "msg-1", conversation_id: "conversation-1" },
        { id: "msg-2", conversation_id: "other-conversation" },
        { id: "msg-3", conversation_id: "conversation-1" },
      ], error: null },
      support_conversations: { data: [{ id: "conversation-1" }], error: null },
    });
    await expect(fetchCustomerNotificationCount("customer-1")).resolves.toEqual({
      total: 3, pendingPayments: 0, underReviewPayments: 0,
      requiresInfoPayments: 1, unreadMessages: 2, isAdmin: false,
    });
    expect(observed[0].query.eq).toHaveBeenCalledWith("user_id", "customer-1");
    expect(observed[0].query.eq).toHaveBeenCalledWith("status", "requires_info");
    expect(observed[1].query.eq).toHaveBeenCalledWith("read_by_customer", false);
    expect(observed[2].query.eq).toHaveBeenCalledWith("user_id", "customer-1");
  });

  it("does not count unrelated messages when the customer has no conversations", async () => {
    dbResponses({
      manual_payments: { data: [], error: null },
      support_messages: { data: [{ id: "other", conversation_id: "other" }], error: null },
      support_conversations: { data: [], error: null },
    });
    await expect(fetchCustomerNotificationCount("customer-1")).resolves.toMatchObject({
      total: 0, unreadMessages: 0, requiresInfoPayments: 0,
    });
  });

  it("preserves zero values for genuinely empty customer results", async () => {
    dbResponses({
      manual_payments: { data: null, error: null },
      support_messages: { data: null, error: null },
      support_conversations: { data: null, error: null },
    });
    await expect(fetchCustomerNotificationCount("customer-1")).resolves.toMatchObject({
      total: 0, unreadMessages: 0, requiresInfoPayments: 0,
    });
  });

  it("propagates customer payment authority errors", async () => {
    dbResponses({
      manual_payments: { data: null, error: { message: "payment denied" } },
    });
    await expect(fetchCustomerNotificationCount("customer-1"))
      .rejects.toMatchObject({ message: "payment denied" });
    expect(observed).toHaveLength(1);
  });

  it("propagates customer message authority errors", async () => {
    dbResponses({
      manual_payments: { data: [], error: null },
      support_messages: { data: null, error: { message: "messages denied" } },
    });
    await expect(fetchCustomerNotificationCount("customer-1"))
      .rejects.toMatchObject({ message: "messages denied" });
    expect(observed).toHaveLength(2);
  });

  it.each([
    ["admin", true],
    ["customer", false],
  ] as const)("routes %s notification counts to their canonical owner query", async (_name, isAdmin) => {
    dbResponses({
      manual_payments: { data: [], error: null },
      support_messages: { data: [], error: null },
      support_conversations: { data: [], error: null },
    });
    await expect(fetchNotificationCount({ userId: "user-1", isAdmin }))
      .resolves.toMatchObject({ total: 0, isAdmin });
    expect(observed[0].table).toBe("manual_payments");
    expect(observed[1].table).toBe("support_messages");
    expect(observed).toHaveLength(isAdmin ? 2 : 3);
  });

  it("scopes customer payment invalidations and cleans up all three channels", () => {
    const channels = setupRealtime();
    const onChange = vi.fn();
    const stop = subscribeToNotificationCountChanges({
      userId: "customer-1", isAdmin: false, onChange,
    });
    expect(channels.map((c) => c.name)).toEqual([
      "notification-payments-customer-1",
      "notification-messages-customer-1",
      "notification-messages-read-customer-1",
    ]);
    expect(channels[0].on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "manual_payments",
        filter: "user_id=eq.customer-1" },
      onChange,
    );
    expect(channels[1].on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "support_messages" },
      onChange,
    );
    expect(channels[2].on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "support_messages" },
      expect.any(Function),
    );
    stop();
    expect(mocks.removeChannel.mock.calls.map((call) => call[0]))
      .toEqual(channels);
  });

  it("listens for all payment statuses for administrators without a customer filter", () => {
    const channels = setupRealtime();
    subscribeToNotificationCountChanges({
      userId: "admin-1", isAdmin: true, onChange: vi.fn(),
    });
    expect(channels[0].on.mock.calls[0][1]).toMatchObject({
      table: "manual_payments", filter: undefined,
    });
  });

  it("does not invalidate counts for support message updates with unchanged read flags", () => {
    const channels = setupRealtime();
    const onChange = vi.fn();
    subscribeToNotificationCountChanges({ userId: "user-1", isAdmin: false, onChange });
    const onUpdate = channels[2].on.mock.calls[0][2];
    onUpdate({
      old: { read_by_customer: false, read_by_admin: false },
      new: { read_by_customer: false, read_by_admin: false },
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each([
    [{ read_by_customer: true, read_by_admin: false }, "customer"],
    [{ read_by_customer: false, read_by_admin: true }, "admin"],
  ] as const)("invalidates counts after the %s read flag changes", (newRow) => {
    const channels = setupRealtime();
    const onChange = vi.fn();
    subscribeToNotificationCountChanges({ userId: "user-1", isAdmin: false, onChange });
    channels[2].on.mock.calls[0][2]({
      old: { read_by_customer: false, read_by_admin: false },
      new: newRow,
    });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("continues message subscriptions if the payment realtime channel fails", () => {
    const channels = setupRealtime();
    const create = mocks.createChannel.getMockImplementation();
    mocks.createChannel.mockImplementation((name: string) => {
      if (name === "notification-payments-user-1") throw new Error("offline");
      return create?.(name);
    });
    const stop = subscribeToNotificationCountChanges({
      userId: "user-1", isAdmin: false, onChange: vi.fn(),
    });
    expect(mocks.warn).toHaveBeenCalledOnce();
    expect(channels.map((c) => c.name)).toEqual([
      "notification-messages-user-1",
      "notification-messages-read-user-1",
    ]);
    stop();
    expect(mocks.removeChannel).toHaveBeenCalledTimes(2);
  });
});
