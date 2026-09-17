import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProductionKanbanBoard } from "./ProductionKanbanBoard";
import type { ProductionQueueItem } from "@/types/production";
import { PRODUCTION_STAGE_ORDER } from "@/config/production-stages";

const hookMocks = vi.hoisted(() => ({
  useProductionPipelineQueue: vi.fn(),
  useMoveProductionKanbanItem: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock("@/hooks/admin/useProductionPipeline", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/admin/useProductionPipeline")>();

  return {
    ...actual,
    useProductionPipelineQueue: hookMocks.useProductionPipelineQueue,
    useMoveProductionKanbanItem: hookMocks.useMoveProductionKanbanItem,
  };
});

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const mockItems: ProductionQueueItem[] = [
  {
    id: "1",
    orderId: "order-1",
    orderType: "subscription_delivery",
    customerId: "customer-1",
    customerName: "João Silva",
    customerEmail: "joao@example.com",
    collectionId: "collection-1",
    collectionName: "Coleção Teste",
    characterId: "char-1",
    characterName: "Personagem A",
    productionStatus: "in_production",
    currentStage: "model_preparation",
    choiceStatus: "approved",
    choiceDeadline: null,
    choiceMadeAt: "2024-01-01T00:00:00Z",
    priority: "high",
    priorityScore: 80,
    scheduledProductionDate: "2024-01-15T00:00:00Z",
    estimatedCompletionDate: "2024-01-30T00:00:00Z",
    assignedTo: "user-1",
    assignedToName: "Maria Santos",
    assignedAt: "2024-01-10T00:00:00Z",
    productionStartedAt: "2024-01-10T00:00:00Z",
    productionCompletedAt: null,
    productionNotes: null,
    customerNotes: null,
    internalFlags: [],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-10T00:00:00Z",
  },
  {
    id: "2",
    orderId: "order-2",
    orderType: "standalone_purchase",
    customerId: "customer-2",
    customerName: "Maria Oliveira",
    customerEmail: "maria@example.com",
    collectionId: "collection-1",
    collectionName: "Coleção Teste",
    characterId: null,
    characterName: null,
    productionStatus: "awaiting_choice",
    currentStage: "awaiting_choice",
    choiceStatus: "pending",
    choiceDeadline: "2024-01-20T00:00:00Z",
    choiceMadeAt: null,
    priority: "critical",
    priorityScore: 95,
    scheduledProductionDate: null,
    estimatedCompletionDate: null,
    assignedTo: null,
    assignedToName: null,
    assignedAt: null,
    productionStartedAt: null,
    productionCompletedAt: null,
    productionNotes: null,
    customerNotes: null,
    internalFlags: [],
    createdAt: "2024-01-05T00:00:00Z",
    updatedAt: "2024-01-05T00:00:00Z",
  },
];

function queueResult(items = mockItems) {
  return {
    data: {
      data: items,
      total: items.length,
      page: 1,
      pageSize: 1000,
      totalPages: 1,
    },
    isLoading: false,
  };
}

describe("ProductionKanbanBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookMocks.useProductionPipelineQueue.mockReturnValue(queueResult());
    hookMocks.useMoveProductionKanbanItem.mockReturnValue({
      mutate: hookMocks.mutate,
      isPending: false,
    });
  });

  it("renders loading state from the pipeline hook", () => {
    hookMocks.useProductionPipelineQueue.mockReturnValue({ data: undefined, isLoading: true });

    render(<ProductionKanbanBoard filters={{}} />);

    expect(screen.getByText("Carregando quadro kanban...")).toBeInTheDocument();
  });

  it("renders the canonical production stage columns", () => {
    render(<ProductionKanbanBoard filters={{}} />);

    expect(screen.getByText("Aguardando Escolha")).toBeInTheDocument();
    expect(screen.getByText("Preparação do Modelo")).toBeInTheDocument();
    expect(screen.getByText("Em Impressão 3D")).toBeInTheDocument();
    expect(screen.getByText("Controle de Qualidade")).toBeInTheDocument();
    expect(screen.getByText("Embalagem")).toBeInTheDocument();
    expect(screen.getByText("Enviado")).toBeInTheDocument();
  });

  it("groups hydrated queue items into their current stages", () => {
    render(<ProductionKanbanBoard filters={{}} />);

    expect(screen.getByText("João Silva")).toBeInTheDocument();
    expect(screen.getByText("Maria Oliveira")).toBeInTheDocument();
    expect(screen.getByText(/Personagem: Personagem A/)).toBeInTheDocument();
  });

  it("shows priority, assignment and collection details", () => {
    render(<ProductionKanbanBoard filters={{}} />);

    expect(screen.getByText("Alto")).toBeInTheDocument();
    expect(screen.getByText("Crítico")).toBeInTheDocument();
    expect(screen.getByText("Maria Santos")).toBeInTheDocument();
    expect(screen.getByText("MS")).toBeInTheDocument();
    expect(screen.getAllByText("Coleção Teste").length).toBeGreaterThan(0);
  });

  it("shows pending choice deadline information", () => {
    const urgentItem: ProductionQueueItem = {
      ...mockItems[1],
      choiceDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    };
    hookMocks.useProductionPipelineQueue.mockReturnValue(queueResult([urgentItem]));

    render(<ProductionKanbanBoard filters={{}} />);

    expect(screen.getByText(/Prazo:/)).toBeInTheDocument();
    expect(screen.getByText(/h restantes/)).toBeInTheDocument();
  });

  it("passes filters to the canonical pipeline hooks", () => {
    const filters = {
      priorities: ["high" as const],
      stages: ["model_preparation" as const],
    };

    render(<ProductionKanbanBoard filters={filters} />);

    expect(hookMocks.useProductionPipelineQueue).toHaveBeenCalledWith(filters);
    expect(hookMocks.useMoveProductionKanbanItem).toHaveBeenCalledWith(filters);
  });

  it("renders order identifiers", () => {
    render(<ProductionKanbanBoard filters={{}} />);

    expect(screen.getByText(/#order-1/)).toBeInTheDocument();
    expect(screen.getByText(/#order-2/)).toBeInTheDocument();
  });

  it("renders an empty board without inventing queue items", () => {
    hookMocks.useProductionPipelineQueue.mockReturnValue(queueResult([]));

    render(<ProductionKanbanBoard filters={{}} />);

    expect(screen.queryByText("João Silva")).not.toBeInTheDocument();
    expect(screen.getAllByText("Nenhum item neste estágio").length).toBe(
      PRODUCTION_STAGE_ORDER.length,
    );
  });
});
