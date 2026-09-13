import { beforeEach, describe, expect, it, vi } from "vitest";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import { cancelReminder, createReminder } from "./reminder-service";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: vi.fn(),
}));

const callAdminRpcMock = vi.mocked(callAdminRpc);
const conversationId = "11111111-1111-4111-8111-111111111111";
const reminderId = "22222222-2222-4222-8222-222222222222";
const otherId = "33333333-3333-4333-8333-333333333333";
const scheduledFor = new Date("2026-09-14T12:00:00.000Z");

function reminderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: reminderId,
    conversation_id: conversationId,
    reminder_type: "quote_followup",
    scheduled_for: "2026-09-14T12:00:00+00:00",
    sent_at: null,
    is_active: true,
    created_at: "2026-09-13T23:10:00+00:00",
    ...overrides,
  };
}

describe("reminder-service mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("binds reminder creation to conversation, type and scheduled instant", async () => {
    callAdminRpcMock.mockResolvedValue(reminderRow());

    await expect(
      createReminder(conversationId, "quote_followup", scheduledFor),
    ).resolves.toMatchObject({
      id: reminderId,
      conversation_id: conversationId,
      reminder_type: "quote_followup",
      is_active: true,
      sent_at: null,
    });

    expect(callAdminRpcMock).toHaveBeenCalledWith("admin_create_conversation_reminder", {
      p_conversation_id: conversationId,
      p_reminder_type: "quote_followup",
      p_scheduled_for: scheduledFor.toISOString(),
    });
  });

  it.each([
    null,
    {},
    reminderRow({ id: "invalid" }),
    reminderRow({ conversation_id: otherId }),
    reminderRow({ reminder_type: "payment_pending" }),
    reminderRow({ scheduled_for: "2026-09-15T12:00:00+00:00" }),
    reminderRow({ sent_at: "2026-09-14T12:01:00+00:00" }),
    reminderRow({ is_active: false }),
    reminderRow({ created_at: "invalid-date" }),
  ])("rejects malformed or mismatched reminder creation data %#", async (value) => {
    callAdminRpcMock.mockResolvedValue(value as never);

    await expect(
      createReminder(conversationId, "quote_followup", scheduledFor),
    ).rejects.toThrow();
  });

  it("requires cancellation to return the cancelled reminder id", async () => {
    callAdminRpcMock.mockResolvedValue(reminderId);
    await expect(cancelReminder(reminderId)).resolves.toBeUndefined();

    callAdminRpcMock.mockResolvedValue(otherId);
    await expect(cancelReminder(reminderId)).rejects.toThrow(
      "Reminder cancellation returned an unexpected resource id",
    );
  });
});
