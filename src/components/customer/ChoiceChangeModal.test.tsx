import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CharacterEntity as Character } from "@/hooks/customer/useChoiceActions";
import { ChoiceChangeModal } from "./ChoiceChangeModal";

const mockGetAvailableCharactersAction = vi.fn();
const mockChangeCharacterChoiceAction = vi.fn();

vi.mock("@/hooks/customer/useChoiceActions", () => ({
  getAvailableCharactersAction: (...args: unknown[]) => mockGetAvailableCharactersAction(...args),
  changeCharacterChoiceAction: (...args: unknown[]) => mockChangeCharacterChoiceAction(...args),
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
    mockGetAvailableCharactersAction.mockResolvedValue(mockCharacters);
  });

  it("renders header, current choice and remaining changes", async () => {
    renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

    expect(screen.getByText("Alterar Escolha de Personagem")).toBeInTheDocument();
    expect(
      screen.getByText("Selecione um novo personagem e informe o motivo da alteração.")
    ).toBeInTheDocument();
    expect(screen.getByText("Escolha Atual")).toBeInTheDocument();
    expect(screen.getByText("Personagem atual")).toBeInTheDocument();
    expect(screen.getByText("Alterações restantes")).toBeInTheDocument();
    expect(screen.getByText(/Você pode alterar sua escolha mais/)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockGetAvailableCharactersAction).toHaveBeenCalledWith("col-1");
      expect(screen.getByText("Personagem 2")).toBeInTheDocument();
    });
  });

  it("shows last-change warning copy", () => {
    renderWithProviders(<ChoiceChangeModal {...defaultProps} changesCount={2} />);

    expect(screen.getByText("Alterações restantes")).toBeInTheDocument();
    expect(screen.getByText(/vez\./)).toBeInTheDocument();
  });

  it("marks current, unavailable and low-stock characters", async () => {
    renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getAllByText("Escolha Atual").length).toBeGreaterThan(0);
      expect(screen.getByText("Indisponível")).toBeInTheDocument();
      expect(screen.getByText("Estoque baixo")).toBeInTheDocument();
    });

    expect(screen.getByText("Personagem 3").closest("button")).toBeDisabled();
  });

  it("shows validation states when change is not allowed", () => {
    const { rerender } = renderWithProviders(
      <ChoiceChangeModal {...defaultProps} isApproved={false} />
    );

    expect(screen.getByText("Alteração não permitida")).toBeInTheDocument();
    expect(screen.getByText(/Sua escolha ainda não foi aprovada/)).toBeInTheDocument();
    expect(mockGetAvailableCharactersAction).not.toHaveBeenCalled();

    rerender(
      <QueryClientProvider client={createTestQueryClient()}>
        <ChoiceChangeModal
          {...defaultProps}
          deadline={new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}
        />
      </QueryClientProvider>
    );
    expect(screen.getByText("Prazo expirado")).toBeInTheDocument();

    rerender(
      <QueryClientProvider client={createTestQueryClient()}>
        <ChoiceChangeModal {...defaultProps} changesCount={3} />
      </QueryClientProvider>
    );
    expect(screen.getByText("Limite atingido")).toBeInTheDocument();
  });

  it("selects a new character and requires a reason", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

    await user.click(await screen.findByText("Personagem 2"));
    const selectedCard = screen.getByText("Personagem 2").closest("button");
    expect(selectedCard).toHaveClass("border-[hsl(var(--gold-accent))]");

    const textarea = screen.getByPlaceholderText(/Explique por que você deseja alterar/i);
    await user.type(textarea, "Prefiro outro personagem");
    expect(textarea).toHaveValue("Prefiro outro personagem");
    expect(screen.getByText("Mínimo de 10 caracteres")).toBeInTheDocument();
  });

  it("does not allow selecting current character", async () => {
    renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

    await waitFor(() => expect(screen.getAllByText("Escolha Atual").length).toBeGreaterThan(0));

    const currentBadge = screen
      .getAllByText("Escolha Atual")
      .find((element) => element.classList.contains("bg-sky-500"));

    expect(currentBadge?.closest("button")).toBeDisabled();
  });

  it("shows confirmation and allows going back", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

    await user.click(await screen.findByText("Personagem 2"));
    await user.type(
      screen.getByPlaceholderText(/Explique por que você deseja alterar/i),
      "Prefiro este personagem"
    );
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    expect(screen.getByText("Confirme sua nova escolha")).toBeInTheDocument();
    expect(screen.getByText("Motivo da alteração")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /voltar/i }));
    expect(screen.getByText("Selecione o Novo Personagem")).toBeInTheDocument();
  });

  it("submits change on confirmation", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    mockChangeCharacterChoiceAction.mockResolvedValue({ id: "choice-1", status: "submitted" });

    renderWithProviders(<ChoiceChangeModal {...defaultProps} onSuccess={onSuccess} />);

    await user.click(await screen.findByText("Personagem 2"));
    await user.type(
      screen.getByPlaceholderText(/Explique por que você deseja alterar/i),
      "Prefiro este personagem"
    );
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.click(screen.getByRole("button", { name: /confirmar alteração/i }));

    await waitFor(() => {
      expect(mockChangeCharacterChoiceAction).toHaveBeenCalledWith(
        "choice-1",
        "char-2",
        "Prefiro este personagem"
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("disables continue until character and valid reason are provided", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

    await screen.findByText("Personagem 2");
    expect(screen.getByRole("button", { name: /continuar/i })).toBeDisabled();

    await user.click(screen.getByText("Personagem 2"));
    await user.type(screen.getByPlaceholderText(/Explique por que você deseja alterar/i), "Curto");
    expect(screen.getByRole("button", { name: /continuar/i })).toBeDisabled();
  });

  it("renders load error when characters fail to load", async () => {
    mockGetAvailableCharactersAction.mockRejectedValueOnce(new Error("Erro ao carregar"));
    renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Erro ao carregar personagens")).toBeInTheDocument();
    });
  });

  it("keeps modal open after submission error", async () => {
    mockGetAvailableCharactersAction.mockResolvedValue(mockCharacters);
    mockChangeCharacterChoiceAction.mockRejectedValue(new Error("Erro ao alterar escolha"));
    renderWithProviders(<ChoiceChangeModal {...defaultProps} />);

    const user = userEvent.setup();
    await user.click(await screen.findByText("Personagem 2"));
    await user.type(
      screen.getByPlaceholderText(/Explique por que você deseja alterar/i),
      "Prefiro este personagem"
    );
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.click(screen.getByRole("button", { name: /confirmar alteração/i }));

    await waitFor(() => expect(mockChangeCharacterChoiceAction).toHaveBeenCalled());
    expect(screen.getByText("Alterar Escolha de Personagem")).toBeInTheDocument();
  });

  it("calls onOpenChange when cancel is clicked and resets on reopen", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    const { rerender } = renderWithProviders(
      <ChoiceChangeModal {...defaultProps} onOpenChange={onOpenChange} />
    );

    await user.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    rerender(
      <QueryClientProvider client={createTestQueryClient()}>
        <ChoiceChangeModal {...defaultProps} open={false} />
      </QueryClientProvider>
    );
    rerender(
      <QueryClientProvider client={createTestQueryClient()}>
        <ChoiceChangeModal {...defaultProps} open />
      </QueryClientProvider>
    );

    await screen.findByText("Personagem 2");
    expect(screen.getByPlaceholderText(/Explique por que você deseja alterar/i)).toHaveValue("");
  });
});
