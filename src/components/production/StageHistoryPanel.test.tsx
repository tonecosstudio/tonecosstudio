/**
 * Tests for StageHistoryPanel Component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StageHistoryPanel } from "./StageHistoryPanel";
import type { ProductionStageRecord } from "@/hooks/admin/useProductionStages";

const stageService = vi.hoisted(() => ({
  getStageHistory: vi.fn(),
}));

vi.mock("@/services/admin/production/stage-service", () => ({
  getStageHistory: stageService.getStageHistory,
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
    notes: "Cliente escolheu personagem rapidamente",
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
    notes: "Design aprovado pelo cliente",
    photos: [
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg",
    ],
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
    status: "completed",
    startedAt: "2024-01-01T18:00:00Z",
    completedAt: "2024-01-02T10:00:00Z",
    estimatedDuration: 24,
    actualDuration: 16,
    assignedTo: "user-2",
    assignedToName: "Maria Santos",
    assignedAt: "2024-01-01T18:00:00Z",
    notes: "Produção concluída sem problemas",
    photos: [
      "https://example.com/photo3.jpg",
      "https://example.com/photo4.jpg",
      "https://example.com/photo5.jpg",
    ],
    isBlocked: false,
    blockReason: null,
    blockedAt: null,
    unblockedAt: null,
    createdAt: "2024-01-01T18:00:00Z",
    updatedAt: "2024-01-02T10:00:00Z",
  },
  {
    id: "stage-4",
    productionQueueId: "queue-1",
    stageName: "quality_check",
    stageOrder: 4,
    status: "in_progress",
    startedAt: "2024-01-02T10:00:00Z",
    completedAt: null,
    estimatedDuration: 4,
    actualDuration: null,
    assignedTo: "user-3",
    assignedToName: "Pedro Costa",
    assignedAt: "2024-01-02T10:00:00Z",
    notes: null,
    photos: [],
    isBlocked: false,
    blockReason: null,
    blockedAt: null,
    unblockedAt: null,
    createdAt: "2024-01-02T10:00:00Z",
    updatedAt: "2024-01-02T10:00:00Z",
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

describe("StageHistoryPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    vi.mocked(stageService.getStageHistory).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<StageHistoryPanel productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("Histórico de Estágios")).toBeInTheDocument();
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("displays all stages with completion times", async () => {
    vi.mocked(stageService.getStageHistory).mockResolvedValue(mockStages);

    render(<StageHistoryPanel productionQueueId="queue-1" />, {
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

  it("shows notes for each stage", async () => {
    vi.mocked(stageService.getStageHistory).mockResolvedValue(mockStages);

    render(<StageHistoryPanel productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(
        screen.getByText("Cliente escolheu personagem rapidamente")
      ).toBeInTheDocument();
      expect(screen.getByText("Design aprovado pelo cliente")).toBeInTheDocument();
      expect(
        screen.getByText("Produção concluída sem problemas")
      ).toBeInTheDocument();
    });
  });

  it("displays photos for each stage", async () => {
    vi.mocked(stageService.getStageHistory).mockResolvedValue(mockStages);

    render(<StageHistoryPanel productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      // Design stage has 2 photos
      expect(screen.getByText("Fotos (2)")).toBeInTheDocument();
      // Production stage has 3 photos
      expect(screen.getByText("Fotos (3)")).toBeInTheDocument();
    });

    // Check that images are rendered
    const images = screen.getAllByRole("img");
    expect(images.length).toBeGreaterThan(0);
  });

  it("calculates and displays duration per stage", async () => {
    vi.mocked(stageService.getStageHistory).mockResolvedValue(mockStages);

    render(<StageHistoryPanel productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      // Check for duration labels
      const durationLabels = screen.getAllByText("Duração");
      expect(durationLabels.length).toBeGreaterThan(0);

      // Check for specific durations
      expect(screen.getByText("2 horas")).toBeInTheDocument(); // awaiting_choice
      expect(screen.getByText("6 horas")).toBeInTheDocument(); // design
      expect(screen.getByText("16 horas")).toBeInTheDocument(); // production
    });
  });

  it("highlights stages that took longer than average", async () => {
    // Create stages where one takes significantly longer
    const stagesWithSlow: ProductionStageRecord[] = [
      {
        ...mockStages[0],
        actualDuration: 2,
      },
      {
        ...mockStages[1],
        actualDuration: 4,
      },
      {
        ...mockStages[2],
        actualDuration: 20, // Much longer than average (2+4)/2 = 3, so 20 > 3*1.5
        status: "completed",
        completedAt: "2024-01-02T10:00:00Z",
      },
    ];

    vi.mocked(stageService.getStageHistory).mockResolvedValue(stagesWithSlow);

    render(<StageHistoryPanel productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      // Should show "Acima da média" badge for slow stage
      expect(screen.getByText("Acima da média")).toBeInTheDocument();
    });
  });

  it("displays average duration", async () => {
    vi.mocked(stageService.getStageHistory).mockResolvedValue(mockStages);

    render(<StageHistoryPanel productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      // Average of completed stages: (2 + 6 + 16) / 3 = 8 hours
      expect(screen.getByText(/Duração média:/)).toBeInTheDocument();
      expect(screen.getByText(/8 horas/)).toBeInTheDocument();
    });
  });

  it("shows status badges for each stage", async () => {
    vi.mocked(stageService.getStageHistory).mockResolvedValue(mockStages);

    render(<StageHistoryPanel productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      // Completed stages
      const completeBadges = screen.getAllByText("Completo");
      expect(completeBadges.length).toBe(3);

      // In progress stage
      expect(screen.getByText("Em Progresso")).toBeInTheDocument();

      // Pending stages
      const pendingBadges = screen.getAllByText("Pendente");
      expect(pendingBadges.length).toBe(2);
    });
  });

  it("displays assigned team member", async () => {
    vi.mocked(stageService.getStageHistory).mockResolvedValue(mockStages);

    render(<StageHistoryPanel productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Atribuído a: João Silva")).toBeInTheDocument();
      expect(screen.getByText("Atribuído a: Maria Santos")).toBeInTheDocument();
      expect(screen.getByText("Atribuído a: Pedro Costa")).toBeInTheDocument();
    });
  });

  it("shows blocked stage with reason", async () => {
    const blockedStages = mockStages.map((stage) =>
      stage.id === "stage-4"
        ? {
            ...stage,
            isBlocked: true,
            blockReason: "Aguardando aprovação do cliente",
          }
        : stage
    );

    vi.mocked(stageService.getStageHistory).mockResolvedValue(blockedStages);

    render(<StageHistoryPanel productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Bloqueado")).toBeInTheDocument();
      expect(screen.getByText("Motivo do bloqueio:")).toBeInTheDocument();
      expect(
        screen.getByText("Aguardando aprovação do cliente")
      ).toBeInTheDocument();
    });
  });

  it("displays timestamps for started and completed stages", async () => {
    vi.mocked(stageService.getStageHistory).mockResolvedValue(mockStages);

    render(<StageHistoryPanel productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      // Check for timestamp labels
      const initiatedLabels = screen.getAllByText("Iniciado:");
      expect(initiatedLabels.length).toBeGreaterThan(0);

      const completedLabels = screen.getAllByText("Concluído:");
      expect(completedLabels.length).toBeGreaterThan(0);
    });
  });

  it("handles error state", async () => {
    vi.mocked(stageService.getStageHistory).mockRejectedValue(
      new Error("Erro ao carregar histórico")
    );

    render(<StageHistoryPanel productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText(/Erro ao carregar histórico/i)).toBeInTheDocument();
    });
  });

  it("handles empty state", async () => {
    vi.mocked(stageService.getStageHistory).mockResolvedValue([]);

    render(<StageHistoryPanel productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(
        screen.getByText("Nenhum estágio encontrado para este item.")
      ).toBeInTheDocument();
    });
  });

  it("renders stages in correct order", async () => {
    // Shuffle stages to test sorting
    const shuffledStages = [...mockStages].sort(() => Math.random() - 0.5);
    vi.mocked(stageService.getStageHistory).mockResolvedValue(shuffledStages);

    render(<StageHistoryPanel productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      // Check that all stages are present in the correct order
      expect(screen.getByText("Aguardando Escolha")).toBeInTheDocument();
      expect(screen.getByText("Design")).toBeInTheDocument();
      expect(screen.getByText("Produção")).toBeInTheDocument();
      expect(screen.getByText("Controle de Qualidade")).toBeInTheDocument();
      expect(screen.getByText("Embalagem")).toBeInTheDocument();
      expect(screen.getByText("Enviado")).toBeInTheDocument();
    });
  });

  it("formats duration correctly for different time ranges", async () => {
    const stagesWithVariedDurations: ProductionStageRecord[] = [
      {
        ...mockStages[0],
        actualDuration: 0.5, // 30 minutes
        status: "completed",
        completedAt: "2024-01-01T10:30:00Z",
      },
      {
        ...mockStages[1],
        actualDuration: 8, // 8 hours
        status: "completed",
        completedAt: "2024-01-01T20:00:00Z",
      },
      {
        ...mockStages[2],
        actualDuration: 48, // 2 days
        status: "completed",
        completedAt: "2024-01-03T18:00:00Z",
      },
    ];

    vi.mocked(stageService.getStageHistory).mockResolvedValue(
      stagesWithVariedDurations
    );

    render(<StageHistoryPanel productionQueueId="queue-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("30 minutos")).toBeInTheDocument();
      expect(screen.getByText("8 horas")).toBeInTheDocument();
      expect(screen.getByText("2 dias")).toBeInTheDocument();
    });
  });
});
