import { beforeEach, describe, expect, it, vi } from "vitest";
import { notificationPreferencesService } from "./notification-preferences-service";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  assertUserId: vi.fn(),
  requireUserId: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from, rpc: mocks.rpc },
}));
vi.mock("@/services/auth/current-user", () => ({
  assertCurrentUserId: mocks.assertUserId,
  requireAuthenticatedUserId: mocks.requireUserId,
}));
vi.mock("@/lib/logger", () => ({
  logError: mocks.logError,
}));

const prefs = {
  id: "preferences-1",
  user_id: "user-1",
  welcome_emails: false,
  reminder_emails: true,
  revelation_emails: false,
  shipping_emails: true,
  payment_emails: false,
  created_at: "2026-10-30T12:00:00Z",
  updated_at: "2026-11-02T12:00:00Z",
};

function query(data: unknown, error: { message: string } | null = null) {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
  q.select.mockReturnValue(q);
  q.eq.mockReturnValue(q);
  mocks.from.mockReturnValue(q);
  return q;
}

describe("notification preferences — owner-scoped settings and canonical RPC", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.assertUserId.mockResolvedValue("user-1");
    mocks.requireUserId.mockResolvedValue("user-1");
    mocks.rpc.mockResolvedValue({ data: prefs, error: null });
  });

  it("fetches only the verified current user's preferences", async () => {
    const q = query(prefs);
    await expect(notificationPreferencesService.getPreferences("user-1"))
      .resolves.toEqual(prefs);
    expect(mocks.assertUserId).toHaveBeenCalledExactlyOnceWith("user-1");
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("notification_preferences");
    expect(q.select).toHaveBeenCalledWith("*");
    expect(q.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("rejects another user's preferences before making a database request", async () => {
    mocks.assertUserId.mockRejectedValueOnce(new Error("identity mismatch"));
    await expect(notificationPreferencesService.getPreferences("other-user"))
      .rejects.toThrow("identity mismatch");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("does not manufacture preferences after a read error", async () => {
    query(null, { message: "permission denied" });
    await expect(notificationPreferencesService.getPreferences("user-1"))
      .resolves.toBeNull();
    expect(mocks.logError).toHaveBeenCalledOnce();
  });

  it("updates the verified user's preferences through the existing upsert RPC", async () => {
    const changes = { welcome_emails: true, shipping_emails: false };
    await expect(notificationPreferencesService.updatePreferences("user-1", changes))
      .resolves.toEqual(prefs);
    expect(mocks.assertUserId).toHaveBeenCalledExactlyOnceWith("user-1");
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      "upsert_email_notification_preferences",
      { p_user_id: "user-1", p_preferences: changes },
    );
  });

  it("blocks a cross-user notification settings update", async () => {
    mocks.assertUserId.mockRejectedValueOnce(new Error("identity mismatch"));
    await expect(notificationPreferencesService.updatePreferences("other-user", {
      payment_emails: false,
    })).rejects.toThrow("identity mismatch");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("does not claim an update was saved after an RPC error", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "denied" } });
    await expect(notificationPreferencesService.updatePreferences("user-1", {
      payment_emails: false,
    })).resolves.toBeNull();
    expect(mocks.logError).toHaveBeenCalledOnce();
  });

  it("creates defaults by passing null preferences to the canonical upsert", async () => {
    await expect(notificationPreferencesService.createDefaultPreferences("user-1"))
      .resolves.toEqual(prefs);
    expect(mocks.assertUserId).toHaveBeenCalledWith("user-1");
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      "upsert_email_notification_preferences",
      { p_user_id: "user-1", p_preferences: null },
    );
  });

  it("does not report default preferences as created when the RPC fails", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "denied" } });
    await expect(notificationPreferencesService.createDefaultPreferences("user-1"))
      .resolves.toBeNull();
    expect(mocks.logError).toHaveBeenCalledOnce();
  });

  it("returns existing current-user settings instead of duplicating them", async () => {
    query(prefs);
    await expect(notificationPreferencesService.getOrCreateCurrentPreferences())
      .resolves.toEqual(prefs);
    expect(mocks.requireUserId).toHaveBeenCalledOnce();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("creates defaults only when the current user has no stored settings", async () => {
    query(null);
    await expect(notificationPreferencesService.getOrCreateCurrentPreferences())
      .resolves.toEqual(prefs);
    expect(mocks.requireUserId).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith(
      "upsert_email_notification_preferences",
      { p_user_id: "user-1", p_preferences: null },
    );
  });

  it("requires authentication before loading or creating current preferences", async () => {
    mocks.requireUserId.mockRejectedValueOnce(new Error("User not authenticated"));
    await expect(notificationPreferencesService.getOrCreateCurrentPreferences())
      .rejects.toThrow("User not authenticated");
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("updates current-user settings only after authentication and identity verification", async () => {
    const changes = { reminder_emails: false };
    await expect(notificationPreferencesService.updateCurrentPreferences(changes))
      .resolves.toEqual(prefs);
    expect(mocks.requireUserId).toHaveBeenCalledOnce();
    expect(mocks.assertUserId).toHaveBeenCalledWith("user-1");
    expect(mocks.rpc).toHaveBeenCalledWith(
      "upsert_email_notification_preferences",
      { p_user_id: "user-1", p_preferences: changes },
    );
  });

  it("does not write current-user preferences when authentication fails", async () => {
    mocks.requireUserId.mockRejectedValueOnce(new Error("not authenticated"));
    await expect(notificationPreferencesService.updateCurrentPreferences({
      payment_emails: false,
    })).rejects.toThrow("not authenticated");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["welcome", false],
    ["reminder", true],
    ["revelation", false],
    ["shipping", true],
    ["payment", false],
  ] as const)("respects the stored opt-in flag for %s emails", async (type, expected) => {
    query(prefs);
    await expect(notificationPreferencesService.shouldSendEmail("user-1", type))
      .resolves.toBe(expected);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("uses canonical defaults when no prior email preferences exist", async () => {
    query(null);
    await expect(notificationPreferencesService.shouldSendEmail("user-1", "welcome"))
      .resolves.toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "upsert_email_notification_preferences",
      { p_user_id: "user-1", p_preferences: null },
    );
  });

  it.each([
    ["enableAllEmails", true],
    ["disableAllEmails", false],
  ] as const)("applies every email category for %s", async (operation, enabled) => {
    await notificationPreferencesService[operation]("user-1");
    expect(mocks.rpc).toHaveBeenCalledWith(
      "upsert_email_notification_preferences",
      {
        p_user_id: "user-1",
        p_preferences: {
          welcome_emails: enabled,
          reminder_emails: enabled,
          revelation_emails: enabled,
          shipping_emails: enabled,
          payment_emails: enabled,
        },
      },
    );
  });

  it.each([
    ["enableAllCurrentUserEmails", true],
    ["disableAllCurrentUserEmails", false],
  ] as const)("updates every category for the authenticated user via %s", async (operation, enabled) => {
    await notificationPreferencesService[operation]();
    expect(mocks.requireUserId).toHaveBeenCalledOnce();
    expect(mocks.assertUserId).toHaveBeenCalledWith("user-1");
    expect(mocks.rpc).toHaveBeenCalledWith(
      "upsert_email_notification_preferences",
      {
        p_user_id: "user-1",
        p_preferences: {
          welcome_emails: enabled,
          reminder_emails: enabled,
          revelation_emails: enabled,
          shipping_emails: enabled,
          payment_emails: enabled,
        },
      },
    );
  });
});
