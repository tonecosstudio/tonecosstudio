import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProductionMetricsBar } from "./ProductionMetricsBar";

const productionMetricsService = vi.hoisted(() => ({
  fetchProductionMetrics: vi.fn(),
  subscribeToProductionMetricsChanges: vi.fn(() => vi.fn()),
}));

vi.mock("@/services/admin/production/production-metrics-service", () => ({
  fetchProductionMetrics: productionMetricsService.fetchProductionMetrics,
  subscribeToProductionMetricsChanges: productionMetricsService.subscribeToProductionMetricsChanges,
}));

describe("ProductionMetricsBar", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ProductionMetricsBar />
      </QueryClientProvider>,
    );

  it("renders loading state initially", () => {
    vi.mocked(productionMetricsService.fetchProductionMetrics).mockImplementation(
      () => new Promise(() => {}),
    );

    renderComponent();
    expect(screen.getByText("Carregando métricas...")).toBeInTheDocument();
  });

  it("renders error state when measured metrics fail", async () => {
    vi.mocked(productionMetricsService.fetchProductionMetrics).mockRejectedValue(
      new Error("Failed to fetch"),
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Erro ao carregar métricas/)).toBeInTheDocument();
    });
  });

  it("renders measured metrics without multiplying completion rate again", async () => {
    productionMetricsService.fetchProductionMetrics.mockResolvedValue({
      stages: {
        awaiting_payment: 0,
        payment_confirmed: 0,
        awaiting_choice: 5,
        model_preparation: 3,
        printing: 10,
        post_processing: 0,
        painting: 0,
        quality_check: 2,
        packaging: 4,
        ready_to_ship: 0,
        shipped: 8,
        delivered: 0,
      },
      statuses: {
        awaiting_choice: 5,
        ready_for_production: 3,
        in_production: 16,
        completed: 8,
        on_hold: 0,
        cancelled: 0,
      },
      priorities: { critical: 2, high: 10, normal: 15, low: 5 },
      choices: {
        pending: 5,
        submitted: 2,
        approved: 20,
        rejected: 1,
        locked: 4,
        expired: 0,
      },
      urgent: { deadlineCritical: 2, deadlineUrgent: 5, blocked: 0, overdue: 1 },
      scheduled: { today: 8, thisWeek: 25, thisMonth: 50 },
      avgStageDurations: {
        model_preparation: 24.5,
        printing: 48.2,
        quality_check: 12.3,
      },
      overall: {
        totalItems: 32,
        avgProductionTimeHours: 120.5,
        completionRate: 25,
        avgPriorityScore: 65.3,
      },
      generatedAt: new Date().toISOString(),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Itens por Estágio")).toBeInTheDocument();
    });

    expect(screen.getByText("Aguardando Escolha")).toBeInTheDocument();
    expect(screen.getAllByText("Preparação do Modelo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Em Impressão 3D").length).toBeGreaterThan(0);
    expect(screen.getByText("Itens Agendados")).toBeInTheDocument();
    expect(screen.getByText("32")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("displays measured average stage durations", async () => {
    productionMetricsService.fetchProductionMetrics.mockResolvedValue({
      stages: {
        awaiting_payment: 0,
        payment_confirmed: 0,
        awaiting_choice: 0,
        model_preparation: 0,
        printing: 0,
        post_processing: 0,
        painting: 0,
        quality_check: 0,
        packaging: 0,
        ready_to_ship: 0,
        shipped: 0,
        delivered: 0,
      },
      statuses: {
        awaiting_choice: 0,
        ready_for_production: 0,
        in_production: 0,
        completed: 0,
        on_hold: 0,
        cancelled: 0,
      },
      priorities: { critical: 0, high: 0, normal: 0, low: 0 },
      choices: {
        pending: 0,
        submitted: 0,
        approved: 0,
        rejected: 0,
        locked: 0,
        expired: 0,
      },
      urgent: { deadlineCritical: 0, deadlineUrgent: 0, blocked: 0, overdue: 0 },
      scheduled: { today: 0, thisWeek: 0, thisMonth: 0 },
      avgStageDurations: { model_preparation: 24.5, printing: 48.2 },
      overall: {
        totalItems: 0,
        avgProductionTimeHours: null,
        completionRate: 0,
        avgPriorityScore: null,
      },
      generatedAt: new Date().toISOString(),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Tempo Médio por Estágio")).toBeInTheDocument();
    });

    expect(screen.getByText("24.5h")).toBeInTheDocument();
    expect(screen.getByText("48.2h")).toBeInTheDocument();
    expect(screen.getByText("Indisponível")).toBeInTheDocument();
  });

  it("shows an explicit message when no measured stage duration exists", async () => {
    productionMetricsService.fetchProductionMetrics.mockResolvedValue({
      stages: {
        awaiting_payment: 0,
        payment_confirmed: 0,
        awaiting_choice: 0,
        model_preparation: 0,
        printing: 0,
        post_processing: 0,
        painting: 0,
        quality_check: 0,
        packaging: 0,
        ready_to_ship: 0,
        shipped: 0,
        delivered: 0,
      },
      statuses: {
        awaiting_choice: 0,
        ready_for_production: 0,
        in_production: 0,
        completed: 0,
        on_hold: 0,
        cancelled: 0,
      },
      priorities: { critical: 0, high: 0, normal: 0, low: 0 },
      choices: {
        pending: 0,
        submitted: 0,
        approved: 0,
        rejected: 0,
        locked: 0,
        expired: 0,
      },
      urgent: { deadlineCritical: 0, deadlineUrgent: 0, blocked: 0, overdue: 0 },
      scheduled: { today: 0, thisWeek: 0, thisMonth: 0 },
      avgStageDurations: {},
      overall: {
        totalItems: 0,
        avgProductionTimeHours: null,
        completionRate: 0,
        avgPriorityScore: null,
      },
      generatedAt: new Date().toISOString(),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Sem dados medidos suficientes")).toBeInTheDocument();
    });
  });
});
