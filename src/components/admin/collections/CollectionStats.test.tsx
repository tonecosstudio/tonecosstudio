import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CollectionStats } from "./CollectionStats";
import { useCollectionStats } from "@/hooks/admin/useCollectionStats";

vi.mock("@/hooks/admin/useCollectionStats", () => ({
  useCollectionStats: vi.fn(),
}));

const useCollectionStatsMock = vi.mocked(useCollectionStats);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("CollectionStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render loading state", () => {
    useCollectionStatsMock.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useCollectionStats>);

    render(<CollectionStats collectionId="col-1" collectionName="Teste" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("Estatísticas da Coleção")).toBeInTheDocument();
    expect(screen.getByText("Teste")).toBeInTheDocument();
  });

  it("should render statistics values", () => {
    useCollectionStatsMock.mockReturnValue({
      data: {
        totalPiecesSold: 5,
        currentMonthSelections: 3,
        totalRevenue: 350,
        subscriptionDeliveries: 3,
        standalonePurchases: 2,
      },
      isLoading: false,
    } as ReturnType<typeof useCollectionStats>);

    render(<CollectionStats collectionId="col-1" />, { wrapper: createWrapper() });

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3 assinaturas + 2 avulsas")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("R$ 350.00")).toBeInTheDocument();
  });

  it("should render fallback when stats is unavailable", () => {
    useCollectionStatsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as ReturnType<typeof useCollectionStats>);

    render(<CollectionStats collectionId="col-1" />, { wrapper: createWrapper() });

    expect(screen.getByText("Não foi possível carregar as estatísticas")).toBeInTheDocument();
  });
});

