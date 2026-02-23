import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GroupList } from "./GroupList";
import { groupService } from "@/lib/services/groupService";
import type { Group, GroupDetails } from "@/types/groups";

// Mock dos serviços
vi.mock("@/lib/services/groupService", () => ({
  groupService: {
    listGroups: vi.fn(),
    getGroupDetails: vi.fn(),
    deleteGroup: vi.fn(),
  },
}));

// Mock do useAuth
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: { id: "admin-123", email: "admin@test.com" },
  }),
}));

// Mock do toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("GroupList", () => {
  const mockGroups: Group[] = [
    {
      id: "group-1",
      name: "Assinantes Ativos",
      type: "assinantes",
      membership_criteria: { type: "assinantes", subscriptionStatus: "active" },
      created_by: "admin-123",
      created_at: "2024-01-01T10:00:00Z",
      updated_at: "2024-01-01T10:00:00Z",
      deleted_at: null,
      deleted_by: null,
    },
    {
      id: "group-2",
      name: "Lançamentos 2024",
      type: "lancamentos",
      membership_criteria: { type: "lancamentos", criteria: "all_users" },
      created_by: "admin-123",
      created_at: "2024-01-02T10:00:00Z",
      updated_at: "2024-01-02T10:00:00Z",
      deleted_at: null,
      deleted_by: null,
    },
  ];

  const mockGroupDetails: Record<string, GroupDetails> = {
    "group-1": {
      ...mockGroups[0],
      member_count: 150,
      message_count: 25,
      last_message_at: "2024-01-15T14:30:00Z",
      estimated_view_rate: 75.5,
    },
    "group-2": {
      ...mockGroups[1],
      member_count: 300,
      message_count: 10,
      last_message_at: "2024-01-10T09:00:00Z",
      estimated_view_rate: 60.0,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(groupService.listGroups).mockResolvedValue(mockGroups);
    vi.mocked(groupService.getGroupDetails).mockImplementation((groupId: string) =>
      Promise.resolve(mockGroupDetails[groupId])
    );
  });

  describe("Renderização", () => {
    it("deve exibir loading state inicialmente", () => {
      render(<GroupList />);
      expect(screen.getByText(/carregando grupos/i)).toBeInTheDocument();
    });

    it("deve exibir lista de grupos após carregar", async () => {
      render(<GroupList />);

      await waitFor(() => {
        expect(screen.getByText("Assinantes Ativos")).toBeInTheDocument();
        expect(screen.getByText("Lançamentos 2024")).toBeInTheDocument();
      });
    });

    it("deve exibir empty state quando não há grupos", async () => {
      vi.mocked(groupService.listGroups).mockResolvedValue([]);

      render(<GroupList />);

      await waitFor(() => {
        expect(screen.getByText(/nenhum grupo criado/i)).toBeInTheDocument();
      });
    });

    it("deve exibir botão de criar grupo quando callback é fornecido", async () => {
      const onCreateGroup = vi.fn();
      render(<GroupList onCreateGroup={onCreateGroup} />);

      await waitFor(() => {
        expect(screen.getAllByText(/criar grupo/i)[0]).toBeInTheDocument();
      });
    });

    it("não deve exibir botão de criar quando callback não é fornecido", async () => {
      render(<GroupList />);

      await waitFor(() => {
        expect(screen.queryByText(/criar grupo/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Métricas dos Grupos", () => {
    it("deve exibir contagem de membros corretamente", async () => {
      render(<GroupList />);

      await waitFor(() => {
        expect(screen.getByText("150")).toBeInTheDocument();
        expect(screen.getByText("300")).toBeInTheDocument();
      });
    });

    it("deve exibir contagem de mensagens corretamente", async () => {
      render(<GroupList />);

      await waitFor(() => {
        expect(screen.getByText("25")).toBeInTheDocument();
        expect(screen.getByText("10")).toBeInTheDocument();
      });
    });

    it("deve exibir timestamp da última mensagem", async () => {
      render(<GroupList />);

      await waitFor(() => {
        const timestamps = screen.getAllByText(/última mensagem:/i);
        expect(timestamps).toHaveLength(2);
      });
    });

    it("deve exibir tipo do grupo como badge", async () => {
      render(<GroupList />);

      await waitFor(() => {
        expect(screen.getByText("Assinantes")).toBeInTheDocument();
        expect(screen.getByText("Lançamentos")).toBeInTheDocument();
      });
    });
  });

  describe("Interações", () => {
    it("deve chamar callback ao clicar em criar grupo", async () => {
      const onCreateGroup = vi.fn();
      const user = userEvent.setup();

      render(<GroupList onCreateGroup={onCreateGroup} />);

      await waitFor(() => {
        expect(screen.getByText("Assinantes Ativos")).toBeInTheDocument();
      });

      const createButton = screen.getAllByText(/criar grupo/i)[0];
      await user.click(createButton);

      expect(onCreateGroup).toHaveBeenCalledTimes(1);
    });

    it("deve chamar callback ao clicar em um grupo", async () => {
      const onSelectGroup = vi.fn();
      const user = userEvent.setup();

      render(<GroupList onSelectGroup={onSelectGroup} />);

      await waitFor(() => {
        expect(screen.getByText("Assinantes Ativos")).toBeInTheDocument();
      });

      const groupCard = screen.getByText("Assinantes Ativos").closest(".cursor-pointer");
      if (groupCard) {
        await user.click(groupCard);
      }

      expect(onSelectGroup).toHaveBeenCalledWith("group-1");
    });
  });

  describe("Error Handling", () => {
    it("deve exibir toast de erro ao falhar ao carregar grupos", async () => {
      const { toast } = await import("sonner");
      vi.mocked(groupService.listGroups).mockRejectedValue(new Error("Erro de rede"));

      render(<GroupList />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Erro ao carregar grupos");
      });
    });

    it("deve continuar funcionando se getGroupDetails falhar para um grupo", async () => {
      vi.mocked(groupService.getGroupDetails).mockImplementation((groupId: string) => {
        if (groupId === "group-1") {
          return Promise.reject(new Error("Erro ao carregar detalhes"));
        }
        return Promise.resolve(mockGroupDetails[groupId]);
      });

      render(<GroupList />);

      await waitFor(() => {
        expect(screen.getByText("Assinantes Ativos")).toBeInTheDocument();
        expect(screen.getByText("Lançamentos 2024")).toBeInTheDocument();
      });

      // Grupo com erro deve exibir métricas zeradas
      const groupCards = screen.getAllByText(/membros/i);
      expect(groupCards).toHaveLength(2);
    });
  });
});
