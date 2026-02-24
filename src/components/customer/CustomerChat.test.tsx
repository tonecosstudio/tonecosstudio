import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomerChat } from "./CustomerChat";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

// Mock services
vi.mock("@/lib/services/conversationService", () => ({
  conversationService: {
    listConversations: vi.fn(),
    getUnreadCount: vi.fn(),
  },
}));

// Mock hooks
vi.mock("@/hooks/useMessages", () => ({
  useMessages: vi.fn(() => ({
    messages: [],
    loading: false,
    hasMore: false,
    loadMore: vi.fn(),
    sendMessage: vi.fn(),
    messagesEndRef: { current: null },
  })),
}));

describe("CustomerChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not render if user is not authenticated", async () => {
    // Mock unauthenticated user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { container } = render(<CustomerChat />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("should render floating chat button for authenticated user", async () => {
    // Mock authenticated user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          email: "test@example.com",
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    });

    // Mock empty conversations
    const { conversationService } = await import("@/lib/services/conversationService");
    vi.mocked(conversationService.listConversations).mockResolvedValue([]);

    render(<CustomerChat />);

    await waitFor(() => {
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });
  });

  it("should display unread count badge when there are unread messages", async () => {
    // Mock authenticated user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          email: "test@example.com",
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    });

    // Mock conversations with unread messages
    const { conversationService } = await import("@/lib/services/conversationService");
    vi.mocked(conversationService.listConversations).mockResolvedValue([
      {
        id: "conv-1",
        user_id: "user-123",
        subject: "Test Conversation",
        status: "waiting_customer",
        priority: "normal",
        tags: [],
        risk_flags: [],
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    vi.mocked(conversationService.getUnreadCount).mockResolvedValue(3);

    render(<CustomerChat />);

    await waitFor(() => {
      const badge = screen.getByText("3");
      expect(badge).toBeInTheDocument();
    });
  });

  it("should open chat panel when button is clicked", async () => {
    // Mock authenticated user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          email: "test@example.com",
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    });

    // Mock conversations
    const { conversationService } = await import("@/lib/services/conversationService");
    vi.mocked(conversationService.listConversations).mockResolvedValue([
      {
        id: "conv-1",
        user_id: "user-123",
        subject: "Test Conversation",
        status: "waiting_customer",
        priority: "normal",
        tags: [],
        risk_flags: [],
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    vi.mocked(conversationService.getUnreadCount).mockResolvedValue(0);

    render(<CustomerChat />);

    await waitFor(() => {
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    // Click the button
    const user = userEvent.setup();
    const button = screen.getByRole("button");
    await user.click(button);

    // Check if panel opened
    await waitFor(() => {
      expect(screen.getByText("Suporte")).toBeInTheDocument();
    });
  });

  it("should display empty state when user has no conversations", async () => {
    // Mock authenticated user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          email: "test@example.com",
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    });

    // Mock empty conversations
    const { conversationService } = await import("@/lib/services/conversationService");
    vi.mocked(conversationService.listConversations).mockResolvedValue([]);

    render(<CustomerChat />);

    // Open chat
    await waitFor(() => {
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const button = screen.getByRole("button");
    await user.click(button);

    // Check empty state
    await waitFor(() => {
      expect(screen.getByText(/Você ainda não tem conversas/i)).toBeInTheDocument();
    });
  });
});

/**
 * Feature: advanced-chat-support-system
 *
 * These tests validate:
 * - Requirement 14.1: Chat button accessible to authenticated users
 * - Requirement 14.3: Displays client's conversation history
 * - Requirement 14.6: Displays unread message count on chat button
 *
 * Additional tests needed:
 * - Property 47: Client Conversation History Display
 * - Property 48: Unread Message Count Display
 * - Property 49: Order Status Updates in Client Chat
 */
