/**
 * Tests for TeamWorkloadView Component
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeamWorkloadView } from "./TeamWorkloadView";

type TeamMemberWorkloadFixture = {
  id: string;
  name: string;
  email: string;
  workload: number;
  averageCompletionTime: number;
  isOverloaded: boolean;
  items: Array<{
    id: string;
    customer_name: string | null;
    collection_name: string | null;
    current_stage: string | null;
    priority: string | number | null;
    assigned_to: string | null;
  }>;
};

const serviceMocks = vi.hoisted(() => ({
  fetchTeamWorkload: vi.fn(),
  assignProduction: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/services/admin/team-workload-service", () => ({
  fetchTeamWorkload: serviceMocks.fetchTeamWorkload,
}));

vi.mock("@/services/admin/production-service", () => ({
  assignProduction: serviceMocks.assignProduction,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
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

function renderWithQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <TeamWorkloadView />
    </QueryClientProvider>
  );
}

describe("TeamWorkloadView", () => {
  const mockTeamWorkload: TeamMemberWorkloadFixture[] = [
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

  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.fetchTeamWorkload.mockResolvedValue(mockTeamWorkload);
  });

  it("renders loading state initially", () => {
    serviceMocks.fetchTeamWorkload.mockImplementation(() => new Promise(() => {}));

    renderWithQueryClient();

    expect(
      screen.getAllByRole("generic").some((element) => element.className.includes("animate-pulse"))
    ).toBe(true);
  });

  it("displays overall statistics", async () => {
    renderWithQueryClient();

    await waitFor(() => {
      expect(screen.getByText("Visao Geral da Equipe")).toBeInTheDocument();
    });

    expect(screen.getByText("Total de Itens")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Media por Membro")).toBeInTheDocument();
    expect(screen.getByText("Tempo Medio de Conclusao")).toBeInTheDocument();
  });

  it("displays team members with assigned item count", async () => {
    renderWithQueryClient();

    await waitFor(() => {
      expect(screen.getByText("Joao Silva")).toBeInTheDocument();
    });

    expect(screen.getByText("2 itens")).toBeInTheDocument();

    expect(screen.getByText("Maria Santos")).toBeInTheDocument();
    expect(screen.getByText("1 itens")).toBeInTheDocument();
  });

  it("displays average completion time per team member", async () => {
    renderWithQueryClient();

    await waitFor(() => {
      expect(screen.getByText("Joao Silva")).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Media: 10\.0h/)).toHaveLength(2);
  });

  it("expands member card to show assigned items", async () => {
    const user = userEvent.setup();
    renderWithQueryClient();

    await waitFor(() => {
      expect(screen.getByText("Joao Silva")).toBeInTheDocument();
    });

    expect(screen.queryByText("Cliente A")).not.toBeInTheDocument();

    const joaoCard = screen.getByText("Joao Silva").closest("div")?.parentElement;
    await user.click(joaoCard!);

    await waitFor(() => {
      expect(screen.getByText("Cliente A")).toBeInTheDocument();
      expect(screen.getByText("Cliente B")).toBeInTheDocument();
    });

    expect(screen.getByText("Distribuicao por Estagio")).toBeInTheDocument();
  });

  it("shows reassign button for each item", async () => {
    const user = userEvent.setup();
    renderWithQueryClient();

    await waitFor(() => {
      expect(screen.getByText("Joao Silva")).toBeInTheDocument();
    });

    const joaoCard = screen.getByText("Joao Silva").closest("div")?.parentElement;
    await user.click(joaoCard!);

    await waitFor(() => {
      expect(screen.getByText("Cliente A")).toBeInTheDocument();
    });

    const reassignButtons = screen.getAllByRole("button", { name: /Reatribuir/i });
    expect(reassignButtons.length).toBeGreaterThan(0);
  });

  it("opens assignment modal when reassign is clicked", async () => {
    const user = userEvent.setup();
    renderWithQueryClient();

    await waitFor(() => {
      expect(screen.getByText("Joao Silva")).toBeInTheDocument();
    });

    const joaoCard = screen.getByText("Joao Silva").closest("div")?.parentElement;
    await user.click(joaoCard!);

    await waitFor(() => {
      expect(screen.getByText("Cliente A")).toBeInTheDocument();
    });

    const reassignButtons = screen.getAllByRole("button", { name: /Reatribuir/i });
    await user.click(reassignButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId("assignment-modal")).toBeInTheDocument();
    });
  });

  it("confirms reassignment through the assignment modal", async () => {
    const user = userEvent.setup();
    renderWithQueryClient();

    await waitFor(() => {
      expect(screen.getByText("Joao Silva")).toBeInTheDocument();
    });

    const joaoCard = screen.getByText("Joao Silva").closest("div")?.parentElement;
    await user.click(joaoCard!);
    await user.click(screen.getAllByRole("button", { name: /Reatribuir/i })[0]);
    await user.click(screen.getByRole("button", { name: "Confirm Assignment" }));

    await waitFor(() => {
      expect(serviceMocks.assignProduction).toHaveBeenCalledWith("item-1", "user-2", "Test reason");
    });
  });

  it("identifies overloaded team members", async () => {
    serviceMocks.fetchTeamWorkload.mockResolvedValue([
      {
        ...mockTeamWorkload[0],
        isOverloaded: true,
      },
    ]);

    renderWithQueryClient();

    await waitFor(() => {
      expect(screen.getByText("Sobrecarregado")).toBeInTheDocument();
    });
  });

  it("shows empty state when no team members have assignments", async () => {
    serviceMocks.fetchTeamWorkload.mockResolvedValue([]);

    renderWithQueryClient();

    await waitFor(() => {
      expect(screen.getByText("Nenhum membro da equipe com itens atribuidos")).toBeInTheDocument();
    });
  });
});
