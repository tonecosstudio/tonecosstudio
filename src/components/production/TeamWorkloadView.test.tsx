import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TeamWorkloadView } from "./TeamWorkloadView";

const hookMocks = vi.hoisted(() => ({
  useTeamWorkload: vi.fn(),
  useReassignProductionItem: vi.fn(),
  mutateAsync: vi.fn(),
}));

vi.mock("@/hooks/admin/useTeamWorkload", () => ({
  useTeamWorkload: hookMocks.useTeamWorkload,
  useReassignProductionItem: hookMocks.useReassignProductionItem,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("./AssignmentModal", () => ({
  AssignmentModal: ({
    open,
    onConfirm,
  }: {
    open: boolean;
    onConfirm: (userId: string, reason?: string) => void;
  }) =>
    open ? (
      <div data-testid="assignment-modal">
        <button onClick={() => onConfirm("user-2", "Test reason")}>Confirm Assignment</button>
      </div>
    ) : null,
}));

const mockTeamWorkload = [
  {
    id: "user-1",
    name: "Joao Silva",
    email: "joao@example.com",
    workload: 2,
    averageCompletionTime: 10,
    isOverloaded: false,
    items: [
      {
        id: "item-1",
        customer_name: "Cliente A",
        collection_name: "Colecao 1",
        current_stage: "production",
        priority: "high",
        assigned_to: "user-1",
      },
      {
        id: "item-2",
        customer_name: "Cliente B",
        collection_name: "Colecao 2",
        current_stage: "design",
        priority: "normal",
        assigned_to: "user-1",
      },
    ],
  },
  {
    id: "user-2",
    name: "Maria Santos",
    email: "maria@example.com",
    workload: 1,
    averageCompletionTime: 10,
    isOverloaded: false,
    items: [
      {
        id: "item-3",
        customer_name: "Cliente C",
        collection_name: "Colecao 1",
        current_stage: "design",
        priority: "high",
        assigned_to: "user-2",
      },
    ],
  },
];

describe("TeamWorkloadView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookMocks.useTeamWorkload.mockReturnValue({
      data: mockTeamWorkload,
      isLoading: false,
      isError: false,
    });
    hookMocks.useReassignProductionItem.mockReturnValue({
      mutateAsync: hookMocks.mutateAsync.mockResolvedValue(undefined),
      isPending: false,
    });
  });

  it("renders loading state from the workload hook", () => {
    hookMocks.useTeamWorkload.mockReturnValue({ data: undefined, isLoading: true, isError: false });

    render(<TeamWorkloadView />);

    expect(
      screen.getAllByRole("generic").some((element) => element.className.includes("animate-pulse")),
    ).toBe(true);
  });

  it("renders overall team statistics", () => {
    render(<TeamWorkloadView />);

    expect(screen.getByText("Visao Geral da Equipe")).toBeInTheDocument();
    expect(screen.getByText("Total de Itens")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Media por Membro")).toBeInTheDocument();
    expect(screen.getByText("Tempo Medio de Conclusao")).toBeInTheDocument();
  });

  it("renders team members and workloads", () => {
    render(<TeamWorkloadView />);

    expect(screen.getByText("Joao Silva")).toBeInTheDocument();
    expect(screen.getByText("Maria Santos")).toBeInTheDocument();
    expect(screen.getByText("2 itens")).toBeInTheDocument();
    expect(screen.getByText("1 itens")).toBeInTheDocument();
    expect(screen.getAllByText(/Media: 10\.0h/)).toHaveLength(2);
  });

  it("expands a member to display assigned items", async () => {
    const user = userEvent.setup();
    render(<TeamWorkloadView />);

    await user.click(screen.getByText("Joao Silva"));

    expect(screen.getByText("Cliente A")).toBeInTheDocument();
    expect(screen.getByText("Cliente B")).toBeInTheDocument();
    expect(screen.getByText("Distribuicao por Estagio")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Reatribuir/i }).length).toBeGreaterThan(0);
  });

  it("reassigns an item through the hook mutation", async () => {
    const user = userEvent.setup();
    render(<TeamWorkloadView />);

    await user.click(screen.getByText("Joao Silva"));
    await user.click(screen.getAllByRole("button", { name: /Reatribuir/i })[0]);
    await user.click(screen.getByRole("button", { name: "Confirm Assignment" }));

    expect(hookMocks.mutateAsync).toHaveBeenCalledWith({
      itemId: "item-1",
      userId: "user-2",
      reason: "Test reason",
    });
  });

  it("renders overloaded state", () => {
    hookMocks.useTeamWorkload.mockReturnValue({
      data: [{ ...mockTeamWorkload[0], isOverloaded: true }],
      isLoading: false,
      isError: false,
    });

    render(<TeamWorkloadView />);

    expect(screen.getByText("Sobrecarregado")).toBeInTheDocument();
  });

  it("renders the error state", () => {
    hookMocks.useTeamWorkload.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    render(<TeamWorkloadView />);

    expect(screen.getByText("Erro ao carregar carga da equipe")).toBeInTheDocument();
  });

  it("renders the empty state", () => {
    hookMocks.useTeamWorkload.mockReturnValue({ data: [], isLoading: false, isError: false });

    render(<TeamWorkloadView />);

    expect(screen.getByText("Nenhum membro da equipe com itens atribuidos")).toBeInTheDocument();
  });
});
