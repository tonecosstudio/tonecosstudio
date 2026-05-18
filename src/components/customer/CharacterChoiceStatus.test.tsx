/**
 * Tests for CharacterChoiceStatus Component
 *
 * Task: 3.2.4 Add choice status to customer order view
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CharacterChoiceStatus } from "./CharacterChoiceStatus";
import * as useCharacterChoiceHook from "@/hooks/customer/useCharacterChoice";

vi.mock("@/hooks/customer/useCharacterChoice");

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

  const renderComponent = (props = {}) => {
    const defaultProps = {
      orderId: "order-123",
      collectionId: "collection-1",
      collectionName: "Test Collection",
      orderType: "standalone_purchase" as const,
      ...props,
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <CharacterChoiceStatus {...defaultProps} />
      </QueryClientProvider>
    );
  };

  it("should show loading state initially", () => {
    vi.mocked(useCharacterChoiceHook.useCharacterChoice).mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    } as never);

    renderComponent();
    expect(screen.getByText("Escolha de Personagem")).toBeInTheDocument();
  });

  it("should show 'Choose Character' button when no choice exists", async () => {
    vi.mocked(useCharacterChoiceHook.useCharacterChoice).mockReturnValue({
      data: null,
      isLoading: false,
      refetch: vi.fn(),
    } as never);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Escolher Personagem")).toBeInTheDocument();
    });
  });

  it("should show pending status with deadline", async () => {
    const mockChoice = {
      id: "choice-1",
      orderId: "order-123",
      orderType: "standalone_purchase" as const,
      userId: "user-1",
      collectionId: "collection-1",
      characterId: null,
      characterName: null,
      characterImageUrl: null,
      status: "pending" as const,
      submittedAt: null,
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

    vi.mocked(useCharacterChoiceHook.useCharacterChoice).mockReturnValue({
      data: mockChoice,
      isLoading: false,
      refetch: vi.fn(),
    } as never);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Você ainda não escolheu um personagem/i)).toBeInTheDocument();
      expect(screen.getByText("Escolher Personagem")).toBeInTheDocument();
    });
  });

  it("should show submitted status with character info", async () => {
    const mockChoice = {
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

    vi.mocked(useCharacterChoiceHook.useCharacterChoice).mockReturnValue({
      data: mockChoice,
      isLoading: false,
      refetch: vi.fn(),
    } as never);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Escolha Enviada - Aguardando Aprovação")).toBeInTheDocument();
      expect(screen.getByText("Test Character")).toBeInTheDocument();
      expect(screen.getByText(/3 alterações restantes/i)).toBeInTheDocument();
    });
  });

  it("should show approved status with character image", async () => {
    const mockChoice = {
      id: "choice-1",
      orderId: "order-123",
      orderType: "standalone_purchase" as const,
      userId: "user-1",
      collectionId: "collection-1",
      characterId: "char-1",
      characterName: "Approved Character",
      characterImageUrl: "https://example.com/char.jpg",
      status: "approved" as const,
      submittedAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      approvedBy: "admin-1",
      approvedByName: "Admin User",
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

    vi.mocked(useCharacterChoiceHook.useCharacterChoice).mockReturnValue({
      data: mockChoice,
      isLoading: false,
      refetch: vi.fn(),
    } as never);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Escolha Aprovada")).toBeInTheDocument();
      expect(screen.getByText("Approved Character")).toBeInTheDocument();
      const aprovadoBadges = screen.getAllByText("Aprovado");
      expect(aprovadoBadges.length).toBeGreaterThan(0);
    });
  });

  it("should show rejected status with reason", async () => {
    const mockChoice = {
      id: "choice-1",
      orderId: "order-123",
      orderType: "standalone_purchase" as const,
      userId: "user-1",
      collectionId: "collection-1",
      characterId: "char-1",
      characterName: "Rejected Character",
      characterImageUrl: "https://example.com/char.jpg",
      status: "rejected" as const,
      submittedAt: new Date().toISOString(),
      approvedAt: null,
      approvedBy: null,
      approvedByName: null,
      rejectedAt: new Date().toISOString(),
      rejectionReason: "Character out of stock",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      remindersSent: 0,
      lastReminderAt: null,
      previousChoiceId: null,
      changeReason: null,
      changeCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.mocked(useCharacterChoiceHook.useCharacterChoice).mockReturnValue({
      data: mockChoice,
      isLoading: false,
      refetch: vi.fn(),
    } as never);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Escolha Rejeitada")).toBeInTheDocument();
      expect(screen.getByText("Character out of stock")).toBeInTheDocument();
      expect(screen.getByText("Escolher Outro Personagem")).toBeInTheDocument();
    });
  });

  it("should show locked status", async () => {
    const mockChoice = {
      id: "choice-1",
      orderId: "order-123",
      orderType: "standalone_purchase" as const,
      userId: "user-1",
      collectionId: "collection-1",
      characterId: "char-1",
      characterName: "Locked Character",
      characterImageUrl: "https://example.com/char.jpg",
      status: "locked" as const,
      submittedAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      approvedBy: "admin-1",
      approvedByName: "Admin User",
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

    vi.mocked(useCharacterChoiceHook.useCharacterChoice).mockReturnValue({
      data: mockChoice,
      isLoading: false,
      refetch: vi.fn(),
    } as never);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Escolha Bloqueada")).toBeInTheDocument();
      expect(screen.getByText("Locked Character")).toBeInTheDocument();
      expect(screen.getByText("Em produção")).toBeInTheDocument();
    });
  });

  it("should not show change button when change limit reached", async () => {
    const mockChoice = {
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
      changeCount: 3, // Max changes reached
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.mocked(useCharacterChoiceHook.useCharacterChoice).mockReturnValue({
      data: mockChoice,
      isLoading: false,
      refetch: vi.fn(),
    } as never);

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/Alterar Escolha/i)).not.toBeInTheDocument();
    });
  });

  it("should show deadline expired warning", async () => {
    const mockChoice = {
      id: "choice-1",
      orderId: "order-123",
      orderType: "standalone_purchase" as const,
      userId: "user-1",
      collectionId: "collection-1",
      characterId: null,
      characterName: null,
      characterImageUrl: null,
      status: "pending" as const,
      submittedAt: null,
      approvedAt: null,
      approvedBy: null,
      approvedByName: null,
      rejectedAt: null,
      rejectionReason: null,
      deadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Expired
      remindersSent: 3,
      lastReminderAt: new Date().toISOString(),
      previousChoiceId: null,
      changeReason: null,
      changeCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.mocked(useCharacterChoiceHook.useCharacterChoice).mockReturnValue({
      data: mockChoice,
      isLoading: false,
      refetch: vi.fn(),
    } as never);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/O prazo para escolher o personagem expirou/i)).toBeInTheDocument();
    });
  });
});
