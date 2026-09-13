import { beforeEach, describe, expect, it, vi } from "vitest";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  fetchAdminNotificationSettings,
  sendAdminNotificationTest,
  updateAdminNotificationSettings,
} from "./admin-notifications-service";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: vi.fn(),
}));

const callAdminRpcMock = vi.mocked(callAdminRpc);
const userId = "11111111-1111-4111-8111-111111111111";
const notificationId = "22222222-2222-4222-8222-222222222222";

function settingsRow(overrides: Record<string, unknown> = {}) {
  return {
    user_id: userId,
    new_quote_enabled: true,
    payment_received_enabled: true,
    support_ticket_enabled: true,
    subscription_canceled_enabled: true,
    low_stock_enabled: true,
    system_error_enabled: true,
    new_user_enabled: true,
    preorder_completed_enabled: true,
    production_ready_enabled: true,
    message_received_enabled: true,
    sound_enabled: true,
    sound_volume: 0.5,
    email_enabled: true,
    email_frequency: "instant",
    push_enabled: true,
    ...overrides,
  };
}

describe("admin-notifications-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts a complete valid notification settings row", async () => {
    callAdminRpcMock.mockResolvedValue(settingsRow());

    await expect(fetchAdminNotificationSettings()).resolves.toMatchObject({
      user_id: userId,
      sound_volume: 0.5,
      email_frequency: "instant",
      push_enabled: true,
    });
  });

  it.each([
    null,
    {},
    settingsRow({ user_id: "invalid" }),
    settingsRow({ new_quote_enabled: "true" }),
    settingsRow({ sound_volume: 2 }),
    settingsRow({ sound_volume: "0.5" }),
    settingsRow({ email_frequency: "hourly" }),
  ])("rejects malformed notification settings %#", async (value) => {
    callAdminRpcMock.mockResolvedValue(value as never);
    await expect(fetchAdminNotificationSettings()).rejects.toThrow();
  });

  it("requires update response to reflect every requested setting", async () => {
    callAdminRpcMock.mockResolvedValue(
      settingsRow({
        sound_enabled: false,
        sound_volume: 0.25,
        email_frequency: "daily",
      }),
    );

    await expect(
      updateAdminNotificationSettings({
        sound_enabled: false,
        sound_volume: 0.25,
        email_frequency: "daily",
      }),
    ).resolves.toBeUndefined();

    expect(callAdminRpcMock).toHaveBeenCalledWith("admin_update_notification_settings", {
      p_updates: {
        sound_enabled: false,
        sound_volume: 0.25,
        email_frequency: "daily",
      },
    });
  });

  it("rejects an update response that did not apply the requested value", async () => {
    callAdminRpcMock.mockResolvedValue(settingsRow({ sound_enabled: true }));

    await expect(
      updateAdminNotificationSettings({ sound_enabled: false }),
    ).rejects.toThrow(
      "Notification settings update returned an unexpected sound_enabled",
    );
  });

  it("filters non-updateable fields and rejects an effectively empty update", async () => {
    await expect(
      updateAdminNotificationSettings({ user_id: userId }),
    ).rejects.toThrow("Nenhuma configuracao de notificacao fornecida");

    expect(callAdminRpcMock).not.toHaveBeenCalled();
  });

  it("requires notification test creation to return a valid UUID", async () => {
    callAdminRpcMock.mockResolvedValue(notificationId);
    await expect(sendAdminNotificationTest()).resolves.toBeUndefined();

    callAdminRpcMock.mockResolvedValue("invalid");
    await expect(sendAdminNotificationTest()).rejects.toThrow(
      "Admin test notification creation returned an invalid resource id",
    );
  });
});
