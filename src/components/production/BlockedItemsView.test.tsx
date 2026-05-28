import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BlockedItemsView } from "./BlockedItemsView";
import { getProductionStageLabel } from "@/config/production-stages";

const blockedItemsHook = vi.hoisted(() => ({
  useBlockedProductionItems: vi.fn(),
}));

vi.mock("@/hooks/admin/useBlockedProductionItems", () => blockedItemsHook);

vi.mock("./UnblockProductionModal", () => ({
  UnblockProductionModal: ({
    isOpen,
    productionQueueId,
  }: {
    isOpen: boolean;
    productionQueueId: string;
  }) =>
    isOpen ? <div data-testid="unblock-modal">Unblock Modal for {productionQueueId}</div> : null,
}));

const mockBlockedItems = [
  {
    id: "item-1",
    customerName: "Joao Silva",
    customerEmail: "joao@example.com",
    collectionName: "Colecao A",
    characterName: "Personagem 1",
    currentStage: "printing",
    blockReason: "Aguardando material",
    blockedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    blockedDurationHours: 72,
    assignedToName: "Maria Santos",
    priority: "high",
  },
  {
    id: "item-2",
    customerName: "Ana Costa",
    customerEmail: "ana@example.com",
    collectionName: "Colecao B",
    characterName: null,
    currentStage: "model_preparation",
    blockReason: "Equipamento quebrado",
    blockedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    blockedDurationHours: 24,
    assignedToName: null,
    priority: "critical",
  },
];

describe("BlockedItemsView", () => {
  const refetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    blockedItemsHook.useBlockedProductionItems.mockReturnValue({
      data: mockBlockedItems,
      isLoading: false,
      refetch,
    });
  });

  function renderComponent() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <BlockedItemsView />
      </QueryClientProvider>
    );
  }

  it("renders loading skeleton initially", () => {
    blockedItemsHook.useBlockedProductionItems.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch,
    });

    renderComponent();

    expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
  });

  it("displays empty state when no blocked items exist", () => {
    blockedItemsHook.useBlockedProductionItems.mockReturnValue({
      data: [],
      isLoading: false,
      refetch,
    });

    renderComponent();

    expect(screen.getByText("Nenhum Item Bloqueado")).toBeInTheDocument();
    expect(screen.getByText("Nao ha itens de producao bloqueados no momento.")).toBeInTheDocument();
  });

  it("displays blocked items from the hook", () => {
    renderComponent();

    expect(screen.getByText("Itens Bloqueados")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Joao Silva")).toBeInTheDocument();
    expect(screen.getByText("Ana Costa")).toBeInTheDocument();
    expect(screen.getByText("Aguardando material")).toBeInTheDocument();
    expect(screen.getByText("Equipamento quebrado")).toBeInTheDocument();
  });

  it("renders item details and status labels", () => {
    renderComponent();

    expect(screen.getByText("joao@example.com")).toBeInTheDocument();
    expect(screen.getByText("Colecao A")).toBeInTheDocument();
    expect(screen.getByText("Personagem 1")).toBeInTheDocument();
    expect(screen.getByText(getProductionStageLabel("printing"))).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
    expect(screen.getByText("Maria Santos")).toBeInTheDocument();
  });

  it("opens unblock modal when unblock action is clicked", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getAllByRole("button", { name: /desbloquear/i })[0]);

    expect(screen.getByTestId("unblock-modal")).toBeInTheDocument();
    expect(screen.getByText(/Unblock Modal for item-1/)).toBeInTheDocument();
  });

  it("displays duration with critical color when blocked longer than 48 hours", () => {
    renderComponent();

    const durationBadge = screen.getByText("3 dias");
    expect(durationBadge).toBeInTheDocument();
    expect(durationBadge).toHaveClass("border-red-500");
  });

  it("uses placeholders for missing character and assignee", () => {
    renderComponent();

    const emptyCells = screen.getAllByRole("cell").filter((cell) => cell.textContent === "-");
    expect(emptyCells.length).toBeGreaterThanOrEqual(2);
  });
});
