/**
 * Integration tests for the MessageService email notification boundary.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { MessageService } from "./messageService";

const mocks = vi.hoisted(() => ({
  edgeFunction: vi.fn(),
  requireCurrentUserAdminAccess: vi.fn(),
  requireAuthenticatedUserId: vi.fn(),
  assertCurrentUserId: vi.fn(),
  getCurrentUserId: vi.fn(),
  conversationUserId: "customer-456",
}));

vi.mock("@/services/auth/current-user", () => ({
  requireCurrentUserAdminAccess: mocks.requireCurrentUserAdminAccess,
  requireAuthenticatedUserId: mocks.requireAuthenticatedUserId,
  assertCurrentUserId: mocks.assertCurrentUserId,
  getCurrentUserId: mocks.getCurrentUserId,
}));

vi.mock("@/services/supabase/edge-function-client", () => ({
  callAuthenticatedEdgeFunction: mocks.edgeFunction,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    rpc: vi.fn((name: string, args: Record<string, unknown>) => {
      if (name !== "send_support_message") {
        return Promise.resolve({ data: null, error: null });
      }

      return Promise.resolve({
        data: {
          id: "msg-789",
          conversation_id: args.p_conversation_id,
          sender_id: "admin-001",
          sender_type: args.p_sender_type,
          message: args.p_message,
          is_internal: args.p_is_internal,
          read_by_admin: false,
          read_by_customer: false,
          created_at: "2026-09-17T12:00:00.000Z",
          updated_at: "2026-09-17T12:00:00.000Z",
        },
        error: null,
      });
    }),
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => {
            if (table === "support_conversations") {
              return {
                data: { id: "conv-123", user_id: mocks.conversationUserId },
                error: null,
              };
            }

            return { data: null, error: null };
          }),
        })),
      })),
    })),
  },
}));

async function flushAsyncNotification(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("MessageService email Edge Function integration", () => {
  let messageService: MessageService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.conversationUserId = "customer-456";
    mocks.requireCurrentUserAdminAccess.mockResolvedValue("admin-001");
    mocks.requireAuthenticatedUserId.mockResolvedValue("customer-456");
    mocks.assertCurrentUserId.mockResolvedValue(undefined);
    mocks.getCurrentUserId.mockResolvedValue("admin-001");
    mocks.edgeFunction.mockResolvedValue({ success: true });
    messageService = new MessageService();
  });

  it("enqueues an email notification when an admin sends a customer-visible message", async () => {
    const result = await messageService.sendMessage({
      conversation_id: "conv-123",
      sender_id: "admin-001",
      sender_type: "admin",
      message: "Hello, how can I help you?",
      is_internal: false,
    });
    await flushAsyncNotification();

    expect(result.id).toBe("msg-789");
    expect(mocks.edgeFunction).toHaveBeenCalledWith(
      "send-email",
      {
        conversationId: "conv-123",
        messageId: "msg-789",
        recipientUserId: "customer-456",
        messageContent: "Hello, how can I help you?",
      },
      "Failed to invoke support email Edge Function",
    );
  });

  it("does not enqueue email for internal notes", async () => {
    await messageService.sendMessage({
      conversation_id: "conv-123",
      sender_id: "admin-001",
      sender_type: "admin",
      message: "Internal note",
      is_internal: true,
    });
    await flushAsyncNotification();

    expect(mocks.edgeFunction).not.toHaveBeenCalled();
  });

  it("does not notify when the conversation recipient is the sender", async () => {
    mocks.conversationUserId = "admin-001";

    await messageService.sendMessage({
      conversation_id: "conv-123",
      sender_id: "admin-001",
      sender_type: "admin",
      message: "Test message",
      is_internal: false,
    });
    await flushAsyncNotification();

    expect(mocks.edgeFunction).not.toHaveBeenCalled();
  });

  it("keeps the message successful when the email boundary fails", async () => {
    mocks.edgeFunction.mockRejectedValueOnce(new Error("Email service unavailable"));

    const result = await messageService.sendMessage({
      conversation_id: "conv-123",
      sender_id: "admin-001",
      sender_type: "admin",
      message: "Test message",
      is_internal: false,
    });
    await flushAsyncNotification();

    expect(result.id).toBe("msg-789");
    expect(mocks.edgeFunction).toHaveBeenCalledTimes(1);
  });

  it("does not enqueue customer-to-admin email from this service boundary", async () => {
    await messageService.sendMessage({
      conversation_id: "conv-123",
      sender_id: "customer-456",
      sender_type: "customer",
      message: "I need help",
      is_internal: false,
    });
    await flushAsyncNotification();

    expect(mocks.assertCurrentUserId).toHaveBeenCalledWith("customer-456");
    expect(mocks.edgeFunction).not.toHaveBeenCalled();
  });
});
