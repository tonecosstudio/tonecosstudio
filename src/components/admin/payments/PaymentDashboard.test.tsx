/**
 * PaymentDashboard Component Tests
 *
 * Unit tests for the PaymentDashboard component.
 *
 * Requirements: 5.1-5.10
 * Task: 12.1 Criar componente PaymentDashboard
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PaymentDashboard } from "./PaymentDashboard";
import { getPaymentStats, listPendingPayments } from "@/lib/admin-payment-service";
import { listAllPaymentMethods } from "@/lib/payment-method-service";

// Mock the services
vi.mock("@/lib/admin-payment-service", () => ({
  listPendingPayments: vi.fn(),
  getPaymentStats: vi.fn(),
}));

vi.mock("@/lib/payment-method-service", () => ({
  listAllPaymentMethods: vi.fn(),
}));

vi.mock("@/hooks/usePaymentRealtimeDashboard", () => ({
  useAdminDashboardRealtime: () => ({
    isConnected: true,
    isReconnecting: false,
    hasNewUpdates: false,
    newUpdateCount: 0,
    resetUpdateCount: vi.fn(),
    hasError: false,
    error: null,
    refreshData: vi.fn(),
  }),
}));

const mockPayments = [
  {
    id: "1",
    reference_number: "PAY-20240101-0001",
    customer_name: "João Silva",
    customer_email: "joao@example.com",
    amount: 150.5,
    currency: "BRL",
    payment_method_name: "PIX",
    status: "pending" as const,
    created_at: "2024-01-01T10:00:00Z",
    file_count: 0,
    unread_messages: 0,
  },
  {
    id: "2",
    reference_number: "PAY-20240101-0002",
    customer_name: "Maria Santos",
    customer_email: "maria@example.com",
    amount: 299.99,
    currency: "BRL",
    payment_method_name: "Cartão",
    status: "under_review" as const,
    created_at: "2024-01-01T11:00:00Z",
    file_count: 2,
    unread_messages: 1,
  },
];

const mockStats = {
  pending_count: 5,
  under_review_count: 3,
  requires_info_count: 2,
  total_pending_amount: 1250.75,
  avg_processing_time_hours: 24,
};

const mockPaymentMethods = [
  { id: "1", name: "PIX", is_active: true },
  { id: "2", name: "Cartão", is_active: true },
  { id: "3", name: "Boleto", is_active: false },
];

describe("PaymentDashboard", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Reset mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    vi.mocked(listPendingPayments).mockResolvedValue(mockPayments);
    vi.mocked(getPaymentStats).mockResolvedValue(mockStats);
    vi.mocked(listAllPaymentMethods).mockResolvedValue(mockPaymentMethods);
  });

  const renderPaymentDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <PaymentDashboard />
      </QueryClientProvider>
    );
  };

  const expectTextPresent = (text: string) => {
    expect(screen.getAllByText(text).length).toBeGreaterThan(0);
  };

  it("should render the dashboard with title and stats", async () => {
    renderPaymentDashboard();

    // Check title
    expect(screen.getByText("Dashboard de Pagamentos")).toBeInTheDocument();
    expect(
      screen.getByText("Gerencie pagamentos manuais pendentes de verificação")
    ).toBeInTheDocument();

    // Wait for stats to load
    await waitFor(() => {
      expectTextPresent("5"); // pending_count
      expectTextPresent("3"); // under_review_count
      expectTextPresent("2"); // requires_info_count
    });

    // Check stat cards
    expectTextPresent("Pendentes");
    expectTextPresent("Em Revisão");
    expectTextPresent("Precisa de Info");
    expectTextPresent("Valor Total");
  });

  it("should render payment table with data", async () => {
    renderPaymentDashboard();

    // Wait for data to load
    await waitFor(() => {
      expectTextPresent("PAY-20240101-0001");
      expectTextPresent("PAY-20240101-0002");
    });

    // Check table headers
    expectTextPresent("Referência");
    expectTextPresent("Cliente");
    expectTextPresent("Valor");
    expectTextPresent("Método");
    expectTextPresent("Status");
    expectTextPresent("Data");
    expectTextPresent("Ações");

    // Check payment data
    expectTextPresent("João Silva");
    expectTextPresent("Maria Santos");
    expectTextPresent("PIX");
    expectTextPresent("Cartão");
    expectTextPresent("Pendente");
    expectTextPresent("Em Revisão");
  });

  it("should show loading state", async () => {
    let resolvePayments!: (payments: typeof mockPayments) => void;
    vi.mocked(listPendingPayments).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePayments = resolve;
        })
    );

    const { container } = renderPaymentDashboard();

    // Should show loading skeletons
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);

    await act(async () => {
      resolvePayments(mockPayments);
    });
    await waitFor(() => {
      expectTextPresent("PAY-20240101-0001");
    });
  });

  it("should show error state", async () => {
    vi.mocked(listPendingPayments).mockRejectedValue(new Error("Network error"));

    renderPaymentDashboard();

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText("Erro ao carregar pagamentos")).toBeInTheDocument();
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    // Check retry button
    expect(screen.getByText("Tentar novamente")).toBeInTheDocument();
  });

  it("should handle empty state", async () => {
    vi.mocked(listPendingPayments).mockResolvedValue([]);

    renderPaymentDashboard();

    // Wait for empty state
    await waitFor(() => {
      expect(
        screen.getByText("Nenhum pagamento encontrado com os filtros atuais.")
      ).toBeInTheDocument();
    });
  });

  it("should call onViewPayment when view button is clicked", async () => {
    const handleViewPayment = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentDashboard onViewPayment={handleViewPayment} />
      </QueryClientProvider>
    );

    // Wait for data to load
    await waitFor(() => {
      expectTextPresent("PAY-20240101-0001");
    });

    // Find and click view button
    const viewButtons = screen.getAllByRole("button", {
      name: /ver pagamento PAY-20240101-0001/i,
    });
    fireEvent.click(viewButtons[0]);

    expect(handleViewPayment).toHaveBeenCalledWith("1");
  });

  it("should apply search filter", async () => {
    renderPaymentDashboard();

    // Wait for data to load
    await waitFor(() => {
      expectTextPresent("PAY-20240101-0001");
    });

    // Find search input
    const searchInput = screen.getByPlaceholderText("Número ou cliente...");
    expect(searchInput).toBeInTheDocument();

    // Type in search
    fireEvent.change(searchInput, { target: { value: "João" } });

    // Wait for debounce
    await waitFor(() => {
      expect(listPendingPayments).toHaveBeenCalledWith(expect.objectContaining({ search: "João" }));
    });
  });

  it("should clear filters when clear button is clicked", async () => {
    renderPaymentDashboard();

    // Wait for data to load
    await waitFor(() => {
      expectTextPresent("PAY-20240101-0001");
    });

    // Find clear filters button
    const clearButton = screen.getAllByText("Limpar Filtros")[0];
    expect(clearButton).toBeInTheDocument();

    // Click clear button
    fireEvent.click(clearButton);

    // The component should refetch with empty filters
    await waitFor(() => {
      expect(listPendingPayments).toHaveBeenCalledWith({});
    });
  });
});
