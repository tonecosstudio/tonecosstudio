/**
 * CharacterSelectionModal Component Tests
 * 
 * Tests for the character selection modal component including:
 * - Character grid display
 * - Stock level indicators
 * - Deadline countdown
 * - Character selection and submission
 * - Error handling
 * - Loading states
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CharacterSelectionModal } from "./CharacterSelectionModal";
import type { CharacterEntity as Character } from "@/hooks/customer/useChoiceActions";

const mockUseAvailableCharacters = vi.fn();
const mockSubmitMutate = vi.fn();

vi.mock("@/hooks/customer/useChoiceActions", () => ({
  useAvailableCharacters: (...args: unknown[]) => mockUseAvailableCharacters(...args),
  useSubmitCharacterChoice: () => ({
    isPending: false,
    mutate: mockSubmitMutate,
  }),
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
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

// Mock characters data
const mockCharacters: Character[] = [
  {
    id: "char-1",
    name: "Personagem A",
    description: "Descrição do Personagem A",
    imageUrl: "https://example.com/char-a.jpg",
    collectionId: "collection-1",
    isAvailable: true,
    stockLevel: 10,
  },
  {
    id: "char-2",
    name: "Personagem B",
    description: "Descrição do Personagem B",
    imageUrl: "https://example.com/char-b.jpg",
    collectionId: "collection-1",
    isAvailable: true,
    stockLevel: 3, // Low stock
  },
  {
    id: "char-3",
    name: "Personagem C",
    description: "Descrição do Personagem C",
    imageUrl: "https://example.com/char-c.jpg",
    collectionId: "collection-1",
    isAvailable: false, // Unavailable
    stockLevel: 0,
  },
  {
    id: "char-4",
    name: "Personagem D",
    description: null,
    imageUrl: null,
    collectionId: "collection-1",
    isAvailable: true,
  },
];

describe("CharacterSelectionModal", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    orderId: "order-123",
    collectionId: "collection-1",
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Display and Layout", () => {
    it("should render modal with title and description", async () => {
      mockUseAvailableCharacters.mockReturnValue({ data: mockCharacters, isLoading: false, error: null });

      renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

      expect(screen.getByText("Escolha Seu Personagem")).toBeInTheDocument();
      expect(screen.getByText("Selecione o personagem que você deseja receber neste pedido.")).toBeInTheDocument();
    });

    it("should display all available characters in grid", async () => {
      mockUseAvailableCharacters.mockReturnValue({ data: mockCharacters, isLoading: false, error: null });

      renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Personagem A")).toBeInTheDocument();
        expect(screen.getByText("Personagem B")).toBeInTheDocument();
        expect(screen.getByText("Personagem C")).toBeInTheDocument();
        expect(screen.getByText("Personagem D")).toBeInTheDocument();
      });
    });

    it("should display character images", async () => {
      mockUseAvailableCharacters.mockReturnValue({ data: mockCharacters, isLoading: false, error: null });

      renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

      await waitFor(() => {
        const images = screen.getAllByRole("img");
        expect(images.length).toBeGreaterThan(0);
        expect(images[0]).toHaveAttribute("alt", "Personagem A");
      });
    });

    it("should display character descriptions", async () => {
      mockUseAvailableCharacters.mockReturnValue({ data: mockCharacters, isLoading: false, error: null });

      renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Descrição do Personagem A")).toBeInTheDocument();
        expect(screen.getByText("Descrição do Personagem B")).toBeInTheDocument();
      });
    });

    it("should handle characters without images", async () => {
      mockUseAvailableCharacters.mockReturnValue({ data: mockCharacters, isLoading: false, error: null });

      renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Personagem D")).toBeInTheDocument();
      });
    });
  });

  describe("Stock Level Indicators", () => {
    it("should show low stock badge for characters with stock <= 5", async () => {
      mockUseAvailableCharacters.mockReturnValue({ data: mockCharacters, isLoading: false, error: null });

      renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Estoque Baixo")).toBeInTheDocument();
      });
    });

    it("should show unavailable overlay for out of stock characters", async () => {
      mockUseAvailableCharacters.mockReturnValue({ data: mockCharacters, isLoading: false, error: null });

      renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Indisponível")).toBeInTheDocument();
      });
    });

    it("should disable selection for unavailable characters", async () => {
      mockUseAvailableCharacters.mockReturnValue({ data: mockCharacters, isLoading: false, error: null });
      renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Personagem C")).toBeInTheDocument();
      });

      const unavailableCard = screen.getByText("Personagem C").closest("button");
      expect(unavailableCard).toBeDisabled();
    });

    it("should display stock level count", async () => {
      mockUseAvailableCharacters.mockReturnValue({ data: mockCharacters, isLoading: false, error: null });

      renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("10 unidades disponíveis")).toBeInTheDocument();
        expect(screen.getByText("3 unidades disponíveis")).toBeInTheDocument();
      });
    });
  });

  describe("Deadline Countdown", () => {
    it("should display deadline countdown", async () => {
      mockUseAvailableCharacters.mockReturnValue({ data: mockCharacters, isLoading: false, error: null });

      renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Prazo para Escolha")).toBeInTheDocument();
      });
    });

    it("should show urgent alert when deadline < 24h", async () => {
      mockUseAvailableCharacters.mockReturnValue({ data: mockCharacters, isLoading: false, error: null });
      
      const urgentDeadline = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(); // 12 hours

      renderWithProviders(
        <CharacterSelectionModal {...defaultProps} deadline={urgentDeadline} />
      );

      await waitFor(() => {
        expect(screen.getByText("Prazo Urgente!")).toBeInTheDocument();
      });
    });

    it("should show expired alert when deadline has passed", async () => {
      mockUseAvailableCharacters.mockReturnValue({ data: mockCharacters, isLoading: false, error: null });
      
      const expiredDeadline = new Date(Date.now() - 1000).toISOString(); // Past

      renderWithProviders(
        <CharacterSelectionModal {...defaultProps} deadline={expiredDeadline} />
      );

      await waitFor(() => {
        expect(screen.getByText("Prazo Expirado")).toBeInTheDocument();
      });
    });

    it("should disable submission when deadline has passed", async () => {
      mockUseAvailableCharacters.mockReturnValue({ data: mockCharacters, isLoading: false, error: null });
      
      const expiredDeadline = new Date(Date.now() - 1000).toISOString();

      renderWithProviders(
        <CharacterSelectionModal {...defaultProps} deadline={expiredDeadline} />
      );

      await waitFor(() => {
        const continueButton = screen.getByRole("button", { name: /continuar/i });
        expect(continueButton).toBeDisabled();
      });
    });
  });

  describe("Character Selection", () => {
    it("should allow selecting a character", async () => {
      mockUseAvailableCharacters.mockReturnValue({ data: mockCharacters, isLoading: false, error: null });
      const user = userEvent.setup();

      renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Personagem A")).toBeInTheDocument();
      });

      const characterCard = screen.getByText("Personagem A").closest("button");
      await user.click(characterCard!);

      // Should show visual selection indicator
      await waitFor(() => {
        const card = screen.getByText("Personagem A").closest("button");
        expect(card).toHaveClass("border-primary");
      });
    });

    it("should show confirmation view after clicking continue", async () => {
      mockUseAvailableCharacters.mockReturnValue({ data: mockCharacters, isLoading: false, error: null });
      const user = userEvent.setup();

      renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Personagem A")).toBeInTheDocument();
      });

      // Select character
      const characterCard = screen.getByText("Personagem A").closest("button");
      await user.click(characterCard!);

      // Click continue
      const continueButton = screen.getByRole("button", { name: /continuar/i });
      await user.click(continueButton);

      // Should show confirmation view
      await waitFor(() => {
        expect(screen.getByText("Confirme Sua Escolha")).toBeInTheDocument();
      });
    });

    it("should allow going back from confirmation view", async () => {
      mockUseAvailableCharacters.mockReturnValue({ data: mockCharacters, isLoading: false, error: null });
      const user = userEvent.setup();

      renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Personagem A")).toBeInTheDocument();
      });

      // Select and continue
      const characterCard = screen.getByText("Personagem A").closest("button");
      await user.click(characterCard!);
      const continueButton = screen.getByRole("button", { name: /continuar/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText("Confirme Sua Escolha")).toBeInTheDocument();
      });

      // Click back
      const backButton = screen.getByRole("button", { name: /voltar/i });
      await user.click(backButton);

      // Should return to character grid
      await waitFor(() => {
        expect(screen.getByText("Personagem A")).toBeInTheDocument();
        expect(screen.queryByText("Confirme Sua Escolha")).not.toBeInTheDocument();
      });
    });
  });

  describe("Character Submission", () => {
    it("should submit character choice successfully", async () => {
      mockUseAvailableCharacters.mockReturnValue({ data: mockCharacters, isLoading: false, error: null });
      mockSubmitMutate.mockImplementation((_characterId: string, options?: { onSuccess?: () => void }) => { options?.onSuccess?.(); });

      const user = userEvent.setup();

      renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Personagem A")).toBeInTheDocument();
      });

      // Select character
      const characterCard = screen.getByText("Personagem A").closest("button");
      await user.click(characterCard!);

      // Continue to confirmation
      const continueButton = screen.getByRole("button", { name: /continuar/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText("Confirme Sua Escolha")).toBeInTheDocument();
      });

      // Confirm
      const confirmButton = screen.getByRole("button", { name: /confirmar escolha/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockSubmitMutate).toHaveBeenCalled();
        expect(defaultProps.onSuccess).toHaveBeenCalled();
        expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("should handle submission error", async () => {
      mockUseAvailableCharacters.mockReturnValue({ data: mockCharacters, isLoading: false, error: null });
      mockSubmitMutate.mockImplementation((_characterId: string, options?: { onError?: (error: Error) => void }) => { options?.onError?.(new Error("Erro ao enviar escolha")); });

      const user = userEvent.setup();

      renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Personagem A")).toBeInTheDocument();
      });

      // Select and submit
      const characterCard = screen.getByText("Personagem A").closest("button");
      await user.click(characterCard!);
      const continueButton = screen.getByRole("button", { name: /continuar/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText("Confirme Sua Escolha")).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole("button", { name: /confirmar escolha/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockSubmitMutate).toHaveBeenCalled();
        // Modal should remain open on error
        expect(defaultProps.onOpenChange).not.toHaveBeenCalledWith(false);
      });
    });

    it("should disable buttons during submission", async () => {
      mockUseAvailableCharacters.mockReturnValue({ data: mockCharacters, isLoading: false, error: null });
      mockSubmitMutate.mockImplementation(() => undefined);

      const user = userEvent.setup();

      renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Personagem A")).toBeInTheDocument();
      });

      // Select and submit
      const characterCard = screen.getByText("Personagem A").closest("button");
      await user.click(characterCard!);
      const continueButton = screen.getByRole("button", { name: /continuar/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText("Confirme Sua Escolha")).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole("button", { name: /confirmar escolha/i });
      await user.click(confirmButton);

      // Buttons should be disabled during submission
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /enviando/i })).toBeDisabled();
      });
    });
  });

  describe("Loading and Error States", () => {
    it("should show loading skeleton while fetching characters", async () => {
      mockUseAvailableCharacters.mockReturnValue({ data: undefined, isLoading: true, error: null });

      renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

      // Should show loading state - check for skeleton class or loading grid
      await waitFor(() => {
        // The LoadingSkeleton component renders a grid with Skeleton components
        const gridElements = document.querySelectorAll('.grid');
        expect(gridElements.length).toBeGreaterThan(0);
      });
    });

    it("should show error message when fetch fails", async () => {
      mockUseAvailableCharacters.mockReturnValue({ data: undefined, isLoading: false, error: new Error("Erro ao carregar personagens") });

      renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Erro ao Carregar Personagens")).toBeInTheDocument();
      });
    });

    it("should show message when no characters available", async () => {
      mockUseAvailableCharacters.mockReturnValue({ data: [], isLoading: false, error: null });

      renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Nenhum Personagem Disponível")).toBeInTheDocument();
      });
    });
  });

  describe("Modal Behavior", () => {
    it("should call onOpenChange when cancel is clicked", async () => {
      mockUseAvailableCharacters.mockReturnValue({ data: mockCharacters, isLoading: false, error: null });
      const user = userEvent.setup();

      renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Personagem A")).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole("button", { name: /cancelar/i });
      await user.click(cancelButton);

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });

    it("should reset selection when modal reopens", async () => {
      mockUseAvailableCharacters.mockReturnValue({ data: mockCharacters, isLoading: false, error: null });
      const user = userEvent.setup();

      const { rerender } = renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Personagem A")).toBeInTheDocument();
      });

      // Select character
      const characterCard = screen.getByText("Personagem A").closest("button");
      await user.click(characterCard!);

      // Close modal
      rerender(
        <QueryClientProvider client={createTestQueryClient()}>
          <CharacterSelectionModal {...defaultProps} open={false} />
        </QueryClientProvider>
      );

      // Reopen modal
      rerender(
        <QueryClientProvider client={createTestQueryClient()}>
          <CharacterSelectionModal {...defaultProps} open={true} />
        </QueryClientProvider>
      );

      // Selection should be reset
      await waitFor(() => {
        const card = screen.getByText("Personagem A").closest("button");
        expect(card).not.toHaveClass("border-primary");
      });
    });
  });
});

