import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { ContactForm } from "./ContactForm";
import { supabase } from "@/integrations/supabase/client";
import { submitCustomerContact } from "@/services/customer/contact-service";
import { profileSectionPath } from "@/config/routes";

// Mock dependencies
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: null }, error: null }),
      ),
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
    },
  },
}));

vi.mock("@/services/customer/contact-service", () => ({
  submitCustomerContact: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockAuthSession = (user: { id: string; email?: string } | null) => {
  vi.mocked(supabase.auth.getUser).mockResolvedValue({
    data: { user },
    error: null,
  } as any);

  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: user ? { user } : null },
    error: null,
  } as any);
};

describe("ContactForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthSession(null);
  });

  const renderContactForm = () => {
    return render(
      <BrowserRouter>
        <ContactForm />
      </BrowserRouter>,
    );
  };

  it("should render all form fields", () => {
    renderContactForm();

    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mensagem/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /enviar mensagem/i }),
    ).toBeInTheDocument();
  });

  it("should validate required fields", async () => {
    const user = userEvent.setup();
    renderContactForm();

    const submitButton = screen.getByRole("button", {
      name: /enviar mensagem/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/nome deve ter pelo menos 2 caracteres/i),
      ).toBeInTheDocument();
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

    const submitButton = screen.getByRole("button", {
      name: /enviar mensagem/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/mensagem deve ter pelo menos 10 caracteres/i),
      ).toBeInTheDocument();
    });
  });

  it("should show error when user is not authenticated", async () => {
    const user = userEvent.setup();

    mockAuthSession(null);

    renderContactForm();

    const nameInput = screen.getByLabelText(/nome/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageInput = screen.getByLabelText(/mensagem/i);

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(
      messageInput,
      "This is a test message with enough characters",
    );

    const submitButton = screen.getByRole("button", {
      name: /enviar mensagem/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/para entrar em contato, por favor faca login/i),
      ).toBeInTheDocument();
    });
  });

  it("should create conversation and redirect when authenticated", async () => {
    const user = userEvent.setup();

    const mockUser = { id: "user-123", email: "john@example.com" };
    mockAuthSession(mockUser);

    vi.mocked(submitCustomerContact).mockResolvedValue(undefined);

    renderContactForm();

    const nameInput = screen.getByLabelText(/nome/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageInput = screen.getByLabelText(/mensagem/i);

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(
      messageInput,
      "This is a test message with enough characters",
    );

    const submitButton = screen.getByRole("button", {
      name: /enviar mensagem/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(submitCustomerContact).toHaveBeenCalledWith({
        userId: mockUser.id,
        name: "John Doe",
        message: "This is a test message with enough characters",
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(profileSectionPath("support"));
    });
  });

  it("should submit contact request through the customer contact service", async () => {
    const user = userEvent.setup();

    const mockUser = { id: "user-123", email: "john@example.com" };
    mockAuthSession(mockUser);

    vi.mocked(submitCustomerContact).mockResolvedValue(undefined);

    renderContactForm();

    const nameInput = screen.getByLabelText(/nome/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageInput = screen.getByLabelText(/mensagem/i);

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(
      messageInput,
      "This is a test message with enough characters",
    );

    const submitButton = screen.getByRole("button", {
      name: /enviar mensagem/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(submitCustomerContact).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          name: "John Doe",
        }),
      );
    });
  });

  it("should show error message when submission fails", async () => {
    const user = userEvent.setup();

    const mockUser = { id: "user-123", email: "john@example.com" };

    mockAuthSession(mockUser);

    vi.mocked(submitCustomerContact).mockRejectedValue(
      new Error("Network error"),
    );

    renderContactForm();

    const nameInput = screen.getByLabelText(/nome/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageInput = screen.getByLabelText(/mensagem/i);

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(
      messageInput,
      "This is a test message with enough characters",
    );

    const submitButton = screen.getByRole("button", {
      name: /enviar mensagem/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/erro ao enviar mensagem/i)).toBeInTheDocument();
    });
  });

  it("should disable form fields while submitting", async () => {
    const user = userEvent.setup();

    const mockUser = { id: "user-123", email: "john@example.com" };

    mockAuthSession(mockUser);

    // Make the submission slow
    vi.mocked(submitCustomerContact).mockImplementation(
      () => new Promise(() => undefined),
    );

    renderContactForm();

    const nameInput = screen.getByLabelText(/nome/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageInput = screen.getByLabelText(/mensagem/i);

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(
      messageInput,
      "This is a test message with enough characters",
    );

    const submitButton = screen.getByRole("button", {
      name: /enviar mensagem/i,
    });
    await user.click(submitButton);

    // Check that fields are disabled during submission
    await waitFor(
      () => {
        expect(nameInput).toBeDisabled();
        expect(emailInput).toBeDisabled();
        expect(messageInput).toBeDisabled();
        expect(submitButton).toBeDisabled();
      },
      { timeout: 3000 },
    );
  });
});
