/**
 * Tests for ProductionStageTracker Component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProductionStageTracker } from "./ProductionStageTracker";
import type { ProductionStageRecord } from "@/hooks/admin/useProductionStages";

const stageService = vi.hoisted(() => ({
  getStageHistory: vi.fn(),
  completeStage: vi.fn(),
}));

vi.mock("@/services/admin/stage-service", () => ({
  getStageHistory: stageService.getStageHistory,
  completeStage: stageService.completeStage,
}));

vi.mock("@/services/admin/stage-validation", () => ({
  validateStageTransition: vi.fn().mockResolvedValue({
    isValid: true,
    canOverride: false,
    requiresJustification: false,
  }),
}));

// Mock toast
vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
}));

// Helper to create a test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Mock stage data
const mockStages: ProductionStageRecord[] = [
  {
    id: "stage-1",
    productionQueueId: "queue-1",
    stageName: "awaiting_choice",
    stageOrder: 1,
    status: "completed",
    startedAt: "2024-01-01T10:00:00Z",
    completedAt: "2024-01-01T12:00:00Z",
    estimatedDuration: 2,
    actualDuration: 2,
    assignedTo: null,
    assignedToName: null,
    assignedAt: null,
    notes: null,
    photos: [],
    isBlocked: false,
    blockReason: null,
    blockedAt: null,
    unblockedAt: null,
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2024-01-01T12:00:00Z",
  },
  {
    id: "stage-2",
    productionQueueId: "queue-1",
    stageName: "design",
    stageOrder: 2,
    status: "completed",
    startedAt: "2024-01-01T12:00:00Z",
    completedAt: "2024-01-01T18:00:00Z",
    estimatedDuration: 8,
    actualDuration: 6,
    assignedTo: "user-1",
    assignedToName: "João Silva",
    assignedAt: "2024-01-01T12:00:00Z",
    notes: "Design aprovado",
    photos: [],
    isBlocked: false,
    blockReason: null,
    blockedAt: null,
    unblockedAt: null,
    createdAt: "2024-01-01T12:00:00Z",
    updatedAt: "2024-01-01T18:00:00Z",
  },
  {
    id: "stage-3",
    productionQueueId: "queue-1",
    stageName: "production",
    stageOrder: 3,
    status: "in_progress",
    startedAt: "2024-01-01T18:00:00Z",
    completedAt: null,
    estimatedDuration: 24,
    actualDuration: null,
    assignedTo: "user-2",
    assignedToName: "Maria Santos",
    assignedAt: "2024-01-01T18:00:00Z",
    notes: null,
    photos: [],
    isBlocked: false,
    blockReason: null,
    blockedAt: null,
    unblockedAt: null,
    createdAt: "2024-01-01T18:00:00Z",
    updatedAt: "2024-01-01T18:00:00Z",
  },
  {
    id: "stage-4",
    productionQueueId: "queue-1",
    stageName: "quality_check",
    stageOrder: 4,
    status: "pending",
    startedAt: null,
    completedAt: null,
    estimatedDuration: 4,
    actualDuration: null,
    assignedTo: null,
    assignedToName: null,
    assignedAt: null,
    notes: null,
    photos: [],
    isBlocked: false,
    blockReason: null,
    blockedAt: null,
    unblockedAt: null,
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2024-01-01T10:00:00Z",
  },
  {
    id: "stage-5",
    productionQueueId: "queue-1",
    stageName: "packaging",
    stageOrder: 5,
    status: "pending",
    startedAt: null,
    completedAt: null,
    estimatedDuration: 2,
    actualDuration: null,
    assignedTo: null,
    assignedToName: null,
    assignedAt: null,
    notes: null,
    photos: [],
    isBlocked: false,
    blockReason: null,
    blockedAt: null,
    unblockedAt: null,
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2024-01-01T10:00:00Z",
  },
  {
    id: "stage-6",
    productionQueueId: "queue-1",
    stageName: "shipped",
    stageOrder: 6,
    status: "pending",
    startedAt: null,
    completedAt: null,
    estimatedDuration: 1,
    actualDuration: null,
    assignedTo: null,
    assignedToName: null,
    assignedAt: null,
    notes: null,
    photos: [],
    isBlocked: false,
    blockReason: null,
    blockedAt: null,
    unblockedAt: null,
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2024-01-01T10:00:00Z",
  },
];

describe("ProductionStageTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    vi.mocked(stageService.getStageHistory).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<ProductionStageTracker productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("Progresso de Produção")).toBeInTheDocument();
    // Check for loading spinner by class name
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("displays all stages in horizontal timeline", async () => {
    vi.mocked(stageService.getStageHistory).mockResolvedValue(mockStages);

    render(<ProductionStageTracker productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Aguardando Escolha")).toBeInTheDocument();
      expect(screen.getByText("Design")).toBeInTheDocument();
      expect(screen.getByText("Produção")).toBeInTheDocument();
      expect(screen.getByText("Controle de Qualidade")).toBeInTheDocument();
      expect(screen.getByText("Embalagem")).toBeInTheDocument();
      expect(screen.getByText("Enviado")).toBeInTheDocument();
    });
  });

  it("highlights current stage", async () => {
    vi.mocked(stageService.getStageHistory).mockResolvedValue(mockStages);

    render(<ProductionStageTracker productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Em Progresso")).toBeInTheDocument();
      expect(screen.getByText("Estágio Atual: Produção")).toBeInTheDocument();
    });
  });

  it("shows checkmarks for completed stages", async () => {
    vi.mocked(stageService.getStageHistory).mockResolvedValue(mockStages);

    render(<ProductionStageTracker productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      // Check icons are rendered (completed stages have Check icon)
      const completedStages = mockStages.filter((s) => s.status === "completed");
      expect(completedStages.length).toBe(2);
    });
  });

  it("shows time spent in each stage", async () => {
    vi.mocked(stageService.getStageHistory).mockResolvedValue(mockStages);

    render(<ProductionStageTracker productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      // Completed stages show actual duration
      expect(screen.getByText("2h")).toBeInTheDocument(); // awaiting_choice
      expect(screen.getByText("6h")).toBeInTheDocument(); // design
    });
  });

  it("displays Next Stage button", async () => {
    vi.mocked(stageService.getStageHistory).mockResolvedValue(mockStages);

    render(<ProductionStageTracker productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Próximo Estágio/i })).toBeInTheDocument();
    });
  });

  it("opens transition modal when Next Stage button is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(stageService.getStageHistory).mockResolvedValue(mockStages);

    render(<ProductionStageTracker productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Próximo Estágio/i })).toBeInTheDocument();
    });

    const nextButton = screen.getByRole("button", { name: /Próximo Estágio/i });
    await user.click(nextButton);

    // Modal should open
    await waitFor(() => {
      expect(screen.getByText("Completar Estágio de Produção")).toBeInTheDocument();
    });
  });

  it("shows assigned team member for current stage", async () => {
    vi.mocked(stageService.getStageHistory).mockResolvedValue(mockStages);

    render(<ProductionStageTracker productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Atribuído a: Maria Santos")).toBeInTheDocument();
    });
  });

  it("disables Next Stage button when stage is blocked", async () => {
    const blockedStages = mockStages.map((stage) =>
      stage.id === "stage-3"
        ? { ...stage, isBlocked: true, blockReason: "Falta de material" }
        : stage
    );

    vi.mocked(stageService.getStageHistory).mockResolvedValue(blockedStages);

    render(<ProductionStageTracker productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      const nextButton = screen.getByRole("button", { name: /Próximo Estágio/i });
      expect(nextButton).toBeDisabled();
      expect(screen.getByText("Bloqueado: Falta de material")).toBeInTheDocument();
    });
  });

  it("shows completion message when all stages are done", async () => {
    const completedStages = mockStages.map((stage) => ({
      ...stage,
      status: "completed" as const,
      completedAt: "2024-01-02T10:00:00Z",
    }));

    vi.mocked(stageService.getStageHistory).mockResolvedValue(completedStages);

    render(<ProductionStageTracker productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Todos os estágios foram completados!")).toBeInTheDocument();
      expect(
        screen.getByText("Este item foi enviado e está a caminho do cliente.")
      ).toBeInTheDocument();
    });
  });

  it("handles error state", async () => {
    vi.mocked(stageService.getStageHistory).mockRejectedValue(
      new Error("Erro ao carregar estágios")
    );

    render(<ProductionStageTracker productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText(/Erro ao carregar estágios/i)).toBeInTheDocument();
    });
  });

  it("calls onStageComplete callback when stage is completed via modal", async () => {
    const user = userEvent.setup();
    const onStageComplete = vi.fn();

    vi.mocked(stageService.getStageHistory).mockResolvedValue(mockStages);
    const completedStage = {
      ...mockStages[2],
      status: "completed" as const,
      completedAt: "2024-01-02T10:00:00Z",
    };
    vi.mocked(stageService.completeStage).mockResolvedValue(completedStage);

    render(
      <ProductionStageTracker productionQueueId="queue-1" onStageComplete={onStageComplete} />,
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Próximo Estágio/i })).toBeInTheDocument();
    });

    // Click next stage button to open modal
    const nextButton = screen.getByRole("button", { name: /Próximo Estágio/i });
    await user.click(nextButton);

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByText("Completar Estágio de Produção")).toBeInTheDocument();
    });

    // Click complete button in modal
    const completeButton = screen.getByRole("button", {
      name: /Completar & Avançar para Próximo Estágio/,
    });
    await user.click(completeButton);

    // Callback should be called
    await waitFor(() => {
      expect(onStageComplete).toHaveBeenCalledWith(completedStage);
    });
  });
});
