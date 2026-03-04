/**
 * BlockedItemsView Component Tests
 *
 * Tests for the BlockedItemsView component that displays all blocked production items.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BlockedItemsView } from "./BlockedItemsView";
import * as productionService from "@/services/admin/production-service";
import { supabase } from "@/integrations/supabase/client";

// Mock the services
vi.mock("@/services/admin/production-service");
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock the UnblockProductionModal
vi.mock("./UnblockProductionModal", () => ({
  UnblockProductionModal: ({ isOpen, productionQueueId }: any) =>
    isOpen ? <div data-testid="unblock-modal">Unblock Modal for {productionQueueId}</div> : null,
}));

describe("BlockedItemsView", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BlockedItemsView />
      </QueryClientProvider>
    );
  };

  const mockBlockedItems = [
    {
      id: "item-1",
      orderId: "order-1",
      orderType: "subscription_delivery" as const,
      customerId: "customer-1",
      customerName: "João Silva",
      customerEmail: "joao@example.com",
      collectionId: "collection-1",
      collectionName: "Coleção A",
      characterId: "char-1",
      characterName: "Personagem 1",
      productionStatus: "on_hold" as const,
      currentStage: "production" as const,
      choiceStatus: "approved" as const,
      choiceDeadline: null,
      choiceMadeAt: null,
      priority: "high" as const,
      priorityScore: 80,
      scheduledProductionDate: null,
      estimatedCompletionDate: null,
      assignedTo: "user-1",
      assignedToName: "Maria Santos",
      assignedAt: null,
      productionStartedAt: null,
      productionCompletedAt: null,
      productionNotes: "Aguardando material",
      customerNotes: null,
      internalFlags: [],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
    },
    {
      id: "item-2",
      orderId: "order-2",
      orderType: "standalone_purchase" as const,
      customerId: "customer-2",
      customerName: "Ana Costa",
      customerEmail: "ana@example.com",
      collectionId: "collection-2",
      collectionName: "Coleção B",
      characterId: null,
      characterName: null,
      productionStatus: "on_hold" as const,
      currentStage: "design" as const,
      choiceStatus: "pending" as const,
      choiceDeadline: null,
      choiceMadeAt: null,
      priority: "critical" as const,
      priorityScore: 95,
      scheduledProductionDate: null,
      estimatedCompletionDate: null,
      assignedTo: null,
      assignedToName: null,
      assignedAt: null,
      productionStartedAt: null,
      productionCompletedAt: null,
      productionNotes: "Equipamento quebrado",
      customerNotes: null,
      internalFlags: [],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T12:00:00Z",
    },
  ];

  it("should render loading skeleton initially", () => {
    vi.mocked(productionService.fetchProductionQueue).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderComponent();

    // Check for skeleton elements
    expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
  });

  it("should display empty state when no blocked items", async () => {
    vi.mocked(productionService.fetchProductionQueue).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 1000,
      totalPages: 0,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Nenhum Item Bloqueado")).toBeInTheDocument();
      expect(
        screen.getByText("Ótimo! Não há itens de produção bloqueados no momento.")
      ).toBeInTheDocument();
    });
  });

  it("should display blocked items sorted by duration", async () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

    vi.mocked(productionService.fetchProductionQueue).mockResolvedValue({
      data: mockBlockedItems,
      total: 2,
      page: 1,
      pageSize: 1000,
      totalPages: 1,
    });

    // Mock supabase queries for stage data
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn()
                .mockResolvedValueOnce({
                  data: {
                    block_reason: "Aguardando material em falta",
                    blocked_at: twoDaysAgo.toISOString(),
                  },
                })
                .mockResolvedValueOnce({
                  data: {
                    block_reason: "Equipamento quebrado",
                    blocked_at: oneDayAgo.toISOString(),
                  },
                }),
            }),
          }),
        }),
      }),
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Itens Bloqueados")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument(); // Badge count
    });

    // Check that items are displayed
    expect(screen.getByText("João Silva")).toBeInTheDocument();
    expect(screen.getByText("Ana Costa")).toBeInTheDocument();

    // Check that block reasons are displayed
    expect(screen.getByText("Aguardando material em falta")).toBeInTheDocument();
    expect(screen.getByText("Equipamento quebrado")).toBeInTheDocument();
  });

  it("should display item details correctly", async () => {
    vi.mocked(productionService.fetchProductionQueue).mockResolvedValue({
      data: [mockBlockedItems[0]],
      total: 1,
      page: 1,
      pageSize: 1000,
      totalPages: 1,
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  block_reason: "Aguardando material",
                  blocked_at: new Date().toISOString(),
                },
              }),
            }),
          }),
        }),
      }),
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    renderComponent();

    await waitFor(() => {
      // Customer info
      expect(screen.getByText("João Silva")).toBeInTheDocument();
      expect(screen.getByText("joao@example.com")).toBeInTheDocument();

      // Collection and character
      expect(screen.getByText("Coleção A")).toBeInTheDocument();
      expect(screen.getByText("Personagem 1")).toBeInTheDocument();

      // Stage
      expect(screen.getByText("Produção")).toBeInTheDocument();

      // Priority
      expect(screen.getByText("HIGH")).toBeInTheDocument();

      // Assigned to
      expect(screen.getByText("Maria Santos")).toBeInTheDocument();

      // Block reason
      expect(screen.getByText("Aguardando material")).toBeInTheDocument();
    });
  });

  it("should open unblock modal when unblock button is clicked", async () => {
    vi.mocked(productionService.fetchProductionQueue).mockResolvedValue({
      data: [mockBlockedItems[0]],
      total: 1,
      page: 1,
      pageSize: 1000,
      totalPages: 1,
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  block_reason: "Aguardando material",
                  blocked_at: new Date().toISOString(),
                },
              }),
            }),
          }),
        }),
      }),
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("João Silva")).toBeInTheDocument();
    });

    // Click unblock button
    const unblockButton = screen.getByRole("button", { name: /desbloquear/i });
    await userEvent.click(unblockButton);

    // Check that modal is opened
    await waitFor(() => {
      expect(screen.getByTestId("unblock-modal")).toBeInTheDocument();
      expect(screen.getByText(/Unblock Modal for item-1/)).toBeInTheDocument();
    });
  });

  it("should display duration with color coding", async () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    vi.mocked(productionService.fetchProductionQueue).mockResolvedValue({
      data: [mockBlockedItems[0]],
      total: 1,
      page: 1,
      pageSize: 1000,
      totalPages: 1,
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  block_reason: "Aguardando material",
                  blocked_at: threeDaysAgo.toISOString(),
                },
              }),
            }),
          }),
        }),
      }),
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    renderComponent();

    await waitFor(() => {
      // Should display duration in days
      const durationBadge = screen.getByText(/3 dias/i);
      expect(durationBadge).toBeInTheDocument();

      // Should have red color for > 48 hours
      expect(durationBadge).toHaveClass("border-red-500");
    });
  });

  it("should handle items without character name", async () => {
    vi.mocked(productionService.fetchProductionQueue).mockResolvedValue({
      data: [mockBlockedItems[1]], // This item has no character
      total: 1,
      page: 1,
      pageSize: 1000,
      totalPages: 1,
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  block_reason: "Equipamento quebrado",
                  blocked_at: new Date().toISOString(),
                },
              }),
            }),
          }),
        }),
      }),
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Ana Costa")).toBeInTheDocument();
    });

    // Check that character column shows "-" for null character
    const cells = screen.getAllByRole("cell");
    const characterCell = cells.find((cell) => cell.textContent === "-");
    expect(characterCell).toBeInTheDocument();
  });

  it("should handle items without assigned team member", async () => {
    vi.mocked(productionService.fetchProductionQueue).mockResolvedValue({
      data: [mockBlockedItems[1]], // This item has no assignee
      total: 1,
      page: 1,
      pageSize: 1000,
      totalPages: 1,
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  block_reason: "Equipamento quebrado",
                  blocked_at: new Date().toISOString(),
                },
              }),
            }),
          }),
        }),
      }),
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Ana Costa")).toBeInTheDocument();
    });

    // Check that assigned to column shows "-" for null assignee
    const cells = screen.getAllByRole("cell");
    const assignedCells = cells.filter((cell) => cell.textContent === "-");
    expect(assignedCells.length).toBeGreaterThan(0);
  });
});
