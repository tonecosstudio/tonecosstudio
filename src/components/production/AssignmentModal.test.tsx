import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProductionAssignmentTeamMembers } from "@/hooks/admin/useProductionAssignmentOptions";
import { AssignmentModal } from "./AssignmentModal";

vi.mock("@/hooks/admin/useProductionAssignmentOptions", () => ({
  useProductionAssignmentTeamMembers: vi.fn(),
}));

const teamMembers = [
  { id: "1", name: "Alice Smith", email: "alice@example.com", workload: 2 },
  { id: "2", name: "Bob Johnson", email: "bob@example.com", workload: 1 },
  { id: "3", name: "Charlie Brown", email: "charlie@example.com", workload: 0 },
];

describe("AssignmentModal", () => {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn();
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    onConfirm.mockResolvedValue(undefined);
    vi.mocked(useProductionAssignmentTeamMembers).mockReturnValue({
      data: teamMembers,
      isLoading: false,
    } as ReturnType<typeof useProductionAssignmentTeamMembers>);
  });

  function render(ui: ReactElement) {
    return rtlRender(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    );
  }

  function renderModal(currentAssignee?: string) {
    return render(
      <AssignmentModal
        open
        onOpenChange={onOpenChange}
        currentAssignee={currentAssignee}
        onConfirm={onConfirm}
      />,
    );
  }

  it("renders title, description and search", () => {
    renderModal();

    expect(screen.getByText("Atribuir Item de Producao")).toBeInTheDocument();
    expect(
      screen.getByText("Selecione um membro da equipe para atribuir este item de producao."),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Buscar por nome ou email...")).toBeInTheDocument();
  });

  it("displays team members with workload", () => {
    renderModal();

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Johnson")).toBeInTheDocument();
    expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
    expect(screen.getByText(/alice@example\.com - 2 itens atribuidos/i)).toBeInTheDocument();
    expect(screen.getByText(/bob@example\.com - 1 item atribuido/i)).toBeInTheDocument();
    expect(screen.getByText(/charlie@example\.com - 0 itens atribuidos/i)).toBeInTheDocument();
  });

  it("filters members by name or email", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByPlaceholderText("Buscar por nome ou email..."), "alice");

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.queryByText("Bob Johnson")).not.toBeInTheDocument();
    expect(screen.queryByText("Charlie Brown")).not.toBeInTheDocument();
  });

  it("shows an empty search result", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByPlaceholderText("Buscar por nome ou email..."), "nobody");

    expect(screen.getByText("Nenhum membro encontrado com esse criterio")).toBeInTheDocument();
  });

  it("selects a member and confirms the assignment", async () => {
    const user = userEvent.setup();
    renderModal();

    const alice = screen.getByLabelText(/Alice Smith/i);
    const assign = screen.getByRole("button", { name: /^Atribuir$/i });
    expect(assign).toBeDisabled();

    await user.click(alice);
    expect(alice).toBeChecked();
    expect(assign).toBeEnabled();

    await user.click(assign);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith("1", undefined);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("preselects the current assignee and requires a reason only for reassignment UI", async () => {
    const user = userEvent.setup();
    renderModal("2");

    const bob = screen.getByLabelText(/Bob Johnson/i);
    expect(bob).toBeChecked();
    expect(screen.queryByLabelText("Motivo da Reatribuicao")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/Alice Smith/i));
    const reason = screen.getByLabelText("Motivo da Reatribuicao");
    await user.type(reason, "Balanceamento de carga");
    await user.click(screen.getByRole("button", { name: /^Atribuir$/i }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith("1", "Balanceamento de carga");
    });
  });

  it("cancels through onOpenChange", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: /Cancelar/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders skeletons while team members are loading", () => {
    vi.mocked(useProductionAssignmentTeamMembers).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useProductionAssignmentTeamMembers>);

    renderModal();
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});
