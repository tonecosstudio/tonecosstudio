import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { ContactForm } from "./ContactForm";
import { supabase } from "@/integrations/supabase/client";
import { conversationService } from "@/lib/services/conversationService";
import { messageService } from "@/lib/services/messageService";

// Mock dependencies
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/conversationService", () => ({
  conversationService: {
    createConversation: vi.fn(),
  },
}));

vi.mock("@/lib/services/messageService", () => ({
  messageService: {
    sendMessage: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("ContactForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderContactForm = () => {
    return render(
      <BrowserRouter>
        <ContactForm />
      </BrowserRouter>
    );
  };

  it("should render all form fields", () => {
    renderContactForm();

    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mensagem/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enviar mensagem/i })).toBeInTheDocument();
  });

  it("should validate required fields", async () => {
    const user = userEvent.setup();
    renderContactForm();

    const submitButton = screen.getByRole("button", { name: /enviar mensagem/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/nome deve ter pelo menos 2 caracteres/i)).toBeInTheDocument();
    });
  });

  it("should validate message minimum length", async () => {
    const user = userEvent.setup();
    renderContactForm();

    const nameInput = screen.getByLabelText(/nome/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageInput = screen.getByLabelText(/mensagem/i);

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(messageInput, "Short");

    const submitButton = screen.getByRole("button", { name: /enviar mensagem/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/mensagem deve ter pelo menos 10 caracteres/i)).toBeInTheDocument();
    });
  });

  it("should show error when user is not authenticated", async () => {
    const user = userEvent.setup();

    // Mock unauthenticated user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    renderContactForm();

    const nameInput = screen.getByLabelText(/nome/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageInput = screen.getByLabelText(/mensagem/i);

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(messageInput, "This is a test message with enough characters");

    const submitButton = screen.getByRole("button", { name: /enviar mensagem/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/para entrar em contato, por favor faça login/i)).toBeInTheDocument();
    });
  });

  it("should create conversation and redirect when authenticated", async () => {
    const user = userEvent.setup();

    const mockUser = { id: "user-123", email: "john@example.com" };
    const mockConversation = { id: "conv-123", user_id: mockUser.id };

    // Mock authenticated user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    vi.mocked(conversationService.createConversation).mockResolvedValue(mockConversation as any);
    vi.mocked(messageService.sendMessage).mockResolvedValue({} as any);

    renderContactForm();

    const nameInput = screen.getByLabelText(/nome/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageInput = screen.getByLabelText(/mensagem/i);

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(messageInput, "This is a test message with enough characters");

    const submitButton = screen.getByRole("button", { name: /enviar mensagem/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(conversationService.createConversation).toHaveBeenCalledWith({
        user_id: mockUser.id,
        subject: "Contato: John Doe",
        status: "waiting_admin",
        tags: ["duvida"],
      });
    });

    await waitFor(() => {
      expect(messageService.sendMessage).toHaveBeenCalledWith({
        conversation_id: mockConversation.id,
        sender_id: mockUser.id,
        sender_type: "customer",
        message: "This is a test message with enough characters",
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/perfil?section=support");
    });
  });

  it("should auto-tag conversation as 'duvida'", async () => {
    const user = userEvent.setup();

    const mockUser = { id: "user-123", email: "john@example.com" };
    const mockConversation = { id: "conv-123", user_id: mockUser.id };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    vi.mocked(conversationService.createConversation).mockResolvedValue(mockConversation as any);
    vi.mocked(messageService.sendMessage).mockResolvedValue({} as any);

    renderContactForm();

    const nameInput = screen.getByLabelText(/nome/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageInput = screen.getByLabelText(/mensagem/i);

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(messageInput, "This is a test message with enough characters");

    const submitButton = screen.getByRole("button", { name: /enviar mensagem/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(conversationService.createConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ["duvida"],
        })
      );
    });
  });

  it("should show error message when submission fails", async () => {
    const user = userEvent.setup();

    const mockUser = { id: "user-123", email: "john@example.com" };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    vi.mocked(conversationService.createConversation).mockRejectedValue(new Error("Network error"));

    renderContactForm();

    const nameInput = screen.getByLabelText(/nome/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageInput = screen.getByLabelText(/mensagem/i);

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(messageInput, "This is a test message with enough characters");

    const submitButton = screen.getByRole("button", { name: /enviar mensagem/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/erro ao enviar mensagem/i)).toBeInTheDocument();
    });
  });

  it("should disable form fields while submitting", async () => {
    const user = userEvent.setup();

    const mockUser = { id: "user-123", email: "john@example.com" };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Make the submission slow
    vi.mocked(conversationService.createConversation).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({} as any), 1000))
    );

    renderContactForm();

    const nameInput = screen.getByLabelText(/nome/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageInput = screen.getByLabelText(/mensagem/i);

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(messageInput, "This is a test message with enough characters");

    const submitButton = screen.getByRole("button", { name: /enviar mensagem/i });
    await user.click(submitButton);

    // Check that fields are disabled during submission
    expect(nameInput).toBeDisabled();
    expect(emailInput).toBeDisabled();
    expect(messageInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });
});
