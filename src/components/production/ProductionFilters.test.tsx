import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProductionFilters } from "./ProductionFilters";
import type { ProductionFilters as ProductionFiltersType } from "@/types/production";

const hookMocks = vi.hoisted(() => ({
  useProductionCollectionFilterOptions: vi.fn(),
  useProductionTeamMemberFilterOptions: vi.fn(),
}));

vi.mock("@/hooks/admin/useProductionFilterOptions", () => ({
  useProductionCollectionFilterOptions: hookMocks.useProductionCollectionFilterOptions,
  useProductionTeamMemberFilterOptions: hookMocks.useProductionTeamMemberFilterOptions,
}));

vi.mock("@/components/ui/date-range-picker", () => ({
  DateRangePicker: ({ onChange }: { onChange: (range: { from?: Date; to?: Date }) => void }) => (
    <button
      type="button"
      onClick={() =>
        onChange({
          from: new Date("2026-09-01T00:00:00.000Z"),
          to: new Date("2026-09-30T00:00:00.000Z"),
        })
      }
    >
      Selecionar período de teste
    </button>
  ),
}));

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

function renderComponent(filters: ProductionFiltersType = defaultFilters) {
  return render(
    <ProductionFilters
      filters={filters}
      onFiltersChange={mockOnFiltersChange}
      onReset={mockOnReset}
    />,
  );
}

describe("ProductionFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookMocks.useProductionCollectionFilterOptions.mockReturnValue({
      data: [
        { id: "col-1", name: "Coleção A" },
        { id: "col-2", name: "Coleção B" },
      ],
      isLoading: false,
    });
    hookMocks.useProductionTeamMemberFilterOptions.mockReturnValue({
      data: [
        { id: "user-1", name: "Admin 1" },
        { id: "user-2", name: "Admin 2" },
      ],
      isLoading: false,
    });
  });

  it("renders the production filter sections", () => {
    renderComponent();

    expect(screen.getByText("Filtros")).toBeInTheDocument();
    expect(screen.getByText("Coleções")).toBeInTheDocument();
    expect(screen.getByText("Prioridade")).toBeInTheDocument();
    expect(screen.getByText("Estágios")).toBeInTheDocument();
    expect(screen.getByText("Período de Produção")).toBeInTheDocument();
    expect(screen.getByText("Membro da Equipe")).toBeInTheDocument();
  });

  it("renders collection and team options from their canonical hooks", () => {
    renderComponent();

    expect(screen.getByText("Coleção A")).toBeInTheDocument();
    expect(screen.getByText("Coleção B")).toBeInTheDocument();
    expect(screen.getByText("Admin 1")).toBeInTheDocument();
    expect(screen.getByText("Admin 2")).toBeInTheDocument();
  });

  it("renders loading states from the option hooks", () => {
    hookMocks.useProductionCollectionFilterOptions.mockReturnValue({ data: undefined, isLoading: true });
    hookMocks.useProductionTeamMemberFilterOptions.mockReturnValue({ data: undefined, isLoading: true });

    renderComponent();

    expect(screen.getByText("Carregando coleções...")).toBeInTheDocument();
    expect(screen.getByText("Carregando membros...")).toBeInTheDocument();
  });

  it("toggles collection selection", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByLabelText("Coleção A"));

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      collections: ["col-1"],
    });
  });

  it("toggles priority selection", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole("button", { name: "Alto" }));

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      priorities: ["high"],
    });
  });

  it("toggles stage selection", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByLabelText("Em Impressão 3D"));

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      stages: ["printing"],
    });
  });

  it("toggles team member selection", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByLabelText("Admin 1"));

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      assignedTo: ["user-1"],
    });
  });

  it("passes date range changes back to the parent", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole("button", { name: "Selecionar período de teste" }));

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      dateFrom: "2026-09-01",
      dateTo: "2026-09-30",
    });
  });

  it("shows active filter count and reset action", async () => {
    const user = userEvent.setup();
    renderComponent({
      ...defaultFilters,
      collections: ["col-1"],
      priorities: ["high", "critical"],
      assignedTo: ["user-1"],
    });

    expect(screen.getByText("4")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Limpar Tudo/i }));
    expect(mockOnReset).toHaveBeenCalledTimes(1);
  });

  it("renders empty option states without inventing data", () => {
    hookMocks.useProductionCollectionFilterOptions.mockReturnValue({ data: [], isLoading: false });
    hookMocks.useProductionTeamMemberFilterOptions.mockReturnValue({ data: [], isLoading: false });

    renderComponent();

    expect(screen.getByText("Nenhuma coleção disponível")).toBeInTheDocument();
    expect(screen.getByText("Nenhum membro disponível")).toBeInTheDocument();
  });
});
