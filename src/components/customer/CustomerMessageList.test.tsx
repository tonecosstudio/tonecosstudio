import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomerMessageList } from "./CustomerMessageList";
import type { Message } from "@/types/support";

const supportActionsMock = vi.hoisted(() => ({
  createConversation: vi.fn(),
  getPublicUrl: vi.fn((filePath: string) => `https://storage.ordax.test/${filePath}`),
}));

// Mock the useMessages hook
vi.mock("@/hooks/useMessages", () => ({
  useMessages: vi.fn(),
}));

vi.mock("@/hooks/customer/useCustomerSupportConversationActions", () => ({
  useCreateCustomerSupportConversation: () => ({
    createConversation: supportActionsMock.createConversation,
    isCreating: false,
  }),
  useSupportAttachmentPublicUrl: () => supportActionsMock.getPublicUrl,
}));

// Mock date-fns
vi.mock("date-fns", () => ({
  formatDistanceToNow: vi.fn((_date) => "2 minutos atrás"),
}));

vi.mock("date-fns/locale", () => ({
  ptBR: {},
}));

import { useMessages } from "@/hooks/useMessages";

describe("CustomerMessageList", () => {
  const mockMessagesEndRef = { current: null };
  const mockLoadMore = vi.fn();

  const createMockMessage = (overrides: Partial<Message> = {}): Message => ({
    id: "msg-1",
    conversation_id: "conv-1",
    sender_id: "user-1",
    sender_type: "customer",
    sender_name: "Cliente Teste",
    message: "Mensagem de teste",
    is_internal: false,
    read_by_admin: false,
    read_by_customer: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMessages).mockReturnValue({
      messages: [],
      loading: false,
      hasMore: false,
      loadMore: mockLoadMore,
      messagesEndRef: mockMessagesEndRef,
      sendMessage: vi.fn(),
      markAsRead: vi.fn(),
      refresh: vi.fn(),
    });
  });

  describe("Requirement 14.2: Display Client's conversation history", () => {
    it("should render customer messages", () => {
      const messages = [
        createMockMessage({
          id: "msg-1",
          sender_type: "customer",
          message: "Olá, preciso de ajuda",
        }),
      ];

      vi.mocked(useMessages).mockReturnValue({
        messages,
        loading: false,
        hasMore: false,
        loadMore: mockLoadMore,
        messagesEndRef: mockMessagesEndRef,
        sendMessage: vi.fn(),
        markAsRead: vi.fn(),
        refresh: vi.fn(),
      });

      render(<CustomerMessageList conversationId="conv-1" />);

      expect(screen.getByText("Olá, preciso de ajuda")).toBeInTheDocument();
      expect(screen.getByText("Você")).toBeInTheDocument();
    });

    it("should render admin messages", () => {
      const messages = [
        createMockMessage({
          id: "msg-2",
          sender_type: "admin",
          sender_name: "Atendente",
          message: "Como posso ajudar?",
        }),
      ];

      vi.mocked(useMessages).mockReturnValue({
        messages,
        loading: false,
        hasMore: false,
        loadMore: mockLoadMore,
        messagesEndRef: mockMessagesEndRef,
        sendMessage: vi.fn(),
        markAsRead: vi.fn(),
        refresh: vi.fn(),
      });

      render(<CustomerMessageList conversationId="conv-1" />);

      expect(screen.getByText("Como posso ajudar?")).toBeInTheDocument();
      expect(screen.getByText("Atendente")).toBeInTheDocument();
    });

    it("should filter out internal notes (is_internal = true)", () => {
      const messages = [
        createMockMessage({
          id: "msg-1",
          sender_type: "customer",
          message: "Mensagem visível",
          is_internal: false,
        }),
        createMockMessage({
          id: "msg-2",
          sender_type: "admin",
          message: "Nota interna - não deve aparecer",
          is_internal: true,
        }),
        createMockMessage({
          id: "msg-3",
          sender_type: "admin",
          message: "Resposta visível",
          is_internal: false,
        }),
      ];

      vi.mocked(useMessages).mockReturnValue({
        messages,
        loading: false,
        hasMore: false,
        loadMore: mockLoadMore,
        messagesEndRef: mockMessagesEndRef,
        sendMessage: vi.fn(),
        markAsRead: vi.fn(),
        refresh: vi.fn(),
      });

      render(<CustomerMessageList conversationId="conv-1" />);

      // Should show visible messages
      expect(screen.getByText("Mensagem visível")).toBeInTheDocument();
      expect(screen.getByText("Resposta visível")).toBeInTheDocument();

      // Should NOT show internal note
      expect(screen.queryByText("Nota interna - não deve aparecer")).not.toBeInTheDocument();
    });

    it("should display empty state when no messages", () => {
      render(<CustomerMessageList conversationId="conv-1" />);

      expect(
        screen.getByText("Nenhuma mensagem ainda. Envie a primeira mensagem!")
      ).toBeInTheDocument();
    });
  });

  describe("Requirement 14.8: Display Order status updates", () => {
    it("should render system messages with special styling", () => {
      const messages = [
        createMockMessage({
          id: "msg-system",
          sender_type: "system",
          message: "Seu pedido #123 foi enviado! 📦\n\nCódigo de rastreamento: BR123456789",
        }),
      ];

      vi.mocked(useMessages).mockReturnValue({
        messages,
        loading: false,
        hasMore: false,
        loadMore: mockLoadMore,
        messagesEndRef: mockMessagesEndRef,
        sendMessage: vi.fn(),
        markAsRead: vi.fn(),
        refresh: vi.fn(),
      });

      render(<CustomerMessageList conversationId="conv-1" />);

      // Should show system message content
      expect(screen.getByText(/Seu pedido #123 foi enviado/)).toBeInTheDocument();

      // Should show "Atualização Automática" badge
      expect(screen.getByText("Atualização Automática")).toBeInTheDocument();
    });

    it("should display multiple system messages", () => {
      const messages = [
        createMockMessage({
          id: "msg-1",
          sender_type: "system",
          message: "Seu pedido #123 entrou em produção",
        }),
        createMockMessage({
          id: "msg-2",
          sender_type: "system",
          message: "Seu pedido #123 foi enviado",
        }),
      ];

      vi.mocked(useMessages).mockReturnValue({
        messages,
        loading: false,
        hasMore: false,
        loadMore: mockLoadMore,
        messagesEndRef: mockMessagesEndRef,
        sendMessage: vi.fn(),
        markAsRead: vi.fn(),
        refresh: vi.fn(),
      });

      render(<CustomerMessageList conversationId="conv-1" />);

      expect(screen.getByText("Seu pedido #123 entrou em produção")).toBeInTheDocument();
      expect(screen.getByText("Seu pedido #123 foi enviado")).toBeInTheDocument();

      // Should have 2 "Atualização Automática" badges
      const badges = screen.getAllByText("Atualização Automática");
      expect(badges).toHaveLength(2);
    });
  });

  describe("Auto-scroll functionality", () => {
    it("should pass autoScroll: true to useMessages hook", () => {
      render(<CustomerMessageList conversationId="conv-1" />);

      expect(useMessages).toHaveBeenCalledWith({
        conversationId: "conv-1",
        autoScroll: true,
      });
    });

    it("should render messagesEndRef anchor for auto-scroll", () => {
      const { container } = render(<CustomerMessageList conversationId="conv-1" />);

      // The ref is attached to a div at the end of the message list
      const scrollAnchor = container.querySelector("div[class*='flex-1'] > div:last-child");
      expect(scrollAnchor).toBeInTheDocument();
    });
  });

  describe("Infinite scroll functionality", () => {
    it("should show 'Load More' button when hasMore is true", () => {
      vi.mocked(useMessages).mockReturnValue({
        messages: [createMockMessage()],
        loading: false,
        hasMore: true,
        loadMore: mockLoadMore,
        messagesEndRef: mockMessagesEndRef,
        sendMessage: vi.fn(),
        markAsRead: vi.fn(),
        refresh: vi.fn(),
      });

      render(<CustomerMessageList conversationId="conv-1" />);

      expect(screen.getByText("Carregar mensagens antigas")).toBeInTheDocument();
    });

    it("should not show 'Load More' button when hasMore is false", () => {
      vi.mocked(useMessages).mockReturnValue({
        messages: [createMockMessage()],
        loading: false,
        hasMore: false,
        loadMore: mockLoadMore,
        messagesEndRef: mockMessagesEndRef,
        sendMessage: vi.fn(),
        markAsRead: vi.fn(),
        refresh: vi.fn(),
      });

      render(<CustomerMessageList conversationId="conv-1" />);

      expect(screen.queryByText("Carregar mensagens antigas")).not.toBeInTheDocument();
    });

    it("should call loadMore when 'Load More' button is clicked", async () => {
      const user = userEvent.setup();

      vi.mocked(useMessages).mockReturnValue({
        messages: [createMockMessage()],
        loading: false,
        hasMore: true,
        loadMore: mockLoadMore,
        messagesEndRef: mockMessagesEndRef,
        sendMessage: vi.fn(),
        markAsRead: vi.fn(),
        refresh: vi.fn(),
      });

      render(<CustomerMessageList conversationId="conv-1" />);

      const loadMoreButton = screen.getByText("Carregar mensagens antigas");
      await user.click(loadMoreButton);

      expect(mockLoadMore).toHaveBeenCalledTimes(1);
    });

    it("should disable 'Load More' button when loading", () => {
      vi.mocked(useMessages).mockReturnValue({
        messages: [createMockMessage()],
        loading: true,
        hasMore: true,
        loadMore: mockLoadMore,
        messagesEndRef: mockMessagesEndRef,
        sendMessage: vi.fn(),
        markAsRead: vi.fn(),
        refresh: vi.fn(),
      });

      render(<CustomerMessageList conversationId="conv-1" />);

      const loadMoreButton = screen.getByText("Carregando...");
      expect(loadMoreButton).toBeDisabled();
    });
  });

  describe("Message rendering", () => {
    it("should preserve line breaks in messages", () => {
      const messages = [
        createMockMessage({
          message: "Linha 1\nLinha 2\nLinha 3",
        }),
      ];

      vi.mocked(useMessages).mockReturnValue({
        messages,
        loading: false,
        hasMore: false,
        loadMore: mockLoadMore,
        messagesEndRef: mockMessagesEndRef,
        sendMessage: vi.fn(),
        markAsRead: vi.fn(),
        refresh: vi.fn(),
      });

      const { container } = render(<CustomerMessageList conversationId="conv-1" />);

      // Check that whitespace-pre-wrap is applied
      const messageElement = container.querySelector(".whitespace-pre-wrap");
      expect(messageElement).toBeInTheDocument();
      expect(messageElement?.textContent).toBe("Linha 1\nLinha 2\nLinha 3");
    });

    it("should display attachments when present", () => {
      const messages = [
        createMockMessage({
          message: "Aqui está o comprovante",
          attachments: [
            {
              id: "att-1",
              message_id: "msg-1",
              file_name: "comprovante.pdf",
              file_path: "conv-1/comprovante.pdf",
              file_size: 1024,
              file_type: "application/pdf",
              uploaded_by: "user-1",
              created_at: new Date().toISOString(),
            },
          ],
        }),
      ];

      vi.mocked(useMessages).mockReturnValue({
        messages,
        loading: false,
        hasMore: false,
        loadMore: mockLoadMore,
        messagesEndRef: mockMessagesEndRef,
        sendMessage: vi.fn(),
        markAsRead: vi.fn(),
        refresh: vi.fn(),
      });

      render(<CustomerMessageList conversationId="conv-1" />);

      const attachmentLink = screen.getByText("📎 comprovante.pdf");
      expect(attachmentLink).toBeInTheDocument();
      expect(attachmentLink).toHaveAttribute(
        "href",
        "https://storage.ordax.test/conv-1/comprovante.pdf"
      );
      expect(attachmentLink).toHaveAttribute("target", "_blank");
    });

    it("should display timestamps for all messages", () => {
      const messages = [createMockMessage({ id: "msg-1" }), createMockMessage({ id: "msg-2" })];

      vi.mocked(useMessages).mockReturnValue({
        messages,
        loading: false,
        hasMore: false,
        loadMore: mockLoadMore,
        messagesEndRef: mockMessagesEndRef,
        sendMessage: vi.fn(),
        markAsRead: vi.fn(),
        refresh: vi.fn(),
      });

      render(<CustomerMessageList conversationId="conv-1" />);

      const timestamps = screen.getAllByText("2 minutos atrás");
      expect(timestamps.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Visual distinction", () => {
    it("should align customer messages to the right", () => {
      const messages = [
        createMockMessage({
          sender_type: "customer",
          message: "Minha mensagem",
        }),
      ];

      vi.mocked(useMessages).mockReturnValue({
        messages,
        loading: false,
        hasMore: false,
        loadMore: mockLoadMore,
        messagesEndRef: mockMessagesEndRef,
        sendMessage: vi.fn(),
        markAsRead: vi.fn(),
        refresh: vi.fn(),
      });

      const { container } = render(<CustomerMessageList conversationId="conv-1" />);

      const messageContainer = container.querySelector(".justify-end");
      expect(messageContainer).toBeInTheDocument();
    });

    it("should align admin messages to the left", () => {
      const messages = [
        createMockMessage({
          sender_type: "admin",
          message: "Resposta do suporte",
        }),
      ];

      vi.mocked(useMessages).mockReturnValue({
        messages,
        loading: false,
        hasMore: false,
        loadMore: mockLoadMore,
        messagesEndRef: mockMessagesEndRef,
        sendMessage: vi.fn(),
        markAsRead: vi.fn(),
        refresh: vi.fn(),
      });

      const { container } = render(<CustomerMessageList conversationId="conv-1" />);

      const messageContainer = container.querySelector(".justify-start");
      expect(messageContainer).toBeInTheDocument();
    });

    it("should center system messages", () => {
      const messages = [
        createMockMessage({
          sender_type: "system",
          message: "Status atualizado",
        }),
      ];

      vi.mocked(useMessages).mockReturnValue({
        messages,
        loading: false,
        hasMore: false,
        loadMore: mockLoadMore,
        messagesEndRef: mockMessagesEndRef,
        sendMessage: vi.fn(),
        markAsRead: vi.fn(),
        refresh: vi.fn(),
      });

      const { container } = render(<CustomerMessageList conversationId="conv-1" />);

      const messageContainer = container.querySelector(".justify-center");
      expect(messageContainer).toBeInTheDocument();
    });
  });
});
