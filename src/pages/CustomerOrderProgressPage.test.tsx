/**
 * Tests for CustomerOrderProgressPage Component
 * 
 * Task: 5.1.1 Create CustomerOrderProgressPage component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import CustomerOrderProgressPage from "./CustomerOrderProgressPage";
import { supabase } from "@/integrations/supabase/client";

// Mock modules
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/image.jpg" } })),
      })),
    },
  },
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

// Mock AppShell
vi.mock("@/components/AppShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock SEOHead
vi.mock("@/components/SEOHead", () => ({
  default: () => null,
}));

// Mock CharacterChoiceCard
vi.mock("@/components/customer/CharacterChoiceCard", () => ({
  CharacterChoiceCard: () => <div data-testid="character-choice-card">Character Choice Card</div>,
}));

// Mock ProgressTimeline
vi.mock("@/components/customer/ProgressTimeline", () => ({
  ProgressTimeline: () => <div data-testid="progress-timeline">Progress Timeline</div>,
}));

// Mock EstimatedDatesCard
vi.mock("@/components/customer/EstimatedDatesCard", () => ({
  EstimatedDatesCard: ({ productionStatus }: { productionStatus: string }) => (
    <div data-testid="estimated-dates-card">
      {productionStatus === "on_hold" && <div>Produção Pausada</div>}
      Estimated Dates Card
    </div>
  ),
}));

// Mock TrackingCard
vi.mock("@/components/customer/TrackingCard", () => ({
  TrackingCard: () => (
    <div data-testid="tracking-card">
      <div>Rastreamento</div>
      Tracking Card
    </div>
  ),
}));

// Mock useOrderProgressRealtime hook
vi.mock("@/hooks/customer/useOrderProgressRealtime", () => ({
  useOrderProgressRealtime: () => ({}),
}));

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

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CustomerOrderProgressPage />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it("should render loading state initially", () => {
    // Mock pending query
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockReturnValue(new Promise(() => {})),
          }),
        }),
      }),
    });
    (supabase.from as any) = mockFrom;

    renderComponent();

    // Should show loading skeletons
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("should render error state when order not found", async () => {
    // Mock error response
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    });
    (supabase.from as any) = mockFrom;

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Pedido Não Encontrado")).toBeInTheDocument();
    });
  });

  it("should render order progress when data is loaded", async () => {
    const mockProductionData = {
      id: "prod-123",
      order_id: "test-order-123",
      order_type: "subscription_delivery",
      current_stage: "production",
      production_status: "in_production",
      choice_status: "approved",
      choice_deadline: null,
      character_id: "char-123",
      character_name: "Test Character",
      estimated_completion_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      production_started_at: new Date().toISOString(),
      production_completed_at: null,
      collection_id: "coll-123",
      collection_name: "Test Collection",
      tracking_code: null,
      tracking_carrier: null,
    };

    const mockStagesData = [
      { stage_name: "awaiting_choice", status: "completed", completed_at: new Date().toISOString(), stage_order: 1 },
      { stage_name: "design", status: "completed", completed_at: new Date().toISOString(), stage_order: 2 },
      { stage_name: "production", status: "in_progress", completed_at: null, stage_order: 3 },
      { stage_name: "quality_check", status: "pending", completed_at: null, stage_order: 4 },
      { stage_name: "packaging", status: "pending", completed_at: null, stage_order: 5 },
      { stage_name: "shipped", status: "pending", completed_at: null, stage_order: 6 },
    ];

    // Create a mock function that tracks call count
    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      callCount++;
      
      // First call: production_queue
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockProductionData,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      
      // Second call: collections
      if (callCount === 2) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        };
      }
      
      // Third call: collection_characters
      if (callCount === 3) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        };
      }
      
      // Fourth call: production_stages
      if (callCount === 4) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockStagesData,
                error: null,
              }),
            }),
          }),
        };
      }
      
      // Fifth call: character_choices
      if (callCount === 5) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: "choice-123" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      
      // Default fallback
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };
    });

    (supabase.from as any) = mockFrom;

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Pedido #test-ord/i)).toBeInTheDocument();
    });

    // Should show progress timeline component
    expect(screen.getByTestId("progress-timeline")).toBeInTheDocument();
    
    // Should show estimated dates component
    expect(screen.getByTestId("estimated-dates-card")).toBeInTheDocument();
    
    // Should show order summary
    expect(screen.getByText("Resumo do Pedido")).toBeInTheDocument();
    expect(screen.getByText("Test Collection")).toBeInTheDocument();
    
    // Should show character choice card component
    expect(screen.getByTestId("character-choice-card")).toBeInTheDocument();
  });

  it("should render tracking information when available", async () => {
    const mockProductionData = {
      id: "prod-123",
      order_id: "test-order-123",
      order_type: "subscription_delivery",
      current_stage: "shipped",
      production_status: "completed",
      choice_status: "approved",
      choice_deadline: null,
      character_id: "char-123",
      character_name: "Test Character",
      estimated_completion_date: new Date().toISOString(),
      production_started_at: new Date().toISOString(),
      production_completed_at: new Date().toISOString(),
      collection_id: "coll-123",
      collection_name: "Test Collection",
      tracking_code: "BR123456789BR",
      tracking_carrier: "Correios",
    };

    const mockStagesData = [
      { stage_name: "awaiting_choice", status: "completed", completed_at: new Date().toISOString(), stage_order: 1 },
      { stage_name: "design", status: "completed", completed_at: new Date().toISOString(), stage_order: 2 },
      { stage_name: "production", status: "completed", completed_at: new Date().toISOString(), stage_order: 3 },
      { stage_name: "quality_check", status: "completed", completed_at: new Date().toISOString(), stage_order: 4 },
      { stage_name: "packaging", status: "completed", completed_at: new Date().toISOString(), stage_order: 5 },
      { stage_name: "shipped", status: "completed", completed_at: new Date().toISOString(), stage_order: 6 },
    ];

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      callCount++;
      
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockProductionData,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      
      if (callCount === 2) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        };
      }
      
      if (callCount === 3) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        };
      }
      
      if (callCount === 4) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockStagesData,
                error: null,
              }),
            }),
          }),
        };
      }
      
      if (callCount === 5) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: "choice-123" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };
    });

    (supabase.from as any) = mockFrom;

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Rastreamento")).toBeInTheDocument();
    });

    // Should show tracking card component
    expect(screen.getByTestId("tracking-card")).toBeInTheDocument();
  });

  it("should show on hold alert when production is paused", async () => {
    const mockProductionData = {
      id: "prod-123",
      order_id: "test-order-123",
      order_type: "subscription_delivery",
      current_stage: "production",
      production_status: "on_hold",
      choice_status: "approved",
      choice_deadline: null,
      character_id: "char-123",
      character_name: "Test Character",
      estimated_completion_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      production_started_at: new Date().toISOString(),
      production_completed_at: null,
      collection_id: "coll-123",
      collection_name: "Test Collection",
      tracking_code: null,
      tracking_carrier: null,
    };

    const mockStagesData = [
      { stage_name: "awaiting_choice", status: "completed", completed_at: new Date().toISOString(), stage_order: 1 },
      { stage_name: "design", status: "completed", completed_at: new Date().toISOString(), stage_order: 2 },
      { stage_name: "production", status: "in_progress", completed_at: null, stage_order: 3 },
      { stage_name: "quality_check", status: "pending", completed_at: null, stage_order: 4 },
      { stage_name: "packaging", status: "pending", completed_at: null, stage_order: 5 },
      { stage_name: "shipped", status: "pending", completed_at: null, stage_order: 6 },
    ];

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      callCount++;
      
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockProductionData,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      
      if (callCount === 2) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        };
      }
      
      if (callCount === 3) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        };
      }
      
      if (callCount === 4) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockStagesData,
                error: null,
              }),
            }),
          }),
        };
      }
      
      if (callCount === 5) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: "choice-123" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };
    });

    (supabase.from as any) = mockFrom;

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Produção Pausada")).toBeInTheDocument();
    });

    // Should show estimated dates card with on_hold status
    expect(screen.getByTestId("estimated-dates-card")).toBeInTheDocument();
  });
});
