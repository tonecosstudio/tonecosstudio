import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useGroupMessages } from "./useGroupMessages";
import { supabase } from "@/integrations/supabase/client";
import { messageService } from "@/lib/services/messageService";
import type { User } from "@supabase/supabase-js";

// Mock dependencies
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    channel: vi.fn(),
    removeChannel: vi.fn(),
    from: vi.fn(),
  },
}));

vi.mock("@/lib/services/messageService", () => ({
  messageService: {
    listGroupMessages: vi.fn(),
    updateLastViewed: vi.fn(),
    sendBroadcastMessage: vi.fn(),
  },
}));

vi.mock("@/lib/realtime/groupBroadcast", () => ({
  verifyGroupMembership: vi.fn(),
  broadcastGroupMessage: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("useGroupMessages", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
  };

  const mockMessages = [
    {
      id: "msg-1",
      group_id: "group-1",
      sender_id: "user-1",
      message: "Test message 1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender_name: "User 1",
      sender_avatar: null,
      attachments: [],
    },
    {
      id: "msg-2",
      group_id: "group-1",
      sender_id: "user-2",
      message: "Test message 2",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender_name: "User 2",
      sender_avatar: null,
      attachments: [],
    },
  ];

  type SupabaseFromResult = ReturnType<typeof supabase.from>;

  function mockFromResult(value: unknown): SupabaseFromResult {
    return value as SupabaseFromResult;
  }

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock auth
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as User },
      error: null,
    });

    // Mock message service
    vi.mocked(messageService.listGroupMessages).mockResolvedValue({
      messages: mockMessages,
      pagination: {
        page: 1,
        limit: 50,
        total: 2,
        total_pages: 1,
      },
    });

    vi.mocked(messageService.updateLastViewed).mockResolvedValue();
  });

  it("should load messages on mount", async () => {
    const { result } = renderHook(() => useGroupMessages({ groupId: "group-1" }));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(messageService.listGroupMessages).toHaveBeenCalledWith("group-1", mockUser.id, {
      page: 1,
      limit: 50,
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].id).toBe("msg-1");
  });

  it("should not load messages when groupId is null", async () => {
    const { result } = renderHook(() => useGroupMessages({ groupId: null }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(messageService.listGroupMessages).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(0);
  });

  it("should update last viewed on mount", async () => {
    renderHook(() => useGroupMessages({ groupId: "group-1" }));

    await waitFor(() => {
      expect(messageService.updateLastViewed).toHaveBeenCalledWith("group-1", mockUser.id);
    });
  });

  it("should handle pagination", async () => {
    vi.mocked(messageService.listGroupMessages).mockResolvedValue({
      messages: mockMessages,
      pagination: {
        page: 1,
        limit: 50,
        total: 100,
        total_pages: 2,
      },
    });

    const { result } = renderHook(() => useGroupMessages({ groupId: "group-1" }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasMore).toBe(true);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(2);
  });

  it("should set hasMore to false on last page", async () => {
    vi.mocked(messageService.listGroupMessages).mockResolvedValue({
      messages: mockMessages,
      pagination: {
        page: 2,
        limit: 50,
        total: 100,
        total_pages: 2,
      },
    });

    const { result } = renderHook(() => useGroupMessages({ groupId: "group-1" }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasMore).toBe(false);
  });

  it("should handle errors gracefully", async () => {
    vi.mocked(messageService.listGroupMessages).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useGroupMessages({ groupId: "group-1" }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should not crash, messages should be empty
    expect(result.current.messages).toHaveLength(0);
  });

  it("should provide refresh function", async () => {
    const { result } = renderHook(() => useGroupMessages({ groupId: "group-1" }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    vi.clearAllMocks();

    // Call refresh
    result.current.refresh();

    await waitFor(() => {
      expect(messageService.listGroupMessages).toHaveBeenCalledWith("group-1", mockUser.id, {
        page: 1,
        limit: 50,
      });
    });
  });

  it("should validate admin role before sending message", async () => {
    // Mock non-admin user
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { role: "customer" },
            error: null,
          }),
        }),
      }),
    });

    vi.mocked(supabase.from).mockImplementation(mockFromResult(mockFrom));

    const { result } = renderHook(() => useGroupMessages({ groupId: "group-1" }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Try to send message as non-admin
    await expect(result.current.sendMessage("Test message")).rejects.toThrow(
      "Apenas administradores podem enviar mensagens"
    );
  });
});
