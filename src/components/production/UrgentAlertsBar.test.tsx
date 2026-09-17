import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UrgentAlertsBar } from "./UrgentAlertsBar";

const productionMetricsService = vi.hoisted(() => ({
  fetchProductionMetrics: vi.fn(),
  subscribeToProductionMetricsChanges: vi.fn(() => vi.fn()),
}));

vi.mock("@/services/admin/production/production-metrics-service", () => ({
  fetchProductionMetrics: productionMetricsService.fetchProductionMetrics,
  subscribeToProductionMetricsChanges:
    productionMetricsService.subscribeToProductionMetricsChanges,
}));

describe("UrgentAlertsBar", () => {
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
    return render(
      <QueryClientProvider client={queryClient}>
        <UrgentAlertsBar {...props} />
      </QueryClientProvider>
    );
  };

  const mockMetrics = {
    stages: {},
    statuses: {},
    priorities: {},
    choices: {},
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

  it("renders loading state initially", () => {
    vi.mocked(productionMetricsService.fetchProductionMetrics).mockImplementation(
      () => new Promise(() => {})
    );

    renderComponent();
    expect(screen.getByText("Carregando alertas...")).toBeInTheDocument();
  });

  it("renders error state when fetch fails", async () => {
    vi.mocked(productionMetricsService.fetchProductionMetrics).mockRejectedValue(
      new Error("Failed to fetch")
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Erro ao carregar alertas/)).toBeInTheDocument();
    });
  });

  it("renders no alerts message when all urgent counts are zero", async () => {
    vi.mocked(productionMetricsService.fetchProductionMetrics).mockResolvedValue(mockMetrics);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("✓ Nenhum alerta urgente no momento")).toBeInTheDocument();
    });
  });

  it("renders critical deadline alert (red badge) when deadlineCritical > 0", async () => {
    const metricsWithCritical = {
      ...mockMetrics,
      urgent: {
        ...mockMetrics.urgent,
        deadlineCritical: 5,
      },
    };

    vi.mocked(productionMetricsService.fetchProductionMetrics).mockResolvedValue(metricsWithCritical);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Prazo < 24h")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });

  it("renders urgent deadline alert (yellow badge) when deadlineUrgent > 0", async () => {
    const metricsWithUrgent = {
      ...mockMetrics,
      urgent: {
        ...mockMetrics.urgent,
        deadlineUrgent: 3,
      },
    };

    vi.mocked(productionMetricsService.fetchProductionMetrics).mockResolvedValue(metricsWithUrgent);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Escolhas Pendentes")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  it("renders blocked items alert (blue badge) when blocked > 0", async () => {
    const metricsWithBlocked = {
      ...mockMetrics,
      urgent: {
        ...mockMetrics.urgent,
        blocked: 2,
      },
    };

    vi.mocked(productionMetricsService.fetchProductionMetrics).mockResolvedValue(metricsWithBlocked);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Itens Bloqueados")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  it("renders overdue items alert (orange badge) when overdue > 0", async () => {
    const metricsWithOverdue = {
      ...mockMetrics,
      urgent: {
        ...mockMetrics.urgent,
        overdue: 7,
      },
    };

    vi.mocked(productionMetricsService.fetchProductionMetrics).mockResolvedValue(metricsWithOverdue);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Tempo Excedido")).toBeInTheDocument();
      expect(screen.getByText("7")).toBeInTheDocument();
    });
  });

  it("renders all alert types when all have values", async () => {
    const metricsWithAllAlerts = {
      ...mockMetrics,
      urgent: {
        deadlineCritical: 5,
        deadlineUrgent: 3,
        blocked: 2,
        overdue: 7,
      },
    };

    vi.mocked(productionMetricsService.fetchProductionMetrics).mockResolvedValue(metricsWithAllAlerts);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Prazo < 24h")).toBeInTheDocument();
      expect(screen.getByText("Escolhas Pendentes")).toBeInTheDocument();
      expect(screen.getByText("Itens Bloqueados")).toBeInTheDocument();
      expect(screen.getByText("Tempo Excedido")).toBeInTheDocument();
    });
  });

  it("calls onAlertClick with correct alert type when critical deadline alert is clicked", async () => {
    const onAlertClick = vi.fn();
    const metricsWithCritical = {
      ...mockMetrics,
      urgent: {
        ...mockMetrics.urgent,
        deadlineCritical: 5,
      },
    };

    vi.mocked(productionMetricsService.fetchProductionMetrics).mockResolvedValue(metricsWithCritical);

    renderComponent({ onAlertClick });

    await waitFor(() => {
      expect(screen.getByText("Prazo < 24h")).toBeInTheDocument();
    });

    const alertButton = screen.getByText("Prazo < 24h").closest("button");
    if (alertButton) {
      await userEvent.click(alertButton);
    }

    expect(onAlertClick).toHaveBeenCalledWith("deadline_critical");
  });

  it("calls onAlertClick with correct alert type when urgent deadline alert is clicked", async () => {
    const onAlertClick = vi.fn();
    const metricsWithUrgent = {
      ...mockMetrics,
      urgent: {
        ...mockMetrics.urgent,
        deadlineUrgent: 3,
      },
    };

    vi.mocked(productionMetricsService.fetchProductionMetrics).mockResolvedValue(metricsWithUrgent);

    renderComponent({ onAlertClick });

    await waitFor(() => {
      expect(screen.getByText("Escolhas Pendentes")).toBeInTheDocument();
    });

    const alertButton = screen.getByText("Escolhas Pendentes").closest("button");
    if (alertButton) {
      await userEvent.click(alertButton);
    }

    expect(onAlertClick).toHaveBeenCalledWith("deadline_urgent");
  });

  it("calls onAlertClick with correct alert type when blocked alert is clicked", async () => {
    const onAlertClick = vi.fn();
    const metricsWithBlocked = {
      ...mockMetrics,
      urgent: {
        ...mockMetrics.urgent,
        blocked: 2,
      },
    };

    vi.mocked(productionMetricsService.fetchProductionMetrics).mockResolvedValue(metricsWithBlocked);

    renderComponent({ onAlertClick });

    await waitFor(() => {
      expect(screen.getByText("Itens Bloqueados")).toBeInTheDocument();
    });

    const alertButton = screen.getByText("Itens Bloqueados").closest("button");
    if (alertButton) {
      await userEvent.click(alertButton);
    }

    expect(onAlertClick).toHaveBeenCalledWith("blocked");
  });

  it("calls onAlertClick with correct alert type when overdue alert is clicked", async () => {
    const onAlertClick = vi.fn();
    const metricsWithOverdue = {
      ...mockMetrics,
      urgent: {
        ...mockMetrics.urgent,
        overdue: 7,
      },
    };

    vi.mocked(productionMetricsService.fetchProductionMetrics).mockResolvedValue(metricsWithOverdue);

    renderComponent({ onAlertClick });

    await waitFor(() => {
      expect(screen.getByText("Tempo Excedido")).toBeInTheDocument();
    });

    const alertButton = screen.getByText("Tempo Excedido").closest("button");
    if (alertButton) {
      await userEvent.click(alertButton);
    }

    expect(onAlertClick).toHaveBeenCalledWith("overdue");
  });

  it("does not call onAlertClick when callback is not provided", async () => {
    const metricsWithCritical = {
      ...mockMetrics,
      urgent: {
        ...mockMetrics.urgent,
        deadlineCritical: 5,
      },
    };

    vi.mocked(productionMetricsService.fetchProductionMetrics).mockResolvedValue(metricsWithCritical);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Prazo < 24h")).toBeInTheDocument();
    });

    const alertButton = screen.getByText("Prazo < 24h").closest("button");
    if (alertButton) {
      await userEvent.click(alertButton);
    }
  });
});
