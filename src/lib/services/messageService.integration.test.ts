/**
 * Integration tests for MessageService email notification boundary
 *
 * Tests that messageService invokes the email Edge Function directly.
 * Requirements: 16.2, 16.5 - Task 18.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MessageService } from "./messageService";

// Mock Supabase
const mockConversationData = {
  "conv-123": {
    id: "conv-123",
    user_id: "customer-456",
    subject: "Test Conversation",
  },
};

const mockInsertedMessage = {
  id: "msg-789",
  conversation_id: "conv-123",
  sender_id: "admin-001",
  sender_type: "admin",
  message: "Test message from admin",
  is_internal: false,
  read_by_admin: false,
  read_by_customer: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn((name: string, args: Record<string, unknown>) => {
      if (name === "send_support_message") {
        return Promise.resolve({
          data: {
            ...mockInsertedMessage,
            conversation_id: args.p_conversation_id,
            sender_type: args.p_sender_type,
            message: args.p_message,
            is_internal: args.p_is_internal,
          },
          error: null,
        });
      }

      return Promise.resolve({ data: null, error: null });
    }),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: { success: true }, error: null })),
    },
    from: vi.fn((table: string) => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: mockInsertedMessage,
            error: null,
          })),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn((field: string, value: string) => ({
          single: vi.fn(() => {
            if (table === "support_conversations") {
              return {
                data: mockConversationData[value as keyof typeof mockConversationData] || null,
                error: null,
              };
            }
            return { data: null, error: null };
          }),
          gte: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        })),
      })),
    })),
  },
}));

describe("MessageService email Edge Function integration - Task 18.3", () => {
  let messageService: MessageService;

  beforeEach(() => {
    vi.clearAllMocks();
    messageService = new MessageService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Requirement 16.2: Send email when recipient is offline", () => {
    it("should invoke send-email Edge Function when admin sends message to customer", async () => {
      const { supabase } = await import("@/integrations/supabase/client");

      // Feature: advanced-chat-support-system, Requirement 16.2, Task 18.3
      const messageData = {
        conversation_id: "conv-123",
        sender_id: "admin-001",
        sender_type: "admin" as const,
        message: "Hello, how can I help you?",
        is_internal: false,
      };

      await messageService.sendMessage(messageData);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
      expect(supabase.functions.invoke).toHaveBeenCalledWith("send-email", {
        body: {
          conversationId: "conv-123",
          messageId: "msg-789",
          recipientUserId: "customer-456",
          messageContent: "Hello, how can I help you?",
        },
      });
    });

    it("should not invoke send-email Edge Function for internal notes", async () => {
      const { supabase } = await import("@/integrations/supabase/client");

      // Feature: advanced-chat-support-system, Requirement 16.2, Task 18.3
      const messageData = {
        conversation_id: "conv-123",
        sender_id: "admin-001",
        sender_type: "admin" as const,
        message: "Internal note: customer seems frustrated",
        is_internal: true,
      };

      await messageService.sendMessage(messageData);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(supabase.functions.invoke).not.toHaveBeenCalled();
    });

    it("should not invoke send-email Edge Function when sender is the recipient", async () => {
      const { supabase } = await import("@/integrations/supabase/client");

      // Feature: advanced-chat-support-system, Requirement 16.2, Task 18.3
      // This prevents sending notification to the same user who sent the message
      const messageData = {
        conversation_id: "conv-123",
        sender_id: "customer-456", // Same as conversation user_id
        sender_type: "admin" as const,
        message: "Test message",
        is_internal: false,
      };

      await messageService.sendMessage(messageData);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(supabase.functions.invoke).not.toHaveBeenCalled();
    });

    it("should handle notification errors gracefully without failing message send", async () => {
      const { supabase } = await import("@/integrations/supabase/client");

      // Feature: advanced-chat-support-system, Requirement 16.2, Task 18.3
      // If notification fails, message should still be sent successfully

      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: null,
        error: { message: "Email service unavailable" },
      } as never);

      const messageData = {
        conversation_id: "conv-123",
        sender_id: "admin-001",
        sender_type: "admin" as const,
        message: "Test message",
        is_internal: false,
      };

      const result = await messageService.sendMessage(messageData);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Message should still be sent successfully
      expect(result).toBeDefined();
      expect(result.id).toBe("msg-789");

      // Verify notification was attempted
      expect(supabase.functions.invoke).toHaveBeenCalled();
    });
  });

  describe("Requirement 16.5: Do NOT send email if user is online", () => {
    it("should delegate online checks to the send-email Edge Function", async () => {
      const { supabase } = await import("@/integrations/supabase/client");

      // Feature: advanced-chat-support-system, Requirement 16.5, Task 18.3
      // The Edge Function owns the online-user check before sending email.

      const messageData = {
        conversation_id: "conv-123",
        sender_id: "admin-001",
        sender_type: "admin" as const,
        message: "Test message",
        is_internal: false,
      };

      await messageService.sendMessage(messageData);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(supabase.functions.invoke).toHaveBeenCalledWith("send-email", {
        body: expect.objectContaining({
          recipientUserId: "customer-456",
          conversationId: "conv-123",
          messageContent: "Test message",
        }),
      });
    });
  });

  describe("Integration behavior", () => {
    it("should send message and trigger notification in correct order", async () => {
      const { supabase } = await import("@/integrations/supabase/client");

      // Feature: advanced-chat-support-system, Task 18.3
      const messageData = {
        conversation_id: "conv-123",
        sender_id: "admin-001",
        sender_type: "admin" as const,
        message: "Test message",
        is_internal: false,
      };

      const result = await messageService.sendMessage(messageData);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Message should be inserted first
      expect(result).toBeDefined();
      expect(result.id).toBe("msg-789");

      // Then notification should be triggered
      expect(supabase.functions.invoke).toHaveBeenCalled();
    });

    it("should work with customer messages (future enhancement)", async () => {
      // Feature: advanced-chat-support-system, Task 18.3
      // Currently, customer messages don't trigger admin notifications
      // Customer-to-admin notifications are outside this service boundary.

      const messageData = {
        conversation_id: "conv-123",
        sender_id: "customer-456",
        sender_type: "customer" as const,
        message: "I need help",
        is_internal: false,
      };

      await messageService.sendMessage(messageData);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Currently, no notification is sent for customer messages
      // This is expected behavior for MVP
      const { supabase } = await import("@/integrations/supabase/client");
      expect(supabase.functions.invoke).not.toHaveBeenCalled();
    });
  });
});
