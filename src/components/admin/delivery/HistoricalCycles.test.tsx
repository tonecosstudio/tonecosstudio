import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { HistoricalCycles } from "./HistoricalCycles";
import { useHistoricalCycles } from "@/hooks/admin/useHistoricalCycles";
import { adminCyclesPath } from "@/config/routes";

vi.mock("@/hooks/admin/useHistoricalCycles", () => ({
  useHistoricalCycles: vi.fn(),
}));

vi.mock("@/lib/services/timezoneService", () => ({
  timezoneService: {
    getCurrentTime: () => new Date("2026-06-15T12:00:00Z"),
    toSystemTimezone: (date: Date) => date,
    getMonth: (_date: Date) => 6,
    getYear: (_date: Date) => 2026,
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const useHistoricalCyclesMock = vi.mocked(useHistoricalCycles);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

const mockCycles = [
  {
    id: "1",
    cycle_number: 1 as const,
    month: 4,
    year: 2026,
    open_start: "2026-04-01T00:00:00Z",
    open_end: "2026-04-15T23:59:59Z",
    production_start: "2026-04-16T00:00:00Z",
    production_end: "2026-04-30T23:59:59Z",
    shipping_date: "2026-05-05",
    status: "completed" as const,
    status_changed_at: "2026-05-05T10:00:00Z",
    capacity_max: 100,
    capacity_current: 85,
    created_at: "2026-04-01T00:00:00Z",
  },
  {
    id: "2",
    cycle_number: 2 as const,
    month: 4,
    year: 2026,
    open_start: "2026-04-16T00:00:00Z",
    open_end: "2026-04-30T23:59:59Z",
    production_start: "2026-05-01T00:00:00Z",
    production_end: "2026-05-15T23:59:59Z",
    shipping_date: "2026-05-20",
    status: "completed" as const,
    status_changed_at: "2026-05-20T10:00:00Z",
    capacity_max: 100,
    capacity_current: 92,
    created_at: "2026-04-16T00:00:00Z",
  },
  {
    id: "3",
    cycle_number: 1 as const,
    month: 5,
    year: 2026,
    open_start: "2026-05-01T00:00:00Z",
    open_end: "2026-05-15T23:59:59Z",
    production_start: "2026-05-16T00:00:00Z",
    production_end: "2026-05-31T23:59:59Z",
    shipping_date: "2026-06-05",
    status: "shipping" as const,
    status_changed_at: "2026-06-01T10:00:00Z",
    capacity_max: 100,
    capacity_current: 78,
    created_at: "2026-05-01T00:00:00Z",
  },
];

describe("HistoricalCycles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useHistoricalCyclesMock.mockReturnValue({
      data: mockCycles,
      isLoading: false,
    } as ReturnType<typeof useHistoricalCycles>);
  });

  it("should render metrics and table", () => {
    render(<HistoricalCycles />, { wrapper: createWrapper() });

    expect(screen.getByText("Histórico de Ciclos")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("255")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("85 / 100")).toBeInTheDocument();
    expect(screen.getByText("92 / 100")).toBeInTheDocument();
    expect(screen.getByText("78 / 100")).toBeInTheDocument();
  });

  it("should navigate to cycle detail", async () => {
    const user = userEvent.setup();
    render(<HistoricalCycles />, { wrapper: createWrapper() });

    const detailButtons = screen.getAllByText("Ver Detalhes");
    await user.click(detailButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith(adminCyclesPath({ month: 5, year: 2026 }));
  });

  it("should show empty state", () => {
    useHistoricalCyclesMock.mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useHistoricalCycles>);

    render(<HistoricalCycles />, { wrapper: createWrapper() });
    expect(screen.getByText("Nenhum ciclo encontrado com os filtros selecionados")).toBeInTheDocument();
  });

  it("should show loading state", () => {
    useHistoricalCyclesMock.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useHistoricalCycles>);

    render(<HistoricalCycles />, { wrapper: createWrapper() });
    expect(screen.getByText("Carregando histórico...")).toBeInTheDocument();
  });
});
