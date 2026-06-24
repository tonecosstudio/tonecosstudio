import { fireEvent, waitFor, screen, renderWithProviders, createTestQueryClient } from "@/test/utils/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as toastHook from "@/hooks/use-toast";
import * as paymentMethodService from "@/lib/payment-method-service";
import * as paymentService from "@/lib/payment-service";
import { PaymentInitiationFlow } from "./PaymentInitiationFlow";

vi.mock("@/lib/payment-method-service", () => ({
  listActivePaymentMethods: vi.fn(),
}));

vi.mock("@/lib/payment-service", () => ({
  createPayment: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: { id: "user-123" },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe("PaymentInitiationFlow", () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  const mockPaymentMethods = [
    {
      id: "method-1",
      name: "PIX",
      type: "pix" as const,
      instructions: "Faca o PIX para a chave abaixo",
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
      name: "Cartao de credito",
      type: "credit_card" as const,
      instructions: "Pagamento via cartao de credito",
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
      name: "Transferencia bancaria",
      type: "bank_transfer" as const,
      instructions: "Faca a transferencia para os dados abaixo",
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

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) =>
    renderWithProviders(<PaymentInitiationFlow amount={150.5} {...props} />, { queryClient });

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
      name: /Confirmar metodo de pagamento/,
    });

    await waitFor(() => {
      expect(confirmButton).toBeEnabled();
    });

    return confirmButton;
  };

  it("renders loading, error and empty states", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockImplementation(
      () => new Promise(() => {})
    );
    const loadingView = renderComponent();
    expect(loadingView.container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    loadingView.unmount();

    queryClient = createTestQueryClient();
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockRejectedValue(new Error("Network error"));
    const errorView = renderComponent();
    expect(await screen.findByText("Erro ao carregar metodos de pagamento")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
    errorView.unmount();

    queryClient = createTestQueryClient();
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue([]);
    renderComponent();
    expect(await screen.findByText("Nenhum metodo de pagamento disponivel")).toBeInTheDocument();
  });

  it("renders methods and auto-selects the default method", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);

    renderComponent();

    expect(await screen.findByText("Iniciar pagamento")).toBeInTheDocument();
    expect(screen.getByText("R$ 150,50")).toBeInTheDocument();
    expect(screen.getByText("Pagamento unico")).toBeInTheDocument();
    expect(screen.getAllByText("PIX").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cartao de credito").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Transferencia bancaria").length).toBeGreaterThan(0);

    const pixCard = screen.getAllByText("PIX")[0].closest("button");
    expect(pixCard).toHaveClass("border-[hsl(42,100%,55%)]");
  });

  it("shows method-specific instructions", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);

    renderComponent();

    expect(await screen.findByText("Chave PIX")).toBeInTheDocument();
    expect(screen.getByText("123.456.789-00")).toBeInTheDocument();

    fireEvent.click(await waitForMethodButton("Cartao de credito"));
    expect(screen.getByText("Link de pagamento")).toBeInTheDocument();
    expect(screen.getByText("https://pagseguro.com/pay/123")).toBeInTheDocument();

    fireEvent.click(await waitForMethodButton("Transferencia bancaria"));
    expect(screen.getByText("Dados bancarios")).toBeInTheDocument();
    expect(screen.getByText("Banco do Brasil")).toBeInTheDocument();
  });

  it("blocks unsafe payment links", async () => {
    const unsafeMethods = mockPaymentMethods.map((method) =>
      method.id === "method-2" ? { ...method, payment_link: "javascript:alert(1)" } : method
    );
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(unsafeMethods);
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    try {
      renderComponent();

      fireEvent.click(await waitForMethodButton("Cartao de credito"));
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

  it("creates a payment and calls onSuccess", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);
    vi.mocked(paymentService.createPayment).mockResolvedValue({ id: "payment-123" });
    const onSuccess = vi.fn();

    renderComponent({ quoteId: "quote-123", onSuccess });

    fireEvent.click(await waitForEnabledConfirmButton());

    await waitFor(() => {
      expect(paymentService.createPayment).toHaveBeenCalledWith({
        payment_method_id: "method-1",
        amount: 150.5,
        currency: "BRL",
        payment_type: "one_time",
        quote_id: "quote-123",
        subscription_id: undefined,
      });
      expect(onSuccess).toHaveBeenCalledWith("payment-123");
    });
  });

  it("shows loading state during payment creation", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);
    vi.mocked(paymentService.createPayment).mockImplementation(() => new Promise(() => {}));

    renderComponent();

    fireEvent.click(await waitForEnabledConfirmButton());

    expect(await screen.findByText("Criando pagamento...")).toBeInTheDocument();
  });

  it("supports cancel, subscription and recurring metadata", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);
    const onCancel = vi.fn();

    renderComponent({ onCancel, subscriptionId: "sub-12345", paymentType: "recurring" });

    expect(await screen.findByText("Assinatura")).toBeInTheDocument();
    expect(screen.getByText("sub-12345")).toBeInTheDocument();
    expect(screen.getByText("Recorrente")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancelar"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("formats alternate currency", async () => {
    vi.mocked(paymentMethodService.listActivePaymentMethods).mockResolvedValue(mockPaymentMethods);

    renderComponent({ amount: 100, currency: "USD" });

    expect(await screen.findByText("US$ 100,00")).toBeInTheDocument();
  });
});
