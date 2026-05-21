/**
 * Tests for ProductionFilters Component
 * 
 * Tests filtering functionality including:
 * - Collection multi-select
 * - Priority filtering
 * - Stage filtering
 * - Date range selection
 * - Team member filtering
 * - Clear all filters
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProductionFilters } from "./ProductionFilters";
import type { ProductionFilters as ProductionFiltersType } from "@/types/production";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [
              { id: "col-1", name: "Coleção A" },
              { id: "col-2", name: "Coleção B" },
            ],
            error: null,
          })),
        })),
      })),
    })),
    rpc: vi.fn(() => ({
      data: [
        { id: "user-1", full_name: "Admin 1", roles: ["admin"] },
        { id: "user-2", full_name: "Admin 2", roles: ["admin"] },
        { id: "user-3", full_name: "User 3", roles: ["user"] },
      ],
      error: null,
    })),
  },
}));

// Helper to render with QueryClient
function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe("ProductionFilters", () => {
  const mockOnFiltersChange = vi.fn();
  const mockOnReset = vi.fn();

  const defaultFilters: ProductionFiltersType = {
    collections: undefined,
    priorities: undefined,
    stages: undefined,
    assignedTo: undefined,
    dateFrom: undefined,
    dateTo: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders filter sections", async () => {
    renderWithQueryClient(
      <ProductionFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText("Filtros")).toBeInTheDocument();
    expect(screen.getByText("Coleções")).toBeInTheDocument();
    expect(screen.getByText("Prioridade")).toBeInTheDocument();
    expect(screen.getByText("Estágios")).toBeInTheDocument();
    expect(screen.getByText("Período de Produção")).toBeInTheDocument();
    expect(screen.getByText("Membro da Equipe")).toBeInTheDocument();
  });

  it("displays active filter count", async () => {
    const filtersWithSelections: ProductionFiltersType = {
      collections: ["col-1"],
      priorities: ["high", "critical"],
      stages: ["production"],
      assignedTo: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    };

    renderWithQueryClient(
      <ProductionFilters
        filters={filtersWithSelections}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
      />
    );

    // Should show badge with count of 4 (1 collection array + 2 priorities array + 1 stage array = 4 filter groups)
    await waitFor(() => {
      const badge = screen.getByText("4");
      expect(badge).toBeInTheDocument();
    });
  });

  it("shows clear all button when filters are active", async () => {
    const filtersWithSelections: ProductionFiltersType = {
      collections: ["col-1"],
      priorities: undefined,
      stages: undefined,
      assignedTo: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    };

    renderWithQueryClient(
      <ProductionFilters
        filters={filtersWithSelections}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Limpar Tudo")).toBeInTheDocument();
    });
  });

  it("calls onReset when clear all button is clicked", async () => {
    const user = userEvent.setup();
    const filtersWithSelections: ProductionFiltersType = {
      collections: ["col-1"],
      priorities: undefined,
      stages: undefined,
      assignedTo: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    };

    renderWithQueryClient(
      <ProductionFilters
        filters={filtersWithSelections}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Limpar Tudo")).toBeInTheDocument();
    });

    const clearButton = screen.getByText("Limpar Tudo");
    await user.click(clearButton);

    expect(mockOnReset).toHaveBeenCalledTimes(1);
  });

  it("loads and displays collections", async () => {
    renderWithQueryClient(
      <ProductionFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Coleção A")).toBeInTheDocument();
      expect(screen.getByText("Coleção B")).toBeInTheDocument();
    });
  });

  it("toggles collection selection", async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <ProductionFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Coleção A")).toBeInTheDocument();
    });

    const collectionCheckbox = screen.getByLabelText("Coleção A");
    await user.click(collectionCheckbox);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      collections: ["col-1"],
    });
  });

  it("displays priority options", () => {
    renderWithQueryClient(
      <ProductionFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText("Crítico")).toBeInTheDocument();
    expect(screen.getByText("Alto")).toBeInTheDocument();
    expect(screen.getByText("Normal")).toBeInTheDocument();
    expect(screen.getByText("Baixo")).toBeInTheDocument();
  });

  it("toggles priority selection", async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <ProductionFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
      />
    );

    const highPriorityButton = screen.getByText("Alto");
    await user.click(highPriorityButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      priorities: ["high"],
    });
  });

  it("displays stage options", () => {
    renderWithQueryClient(
      <ProductionFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText("Aguardando Escolha")).toBeInTheDocument();
    expect(screen.getByText("Preparação do Modelo")).toBeInTheDocument();
    expect(screen.getByText("Em Impressão 3D")).toBeInTheDocument();
    expect(screen.getByText("Controle de Qualidade")).toBeInTheDocument();
    expect(screen.getByText("Embalagem")).toBeInTheDocument();
    expect(screen.getByText("Enviado")).toBeInTheDocument();
  });

  it("toggles stage selection", async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <ProductionFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
      />
    );

    const productionCheckbox = screen.getByLabelText("Em Impressão 3D");
    await user.click(productionCheckbox);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      stages: ["printing"],
    });
  });

  it("loads and displays team members (admins only)", async () => {
    renderWithQueryClient(
      <ProductionFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Admin 1")).toBeInTheDocument();
      expect(screen.getByText("Admin 2")).toBeInTheDocument();
      // User 3 should not appear (not an admin)
      expect(screen.queryByText("User 3")).not.toBeInTheDocument();
    });
  });

  it("toggles team member selection", async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <ProductionFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Admin 1")).toBeInTheDocument();
    });

    const memberCheckbox = screen.getByLabelText("Admin 1");
    await user.click(memberCheckbox);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      assignedTo: ["user-1"],
    });
  });

  it("shows selection count for each filter type", async () => {
    const filtersWithSelections: ProductionFiltersType = {
      collections: ["col-1", "col-2"],
      priorities: ["high"],
      stages: ["production", "quality_check", "packaging"],
      assignedTo: ["user-1"],
      dateFrom: undefined,
      dateTo: undefined,
    };

    renderWithQueryClient(
      <ProductionFilters
        filters={filtersWithSelections}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("2 coleções selecionadas")).toBeInTheDocument();
      expect(screen.getByText("1 prioridade selecionada")).toBeInTheDocument();
      expect(screen.getByText("3 estágios selecionados")).toBeInTheDocument();
      expect(screen.getByText("1 membro selecionado")).toBeInTheDocument();
    });
  });

  it("handles multiple selections in same filter", async () => {
    const user = userEvent.setup();

    const { unmount } = renderWithQueryClient(
      <ProductionFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
      />
    );

    // Select first priority
    const highPriorityButton = screen.getByText("Alto");
    await user.click(highPriorityButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      priorities: ["high"],
    });

    // Unmount and re-render with updated filters
    unmount();

    const filtersWithHigh: ProductionFiltersType = {
      ...defaultFilters,
      priorities: ["high"],
    };

    renderWithQueryClient(
      <ProductionFilters
        filters={filtersWithHigh}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
      />
    );

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText("Crítico")).toBeInTheDocument();
    });

    // Select second priority
    const criticalPriorityButton = screen.getByText("Crítico");
    await user.click(criticalPriorityButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...filtersWithHigh,
      priorities: ["high", "critical"],
    });
  });

  it("deselects when clicking selected item", async () => {
    const user = userEvent.setup();
    const filtersWithSelection: ProductionFiltersType = {
      ...defaultFilters,
      priorities: ["high"],
    };

    renderWithQueryClient(
      <ProductionFilters
        filters={filtersWithSelection}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
      />
    );

    const highPriorityButton = screen.getByText("Alto");
    await user.click(highPriorityButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      priorities: undefined,
    });
  });
});
