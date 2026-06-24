import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGroupMessages } from "./useGroupMessages";
import { supabase } from "@/integrations/supabase/client";
import { messageService } from "@/services/support/message-service";
import type { User } from "@supabase/supabase-js";

// Mock dependencies
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    channel: vi.fn(() => {
      const channel = {
        on: vi.fn(() => channel),
        subscribe: vi.fn(() => channel),
      };
      return channel;
    }),
    removeChannel: vi.fn(),
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock("@/services/support/message-service", () => ({
  messageService: {
    listCurrentUserGroupMessages: vi.fn(),
    updateCurrentUserLastViewed: vi.fn(),
    sendCurrentAdminBroadcastMessage: vi.fn(),
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

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { gcTime: 0, retry: false },
      },
    });

    return ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);
  };

  const renderUseGroupMessages = (
    options: Parameters<typeof useGroupMessages>[0],
  ) =>
    renderHook(() => useGroupMessages(options), { wrapper: createWrapper() });

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock auth
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as User },
      error: null,
    });
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: true,
      error: null,
    } as Awaited<ReturnType<typeof supabase.rpc>>);

    // Mock message service
    vi.mocked(messageService.listCurrentUserGroupMessages).mockResolvedValue({
      messages: mockMessages,
      pagination: {
        page: 1,
        limit: 50,
        total: 2,
        total_pages: 1,
      },
    });

    vi.mocked(messageService.updateCurrentUserLastViewed).mockResolvedValue(
      mockUser.id,
    );
    vi.mocked(
      messageService.sendCurrentAdminBroadcastMessage,
    ).mockResolvedValue({
      ...mockMessages[0],
      attachments: [],
    } as Awaited<
      ReturnType<typeof messageService.sendCurrentAdminBroadcastMessage>
    >);
  });

  it("should load messages on mount", async () => {
    const { result } = renderUseGroupMessages({ groupId: "group-1" });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(messageService.listCurrentUserGroupMessages).toHaveBeenCalledWith(
      "group-1",
      {
        page: 1,
        limit: 50,
      },
    );

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].id).toBe("msg-1");
  });

  it("should not load messages when groupId is null", async () => {
    const { result } = renderUseGroupMessages({ groupId: null });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(messageService.listCurrentUserGroupMessages).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(0);
  });

  it("should update last viewed on mount", async () => {
    renderUseGroupMessages({ groupId: "group-1" });

    await waitFor(() => {
      expect(messageService.updateCurrentUserLastViewed).toHaveBeenCalledWith(
        "group-1",
      );
    });
  });

  it("should handle pagination", async () => {
    vi.mocked(messageService.listCurrentUserGroupMessages).mockResolvedValue({
      messages: mockMessages,
      pagination: {
        page: 1,
        limit: 50,
        total: 100,
        total_pages: 2,
      },
    });

    const { result } = renderUseGroupMessages({ groupId: "group-1" });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasMore).toBe(true);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(2);
  });

  it("should set hasMore to false on last page", async () => {
    vi.mocked(messageService.listCurrentUserGroupMessages).mockResolvedValue({
      messages: mockMessages,
      pagination: {
        page: 2,
        limit: 50,
        total: 100,
        total_pages: 2,
      },
    });

    const { result } = renderUseGroupMessages({ groupId: "group-1" });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasMore).toBe(false);
  });

  it("should handle errors gracefully", async () => {
    vi.mocked(messageService.listCurrentUserGroupMessages).mockRejectedValue(
      new Error("Network error"),
    );

    const { result } = renderUseGroupMessages({ groupId: "group-1" });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should not crash, messages should be empty
    expect(result.current.messages).toHaveLength(0);
  });

  it("should provide refresh function", async () => {
    const { result } = renderUseGroupMessages({ groupId: "group-1" });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    vi.clearAllMocks();

    // Call refresh
    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(messageService.listCurrentUserGroupMessages).toHaveBeenCalledWith(
        "group-1",
        {
          page: 1,
          limit: 50,
        },
      );
    });
  });

  it("should validate admin role before sending message", async () => {
    vi.mocked(
      messageService.sendCurrentAdminBroadcastMessage,
    ).mockRejectedValue(
      new Error("Apenas administradores podem enviar mensagens"),
    );

    const { result } = renderUseGroupMessages({ groupId: "group-1" });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Try to send message as non-admin
    await expect(result.current.sendMessage("Test message")).rejects.toThrow(
      "Apenas administradores podem enviar mensagens",
    );
  });
});
