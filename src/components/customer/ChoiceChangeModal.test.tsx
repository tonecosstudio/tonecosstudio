/**
 * Tests for ChoiceChangeModal Component
 * 
 * Tests character choice change functionality including:
 * - Current choice display
 * - New character selection
 * - Reason requirement
 * - Remaining changes counter
 * - Validation (approval status, deadline, change limit)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChoiceChangeModal } from "./ChoiceChangeModal";
import * as choiceService from "@/services/customer/choice-service";

// Mock the choice service
vi.mock("@/services/customer/choice-service", () => ({
  getAvailableCharacters: vi.fn(),
  changeCharacterChoice: vi.fn(),
}));

// Mock toast
vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
}));

// Helper to create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

// Helper to render with providers
const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

// Mock characters data
const mockCharacters = [
  {
    id: "char-1",
    name: "Personagem 1",
    description: "Descrição do personagem 1",
    imageUrl: "https://example.com/char1.jpg",
    collectionId: "col-1",
    isAvailable: true,
    stockLevel: 10,
  },
  {
    id: "char-2",
    name: "Personagem 2",
    description: "Descrição do personagem 2",
    imageUrl: "https://example.com/char2.jpg",
    collectionId: "col-1",
    isAvailable: true,
    stockLevel: 3,
  },
  {
    id: "char-3",
    name: "Personagem 3",
    description: "Descrição do personagem 3",
    imageUrl: "https://example.com/char3.jpg",
    collectionId: "col-1",
    isAvailable: false,
    stockLevel: 0,
  },
];

describe("ChoiceChangeModal", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    choiceId: "choice-1",
    orderId: "order-1",
    collectionId: "col-1",
    currentCharacterId: "char-1",
    currentCharacterName: "Personagem 1",
    currentCharacterImageUrl: "https://example.com/char1.jpg",
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    changesCount: 0,
    isApproved: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(choiceService.getAvailableCharacters).mockResolvedValue(mockCharacters);
  });

  describe("Rendering", () => {
    it("should render modal with title and description", () => {
      renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

      expect(screen.getByText("Alterar Escolha de Personagem")).toBeInTheDocument();
      expect(screen.getByText("Selecione um novo personagem e informe o motivo da alteração.")).toBeInTheDocument();
    });

    it("should display current choice", () => {
      renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

      expect(screen.getByText("Escolha Atual")).toBeInTheDocument();
      expect(screen.getByText("Personagem 1")).toBeInTheDocument();
      expect(screen.getByText("Personagem atual")).toBeInTheDocument();
    });

    it("should display remaining changes counter", () => {
      renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

      expect(screen.getByText("Alterações Restantes")).toBeInTheDocument();
      expect(screen.getByText(/Você pode alterar sua escolha mais/)).toBeInTheDocument();
      expect(screen.getByText(/3/)).toBeInTheDocument();
      expect(screen.getByText(/vezes/)).toBeInTheDocument();
    });

    it("should show warning when only 1 change remaining", () => {
      renderWithProviders(
        <ChoiceChangeModal {...defaultProps} changesCount={2} />
      );

      expect(screen.getByText(/Você pode alterar sua escolha mais/)).toBeInTheDocument();
      expect(screen.getByText(/vez\./)).toBeInTheDocument();
    });

    it("should load and display available characters", async () => {
      renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

      await waitFor(() => {
        expect(choiceService.getAvailableCharacters).toHaveBeenCalledWith("col-1");
      });

      await waitFor(() => {
        expect(screen.getByText("Personagem 2")).toBeInTheDocument();
      });
    });

    it("should mark current character as 'Escolha Atual'", async () => {
      renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

      await waitFor(() => {
        const currentBadge = screen.getByText("Escolha Atual");
        expect(currentBadge).toBeInTheDocument();
      });
    });

    it("should mark unavailable characters", async () => {
      renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Indisponível")).toBeInTheDocument();
      });
    });

    it("should show low stock badge", async () => {
      renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Estoque Baixo")).toBeInTheDocument();
      });
    });
  });

  describe("Validation", () => {
    it("should show error when not approved", () => {
      renderWithProviders(
        <ChoiceChangeModal {...defaultProps} isApproved={false} />
      );

      expect(screen.getByText("Alteração Não Permitida")).toBeInTheDocument();
      expect(screen.getByText(/Sua escolha ainda não foi aprovada/)).toBeInTheDocument();
    });

    it("should show error when deadline passed", () => {
      const pastDeadline = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      renderWithProviders(
        <ChoiceChangeModal {...defaultProps} deadline={pastDeadline} />
      );

      expect(screen.getByText("Prazo Expirado")).toBeInTheDocument();
      expect(screen.getByText(/O prazo para alterar a escolha expirou/)).toBeInTheDocument();
    });

    it("should show error when change limit reached", () => {
      renderWithProviders(
        <ChoiceChangeModal {...defaultProps} changesCount={3} />
      );

      expect(screen.getByText("Limite Atingido")).toBeInTheDocument();
      expect(screen.getByText(/Você já atingiu o limite de 3 alterações/)).toBeInTheDocument();
    });

    it("should not load characters when changes not allowed", () => {
      renderWithProviders(
        <ChoiceChangeModal {...defaultProps} isApproved={false} />
      );

      expect(choiceService.getAvailableCharacters).not.toHaveBeenCalled();
    });
  });

  describe("Character Selection", () => {
    it("should allow selecting a new character", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Personagem 2")).toBeInTheDocument();
      });

      const char2Button = screen.getByText("Personagem 2").closest("button");
      await user.click(char2Button!);

      // Should show selection indicator
      await waitFor(() => {
        const selectedCard = char2Button!.closest("button");
        expect(selectedCard).toHaveClass("border-primary");
      });
    });

    it("should not allow selecting current character", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("Escolha Atual").length).toBeGreaterThan(0);
      });

      // Find the badge with "Escolha Atual" text (not the heading)
      const badges = screen.getAllByText("Escolha Atual");
      const currentCharBadge = badges.find(el => el.classList.contains("bg-blue-500"));
      expect(currentCharBadge).toBeInTheDocument();
      
      const currentCharButton = currentCharBadge?.closest("button");
      expect(currentCharButton).toBeDisabled();
    });

    it("should not allow selecting unavailable character", async () => {
      renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Indisponível")).toBeInTheDocument();
      });

      const unavailableButton = screen.getByText("Personagem 3").closest("button");
      expect(unavailableButton).toBeDisabled();
    });
  });

  describe("Reason Input", () => {
    it("should render reason textarea", async () => {
      renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Motivo da Alteração/)).toBeInTheDocument();
      });

      expect(screen.getByPlaceholderText(/Explique por que você deseja alterar/)).toBeInTheDocument();
    });

    it("should allow typing reason", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Motivo da Alteração/)).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/Explique por que você deseja alterar/);
      await user.type(textarea, "Prefiro outro personagem");

      expect(textarea).toHaveValue("Prefiro outro personagem");
    });

    it("should show minimum character requirement", async () => {
      renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Mínimo de 10 caracteres")).toBeInTheDocument();
      });
    });
  });

  describe("Submission Flow", () => {
    it("should show confirmation screen after clicking continue", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

      // Wait for characters to load
      await waitFor(() => {
        expect(screen.getByText("Personagem 2")).toBeInTheDocument();
      });

      // Select character
      const char2Button = screen.getByText("Personagem 2").closest("button");
      await user.click(char2Button!);

      // Enter reason
      const textarea = screen.getByPlaceholderText(/Explique por que você deseja alterar/);
      await user.type(textarea, "Prefiro este personagem");

      // Click continue
      const continueButton = screen.getByRole("button", { name: /Continuar/ });
      await user.click(continueButton);

      // Should show confirmation
      await waitFor(() => {
        expect(screen.getByText("Confirme Sua Nova Escolha")).toBeInTheDocument();
      });
    });

    it("should display selected character in confirmation", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Personagem 2")).toBeInTheDocument();
      });

      const char2Button = screen.getByText("Personagem 2").closest("button");
      await user.click(char2Button!);

      const textarea = screen.getByPlaceholderText(/Explique por que você deseja alterar/);
      await user.type(textarea, "Prefiro este personagem");

      const continueButton = screen.getByRole("button", { name: /Continuar/ });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText("Descrição do personagem 2")).toBeInTheDocument();
      });
    });

    it("should display reason in confirmation", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Personagem 2")).toBeInTheDocument();
      });

      const char2Button = screen.getByText("Personagem 2").closest("button");
      await user.click(char2Button!);

      const reason = "Prefiro este personagem";
      const textarea = screen.getByPlaceholderText(/Explique por que você deseja alterar/);
      await user.type(textarea, reason);

      const continueButton = screen.getByRole("button", { name: /Continuar/ });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(reason)).toBeInTheDocument();
      });
    });

    it("should allow going back from confirmation", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Personagem 2")).toBeInTheDocument();
      });

      const char2Button = screen.getByText("Personagem 2").closest("button");
      await user.click(char2Button!);

      const textarea = screen.getByPlaceholderText(/Explique por que você deseja alterar/);
      await user.type(textarea, "Prefiro este personagem");

      const continueButton = screen.getByRole("button", { name: /Continuar/ });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText("Confirme Sua Nova Escolha")).toBeInTheDocument();
      });

      const backButton = screen.getByRole("button", { name: /Voltar/ });
      await user.click(backButton);

      // Should be back to selection screen
      await waitFor(() => {
        expect(screen.getByText("Selecione o Novo Personagem")).toBeInTheDocument();
      });
    });

    it("should submit change on confirmation", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      vi.mocked(choiceService.changeCharacterChoice).mockResolvedValue({
        id: "choice-1",
        orderId: "order-1",
        orderType: "subscription_delivery",
        userId: "user-1",
        collectionId: "col-1",
        characterId: "char-2",
        characterName: "Personagem 2",
        characterImageUrl: "https://example.com/char2.jpg",
        status: "submitted",
        submittedAt: new Date().toISOString(),
        approvedAt: null,
        approvedBy: null,
        approvedByName: null,
        rejectedAt: null,
        rejectionReason: null,
        deadline: defaultProps.deadline,
        remindersSent: 0,
        lastReminderAt: null,
        previousChoiceId: null,
        changeReason: "Prefiro este personagem",
        changeCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      renderWithProviders(
        <ChoiceChangeModal {...defaultProps} onSuccess={onSuccess} />
      );

      await waitFor(() => {
        expect(screen.getByText("Personagem 2")).toBeInTheDocument();
      });

      const char2Button = screen.getByText("Personagem 2").closest("button");
      await user.click(char2Button!);

      const textarea = screen.getByPlaceholderText(/Explique por que você deseja alterar/);
      await user.type(textarea, "Prefiro este personagem");

      const continueButton = screen.getByRole("button", { name: /Continuar/ });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText("Confirme Sua Nova Escolha")).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole("button", { name: /Confirmar Alteração/ });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(choiceService.changeCharacterChoice).toHaveBeenCalledWith(
          "choice-1",
          "char-2",
          "Prefiro este personagem"
        );
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it("should disable continue button when no character selected", async () => {
      renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Personagem 2")).toBeInTheDocument();
      });

      const continueButton = screen.getByRole("button", { name: /Continuar/ });
      expect(continueButton).toBeDisabled();
    });

    it("should disable continue button when reason too short", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Personagem 2")).toBeInTheDocument();
      });

      const char2Button = screen.getByText("Personagem 2").closest("button");
      await user.click(char2Button!);

      const textarea = screen.getByPlaceholderText(/Explique por que você deseja alterar/);
      await user.type(textarea, "Curto");

      const continueButton = screen.getByRole("button", { name: /Continuar/ });
      expect(continueButton).toBeDisabled();
    });
  });

  describe("Error Handling", () => {
    it("should display error when loading characters fails", async () => {
      vi.mocked(choiceService.getAvailableCharacters).mockRejectedValue(
        new Error("Erro ao carregar")
      );

      renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Erro ao Carregar Personagens")).toBeInTheDocument();
      });
    });

    it("should handle submission error", async () => {
      const user = userEvent.setup();
      vi.mocked(choiceService.changeCharacterChoice).mockRejectedValue(
        new Error("Erro ao alterar escolha")
      );

      renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Personagem 2")).toBeInTheDocument();
      });

      const char2Button = screen.getByText("Personagem 2").closest("button");
      await user.click(char2Button!);

      const textarea = screen.getByPlaceholderText(/Explique por que você deseja alterar/);
      await user.type(textarea, "Prefiro este personagem");

      const continueButton = screen.getByRole("button", { name: /Continuar/ });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText("Confirme Sua Nova Escolha")).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole("button", { name: /Confirmar Alteração/ });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(choiceService.changeCharacterChoice).toHaveBeenCalled();
      });

      // Modal should still be open after error
      expect(screen.getByText("Alterar Escolha de Personagem")).toBeInTheDocument();
    });
  });

  describe("Modal Controls", () => {
    it("should call onOpenChange when cancel is clicked", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      renderWithProviders(
        <ChoiceChangeModal {...defaultProps} onOpenChange={onOpenChange} />
      );

      const cancelButton = screen.getByRole("button", { name: /Cancelar/ });
      await user.click(cancelButton);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("should reset state when modal reopens", async () => {
      const { rerender } = renderWithProviders(
        <ChoiceChangeModal {...defaultProps} open={false} />
      );

      rerender(
        <QueryClientProvider client={createTestQueryClient()}>
          <ChoiceChangeModal {...defaultProps} open={true} />
        </QueryClientProvider>
      );

      // Should not have any selected character
      await waitFor(() => {
        expect(screen.getByText("Personagem 2")).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/Explique por que você deseja alterar/);
      expect(textarea).toHaveValue("");
    });
  });
});
