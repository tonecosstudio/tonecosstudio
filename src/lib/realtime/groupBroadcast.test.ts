import { describe, it, expect, vi, beforeEach } from "vitest";
import { broadcastGroupMessage, verifyGroupMembership } from "./groupBroadcast";
import { supabase } from "@/integrations/supabase/client";
import type { GroupMessage, GroupAttachment } from "@/types/groups";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: vi.fn(),
    from: vi.fn(),
  },
}));

describe("groupBroadcast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("broadcastGroupMessage", () => {
    it("should broadcast message to correct channel", async () => {
      const mockSend = vi.fn().mockResolvedValue(undefined);
      const mockChannel = {
        send: mockSend,
      };

      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

      const groupId = "test-group-id";
      const message: GroupMessage & {
        sender_name: string;
        sender_avatar: string | null;
        attachments: GroupAttachment[];
      } = {
        id: "msg-1",
        group_id: groupId,
        sender_id: "user-1",
        message: "Test message",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender_name: "Test User",
        sender_avatar: null,
        attachments: [],
      };

      await broadcastGroupMessage(groupId, message);

      expect(supabase.channel).toHaveBeenCalledWith(`group:${groupId}`);
      expect(mockSend).toHaveBeenCalledWith({
        type: "broadcast",
        event: "new_message",
        payload: { message },
      });
    });

    it("should handle broadcast errors gracefully", async () => {
      const mockSend = vi.fn().mockRejectedValue(new Error("Network error"));
      const mockChannel = {
        send: mockSend,
      };

      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

      const groupId = "test-group-id";
      const message: GroupMessage & {
        sender_name: string;
        sender_avatar: string | null;
        attachments: GroupAttachment[];
      } = {
        id: "msg-1",
        group_id: groupId,
        sender_id: "user-1",
        message: "Test message",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender_name: "Test User",
        sender_avatar: null,
        attachments: [],
      };

      // Should not throw error (graceful degradation)
      await expect(broadcastGroupMessage(groupId, message)).resolves.not.toThrow();
    });

    it("should include attachments in broadcast payload", async () => {
      const mockSend = vi.fn().mockResolvedValue(undefined);
      const mockChannel = {
        send: mockSend,
      };

      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

      const groupId = "test-group-id";
      const attachments: GroupAttachment[] = [
        {
          id: "att-1",
          message_id: "msg-1",
          file_name: "test.pdf",
          file_path: "/path/to/test.pdf",
          file_size: 1024,
          file_type: "application/pdf",
          thumbnail_path: null,
          uploaded_by: "user-1",
          created_at: new Date().toISOString(),
        },
      ];

      const message: GroupMessage & {
        sender_name: string;
        sender_avatar: string | null;
        attachments: GroupAttachment[];
      } = {
        id: "msg-1",
        group_id: groupId,
        sender_id: "user-1",
        message: "Test message with attachment",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender_name: "Test User",
        sender_avatar: null,
        attachments,
      };

      await broadcastGroupMessage(groupId, message);

      expect(mockSend).toHaveBeenCalledWith({
        type: "broadcast",
        event: "new_message",
        payload: { message },
      });

      const payload = mockSend.mock.calls[0][0].payload;
      expect(payload.message.attachments).toHaveLength(1);
      expect(payload.message.attachments[0].file_name).toBe("test.pdf");
    });
  });

  describe("verifyGroupMembership", () => {
    it("should return true for valid member", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: "membership-1" },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await verifyGroupMembership("group-1", "user-1");

      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith("chat_group_members");
      expect(mockSelect).toHaveBeenCalledWith("id");
    });

    it("should return false for non-member", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await verifyGroupMembership("group-1", "user-2");

      expect(result).toBe(false);
    });

    it("should return false on database error", async () => {
      const mockSingle = vi.fn().mockRejectedValue(new Error("Database error"));

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await verifyGroupMembership("group-1", "user-1");

      expect(result).toBe(false);
    });

    it("should verify correct group and user IDs", async () => {
      const mockEq = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "membership-1" },
            error: null,
          }),
        }),
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const groupId = "group-123";
      const userId = "user-456";

      await verifyGroupMembership(groupId, userId);

      expect(mockEq).toHaveBeenCalledWith("group_id", groupId);
      const secondEq = mockEq.mock.results[0].value.eq;
      expect(secondEq).toHaveBeenCalledWith("user_id", userId);
    });
  });
});
