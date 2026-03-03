import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProductionMetricsBar } from "./ProductionMetricsBar";
import * as productionService from "@/services/admin/production-service";

// Mock the production service
vi.mock("@/services/admin/production-service", () => ({
  fetchProductionMetrics: vi.fn(),
}));

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

describe("ProductionMetricsBar", () => {
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

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ProductionMetricsBar />
      </QueryClientProvider>
    );
  };

  it("should render loading state initially", () => {
    vi.mocked(productionService.fetchProductionMetrics).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderComponent();
    expect(screen.getByText("Carregando métricas...")).toBeInTheDocument();
  });

  it("should render error state when fetch fails", async () => {
    vi.mocked(productionService.fetchProductionMetrics).mockRejectedValue(
      new Error("Failed to fetch")
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Erro ao carregar métricas/)).toBeInTheDocument();
    });
  });

  it("should render metrics when data is loaded", async () => {
    const mockMetrics = {
      stages: {
        awaiting_choice: 5,
        design: 3,
        production: 10,
        quality_check: 2,
        packaging: 4,
        shipped: 8,
      },
      statuses: {
        awaiting_choice: 5,
        ready_for_production: 3,
        in_production: 16,
        completed: 8,
        on_hold: 0,
        cancelled: 0,
      },
      priorities: {
        critical: 2,
        high: 10,
        normal: 15,
        low: 5,
      },
      choices: {
        pending: 5,
        submitted: 2,
        approved: 20,
        rejected: 1,
        locked: 4,
      },
      urgent: {
        deadlineCritical: 2,
        deadlineUrgent: 5,
        blocked: 0,
        overdue: 1,
      },
      scheduled: {
        today: 8,
        thisWeek: 25,
        thisMonth: 50,
      },
      avgStageDurations: {
        design: 24.5,
        production: 48.2,
        quality_check: 12.3,
      },
      overall: {
        totalItems: 32,
        avgProductionTimeHours: 120.5,
        completionRate: 0.75,
        avgPriorityScore: 65.3,
      },
      generatedAt: new Date().toISOString(),
    };

    vi.mocked(productionService.fetchProductionMetrics).mockResolvedValue(mockMetrics);

    renderComponent();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText("Itens por Estágio")).toBeInTheDocument();
    });

    // Check stage counts
    expect(screen.getByText("Aguardando Escolha")).toBeInTheDocument();
    expect(screen.getAllByText("Design").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Produção").length).toBeGreaterThan(0);

    // Check scheduled items
    expect(screen.getByText("Itens Agendados")).toBeInTheDocument();
    expect(screen.getByText("Hoje")).toBeInTheDocument();
    expect(screen.getByText("Esta Semana")).toBeInTheDocument();

    // Check overall metrics
    expect(screen.getByText("Métricas Gerais")).toBeInTheDocument();
    expect(screen.getByText("Total de Itens")).toBeInTheDocument();
    expect(screen.getByText("32")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument(); // Completion rate
  });

  it("should display average stage durations", async () => {
    const mockMetrics = {
      stages: {
        awaiting_choice: 0,
        design: 0,
        production: 0,
        quality_check: 0,
        packaging: 0,
        shipped: 0,
      },
      statuses: {
        awaiting_choice: 0,
        ready_for_production: 0,
        in_production: 0,
        completed: 0,
        on_hold: 0,
        cancelled: 0,
      },
      priorities: {
        critical: 0,
        high: 0,
        normal: 0,
        low: 0,
      },
      choices: {
        pending: 0,
        submitted: 0,
        approved: 0,
        rejected: 0,
        locked: 0,
      },
      urgent: {
        deadlineCritical: 0,
        deadlineUrgent: 0,
        blocked: 0,
        overdue: 0,
      },
      scheduled: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
      },
      avgStageDurations: {
        design: 24.5,
        production: 48.2,
      },
      overall: {
        totalItems: 0,
        avgProductionTimeHours: 0,
        completionRate: 0,
        avgPriorityScore: 0,
      },
      generatedAt: new Date().toISOString(),
    };

    vi.mocked(productionService.fetchProductionMetrics).mockResolvedValue(mockMetrics);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Tempo Médio por Estágio")).toBeInTheDocument();
    });

    // Check that durations are displayed
    expect(screen.getByText("24.5h")).toBeInTheDocument();
    expect(screen.getByText("48.2h")).toBeInTheDocument();
  });

  it("should show message when no stage duration data is available", async () => {
    const mockMetrics = {
      stages: {
        awaiting_choice: 0,
        design: 0,
        production: 0,
        quality_check: 0,
        packaging: 0,
        shipped: 0,
      },
      statuses: {
        awaiting_choice: 0,
        ready_for_production: 0,
        in_production: 0,
        completed: 0,
        on_hold: 0,
        cancelled: 0,
      },
      priorities: {
        critical: 0,
        high: 0,
        normal: 0,
        low: 0,
      },
      choices: {
        pending: 0,
        submitted: 0,
        approved: 0,
        rejected: 0,
        locked: 0,
      },
      urgent: {
        deadlineCritical: 0,
        deadlineUrgent: 0,
        blocked: 0,
        overdue: 0,
      },
      scheduled: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
      },
      avgStageDurations: {},
      overall: {
        totalItems: 0,
        avgProductionTimeHours: 0,
        completionRate: 0,
        avgPriorityScore: 0,
      },
      generatedAt: new Date().toISOString(),
    };

    vi.mocked(productionService.fetchProductionMetrics).mockResolvedValue(mockMetrics);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Sem dados suficientes")).toBeInTheDocument();
    });
  });
});
