import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CharacterEntity as Character } from "@/hooks/customer/useChoiceActions";
import { CharacterSelectionModal } from "./CharacterSelectionModal";

const mockUseAvailableCharacters = vi.fn();
const mockSubmitCharacterChoiceAction = vi.fn();

vi.mock("@/hooks/customer/useChoiceActions", () => ({
  useAvailableCharacters: (...args: unknown[]) => mockUseAvailableCharacters(...args),
  submitCharacterChoiceAction: (...args: unknown[]) => mockSubmitCharacterChoiceAction(...args),
}));

vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

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
    stockLevel: 3,
  },
  {
    id: "char-3",
    name: "Personagem C",
    description: "Descrição do Personagem C",
    imageUrl: "https://example.com/char-c.jpg",
    collectionId: "collection-1",
    isAvailable: false,
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
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAvailableCharacters.mockReturnValue({
      data: mockCharacters,
      isLoading: false,
      error: null,
    });
  });

  it("renders title, description and character grid", async () => {
    renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

    expect(screen.getByText("Escolha Seu Personagem")).toBeInTheDocument();
    expect(
      screen.getByText("Selecione o personagem que você deseja receber neste pedido.")
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Personagem A")).toBeInTheDocument();
      expect(screen.getByText("Personagem B")).toBeInTheDocument();
      expect(screen.getByText("Personagem C")).toBeInTheDocument();
      expect(screen.getByText("Personagem D")).toBeInTheDocument();
    });
  });

  it("shows descriptions, images and stock signals", async () => {
    renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Descrição do Personagem A")).toBeInTheDocument();
      expect(screen.getByAltText("Personagem A")).toHaveAttribute(
        "src",
        "https://example.com/char-a.jpg"
      );
      expect(screen.getByText("Estoque baixo")).toBeInTheDocument();
      expect(screen.getByText("Indisponível")).toBeInTheDocument();
      expect(screen.getByText("10 unidades disponíveis")).toBeInTheDocument();
      expect(screen.getByText("3 unidades disponíveis")).toBeInTheDocument();
    });
  });

  it("disables unavailable characters", async () => {
    renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

    await waitFor(() => expect(screen.getByText("Personagem C")).toBeInTheDocument());

    expect(screen.getByText("Personagem C").closest("button")).toBeDisabled();
  });

  it("shows deadline states and blocks expired submission", async () => {
    const expiredDeadline = new Date(Date.now() - 1000).toISOString();

    renderWithProviders(
      <CharacterSelectionModal {...defaultProps} deadline={expiredDeadline} />
    );

    expect(screen.getByText("Prazo expirado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continuar/i })).toBeDisabled();
  });

  it("shows urgent deadline state", () => {
    const urgentDeadline = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

    renderWithProviders(
      <CharacterSelectionModal {...defaultProps} deadline={urgentDeadline} />
    );

    expect(screen.getByText("Prazo urgente")).toBeInTheDocument();
  });

  it("selects a character and shows confirmation view", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

    await user.click(await screen.findByText("Personagem A"));
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    expect(screen.getByText("Confirme sua escolha")).toBeInTheDocument();
    expect(screen.getByText(/Você selecionou o personagem abaixo/i)).toBeInTheDocument();
  });

  it("allows returning from confirmation view", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

    await user.click(await screen.findByText("Personagem A"));
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.click(screen.getByRole("button", { name: /voltar/i }));

    expect(screen.getByText("Personagem A")).toBeInTheDocument();
    expect(screen.queryByText("Confirme sua escolha")).not.toBeInTheDocument();
  });

  it("submits selected character successfully", async () => {
    const user = userEvent.setup();
    mockSubmitCharacterChoiceAction.mockResolvedValue(undefined);

    renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

    await user.click(await screen.findByText("Personagem A"));
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.click(screen.getByRole("button", { name: /confirmar escolha/i }));

    await waitFor(() => {
      expect(mockSubmitCharacterChoiceAction).toHaveBeenCalledWith("order-123", "char-1");
      expect(defaultProps.onSuccess).toHaveBeenCalled();
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("keeps modal open when submission fails", async () => {
    const user = userEvent.setup();
    mockSubmitCharacterChoiceAction.mockRejectedValue(new Error("Erro ao enviar escolha"));

    renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

    await user.click(await screen.findByText("Personagem A"));
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.click(screen.getByRole("button", { name: /confirmar escolha/i }));

    await waitFor(() => {
      expect(mockSubmitCharacterChoiceAction).toHaveBeenCalledWith("order-123", "char-1");
      expect(defaultProps.onOpenChange).not.toHaveBeenCalledWith(false);
    });
  });

  it("renders loading, error and empty states", () => {
    mockUseAvailableCharacters.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      error: null,
    });
    const { rerender } = renderWithProviders(<CharacterSelectionModal {...defaultProps} />);
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);

    mockUseAvailableCharacters.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new Error("Erro ao carregar personagens"),
    });
    rerender(
      <QueryClientProvider client={createTestQueryClient()}>
        <CharacterSelectionModal {...defaultProps} />
      </QueryClientProvider>
    );
    expect(screen.getAllByText("Erro ao carregar personagens").length).toBeGreaterThan(0);

    mockUseAvailableCharacters.mockReturnValueOnce({
      data: [],
      isLoading: false,
      error: null,
    });
    rerender(
      <QueryClientProvider client={createTestQueryClient()}>
        <CharacterSelectionModal {...defaultProps} />
      </QueryClientProvider>
    );
    expect(screen.getByText("Nenhum personagem disponível")).toBeInTheDocument();
  });

  it("calls onOpenChange when cancel is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CharacterSelectionModal {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });
});
