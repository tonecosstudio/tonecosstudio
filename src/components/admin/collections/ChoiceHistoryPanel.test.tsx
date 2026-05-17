/**
 * Tests for ChoiceHistoryPanel Component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChoiceHistoryPanel } from "./ChoiceHistoryPanel";
import { useChoiceHistory } from "@/hooks/admin/useChoiceHistory";
import type { CharacterChoice } from "@/hooks/admin/useChoiceApproval";

// Mock the choice history hook
vi.mock("@/hooks/admin/useChoiceHistory", () => ({
  useChoiceHistory: vi.fn(),
}));

// Mock date-fns to have consistent dates in tests
vi.mock("date-fns", async () => {
  const actual = await vi.importActual("date-fns");
  return {
    ...actual,
    formatDistanceToNow: () => "2 horas atrás",
  };
});

describe("ChoiceHistoryPanel", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
    vi.mocked(useChoiceHistory).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useChoiceHistory>);
  });

  const renderComponent = (orderId: string) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ChoiceHistoryPanel orderId={orderId} />
      </QueryClientProvider>
    );
  };

  const mockChoice: CharacterChoice = {
    id: "choice-1",
    orderId: "order-1",
    orderType: "subscription_delivery",
    userId: "user-1",
    customerName: "João Silva",
    customerEmail: "joao@example.com",
    collectionId: "collection-1",
    collectionName: "Coleção Teste",
    characterId: "char-1",
    characterName: "Personagem A",
    characterImageUrl: "https://example.com/char-a.jpg",
    status: "approved",
    submittedAt: "2024-01-15T10:00:00Z",
    approvedAt: "2024-01-15T11:00:00Z",
    approvedBy: "admin-1",
    approvedByName: "Admin User",
    rejectedAt: null,
    rejectionReason: null,
    deadline: "2024-01-20T23:59:59Z",
    remindersSent: 1,
    lastReminderAt: "2024-01-14T10:00:00Z",
    previousChoiceId: null,
    changeReason: null,
    changeCount: 0,
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T11:00:00Z",
  };

  describe("Loading State", () => {
    it("should display loading skeletons while fetching data", () => {
      vi.mocked(useChoiceHistory).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as unknown as ReturnType<typeof useChoiceHistory>);

      renderComponent("order-1");

      expect(screen.getByText("Histórico de Escolhas")).toBeInTheDocument();
      expect(screen.getByText("Carregando histórico...")).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("should display empty state when no history exists", async () => {
      vi.mocked(useChoiceHistory).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useChoiceHistory>);

      renderComponent("order-1");

      await waitFor(() => {
        expect(screen.getByText("Nenhuma escolha registrada para este pedido")).toBeInTheDocument();
      });

      expect(
        screen.getByText("O histórico de escolhas aparecerá aqui quando o cliente fizer uma seleção.")
      ).toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("should display error message when fetch fails", async () => {
      const errorMessage = "Failed to fetch history";
      vi.mocked(useChoiceHistory).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error(errorMessage),
      } as unknown as ReturnType<typeof useChoiceHistory>);

      renderComponent("order-1");

      await waitFor(() => {
        expect(screen.getByText(/Erro ao carregar histórico/)).toBeInTheDocument();
      });

      expect(screen.getByText(new RegExp(errorMessage))).toBeInTheDocument();
    });
  });

  describe("Display History", () => {
    it("should display single choice history", async () => {
      vi.mocked(useChoiceHistory).mockReturnValue({
        data: [mockChoice],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useChoiceHistory>);

      renderComponent("order-1");

      await waitFor(() => {
        expect(screen.getByText("1 registro encontrado")).toBeInTheDocument();
      });

      expect(screen.getByText("Personagem A")).toBeInTheDocument();
      expect(screen.getByText("Aprovado")).toBeInTheDocument();
      expect(screen.getByText("Atual")).toBeInTheDocument();
    });

    it("should display multiple choice history entries", async () => {
      const rejectedChoice: CharacterChoice = {
        ...mockChoice,
        id: "choice-2",
        characterName: "Personagem B",
        status: "rejected",
        rejectedAt: "2024-01-14T15:00:00Z",
        rejectionReason: "Personagem sem estoque",
        approvedAt: null,
        approvedBy: null,
        approvedByName: null,
        createdAt: "2024-01-14T14:00:00Z",
      };

      vi.mocked(useChoiceHistory).mockReturnValue({
        data: [mockChoice, rejectedChoice],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useChoiceHistory>);

      renderComponent("order-1");

      await waitFor(() => {
        expect(screen.getByText("2 registros encontrados")).toBeInTheDocument();
      });

      expect(screen.getByText("Personagem A")).toBeInTheDocument();
      expect(screen.getByText("Personagem B")).toBeInTheDocument();
    });

    it("should display character image when available", async () => {
      vi.mocked(useChoiceHistory).mockReturnValue({
        data: [mockChoice],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useChoiceHistory>);

      renderComponent("order-1");

      await waitFor(() => {
        const image = screen.getByAltText("Personagem A");
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute("src", "https://example.com/char-a.jpg");
      });
    });

    it("should handle missing character name", async () => {
      const choiceWithoutCharacter: CharacterChoice = {
        ...mockChoice,
        characterName: null,
        characterImageUrl: null,
      };

      vi.mocked(useChoiceHistory).mockReturnValue({
        data: [choiceWithoutCharacter],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useChoiceHistory>);

      renderComponent("order-1");

      await waitFor(() => {
        expect(screen.getByText("Nenhum personagem escolhido")).toBeInTheDocument();
      });
    });
  });

  describe("Status Display", () => {
    it("should display pending status correctly", async () => {
      const pendingChoice: CharacterChoice = {
        ...mockChoice,
        status: "pending",
        submittedAt: null,
        approvedAt: null,
        approvedBy: null,
        approvedByName: null,
      };

      vi.mocked(useChoiceHistory).mockReturnValue({
        data: [pendingChoice],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useChoiceHistory>);

      renderComponent("order-1");

      await waitFor(() => {
        expect(screen.getByText("Pendente")).toBeInTheDocument();
      });
    });

    it("should display submitted status correctly", async () => {
      const submittedChoice: CharacterChoice = {
        ...mockChoice,
        status: "submitted",
        approvedAt: null,
        approvedBy: null,
        approvedByName: null,
      };

      vi.mocked(useChoiceHistory).mockReturnValue({
        data: [submittedChoice],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useChoiceHistory>);

      renderComponent("order-1");

      await waitFor(() => {
        expect(screen.getByText("Submetido")).toBeInTheDocument();
      });
    });

    it("should display approved status with approver info", async () => {
      vi.mocked(useChoiceHistory).mockReturnValue({
        data: [mockChoice],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useChoiceHistory>);

      renderComponent("order-1");

      await waitFor(() => {
        expect(screen.getByText("Aprovado")).toBeInTheDocument();
        expect(screen.getByText(/Aprovado por/)).toBeInTheDocument();
        expect(screen.getByText(/Admin User/)).toBeInTheDocument();
      });
    });

    it("should display rejected status with reason", async () => {
      const rejectedChoice: CharacterChoice = {
        ...mockChoice,
        status: "rejected",
        rejectedAt: "2024-01-15T12:00:00Z",
        rejectionReason: "Personagem sem estoque",
        approvedAt: null,
        approvedBy: null,
        approvedByName: null,
      };

      vi.mocked(useChoiceHistory).mockReturnValue({
        data: [rejectedChoice],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useChoiceHistory>);

      renderComponent("order-1");

      await waitFor(() => {
        expect(screen.getByText("Rejeitado")).toBeInTheDocument();
        expect(screen.getByText("Motivo da rejeição:")).toBeInTheDocument();
        expect(screen.getByText("Personagem sem estoque")).toBeInTheDocument();
      });
    });

    it("should display locked status correctly", async () => {
      const lockedChoice: CharacterChoice = {
        ...mockChoice,
        status: "locked",
      };

      vi.mocked(useChoiceHistory).mockReturnValue({
        data: [lockedChoice],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useChoiceHistory>);

      renderComponent("order-1");

      await waitFor(() => {
        expect(screen.getByText("Bloqueado")).toBeInTheDocument();
      });
    });
  });

  describe("Change Information", () => {
    it("should display change reason when present", async () => {
      const changedChoice: CharacterChoice = {
        ...mockChoice,
        changeReason: "Cliente mudou de ideia",
        changeCount: 1,
      };

      vi.mocked(useChoiceHistory).mockReturnValue({
        data: [changedChoice],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useChoiceHistory>);

      renderComponent("order-1");

      await waitFor(() => {
        expect(screen.getByText("Motivo da alteração:")).toBeInTheDocument();
        expect(screen.getByText("Cliente mudou de ideia")).toBeInTheDocument();
        expect(screen.getByText("Alteração #1 (máximo: 3)")).toBeInTheDocument();
      });
    });

    it("should display change count correctly", async () => {
      const changedChoice: CharacterChoice = {
        ...mockChoice,
        changeCount: 2,
      };

      vi.mocked(useChoiceHistory).mockReturnValue({
        data: [changedChoice],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useChoiceHistory>);

      renderComponent("order-1");

      await waitFor(() => {
        expect(screen.getByText("Alteração #2 (máximo: 3)")).toBeInTheDocument();
      });
    });
  });

  describe("Timeline Visualization", () => {
    it("should mark the latest entry as current", async () => {
      const olderChoice: CharacterChoice = {
        ...mockChoice,
        id: "choice-2",
        createdAt: "2024-01-14T09:00:00Z",
      };

      vi.mocked(useChoiceHistory).mockReturnValue({
        data: [mockChoice, olderChoice],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useChoiceHistory>);

      renderComponent("order-1");

      await waitFor(() => {
        const currentBadges = screen.getAllByText("Atual");
        expect(currentBadges).toHaveLength(1);
      });
    });

    it("should display customer information for each entry", async () => {
      vi.mocked(useChoiceHistory).mockReturnValue({
        data: [mockChoice],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useChoiceHistory>);

      renderComponent("order-1");

      await waitFor(() => {
        expect(screen.getByText(/Cliente:/)).toBeInTheDocument();
        expect(screen.getByText(/João Silva/)).toBeInTheDocument();
        expect(screen.getByText(/joao@example.com/)).toBeInTheDocument();
      });
    });

    it("should display deadline information", async () => {
      vi.mocked(useChoiceHistory).mockReturnValue({
        data: [mockChoice],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useChoiceHistory>);

      renderComponent("order-1");

      await waitFor(() => {
        expect(screen.getByText(/Prazo:/)).toBeInTheDocument();
      });
    });
  });

  describe("Timestamps", () => {
    it("should display submitted timestamp when available", async () => {
      vi.mocked(useChoiceHistory).mockReturnValue({
        data: [mockChoice],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useChoiceHistory>);

      renderComponent("order-1");

      await waitFor(() => {
        expect(screen.getByText(/Submetido:/)).toBeInTheDocument();
      });
    });

    it("should handle null timestamps gracefully", async () => {
      const choiceWithNullTimestamps: CharacterChoice = {
        ...mockChoice,
        submittedAt: null,
        approvedAt: null,
        rejectedAt: null,
      };

      vi.mocked(useChoiceHistory).mockReturnValue({
        data: [choiceWithNullTimestamps],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useChoiceHistory>);

      renderComponent("order-1");

      await waitFor(() => {
        expect(screen.getByText("Aprovado")).toBeInTheDocument();
      });

      // Should not crash and should not display timestamp sections
      expect(screen.queryByText(/Submetido:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Aprovado por/)).not.toBeInTheDocument();
    });
  });
});
