import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CollectionBreakdown } from "./CollectionBreakdown";
import { useCollectionBreakdown } from "@/hooks/admin/useCollectionBreakdown";
import type { ReactNode } from "react";

vi.mock("@/hooks/admin/useCollectionBreakdown", () => ({
  useCollectionBreakdown: vi.fn(),
}));

vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: { children: ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

const useCollectionBreakdownMock = vi.mocked(useCollectionBreakdown);

describe("CollectionBreakdown", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  const renderComponent = (cycleId: string, cycleName?: string) =>
    render(
      <QueryClientProvider client={queryClient}>
        <CollectionBreakdown cycleId={cycleId} cycleName={cycleName} />
      </QueryClientProvider>
    );

  it("should show loading state", () => {
    useCollectionBreakdownMock.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useCollectionBreakdown>);

    renderComponent("cycle-1");
    expect(screen.getByText("Carregando distribuição por coleção...")).toBeInTheDocument();
  });

  it("should show empty state", () => {
    useCollectionBreakdownMock.mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useCollectionBreakdown>);

    renderComponent("cycle-1", "Ciclo 1");
    expect(screen.getByText("Nenhuma peça em produção para este ciclo")).toBeInTheDocument();
  });

  it("should render aggregated data", () => {
    useCollectionBreakdownMock.mockReturnValue({
      data: [
        {
          collection_id: "col-1",
          collection_name: "Coleção A",
          subscription_deliveries: 2,
          standalone_purchases: 1,
          total: 3,
        },
        {
          collection_id: "col-2",
          collection_name: "Coleção B",
          subscription_deliveries: 1,
          standalone_purchases: 1,
          total: 2,
        },
      ],
      isLoading: false,
    } as ReturnType<typeof useCollectionBreakdown>);

    renderComponent("cycle-1");
    expect(screen.getByText("Coleção A")).toBeInTheDocument();
    expect(screen.getByText("Coleção B")).toBeInTheDocument();
    expect(screen.getAllByText("5").length).toBeGreaterThan(0);
    expect(screen.getByRole("tab", { name: /tabela/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /gráfico de barras/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /gráfico de pizza/i })).toBeInTheDocument();
  });
});
