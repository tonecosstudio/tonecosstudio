/**
 * PaymentInitiationFlow Component Tests
 *
 * Unit tests for the PaymentInitiationFlow component
 *
 * Requirements: 2.1-2.10
 * Task: 16.1 Criar componente PaymentInitiationFlow
 */

import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
  createTestQueryClient,
} from "@/test/utils/test-utils";
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
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
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

    return renderWithProviders(<PaymentInitiationFlow {...defaultProps} />, { queryClient });
  };

  const waitForMethodButton = async (name: string) => {
    await screen.findAllByText(name);
    const button = screen
      .getAllByText(name)
      .map((element) => element.closest("button"))
      .find(Boolean);

    expect(button).toBeTruthy();
    return button as HTMLButtonElement;
  };

  const waitForEnabledConfirmButton = async () => {
    const confirmButton = await screen.findByRole("button", {
      name: /Confirmar Método de Pagamento/,
    });

    await waitFor(() => {
      expect(confirmButton).toBeEnabled();
    });

    return confirmButton;
  };

  it("should render loading state initially", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockImplementation(
      () => new Promise(() => {})
    ); // Never resolves

    const { container } = renderComponent();

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
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
      const pixElements = screen.getAllByText("PIX");
      expect(pixElements.length).toBeGreaterThan(0);
      
      const creditCardElements = screen.getAllByText("Cartão de Crédito");
      expect(creditCardElements.length).toBeGreaterThan(0);
      
      const bankTransferElements = screen.getAllByText("Transferência Bancária");
      expect(bankTransferElements.length).toBeGreaterThan(0);
    });

    // Check payment summary
    expect(screen.getByText("R$ 150,50")).toBeInTheDocument();
    expect(screen.getByText("Pagamento Único")).toBeInTheDocument();
  });

  it("should auto-select default payment method", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);

    renderComponent();

    await waitFor(() => {
      const pixElements = screen.getAllByText("PIX");
      expect(pixElements.length).toBeGreaterThan(0);
    });

    // PIX should be selected by default (has is_default: true)
    const pixElements = screen.getAllByText("PIX");
    const pixCard = pixElements[0].closest("button");
    expect(pixCard).toHaveClass("border-primary");
  });

  it("should allow selecting a different payment method", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);

    renderComponent();

    const creditCardButton = await waitForMethodButton("Cartão de Crédito");
    fireEvent.click(creditCardButton);

    // Credit card should now be selected
    expect(creditCardButton).toHaveClass("border-primary");
  });

  it("should show PIX-specific instructions when PIX is selected", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);

    renderComponent();

    await waitFor(() => {
      const pixElements = screen.getAllByText("PIX");
      expect(pixElements.length).toBeGreaterThan(0);
    });

    // PIX should be selected by default
    expect(screen.getByText("Chave PIX")).toBeInTheDocument();
    expect(screen.getByText("123.456.789-00")).toBeInTheDocument();
    expect(screen.getByText("Copiar")).toBeInTheDocument();
  });

  it("should show payment link instructions when credit card is selected", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);

    renderComponent();

    const creditCardButton = await waitForMethodButton("Cartão de Crédito");
    fireEvent.click(creditCardButton);

    // Should show payment link
    expect(screen.getByText("Link de Pagamento")).toBeInTheDocument();
    expect(screen.getByText("https://pagseguro.com/pay/123")).toBeInTheDocument();
    expect(screen.getByText("Abrir")).toBeInTheDocument();
  });

  it("should block unsafe payment links when opening external payment page", async () => {
    const unsafeMethods = mockPaymentMethods.map((method) =>
      method.id === "method-2" ? { ...method, payment_link: "javascript:alert(1)" } : method
    );
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(unsafeMethods);
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    try {
      renderComponent();

      const creditCardButton = await waitForMethodButton("Cartão de Crédito");
      fireEvent.click(creditCardButton);
      fireEvent.click(screen.getByRole("button", { name: "Abrir" }));

      expect(openSpy).not.toHaveBeenCalled();
      expect(toastHook.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Link de pagamento invalido",
          variant: "destructive",
        })
      );
    } finally {
      openSpy.mockRestore();
    }
  });

  it("should show bank transfer instructions when bank transfer is selected", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);

    renderComponent();

    const bankTransferButton = await waitForMethodButton("Transferência Bancária");
    fireEvent.click(bankTransferButton);

    // Should show bank details
    await waitFor(() => {
      expect(screen.getByText("Dados Bancários")).toBeInTheDocument();
      expect(screen.getByText("Banco")).toBeInTheDocument();
      expect(screen.getByText("Banco do Brasil")).toBeInTheDocument();
    });
  });

  it("should call createPayment when confirm button is clicked", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);
    vi.mocked(paymentService.createPayment).mockResolvedValue({ id: "payment-123" });

    renderComponent({ quoteId: "quote-123" });

    const confirmButton = await waitForEnabledConfirmButton();
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(paymentService.createPayment).toHaveBeenCalledWith({
        payment_method_id: "method-1", // Default PIX method
        amount: 150.5,
        currency: "BRL",
        payment_type: "one_time",
        quote_id: "quote-123",
        subscription_id: undefined,
      });
    });
  });

  it("should keep payment creation unavailable while methods are loading", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockImplementation(
      () => new Promise(() => {})
    );

    renderComponent();

    expect(screen.queryByRole("button", { name: /Confirmar Método de Pagamento/ })).toBeNull();
    expect(paymentService.createPayment).not.toHaveBeenCalled();
  });

  it("should show loading state during payment creation", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);
    vi.mocked(paymentService.createPayment).mockImplementation(() => new Promise(() => {})); // Never resolves

    renderComponent();

    const confirmButton = await waitForEnabledConfirmButton();
    fireEvent.click(confirmButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText("Criando Pagamento...")).toBeInTheDocument();
    });
  });

  it("should call onSuccess when payment is created successfully", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);
    vi.mocked(paymentService.createPayment).mockResolvedValue({ id: "payment-123" });
    const mockOnSuccess = vi.fn();

    renderComponent({ onSuccess: mockOnSuccess });

    const confirmButton = await waitForEnabledConfirmButton();
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
      const pixElements = screen.getAllByText("PIX");
      expect(pixElements.length).toBeGreaterThan(0);
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
