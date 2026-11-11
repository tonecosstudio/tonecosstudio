import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteUserNotification,
  listUserNotifications,
  markAllUserNotificationsAsRead,
  markUserNotificationAsRead,
} from "./notification-center-service";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  userId: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from, rpc: mocks.rpc },
}));
vi.mock("@/services/auth/current-user", () => ({
  requireAuthenticatedUserId: mocks.userId,
}));

type Read = { data: unknown; error: { message: string } | null };

function notificationQuery(result: Read) {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    or: vi.fn(),
    then: (
      resolve: (value: Read) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  [q.select, q.eq, q.order, q.limit, q.or].forEach((fn) => fn.mockReturnValue(q));
  mocks.from.mockReturnValue(q);
  return q;
}

const notification = {
  id: "notification-1",
  user_id: "user-1",
  type: "order",
  priority: "high",
  title: "Seu pedido foi enviado",
  message: "Seu pedido está a caminho",
  icon: null,
  related_id: "order-1",
  related_type: "order",
  action_url: "/minha-conta",
  action_label: "Ver pedido",
  is_read: false,
  read_at: null,
  created_at: "2026-11-02T12:00:00Z",
  metadata: { source: "order-service" },
};

describe("notification center — authenticated, bounded, owner-scoped access", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.userId.mockResolvedValue("user-1");
    mocks.rpc.mockResolvedValue({ data: 1, error: null });
  });

  it("restricts reads to the authenticated owner and at most 50 notifications", async () => {
    const q = notificationQuery({ data: [notification], error: null });
    await expect(listUserNotifications("all")).resolves.toMatchObject([{
      id: "notification-1",
      user_id: "user-1",
      priority: "high",
      title: "Seu pedido foi enviado",
      metadata: { source: "order-service" },
    }]);
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("user_notifications");
    expect(q.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(q.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(q.limit).toHaveBeenCalledWith(50);
  });

  it.each([
    ["unread" as const, false],
    ["read" as const, true],
  ])("filters %s notifications on the database", async (filter, is_read) => {
    const q = notificationQuery({ data: [], error: null });
    await listUserNotifications(filter);
    expect(q.eq).toHaveBeenCalledWith("is_read", is_read);
  });

  it("does not add an is_read predicate for all notifications", async () => {
    const q = notificationQuery({ data: [], error: null });
    await listUserNotifications("all");
    expect(q.eq).not.toHaveBeenCalledWith("is_read", expect.anything());
  });

  it("sends only sanitized search to the limited notification query", async () => {
    const q = notificationQuery({ data: [], error: null });
    await listUserNotifications("all", "pedido");
    expect(q.or).toHaveBeenCalledWith(
      "title.ilike.%pedido%,message.ilike.%pedido%",
    );
  });

  it("uses safe optional display defaults without inventing a notification", async () => {
    notificationQuery({ data: [{
      ...notification,
      type: null,
      priority: "unexpected",
      message: null,
      icon: null,
      action_url: null,
      action_label: null,
      metadata: ["not-an-object"],
    }], error: null });
    await expect(listUserNotifications("all")).resolves.toMatchObject([{
      id: "notification-1",
      type: "system",
      priority: "medium",
      message: "",
      metadata: undefined,
    }]);
  });

  it("returns an empty array if the RLS query has no data", async () => {
    notificationQuery({ data: null, error: null });
    await expect(listUserNotifications("all")).resolves.toEqual([]);
  });

  it("fails closed if the notification read is denied", async () => {
    notificationQuery({ data: null, error: { message: "denied" } });
    await expect(listUserNotifications("all")).rejects.toMatchObject({
      message: "denied",
    });
  });

  it("never reads notifications if authentication fails", async () => {
    mocks.userId.mockRejectedValueOnce(new Error("User not authenticated"));
    await expect(listUserNotifications("all")).rejects.toThrow(
      "User not authenticated",
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("marks only the specified notification as read through its approved RPC", async () => {
    await expect(markUserNotificationAsRead("notification-1"))
      .resolves.toBeUndefined();
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      "mark_user_notification_read",
      { p_notification_id: "notification-1" },
    );
  });

  it("never writes a notification when user authentication fails", async () => {
    mocks.userId.mockRejectedValueOnce(new Error("User not authenticated"));
    await expect(deleteUserNotification("notification-1"))
      .rejects.toThrow("User not authenticated");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("marks all notifications read using the one approved RPC", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: 6, error: null });
    await expect(markAllUserNotificationsAsRead()).resolves.toBe(6);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      "mark_all_user_notifications_read",
    );
  });

  it("does not fabricate a count when the marking RPC returns null", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(markAllUserNotificationsAsRead()).resolves.toBe(0);
  });

  it("removes only the selected notification using the approved RPC", async () => {
    await expect(deleteUserNotification("notification-1"))
      .resolves.toBeUndefined();
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      "delete_user_notification",
      { p_notification_id: "notification-1" },
    );
  });

  it.each([
    ["read", () => markUserNotificationAsRead("notification-1")],
    ["mark all", () => markAllUserNotificationsAsRead()],
    ["delete", () => deleteUserNotification("notification-1")],
  ])("propagates failures from the %s RPC", async (_label, action) => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "denied" } });
    await expect(action()).rejects.toMatchObject({ message: "denied" });
  });
});
