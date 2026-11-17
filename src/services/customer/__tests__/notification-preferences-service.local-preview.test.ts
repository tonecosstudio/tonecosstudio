import { describe, expect, it, vi } from "vitest";
import {
  fetchNotificationPreferences,
  shouldSendNotification,
  updateNotificationPreferences,
} from "../notification-preferences-service";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/types/notification-preferences";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc, from: mocks.from },
}));
vi.mock("@/config/supabase-environment", () => ({
  LOCAL_SUPABASE_FALLBACK: true,
}));

describe("local notification preference fixture", () => {
  it("keeps preference edits in memory and does not access Supabase", async () => {
    await expect(fetchNotificationPreferences()).resolves.toEqual(
      DEFAULT_NOTIFICATION_PREFERENCES,
    );

    await updateNotificationPreferences({ item_shipped: false });

    await expect(fetchNotificationPreferences()).resolves.toEqual({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      item_shipped: false,
    });
    await expect(
      shouldSendNotification("mock-user", "item_shipped"),
    ).resolves.toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
