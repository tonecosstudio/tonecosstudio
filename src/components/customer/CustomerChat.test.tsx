import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomerChat } from "./CustomerChat";
import { supabase } from "@/integrations/supabase/client";
import * as customerChatService from "@/services/customer-chat-button-service";
import { renderWithProviders } from "@/test/utils/test-utils";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(),
    channel: vi.fn(() => {
      const channel = {
        on: vi.fn(),
        subscribe: vi.fn(),
        send: vi.fn(),
        unsubscribe: vi.fn(),
      };
      channel.on.mockReturnValue(channel);
      channel.subscribe.mockReturnValue(channel);
      return channel;
    }),
    removeChannel: vi.fn(),
  },
}));

vi.mock("@/services/customer-chat-button-service", () => ({
  countUnreadCustomerSupportMessages: vi.fn(),
  createCustomerSupportConversation: vi.fn(),
  listCustomerSupportConversations: vi.fn(),
  subscribeToCustomerChatUpdates: vi.fn(() => ({})),
  unsubscribeFromCustomerChatUpdates: vi.fn(),
}));

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
  const authenticatedUser = {
    id: "user-123",
    email: "test@example.com",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(customerChatService.countUnreadCustomerSupportMessages).mockResolvedValue(0);
    vi.mocked(customerChatService.listCustomerSupportConversations).mockResolvedValue([]);
  });

  function mockAuthSession(user: typeof authenticatedUser | null) {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user },
      error: null,
    });
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: user ? { user } : null },
      error: null,
    });
  }

  it("should not render if user is not authenticated", async () => {
    mockAuthSession(null);

    const { container } = renderWithProviders(<CustomerChat />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("should render floating chat button for authenticated user", async () => {
    mockAuthSession(authenticatedUser);

    renderWithProviders(<CustomerChat />);

    await waitFor(() => {
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });

  it("should display unread count badge when there are unread messages", async () => {
    mockAuthSession(authenticatedUser);
    vi.mocked(customerChatService.countUnreadCustomerSupportMessages).mockResolvedValue(3);

    renderWithProviders(<CustomerChat />);

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  it("should open chat panel when button is clicked", async () => {
    mockAuthSession(authenticatedUser);
    vi.mocked(customerChatService.listCustomerSupportConversations).mockResolvedValue([
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

    renderWithProviders(<CustomerChat />);

    await waitFor(() => {
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("Suporte")).toBeInTheDocument();
    });
  });

  it("should display empty state when user has no conversations", async () => {
    mockAuthSession(authenticatedUser);
    vi.mocked(customerChatService.listCustomerSupportConversations).mockResolvedValue([]);

    renderWithProviders(<CustomerChat />);

    await waitFor(() => {
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText(/Voce ainda nao tem conversas/i)).toBeInTheDocument();
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
