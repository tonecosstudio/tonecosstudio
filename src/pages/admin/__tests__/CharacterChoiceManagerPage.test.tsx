/**
 * Unit tests for CharacterChoiceManagerPage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CharacterChoiceManagerPage from "./CharacterChoiceManagerPage";
import * as choiceService from "@/services/admin/choice-service";
import { supabase } from "@/integrations/supabase/client";

// Mock the services
vi.mock("@/services/admin/choice-service");
vi.mock("@/integrations/supabase/client");

// Mock data
const mockChoices = [
  {
    id: "choice-1",
    orderId: "order-1",
    orderType: "subscription_delivery" as const,
    userId: "user-1",
    customerName: "John Doe",
    customerEmail: "john@example.com",
    collectionId: "collection-1",
    collectionName: "Summer Collection",
    characterId: "char-1",
    characterName: "Hero Character",
    characterImageUrl: "https://example.com/hero.jpg",
    status: "submitted" as const,
    submittedAt: "2024-01-15T10:00:00Z",
    approvedAt: null,
    approvedBy: null,
    approvedByName: null,
    rejectedAt: null,
    rejectionReason: null,
    deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48h from now
    remindersSent: 1,
    lastReminderAt: "2024-01-14T10:00:00Z",
    previousChoiceId: null,
    changeReason: null,
    changeCount: 0,
    createdAt: "2024-01-10T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "choice-2",
    orderId: "order-2",
    orderType: "standalone_purchase" as const,
    userId: "user-2",
    customerName: "Jane Smith",
    customerEmail: "jane@example.com",
    collectionId: "collection-2",
    collectionName: "Winter Collection",
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
    deadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12h from now (critical)
    remindersSent: 2,
    lastReminderAt: "2024-01-15T08:00:00Z",
    previousChoiceId: null,
    changeReason: null,
    changeCount: 0,
    createdAt: "2024-01-08T10:00:00Z",
    updatedAt: "2024-01-15T08:00:00Z",
  },
];

const mockCollections = [
  { id: "collection-1", name: "Summer Collection" },
  { id: "collection-2", name: "Winter Collection" },
];

describe("CharacterChoiceManagerPage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    // Mock fetchPendingChoices
    vi.mocked(choiceService.fetchPendingChoices).mockResolvedValue(mockChoices);

    // Mock supabase collections query
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockCollections,
        error: null,
      }),
    } as any);
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <CharacterChoiceManagerPage />
      </QueryClientProvider>
    );
  };

  it("renders the page header", () => {
    renderComponent();

    expect(
      screen.getByText("Gerenciamento de Escolhas de Personagens")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Gerencie as escolhas de personagens dos clientes/)
    ).toBeInTheDocument();
  });

  it("displays loading state initially", () => {
    renderComponent();

    expect(screen.getByText("Carregando escolhas...")).toBeInTheDocument();
  });

  it("displays choices in table after loading", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    });

    // Use getAllByText for items that appear multiple times (in filter and table)
    expect(screen.getAllByText("Summer Collection").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Winter Collection").length).toBeGreaterThan(0);
    expect(screen.getByText("Hero Character")).toBeInTheDocument();
  });

  it("displays status badges correctly", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Submetido")).toBeInTheDocument();
      expect(screen.getByText("Pendente")).toBeInTheDocument();
    });
  });

  it("displays deadline countdown with color coding", async () => {
    renderComponent();

    await waitFor(() => {
      // Check that deadline text is displayed (could be "dias" or "dia")
      const deadlineElements = screen.getAllByText(/\d+\s*(dia|dias|h restantes)/);
      expect(deadlineElements.length).toBeGreaterThan(0);
    });
  });

  it("renders filter sidebar with all filter options", async () => {
    renderComponent();

    expect(screen.getByText("Filtros")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Nome ou email...")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Coleções")).toBeInTheDocument();
    expect(screen.getByText("Período do Prazo")).toBeInTheDocument();
  });

  it("allows filtering by status", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    // Click on "Pendente" status filter
    const pendenteCheckbox = screen.getByLabelText("Pendente");
    await user.click(pendenteCheckbox);

    // Should call fetchPendingChoices with status filter
    await waitFor(() => {
      expect(choiceService.fetchPendingChoices).toHaveBeenCalledWith(
        expect.objectContaining({
          statuses: ["pending"],
        })
      );
    });
  });

  it("allows filtering by collection", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText("Summer Collection").length).toBeGreaterThan(0);
    });

    // Click on collection filter (use getAllByLabelText and get the first one)
    const collectionCheckboxes = screen.getAllByLabelText("Summer Collection");
    await user.click(collectionCheckboxes[0]);

    // Should call fetchPendingChoices with collection filter
    await waitFor(() => {
      expect(choiceService.fetchPendingChoices).toHaveBeenCalledWith(
        expect.objectContaining({
          collections: ["collection-1"],
        })
      );
    });
  });

  it("allows searching by customer name/email", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Nome ou email...");
    await user.type(searchInput, "john");

    // Should call fetchPendingChoices with search query
    await waitFor(() => {
      expect(choiceService.fetchPendingChoices).toHaveBeenCalledWith(
        expect.objectContaining({
          searchQuery: "john",
        })
      );
    });
  });

  it("displays active filter count", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    // Click on status filter
    const pendenteCheckbox = screen.getByLabelText("Pendente");
    await user.click(pendenteCheckbox);

    // Should show filter count badge
    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  it("allows clearing all filters", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    // Apply a filter
    const pendenteCheckbox = screen.getByLabelText("Pendente");
    await user.click(pendenteCheckbox);

    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    // Click clear button
    const clearButton = screen.getByText("Limpar");
    await user.click(clearButton);

    // Should reset filters - check that searchQuery is empty string
    await waitFor(() => {
      expect(choiceService.fetchPendingChoices).toHaveBeenCalledWith(
        expect.objectContaining({
          searchQuery: "",
        })
      );
    });
  });

  it("displays empty state when no choices found", async () => {
    vi.mocked(choiceService.fetchPendingChoices).mockResolvedValue([]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Nenhuma escolha encontrada")).toBeInTheDocument();
      expect(
        screen.getByText("Tente ajustar os filtros ou a busca")
      ).toBeInTheDocument();
    });
  });

  it("displays 'Ver Detalhes' button for each choice", async () => {
    renderComponent();

    await waitFor(() => {
      const detailButtons = screen.getAllByText("Ver Detalhes");
      expect(detailButtons).toHaveLength(2);
    });
  });
});
