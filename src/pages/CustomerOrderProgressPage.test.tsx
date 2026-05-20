import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import CustomerOrderProgressPage from "./CustomerOrderProgressPage";
import type { CustomerOrderProgress } from "@/services/customer/order-progress-service";

const hookMocks = vi.hoisted(() => ({
  useCustomerOrderProgress: vi.fn(),
}));

vi.mock("@/hooks/customer/useCustomerOrderProgress", () => ({
  useCustomerOrderProgress: hookMocks.useCustomerOrderProgress,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({
      orderId: "test-order-123",
      orderType: "subscription_delivery",
    }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock("@/components/layouts/Page", () => ({
  Page: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/customer/CharacterChoiceCard", () => ({
  CharacterChoiceCard: () => <div data-testid="character-choice-card">Character Choice Card</div>,
}));

vi.mock("@/components/customer/ProgressTimeline", () => ({
  ProgressTimeline: () => <div data-testid="progress-timeline">Progress Timeline</div>,
}));

vi.mock("@/components/customer/EstimatedDatesCard", () => ({
  EstimatedDatesCard: ({ productionStatus }: { productionStatus: string }) => (
    <div data-testid="estimated-dates-card">
      {productionStatus === "on_hold" && <div>Producao Pausada</div>}
      Estimated Dates Card
    </div>
  ),
}));

vi.mock("@/components/customer/TrackingCard", () => ({
  TrackingCard: () => (
    <div data-testid="tracking-card">
      <div>Rastreamento</div>
      Tracking Card
    </div>
  ),
}));

vi.mock("@/hooks/customer/useOrderProgressRealtime", () => ({
  useOrderProgressRealtime: () => ({}),
}));

const baseOrderProgress: CustomerOrderProgress = {
  id: "prod-123",
  orderId: "test-order-123",
  orderNumber: "test-ord",
  orderType: "subscription_delivery",
  collectionId: "coll-123",
  collectionName: "Test Collection",
  collectionImageUrl: "https://example.com/image.jpg",
  currentStage: "printing",
  productionStatus: "in_production",
  choiceStatus: "approved",
  choiceDeadline: null,
  choiceId: "choice-123",
  characterId: "char-123",
  characterName: "Test Character",
  characterImageUrl: "https://example.com/character.jpg",
  estimatedCompletionDate: new Date().toISOString(),
  estimatedShippingDate: new Date().toISOString(),
  estimatedDeliveryDate: new Date().toISOString(),
  trackingCode: null,
  trackingCarrier: null,
  productionStartedAt: new Date().toISOString(),
  productionCompletedAt: null,
  stages: [
    {
      name: "awaiting_choice",
      displayName: "Aguardando Escolha",
      status: "completed",
      completedAt: new Date().toISOString(),
      order: 1,
    },
    {
      name: "printing",
      displayName: "Em Impressao 3D",
      status: "current",
      completedAt: null,
      order: 2,
    },
  ],
};

describe("CustomerOrderProgressPage", () => {
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
        <BrowserRouter>
          <CustomerOrderProgressPage />
        </BrowserRouter>
      </QueryClientProvider>
    );

  it("should render loading state initially", () => {
    hookMocks.useCustomerOrderProgress.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    renderComponent();
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("should render error state when order is not found", () => {
    hookMocks.useCustomerOrderProgress.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Pedido nao encontrado na fila de producao"),
    });

    renderComponent();
    expect(screen.getByText("Pedido Nao Encontrado")).toBeInTheDocument();
  });

  it("should render order progress when data is loaded", () => {
    hookMocks.useCustomerOrderProgress.mockReturnValue({
      data: baseOrderProgress,
      isLoading: false,
      error: null,
    });

    renderComponent();
    expect(screen.getByText("Pedido #test-ord")).toBeInTheDocument();
    expect(screen.getByTestId("progress-timeline")).toBeInTheDocument();
    expect(screen.getByTestId("estimated-dates-card")).toBeInTheDocument();
    expect(screen.getByTestId("character-choice-card")).toBeInTheDocument();
  });

  it("should render tracking card only when order is shipped", () => {
    hookMocks.useCustomerOrderProgress.mockReturnValue({
      data: { ...baseOrderProgress, currentStage: "shipped", trackingCode: "BR123" },
      isLoading: false,
      error: null,
    });

    renderComponent();
    expect(screen.getByTestId("tracking-card")).toBeInTheDocument();
  });

  it("should show on hold state in estimated dates card", () => {
    hookMocks.useCustomerOrderProgress.mockReturnValue({
      data: { ...baseOrderProgress, productionStatus: "on_hold" },
      isLoading: false,
      error: null,
    });

    renderComponent();
    expect(screen.getByText("Producao Pausada")).toBeInTheDocument();
  });
});
