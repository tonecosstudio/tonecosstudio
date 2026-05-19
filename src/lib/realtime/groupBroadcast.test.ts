import { supabase } from "@/integrations/supabase/client";
import type { GroupAttachment, GroupMessage } from "@/types/groups";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { broadcastGroupMessage, verifyGroupMembership } from "./groupBroadcast";

type SupabaseChannel = ReturnType<typeof supabase.channel>;
type SupabaseFromResult = ReturnType<typeof supabase.from>;
type BroadcastMessage = GroupMessage & {
  sender_name: string;
  sender_avatar: string | null;
  attachments: GroupAttachment[];
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: vi.fn(),
    from: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  log: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

function createMessage(overrides: Partial<BroadcastMessage> = {}): BroadcastMessage {
  const now = new Date().toISOString();

  return {
    id: "msg-1",
    group_id: "test-group-id",
    sender_id: "user-1",
    message: "Test message",
    created_at: now,
    updated_at: now,
    sender_name: "Test User",
    sender_avatar: null,
    attachments: [],
    ...overrides,
  };
}

function mockBroadcastChannel(send: ReturnType<typeof vi.fn>): void {
  vi.mocked(supabase.channel).mockReturnValue({
    send,
  } as unknown as SupabaseChannel);
}

function mockMembershipQuery(result: { data: { id: string } | null; error: unknown }): {
  from: ReturnType<typeof vi.fn>;
  firstEq: ReturnType<typeof vi.fn>;
  secondEq: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
} {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const secondEq = vi.fn().mockReturnValue({ maybeSingle });
  const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
  const select = vi.fn().mockReturnValue({ eq: firstEq });
  const from = vi.fn().mockReturnValue({ select });

  vi.mocked(supabase.from).mockImplementation(from as unknown as typeof supabase.from);

  return { from, firstEq, secondEq, maybeSingle };
}

function mockMembershipQueryError(error: Error): void {
  const maybeSingle = vi.fn().mockRejectedValue(error);
  const secondEq = vi.fn().mockReturnValue({ maybeSingle });
  const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
  const select = vi.fn().mockReturnValue({ eq: firstEq });

  vi.mocked(supabase.from).mockReturnValue({ select } as unknown as SupabaseFromResult);
}

describe("groupBroadcast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("broadcastGroupMessage", () => {
    it("broadcasts message to correct channel", async () => {
      const send = vi.fn().mockResolvedValue(undefined);
      const groupId = "test-group-id";
      const message = createMessage({ group_id: groupId });

      mockBroadcastChannel(send);

      await broadcastGroupMessage(groupId, message);

      expect(supabase.channel).toHaveBeenCalledWith(`group:${groupId}`);
      expect(send).toHaveBeenCalledWith({
        type: "broadcast",
        event: "new_message",
        payload: { message },
      });
    });

    it("handles broadcast errors gracefully", async () => {
      const send = vi.fn().mockRejectedValue(new Error("Network error"));
      const groupId = "test-group-id";

      mockBroadcastChannel(send);

      await expect(broadcastGroupMessage(groupId, createMessage({ group_id: groupId }))).resolves.not.toThrow();
    });

    it("includes attachments in broadcast payload", async () => {
      const send = vi.fn().mockResolvedValue(undefined);
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
      const message = createMessage({
        attachments,
        message: "Test message with attachment",
      });

      mockBroadcastChannel(send);

      await broadcastGroupMessage("test-group-id", message);

      expect(send).toHaveBeenCalledWith({
        type: "broadcast",
        event: "new_message",
        payload: { message },
      });
      expect(send.mock.calls[0][0].payload.message.attachments).toHaveLength(1);
      expect(send.mock.calls[0][0].payload.message.attachments[0].file_name).toBe("test.pdf");
    });
  });

  describe("verifyGroupMembership", () => {
    it("returns true for valid member", async () => {
      const { from } = mockMembershipQuery({
        data: { id: "membership-1" },
        error: null,
      });

      await expect(verifyGroupMembership("group-1", "user-1")).resolves.toBe(true);
      expect(from).toHaveBeenCalledWith("chat_group_members");
    });

    it("returns false for non-member", async () => {
      mockMembershipQuery({
        data: null,
        error: { message: "Not found" },
      });

      await expect(verifyGroupMembership("group-1", "user-2")).resolves.toBe(false);
    });

    it("returns false on database error", async () => {
      mockMembershipQueryError(new Error("Database error"));

      await expect(verifyGroupMembership("group-1", "user-1")).resolves.toBe(false);
    });

    it("verifies correct group and user IDs", async () => {
      const groupId = "group-123";
      const userId = "user-456";
      const { firstEq, secondEq } = mockMembershipQuery({
        data: { id: "membership-1" },
        error: null,
      });

      await verifyGroupMembership(groupId, userId);

      expect(firstEq).toHaveBeenCalledWith("group_id", groupId);
      expect(secondEq).toHaveBeenCalledWith("user_id", userId);
    });
  });
});
