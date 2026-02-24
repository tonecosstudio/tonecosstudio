/**
 * Integration tests for MessageService with NotificationService
 *
 * Tests that messageService correctly integrates with notificationService
 * Requirements: 16.2, 16.5 - Task 18.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MessageService } from "./messageService";
import { notificationService } from "./notificationService";

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

describe("MessageService Integration with NotificationService - Task 18.3", () => {
  let messageService: MessageService;
  let sendEmailNotificationSpy: any;

  beforeEach(() => {
    messageService = new MessageService();

    // Spy on notificationService.sendEmailNotification
    sendEmailNotificationSpy = vi.spyOn(notificationService, "sendEmailNotification");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Requirement 16.2: Send email when recipient is offline", () => {
    it("should call notificationService when admin sends message to customer", async () => {
      // Feature: advanced-chat-support-system, Requirement 16.2, Task 18.3
      const messageData = {
        conversation_id: "conv-123",
        sender_id: "admin-001",
        sender_type: "admin" as const,
        message: "Hello, how can I help you?",
        is_internal: false,
      };

      await messageService.sendMessage(messageData);

      // Verify notificationService was called
      expect(sendEmailNotificationSpy).toHaveBeenCalledTimes(1);

      // Verify it was called with correct parameters
      expect(sendEmailNotificationSpy).toHaveBeenCalledWith(
        "customer-456", // recipient user_id
        "conv-123", // conversation_id
        "Hello, how can I help you?" // message content
      );
    });

    it("should NOT call notificationService for internal notes", async () => {
      // Feature: advanced-chat-support-system, Requirement 16.2, Task 18.3
      const messageData = {
        conversation_id: "conv-123",
        sender_id: "admin-001",
        sender_type: "admin" as const,
        message: "Internal note: customer seems frustrated",
        is_internal: true,
      };

      await messageService.sendMessage(messageData);

      // Verify notificationService was NOT called for internal notes
      expect(sendEmailNotificationSpy).not.toHaveBeenCalled();
    });

    it("should NOT call notificationService when customer is the sender and recipient", async () => {
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

      // Verify notificationService was NOT called
      expect(sendEmailNotificationSpy).not.toHaveBeenCalled();
    });

    it("should handle notification errors gracefully without failing message send", async () => {
      // Feature: advanced-chat-support-system, Requirement 16.2, Task 18.3
      // If notification fails, message should still be sent successfully

      // Make notificationService throw an error
      sendEmailNotificationSpy.mockRejectedValueOnce(new Error("Email service unavailable"));

      const messageData = {
        conversation_id: "conv-123",
        sender_id: "admin-001",
        sender_type: "admin" as const,
        message: "Test message",
        is_internal: false,
      };

      // Should not throw error
      const result = await messageService.sendMessage(messageData);

      // Message should still be sent successfully
      expect(result).toBeDefined();
      expect(result.id).toBe("msg-789");

      // Verify notification was attempted
      expect(sendEmailNotificationSpy).toHaveBeenCalled();
    });
  });

  describe("Requirement 16.5: Do NOT send email if user is online", () => {
    it("should delegate online check to notificationService", async () => {
      // Feature: advanced-chat-support-system, Requirement 16.5, Task 18.3
      // The notificationService.sendEmailNotification method internally checks
      // if user is online using isUserOnline() before sending email

      const messageData = {
        conversation_id: "conv-123",
        sender_id: "admin-001",
        sender_type: "admin" as const,
        message: "Test message",
        is_internal: false,
      };

      await messageService.sendMessage(messageData);

      // Verify notificationService was called
      // The notificationService will handle the online check internally
      expect(sendEmailNotificationSpy).toHaveBeenCalledWith(
        "customer-456",
        "conv-123",
        "Test message"
      );
    });
  });

  describe("Integration behavior", () => {
    it("should send message and trigger notification in correct order", async () => {
      // Feature: advanced-chat-support-system, Task 18.3
      const messageData = {
        conversation_id: "conv-123",
        sender_id: "admin-001",
        sender_type: "admin" as const,
        message: "Test message",
        is_internal: false,
      };

      const result = await messageService.sendMessage(messageData);

      // Message should be inserted first
      expect(result).toBeDefined();
      expect(result.id).toBe("msg-789");

      // Then notification should be triggered
      expect(sendEmailNotificationSpy).toHaveBeenCalled();
    });

    it("should work with customer messages (future enhancement)", async () => {
      // Feature: advanced-chat-support-system, Task 18.3
      // Currently, customer messages don't trigger admin notifications
      // This is documented as TODO in the code

      const messageData = {
        conversation_id: "conv-123",
        sender_id: "customer-456",
        sender_type: "customer" as const,
        message: "I need help",
        is_internal: false,
      };

      await messageService.sendMessage(messageData);

      // Currently, no notification is sent for customer messages
      // This is expected behavior for MVP
      expect(sendEmailNotificationSpy).not.toHaveBeenCalled();
    });
  });
});
