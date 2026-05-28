import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import userEvent from "@testing-library/user-event";

import { GroupList } from "./GroupList";
import { groupService } from "@/lib/services/groupService";
import { renderWithProviders, screen, waitFor } from "@/test/utils/test-utils";
import type { GroupWithMetrics } from "@/types/groups";

const authState = vi.hoisted(() => ({
  user: { email: "admin@test.com", id: "admin-123" } as { email: string; id: string } | null,
}));

vi.mock("@/lib/services/groupService", () => ({
  groupService: {
    deleteGroup: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: authState.user,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const mockGroups: GroupWithMetrics[] = [
  {
    created_at: "2024-01-01T10:00:00Z",
    created_by: "admin-123",
    deleted_at: null,
    deleted_by: null,
    id: "group-1",
    last_message_at: "2024-01-15T14:30:00Z",
    member_count: 150,
    membership_criteria: null,
    message_count: 25,
    name: "Assinantes Ativos",
    type: "assinantes",
    updated_at: "2024-01-01T10:00:00Z",
  },
  {
    created_at: "2024-01-02T10:00:00Z",
    created_by: "admin-123",
    deleted_at: null,
    deleted_by: null,
    id: "group-2",
    last_message_at: null,
    member_count: 300,
    membership_criteria: null,
    message_count: 10,
    name: "Grupo Manual",
    type: "manual",
    updated_at: "2024-01-02T10:00:00Z",
  },
];

function renderGroupList(
  props: Partial<ComponentProps<typeof GroupList>> = {}
): {
  onRefresh: ReturnType<typeof vi.fn>;
  onSelectGroup: ReturnType<typeof vi.fn>;
} {
  const onRefresh = vi.fn();
  const onSelectGroup = vi.fn();

  renderWithProviders(
    <GroupList
      groups={mockGroups}
      isLoading={false}
      onRefresh={onRefresh}
      onSelectGroup={onSelectGroup}
      {...props}
    />
  );

  return { onRefresh, onSelectGroup };
}

describe("GroupList", () => {
  beforeEach(() => {
    authState.user = { email: "admin@test.com", id: "admin-123" };
    vi.clearAllMocks();
    vi.mocked(groupService.deleteGroup).mockResolvedValue(undefined);
  });

  it("exibe estado de loading acessivel sem depender de dados carregados", () => {
    renderGroupList({ groups: [], isLoading: true });

    expect(screen.getByRole("status", { name: "Carregando grupos" })).toBeInTheDocument();
  });

  it("exibe estado vazio quando nao ha grupos", () => {
    renderGroupList({ groups: [] });

    expect(screen.getByText("Nenhum grupo criado")).toBeInTheDocument();
    expect(screen.getByText(/Crie seu primeiro grupo/)).toBeInTheDocument();
  });

  it("renderiza grupos com metricas e tipo", () => {
    renderGroupList();

    expect(screen.getByText("Assinantes Ativos")).toBeInTheDocument();
    expect(screen.getByText("Grupo Manual")).toBeInTheDocument();
    expect(screen.getByText("Assinantes")).toBeInTheDocument();
    expect(screen.getByText("Manual")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("300")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getAllByText(/mensagem:/i)).toHaveLength(2);
  });

  it("chama callback de selecao ao clicar no card do grupo", async () => {
    const user = userEvent.setup();
    const { onSelectGroup } = renderGroupList();

    await user.click(screen.getByText("Assinantes Ativos").closest(".cursor-pointer")!);

    expect(onSelectGroup).toHaveBeenCalledWith("group-1");
  });

  it("abre confirmacao e deleta grupo com auditoria do usuario autenticado", async () => {
    const user = userEvent.setup();
    const { onRefresh, onSelectGroup } = renderGroupList();
    const { toast } = await import("sonner");

    await user.click(screen.getByRole("button", { name: "Abrir acoes do grupo Assinantes Ativos" }));
    await user.click(screen.getByText("Deletar Grupo"));

    expect(onSelectGroup).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Deletar Grupo" })).toBeInTheDocument();
    expect(screen.getAllByText("Assinantes Ativos")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Deletar Grupo" }));

    await waitFor(() => {
      expect(groupService.deleteGroup).toHaveBeenCalledWith("group-1", "admin-123");
    });
    expect(toast.success).toHaveBeenCalledWith("Grupo deletado com sucesso");
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("exibe erro de exclusao retornado pelo servico", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");
    vi.mocked(groupService.deleteGroup).mockRejectedValue(new Error("Grupo nao encontrado"));

    renderGroupList();

    await user.click(screen.getByRole("button", { name: "Abrir acoes do grupo Assinantes Ativos" }));
    await user.click(screen.getByText("Deletar Grupo"));
    await user.click(screen.getByRole("button", { name: "Deletar Grupo" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Grupo nao encontrado");
    });
  });

  it("bloqueia exclusao sem usuario autenticado", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");
    authState.user = null;

    renderGroupList();

    await user.click(screen.getByRole("button", { name: "Abrir acoes do grupo Assinantes Ativos" }));
    await user.click(screen.getByText("Deletar Grupo"));
    await user.click(screen.getByRole("button", { name: "Deletar Grupo" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Usuario autenticado obrigatorio para deletar grupo"
      );
    });
    expect(groupService.deleteGroup).not.toHaveBeenCalled();
  });
});
