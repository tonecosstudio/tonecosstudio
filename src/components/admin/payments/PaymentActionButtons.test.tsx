/**
 * PaymentActionButtons Component Tests
 *
 * Unit tests for the PaymentActionButtons component
 *
 * Requirements: 7.1-7.15
 * Task: 13.2 Criar componente PaymentActionButtons
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PaymentActionButtons } from "./PaymentActionButtons";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { approvePayment, rejectPayment, requestPaymentInfo } from "@/lib/payment-service";
import { toast } from "@/hooks/use-toast";

// Mock the payment service
vi.mock("@/lib/payment-service", () => ({
  approvePayment: vi.fn(),
  rejectPayment: vi.fn(),
  requestPaymentInfo: vi.fn(),
}));

// Mock the toast hook
vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: { id: "admin-123" },
  }),
}));

describe("PaymentActionButtons", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      paymentId: "payment-123",
      currentStatus: "under_review" as const,
      ...props,
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <PaymentActionButtons {...defaultProps} />
      </QueryClientProvider>
    );
  };

  it("should render all action buttons for under_review status", () => {
    renderComponent();

    expect(screen.getByText("Aprovar")).toBeInTheDocument();
    expect(screen.getByText("Rejeitar")).toBeInTheDocument();
    expect(screen.getByText("Solicitar Info")).toBeInTheDocument();
  });

  it("should disable buttons for approved status", () => {
    renderComponent({ currentStatus: "approved" });

    const approveButton = screen.getByText("Aprovar");
    const rejectButton = screen.getByText("Rejeitar");
    const requestInfoButton = screen.getByText("Solicitar Info");

    expect(approveButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();
    expect(requestInfoButton).toBeDisabled();
  });

  it("should disable buttons for rejected status", () => {
    renderComponent({ currentStatus: "rejected" });

    const approveButton = screen.getByText("Aprovar");
    const rejectButton = screen.getByText("Rejeitar");
    const requestInfoButton = screen.getByText("Solicitar Info");

    expect(approveButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();
    expect(requestInfoButton).toBeDisabled();
  });

  it("should open approve confirmation dialog when approve button is clicked", () => {
    renderComponent();

    const approveButton = screen.getByText("Aprovar");
    fireEvent.click(approveButton);

    expect(screen.getByRole("heading", { name: /Confirmar Aprova/ })).toBeInTheDocument();
    expect(screen.getByText(/Tem certeza que deseja aprovar este pagamento/)).toBeInTheDocument();
  });

  it("should open reject dialog when reject button is clicked", () => {
    renderComponent();

    const rejectButton = screen.getByText("Rejeitar");
    fireEvent.click(rejectButton);

    expect(screen.getByText("Rejeitar Pagamento")).toBeInTheDocument();
    expect(screen.getByText("Informe o motivo da rejeição para o cliente.")).toBeInTheDocument();
  });

  it("should open request info dialog when request info button is clicked", () => {
    renderComponent();

    const requestInfoButton = screen.getByText("Solicitar Info");
    fireEvent.click(requestInfoButton);

    expect(screen.getByText("Solicitar Informações Adicionais")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Envie uma mensagem ao cliente solicitando informações ou documentos adicionais."
      )
    ).toBeInTheDocument();
  });

  it("should call approvePayment when approve is confirmed", async () => {
    vi.mocked(approvePayment).mockResolvedValue(undefined);

    renderComponent();

    // Open approve dialog
    const approveButton = screen.getByText("Aprovar");
    fireEvent.click(approveButton);

    // Confirm approval
    const confirmButton = screen.getByRole("button", { name: /Confirmar Aprova/ });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(approvePayment).toHaveBeenCalledWith("payment-123", "admin-123");
    });
  });

  it("should call rejectPayment when reject is confirmed with reason", async () => {
    vi.mocked(rejectPayment).mockResolvedValue(undefined);

    renderComponent();

    // Open reject dialog
    const rejectButton = screen.getByText("Rejeitar");
    fireEvent.click(rejectButton);

    // Enter rejection reason
    const textarea = screen.getByPlaceholderText(/Ex: Comprovante ilegível/);
    fireEvent.change(textarea, { target: { value: "Comprovante ilegível" } });

    // Confirm rejection
    const confirmButton = screen.getByText("Confirmar Rejeição");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(rejectPayment).toHaveBeenCalledWith(
        "payment-123",
        "admin-123",
        "Comprovante ilegível"
      );
    });
  });

  it("should call requestPaymentInfo when request info is confirmed with message", async () => {
    vi.mocked(requestPaymentInfo).mockResolvedValue(undefined);

    renderComponent();

    // Open request info dialog
    const requestInfoButton = screen.getByText("Solicitar Info");
    fireEvent.click(requestInfoButton);

    // Enter message
    const textarea = screen.getByPlaceholderText(/Ex: Por favor, envie um comprovante/);
    fireEvent.change(textarea, {
      target: { value: "Por favor, envie um comprovante mais legível" },
    });

    // Confirm request
    const confirmButton = screen.getByText("Enviar Solicitação");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(requestPaymentInfo).toHaveBeenCalledWith(
        "payment-123",
        "admin-123",
        "Por favor, envie um comprovante mais legível"
      );
    });
  });

  it("should show loading state during approve mutation", async () => {
    vi.mocked(approvePayment).mockImplementation(() => new Promise(() => {})); // Never resolves

    renderComponent();

    // Open approve dialog
    const approveButton = screen.getByText("Aprovar");
    fireEvent.click(approveButton);

    // Confirm approval
    const confirmButton = screen.getByRole("button", { name: /Confirmar Aprova/ });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText("Aprovando...")).toBeInTheDocument();
    });
  });

  it("should show loading state during reject mutation", async () => {
    vi.mocked(rejectPayment).mockImplementation(() => new Promise(() => {})); // Never resolves

    renderComponent();

    // Open reject dialog
    const rejectButton = screen.getByText("Rejeitar");
    fireEvent.click(rejectButton);

    // Enter rejection reason
    const textarea = screen.getByPlaceholderText(/Ex: Comprovante ilegível/);
    fireEvent.change(textarea, { target: { value: "Comprovante ilegível" } });

    // Confirm rejection
    const confirmButton = screen.getByText("Confirmar Rejeição");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText("Rejeitando...")).toBeInTheDocument();
    });
  });

  it("should show loading state during request info mutation", async () => {
    vi.mocked(requestPaymentInfo).mockImplementation(() => new Promise(() => {})); // Never resolves

    renderComponent();

    // Open request info dialog
    const requestInfoButton = screen.getByText("Solicitar Info");
    fireEvent.click(requestInfoButton);

    // Enter message
    const textarea = screen.getByPlaceholderText(/Ex: Por favor, envie um comprovante/);
    fireEvent.change(textarea, {
      target: { value: "Por favor, envie um comprovante mais legível" },
    });

    // Confirm request
    const confirmButton = screen.getByText("Enviar Solicitação");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText("Enviando...")).toBeInTheDocument();
    });
  });

  it("should call onActionComplete when action succeeds", async () => {
    vi.mocked(approvePayment).mockResolvedValue(undefined);
    const mockOnActionComplete = vi.fn();

    renderComponent({ onActionComplete: mockOnActionComplete });

    // Open approve dialog
    const approveButton = screen.getByText("Aprovar");
    fireEvent.click(approveButton);

    // Confirm approval
    const confirmButton = screen.getByRole("button", { name: /Confirmar Aprova/ });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnActionComplete).toHaveBeenCalled();
    });
  });

  it("should show error toast when approve fails", async () => {
    const errorMessage = "Network error";
    vi.mocked(approvePayment).mockRejectedValue(new Error(errorMessage));

    renderComponent();

    // Open approve dialog
    const approveButton = screen.getByText("Aprovar");
    fireEvent.click(approveButton);

    // Confirm approval
    const confirmButton = screen.getByRole("button", { name: /Confirmar Aprova/ });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Erro ao aprovar pagamento",
          description: errorMessage,
          variant: "destructive",
        })
      );
    });
  });

  it("should block rejection confirmation until a reason is provided", () => {
    renderComponent();

    const rejectButton = screen.getByText("Rejeitar");
    fireEvent.click(rejectButton);

    expect(screen.getByText("Confirmar Rejeição")).toBeDisabled();
    expect(toast).not.toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Motivo obrigatório",
      })
    );
  });

  it("should block request info confirmation until a message is provided", () => {
    renderComponent();

    const requestInfoButton = screen.getByText("Solicitar Info");
    fireEvent.click(requestInfoButton);

    expect(screen.getByText("Enviar Solicitação")).toBeDisabled();
    expect(toast).not.toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Mensagem obrigatória",
      })
    );
  });
});
