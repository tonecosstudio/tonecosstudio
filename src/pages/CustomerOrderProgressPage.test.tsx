import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
      {productionStatus === "on_hold" ? <div>Producao Pausada</div> : null}
      Estimated Dates Card
    </div>
  ),
}));

vi.mock("@/components/customer/TrackingCard", () => ({
  TrackingCard: () => <div data-testid="tracking-card">Rastreamento</div>,
}));

vi.mock("@/hooks/customer/useOrderProgressRealtime", () => ({
  useOrderProgressRealtime: () => undefined,
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

function renderComponent() {
  return render(
    <BrowserRouter>
      <CustomerOrderProgressPage />
    </BrowserRouter>,
  );
}

describe("CustomerOrderProgressPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    hookMocks.useCustomerOrderProgress.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    renderComponent();

    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders the not-found state without depending on text casing", () => {
    hookMocks.useCustomerOrderProgress.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Pedido nao encontrado na fila de producao"),
    });

    renderComponent();

    expect(screen.getByText(/pedido nao encontrado/i)).toBeInTheDocument();
    expect(screen.getByText("Pedido nao encontrado na fila de producao")).toBeInTheDocument();
  });

  it("renders loaded order progress", () => {
    hookMocks.useCustomerOrderProgress.mockReturnValue({
      data: baseOrderProgress,
      isLoading: false,
      error: null,
    });

    renderComponent();

    expect(screen.getByText("PEDIDO #test-ord")).toBeInTheDocument();
    expect(screen.getByTestId("progress-timeline")).toBeInTheDocument();
    expect(screen.getByTestId("estimated-dates-card")).toBeInTheDocument();
    expect(screen.getByTestId("character-choice-card")).toBeInTheDocument();
  });

  it("renders tracking only for a shipped order", () => {
    hookMocks.useCustomerOrderProgress.mockReturnValue({
      data: { ...baseOrderProgress, currentStage: "shipped", trackingCode: "BR123" },
      isLoading: false,
      error: null,
    });

    const view = renderComponent();
    expect(screen.getByTestId("tracking-card")).toBeInTheDocument();

    view.unmount();
    hookMocks.useCustomerOrderProgress.mockReturnValue({
      data: baseOrderProgress,
      isLoading: false,
      error: null,
    });
    renderComponent();
    expect(screen.queryByTestId("tracking-card")).not.toBeInTheDocument();
  });

  it("propagates the on-hold status to estimated dates", () => {
    hookMocks.useCustomerOrderProgress.mockReturnValue({
      data: { ...baseOrderProgress, productionStatus: "on_hold" },
      isLoading: false,
      error: null,
    });

    renderComponent();

    expect(screen.getByText("Producao Pausada")).toBeInTheDocument();
  });
});
