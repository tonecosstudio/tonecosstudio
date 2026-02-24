/**
 * PaymentInitiationFlow Component Tests
 *
 * Unit tests for the PaymentInitiationFlow component
 *
 * Requirements: 2.1-2.10
 * Task: 16.1 Criar componente PaymentInitiationFlow
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { PaymentInitiationFlow } from "./PaymentInitiationFlow";
import { vi, describe, it, expect, beforeEach } from "vitest";
import * as paymentMethodService from "@/lib/payment-method-service";
import * as paymentService from "@/lib/payment-service";
import * as toastHook from "@/hooks/use-toast";

// Mock the payment method service
vi.mock("@/lib/payment-method-service", () => ({
  listActivePaymentMethods: vi.fn(),
}));

// Mock the payment service
vi.mock("@/lib/payment-service", () => ({
  createPayment: vi.fn(),
}));

// Mock the auth hook
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: { id: "user-123" },
    isLoading: false,
  }),
}));

// Mock the toast hook
vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

// Mock react-router-dom
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe("PaymentInitiationFlow", () => {
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

  const mockPaymentMethods = [
    {
      id: "method-1",
      name: "PIX",
      type: "pix" as const,
      instructions: "Faça o PIX para a chave abaixo",
      payment_link: null,
      pix_key: "123.456.789-00",
      account_details: null,
      is_active: true,
      is_default: true,
      display_order: 0,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "method-2",
      name: "Cartão de Crédito",
      type: "credit_card" as const,
      instructions: "Pagamento via cartão de crédito",
      payment_link: "https://pagseguro.com/pay/123",
      pix_key: null,
      account_details: null,
      is_active: true,
      is_default: false,
      display_order: 1,
      created_at: "2024-01-02T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
    },
    {
      id: "method-3",
      name: "Transferência Bancária",
      type: "bank_transfer" as const,
      instructions: "Faça a transferência para os dados abaixo",
      payment_link: null,
      pix_key: null,
      account_details: {
        bank: "Banco do Brasil",
        agency: "1234",
        account: "56789-0",
      },
      is_active: true,
      is_default: false,
      display_order: 2,
      created_at: "2024-01-03T00:00:00Z",
      updated_at: "2024-01-03T00:00:00Z",
    },
  ];

  const renderComponent = (props = {}) => {
    const defaultProps = {
      amount: 150.5,
      ...props,
    };

    return render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <PaymentInitiationFlow {...defaultProps} />
        </QueryClientProvider>
      </MemoryRouter>
    );
  };

  it("should render loading state initially", () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockImplementation(
      () => new Promise(() => {})
    ); // Never resolves

    renderComponent();

    expect(screen.getByText("Iniciar Pagamento")).toBeInTheDocument();
    expect(screen.getAllByRole("status").length).toBeGreaterThan(0); // Loading skeletons
  });

  it("should render error state when fetch fails", async () => {
    const errorMessage = "Network error";
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockRejectedValue(
      new Error(errorMessage)
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Erro ao carregar métodos de pagamento")).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it("should render empty state when no payment methods", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue([]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Nenhum método de pagamento disponível")).toBeInTheDocument();
      expect(
        screen.getByText("No momento não há métodos de pagamento configurados.")
      ).toBeInTheDocument();
    });
  });

  it("should render payment methods when loaded", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("PIX")).toBeInTheDocument();
      expect(screen.getByText("Cartão de Crédito")).toBeInTheDocument();
      expect(screen.getByText("Transferência Bancária")).toBeInTheDocument();
    });

    // Check payment summary
    expect(screen.getByText("R$ 150,50")).toBeInTheDocument();
    expect(screen.getByText("Pagamento Único")).toBeInTheDocument();
  });

  it("should auto-select default payment method", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("PIX")).toBeInTheDocument();
    });

    // PIX should be selected by default (has is_default: true)
    const pixCard = screen.getByText("PIX").closest("button");
    expect(pixCard).toHaveClass("border-primary");
  });

  it("should allow selecting a different payment method", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Cartão de Crédito")).toBeInTheDocument();
    });

    // Click on credit card method
    const creditCardButton = screen.getByText("Cartão de Crédito").closest("button");
    fireEvent.click(creditCardButton!);

    // Credit card should now be selected
    expect(creditCardButton).toHaveClass("border-primary");
  });

  it("should show PIX-specific instructions when PIX is selected", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("PIX")).toBeInTheDocument();
    });

    // PIX should be selected by default
    expect(screen.getByText("Chave PIX")).toBeInTheDocument();
    expect(screen.getByText("123.456.789-00")).toBeInTheDocument();
    expect(screen.getByText("Copiar")).toBeInTheDocument();
  });

  it("should show payment link instructions when credit card is selected", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Cartão de Crédito")).toBeInTheDocument();
    });

    // Select credit card
    const creditCardButton = screen.getByText("Cartão de Crédito").closest("button");
    fireEvent.click(creditCardButton!);

    // Should show payment link
    expect(screen.getByText("Link de Pagamento")).toBeInTheDocument();
    expect(screen.getByText("https://pagseguro.com/pay/123")).toBeInTheDocument();
    expect(screen.getByText("Abrir")).toBeInTheDocument();
  });

  it("should show bank transfer instructions when bank transfer is selected", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Transferência Bancária")).toBeInTheDocument();
    });

    // Select bank transfer
    const bankTransferButton = screen.getByText("Transferência Bancária").closest("button");
    fireEvent.click(bankTransferButton!);

    // Should show bank details
    expect(screen.getByText("Dados Bancários")).toBeInTheDocument();
    expect(screen.getByText("Banco do Brasil")).toBeInTheDocument();
  });

  it("should call createPayment when confirm button is clicked", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);
    vi.mocked(paymentService.createPayment).mockResolvedValue({ id: "payment-123" });

    renderComponent({ quoteId: "quote-123" });

    await waitFor(() => {
      expect(screen.getByText("PIX")).toBeInTheDocument();
    });

    // Click confirm button
    const confirmButton = screen.getByText("Confirmar Método de Pagamento");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(paymentService.createPayment).toHaveBeenCalledWith({
        user_id: "user-123",
        payment_method_id: "method-1", // Default PIX method
        amount: 150.5,
        currency: "BRL",
        payment_type: "one_time",
        quote_id: "quote-123",
        subscription_id: undefined,
      });
    });
  });

  it("should show validation error when no method is selected", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("PIX")).toBeInTheDocument();
    });

    // Manually deselect all methods (simulate clicking on already selected method)
    const pixButton = screen.getByText("PIX").closest("button");
    fireEvent.click(pixButton!); // Click to select
    fireEvent.click(pixButton!); // Click again to deselect

    // Click confirm button
    const confirmButton = screen.getByText("Confirmar Método de Pagamento");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(toastHook.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Selecione um método",
          description: "Por favor, selecione um método de pagamento.",
          variant: "destructive",
        })
      );
    });
  });

  it("should show loading state during payment creation", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);
    vi.mocked(paymentService.createPayment).mockImplementation(() => new Promise(() => {})); // Never resolves

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("PIX")).toBeInTheDocument();
    });

    // Click confirm button
    const confirmButton = screen.getByText("Confirmar Método de Pagamento");
    fireEvent.click(confirmButton);

    // Should show loading state
    expect(screen.getByText("Criando Pagamento...")).toBeInTheDocument();
  });

  it("should call onSuccess when payment is created successfully", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);
    vi.mocked(paymentService.createPayment).mockResolvedValue({ id: "payment-123" });
    const mockOnSuccess = vi.fn();

    renderComponent({ onSuccess: mockOnSuccess });

    await waitFor(() => {
      expect(screen.getByText("PIX")).toBeInTheDocument();
    });

    // Click confirm button
    const confirmButton = screen.getByText("Confirmar Método de Pagamento");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith("payment-123");
    });
  });

  it("should call onCancel when cancel button is clicked", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);
    const mockOnCancel = vi.fn();

    renderComponent({ onCancel: mockOnCancel });

    await waitFor(() => {
      expect(screen.getByText("PIX")).toBeInTheDocument();
    });

    // Click cancel button
    const cancelButton = screen.getByText("Cancelar");
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("should display quote ID when provided", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);

    renderComponent({ quoteId: "quote-12345" });

    await waitFor(() => {
      expect(screen.getByText("Orçamento")).toBeInTheDocument();
      expect(screen.getByText("quote-12345")).toBeInTheDocument();
    });
  });

  it("should display subscription ID when provided", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);

    renderComponent({ subscriptionId: "sub-12345" });

    await waitFor(() => {
      expect(screen.getByText("Assinatura")).toBeInTheDocument();
      expect(screen.getByText("sub-12345")).toBeInTheDocument();
    });
  });

  it("should display different currency when provided", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);

    renderComponent({ amount: 100, currency: "USD" });

    await waitFor(() => {
      expect(screen.getByText("US$ 100,00")).toBeInTheDocument();
    });
  });

  it("should display recurring payment type", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);

    renderComponent({ paymentType: "recurring" });

    await waitFor(() => {
      expect(screen.getByText("Recorrente")).toBeInTheDocument();
    });
  });
});
