import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAdminNotificationSettingsForCurrentUser,
  getUserNotificationSettingsForCurrentUser,
  listUnreadAdminNotifications,
  listUnreadUserNotificationsForCurrentUser,
  subscribeToAdminNotificationInserts,
  subscribeToUserNotificationInserts,
} from "./live-notifications-service";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  currentSession: vi.fn(),
  createChannel: vi.fn(),
  removeChannel: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));
vi.mock("@/services/auth/auth-session-service", () => ({
  getCurrentAuthSession: mocks.currentSession,
}));
vi.mock("@/services/supabase/realtime-client", () => ({
  createRealtimeChannel: mocks.createChannel,
  removeRealtimeChannel: mocks.removeChannel,
}));

type ReadResult = { data: unknown; error: { message: string } | null };

function query(result: ReadResult) {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: (
      resolve: (value: ReadResult) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  [q.select, q.eq, q.order].forEach((fn) => fn.mockReturnValue(q));
  mocks.from.mockReturnValue(q);
  return q;
}

function channel() {
  const c = { on: vi.fn(), subscribe: vi.fn() };
  c.on.mockReturnValue(c);
  c.subscribe.mockReturnValue(c);
  mocks.createChannel.mockReturnValue(c);
  return c;
}

const notification = {
  id: "notification-1",
  user_id: "user-1",
  type: "order",
  priority: "high",
  title: "Pedido enviado",
  message: "Seu pedido está a caminho",
  is_read: false,
  created_at: "2026-11-02T12:00:00Z",
};

describe("live notifications — authenticated reads and scoped realtime subscriptions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.currentSession.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("returns no customer notifications when the session is absent", async () => {
    mocks.currentSession.mockResolvedValueOnce(null);
    await expect(listUnreadUserNotificationsForCurrentUser()).resolves.toEqual([]);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("queries only the current user's unread notifications, newest first", async () => {
    const q = query({ data: [notification], error: null });
    await expect(listUnreadUserNotificationsForCurrentUser())
      .resolves.toEqual([notification]);
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("user_notifications");
    expect(q.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(q.eq).toHaveBeenCalledWith("is_read", false);
    expect(q.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("does not disguise a user notification RLS failure as an empty inbox", async () => {
    query({ data: null, error: { message: "access denied" } });
    await expect(listUnreadUserNotificationsForCurrentUser())
      .rejects.toMatchObject({ message: "access denied" });
  });

  it("returns no sound settings when user authentication is missing", async () => {
    mocks.currentSession.mockResolvedValueOnce(null);
    await expect(getUserNotificationSettingsForCurrentUser()).resolves.toBeNull();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("uses the documented default customer sound settings without a duplicate table", async () => {
    await expect(getUserNotificationSettingsForCurrentUser())
      .resolves.toEqual({ sound_enabled: true, sound_volume: 0.5 });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("fetches unread administrator notifications without inventing older messages", async () => {
    const q = query({ data: [notification], error: null });
    await expect(listUnreadAdminNotifications()).resolves.toEqual([notification]);
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("admin_notifications");
    expect(q.eq).toHaveBeenCalledWith("is_read", false);
    expect(q.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("fails explicitly if the admin notification feed cannot be read", async () => {
    query({ data: null, error: { message: "denied" } });
    await expect(listUnreadAdminNotifications())
      .rejects.toMatchObject({ message: "denied" });
  });

  it("requires a user session before looking up admin sound preferences", async () => {
    mocks.currentSession.mockResolvedValueOnce(null);
    await expect(getAdminNotificationSettingsForCurrentUser()).resolves.toBeNull();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("looks up admin sound settings for the authenticated user only", async () => {
    const preferences = { sound_enabled: false, sound_volume: 0.2 };
    const q = query({ data: preferences, error: null });
    await expect(getAdminNotificationSettingsForCurrentUser()).resolves.toEqual(preferences);
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("admin_notification_settings");
    expect(q.select).toHaveBeenCalledWith("sound_enabled, sound_volume");
    expect(q.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(q.maybeSingle).toHaveBeenCalledOnce();
  });

  it("retains an absent admin settings result as null", async () => {
    query({ data: null, error: null });
    await expect(getAdminNotificationSettingsForCurrentUser()).resolves.toBeNull();
  });

  it("propagates admin sound settings read errors", async () => {
    query({ data: null, error: { message: "forbidden" } });
    await expect(getAdminNotificationSettingsForCurrentUser())
      .rejects.toMatchObject({ message: "forbidden" });
  });

  it("does not create a customer realtime channel without authentication", async () => {
    mocks.currentSession.mockResolvedValueOnce(null);
    const stop = await subscribeToUserNotificationInserts(vi.fn());
    expect(mocks.createChannel).not.toHaveBeenCalled();
    expect(stop()).toBeUndefined();
    expect(mocks.removeChannel).not.toHaveBeenCalled();
  });

  it("subscribes to only the current user's inserts and cleans up the channel", async () => {
    const c = channel();
    const onInsert = vi.fn();
    const stop = await subscribeToUserNotificationInserts(onInsert);
    expect(mocks.createChannel).toHaveBeenCalledExactlyOnceWith(
      "user-notifications-realtime",
    );
    expect(c.on).toHaveBeenCalledWith(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "user_notifications",
        filter: "user_id=eq.user-1",
      },
      expect.any(Function),
    );
    c.on.mock.calls[0][2]({ new: notification });
    expect(onInsert).toHaveBeenCalledExactlyOnceWith(notification);
    expect(c.subscribe).toHaveBeenCalledOnce();
    stop();
    expect(mocks.removeChannel).toHaveBeenCalledExactlyOnceWith(c);
  });

  it("does not create administrator realtime channels without a session", async () => {
    mocks.currentSession.mockResolvedValueOnce(null);
    const stop = await subscribeToAdminNotificationInserts(vi.fn());
    expect(mocks.createChannel).not.toHaveBeenCalled();
    expect(stop()).toBeUndefined();
  });

  it("subscribes to administrative inserts and removes its own realtime channel", async () => {
    const c = channel();
    const onInsert = vi.fn();
    const stop = await subscribeToAdminNotificationInserts(onInsert);
    expect(mocks.createChannel).toHaveBeenCalledExactlyOnceWith(
      "admin-notifications-realtime",
    );
    expect(c.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "admin_notifications" },
      expect.any(Function),
    );
    c.on.mock.calls[0][2]({ new: notification });
    expect(onInsert).toHaveBeenCalledExactlyOnceWith(notification);
    stop();
    expect(mocks.removeChannel).toHaveBeenCalledExactlyOnceWith(c);
  });
});
