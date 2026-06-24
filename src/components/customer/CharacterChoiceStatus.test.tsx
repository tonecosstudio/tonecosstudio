import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as useCharacterChoiceHook from "@/hooks/customer/useCharacterChoice";
import { CharacterChoiceStatus } from "./CharacterChoiceStatus";

vi.mock("@/hooks/customer/useCharacterChoice");
vi.mock("./CharacterSelectionModal", () => ({
  CharacterSelectionModal: () => null,
}));
vi.mock("./ChoiceChangeModal", () => ({
  ChoiceChangeModal: () => null,
}));

describe("CharacterChoiceStatus", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <CharacterChoiceStatus
          orderId="order-123"
          collectionId="collection-1"
          collectionName="Test Collection"
          orderType="standalone_purchase"
        />
      </QueryClientProvider>
    );

  const baseChoice = {
    id: "choice-1",
    orderId: "order-123",
    orderType: "standalone_purchase" as const,
    userId: "user-1",
    collectionId: "collection-1",
    characterId: "char-1",
    characterName: "Test Character",
    characterImageUrl: "https://example.com/char.jpg",
    status: "submitted" as const,
    submittedAt: new Date().toISOString(),
    approvedAt: null,
    approvedBy: null,
    approvedByName: null,
    rejectedAt: null,
    rejectionReason: null,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    remindersSent: 0,
    lastReminderAt: null,
    previousChoiceId: null,
    changeReason: null,
    changeCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockChoice = (choice: unknown, isLoading = false) => {
    vi.mocked(useCharacterChoiceHook.useCharacterChoice).mockReturnValue({
      data: choice,
      isLoading,
      refetch: vi.fn(),
    } as never);
  };

  it("renders loading state", () => {
    mockChoice(undefined, true);

    renderComponent();

    expect(screen.getByText("Escolha de personagem")).toBeInTheDocument();
  });

  it("asks the customer to choose a character when no choice exists", async () => {
    mockChoice(null);

    renderComponent();

    expect(await screen.findByText("Escolher personagem")).toBeInTheDocument();
    expect(screen.getByText(/Voce precisa escolher um personagem/)).toBeInTheDocument();
  });

  it("shows pending status with deadline", async () => {
    mockChoice({
      ...baseChoice,
      characterId: null,
      characterName: null,
      characterImageUrl: null,
      status: "pending",
    });

    renderComponent();

    expect(await screen.findByText(/Voce ainda nao escolheu um personagem/)).toBeInTheDocument();
    expect(screen.getByText("Escolher personagem")).toBeInTheDocument();
    expect(screen.getByText(/Prazo:/)).toBeInTheDocument();
  });

  it("shows submitted status with change availability", async () => {
    mockChoice(baseChoice);

    renderComponent();

    expect(await screen.findByText("Escolha enviada - aguardando aprovacao")).toBeInTheDocument();
    expect(screen.getByText("Test Character")).toBeInTheDocument();
    expect(screen.getByText(/3 alteracoes restantes/)).toBeInTheDocument();
  });

  it("shows approved status", async () => {
    mockChoice({
      ...baseChoice,
      characterName: "Approved Character",
      status: "approved",
      approvedAt: new Date().toISOString(),
    });

    renderComponent();

    expect(await screen.findByText("Escolha aprovada")).toBeInTheDocument();
    expect(screen.getByText("Approved Character")).toBeInTheDocument();
    expect(screen.getAllByText("Aprovado").length).toBeGreaterThan(0);
  });

  it("shows rejected status with reason", async () => {
    mockChoice({
      ...baseChoice,
      characterName: "Rejected Character",
      status: "rejected",
      rejectedAt: new Date().toISOString(),
      rejectionReason: "Personagem indisponivel",
    });

    renderComponent();

    expect((await screen.findAllByText("Escolha rejeitada")).length).toBeGreaterThan(0);
    expect(screen.getByText("Personagem indisponivel")).toBeInTheDocument();
    expect(screen.getByText("Escolher outro personagem")).toBeInTheDocument();
  });

  it("shows locked status", async () => {
    mockChoice({
      ...baseChoice,
      characterName: "Locked Character",
      status: "locked",
      approvedAt: new Date().toISOString(),
    });

    renderComponent();

    expect(await screen.findByText("Escolha bloqueada")).toBeInTheDocument();
    expect(screen.getByText("Locked Character")).toBeInTheDocument();
    expect(screen.getByText("Em producao")).toBeInTheDocument();
  });

  it("hides change button after change limit", async () => {
    mockChoice({
      ...baseChoice,
      changeCount: 3,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/Alterar escolha/)).not.toBeInTheDocument();
    });
  });

  it("shows expired deadline warning", async () => {
    mockChoice({
      ...baseChoice,
      characterId: null,
      characterName: null,
      characterImageUrl: null,
      status: "pending",
      deadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    });

    renderComponent();

    expect(await screen.findByText(/O prazo para escolher o personagem expirou/)).toBeInTheDocument();
  });
});
