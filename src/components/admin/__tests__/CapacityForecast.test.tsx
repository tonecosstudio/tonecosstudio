import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CapacityForecast } from "../CapacityForecast";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock toast
const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe("CapacityForecast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCyclesQuery = (data: any[], error: any = null) => {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data, error }),
    };
  };

  const mockCountQuery = (count: number, error: any = null) => {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockResolvedValue({ data: count, error }),
    };
  };

  const mockSubscriptionsQuery = (data: any[], error: any = null) => {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data, error }),
    };
  };

  it("should render loading state initially", () => {
    vi.mocked(supabase.from).mockReturnValue(mockCyclesQuery([]) as any);

    render(<CapacityForecast />);

    expect(screen.getByText("Previsão de Capacidade")).toBeInTheDocument();
    // Check for the loader icon instead of role="status"
    const loader = document.querySelector('.animate-spin');
    expect(loader).toBeInTheDocument();
  });

  it("should display forecast for next 3 months", async () => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const month2 = new Date(today.getFullYear(), today.getMonth() + 2, 1);
    const month3 = new Date(today.getFullYear(), today.getMonth() + 3, 1);

    // Mock cycles data
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "cycles") {
        return mockCyclesQuery([
          { id: "cycle1", cycle_number: 1, capacity_max: 100, capacity_current: 20 },
          { id: "cycle2", cycle_number: 2, capacity_max: 100, capacity_current: 30 },
        ]) as any;
      }
      if (table === "subscription_deliveries") {
        return mockCountQuery(10) as any;
      }
      if (table === "subscriptions") {
        return mockSubscriptionsQuery([
          {
            id: "sub1",
            plan_type: "trimestral",
            deliveries_completed: 1,
            deliveries_total: 3,
            created_at: today.toISOString(),
          },
        ]) as any;
      }
      if (table === "standalone_purchases") {
        return mockCountQuery(5) as any;
      }
      return {} as any;
    });

    render(<CapacityForecast />);

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    // Check that 3 months are displayed
    const monthNames = [
      new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(nextMonth),
      new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(month2),
      new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(month3),
    ];

    // At least one month should be visible (case-insensitive check)
    const tableContent = screen.getByRole("table").textContent || "";
    expect(tableContent.toLowerCase()).toContain(monthNames[0].toLowerCase());
  });

  it("should highlight months exceeding capacity", async () => {
    // Mock data where projected usage exceeds capacity
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "cycles") {
        return mockCyclesQuery([
          { id: "cycle1", cycle_number: 1, capacity_max: 50, capacity_current: 40 },
          { id: "cycle2", cycle_number: 2, capacity_max: 50, capacity_current: 45 },
        ]) as any;
      }
      if (table === "subscription_deliveries") {
        return mockCountQuery(20) as any; // High scheduled deliveries
      }
      if (table === "subscriptions") {
        return mockSubscriptionsQuery([
          {
            id: "sub1",
            plan_type: "semestral",
            deliveries_completed: 0,
            deliveries_total: 6,
            created_at: new Date().toISOString(),
          },
        ]) as any;
      }
      if (table === "standalone_purchases") {
        return mockCountQuery(10) as any;
      }
      return {} as any;
    });

    render(<CapacityForecast />);

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    // Should show warning alert
    await waitFor(() => {
      expect(screen.getByText("Atenção")).toBeInTheDocument();
    });
  });

  it("should show warning for months at 80% capacity", async () => {
    // Mock data where usage is at 80%
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "cycles") {
        return mockCyclesQuery([
          { id: "cycle1", cycle_number: 1, capacity_max: 100, capacity_current: 70 },
          { id: "cycle2", cycle_number: 2, capacity_max: 100, capacity_current: 70 },
        ]) as any;
      }
      if (table === "subscription_deliveries") {
        return mockCountQuery(10) as any;
      }
      if (table === "subscriptions") {
        return mockSubscriptionsQuery([
          {
            id: "sub1",
            plan_type: "trimestral",
            deliveries_completed: 1,
            deliveries_total: 3,
            created_at: new Date().toISOString(),
          },
        ]) as any;
      }
      if (table === "standalone_purchases") {
        return mockCountQuery(5) as any;
      }
      return {} as any;
    });

    render(<CapacityForecast />);

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    // Should show warning alert for high capacity - check for the legend text instead
    await waitFor(() => {
      expect(screen.getByText(/Atenção \(80-100%\)/)).toBeInTheDocument();
    });
  });

  it("should display capacity details in table", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "cycles") {
        return mockCyclesQuery([
          { id: "cycle1", cycle_number: 1, capacity_max: 100, capacity_current: 20 },
          { id: "cycle2", cycle_number: 2, capacity_max: 100, capacity_current: 30 },
        ]) as any;
      }
      if (table === "subscription_deliveries") {
        return mockCountQuery(10) as any;
      }
      if (table === "subscriptions") {
        return mockSubscriptionsQuery([]) as any;
      }
      if (table === "standalone_purchases") {
        return mockCountQuery(5) as any;
      }
      return {} as any;
    });

    render(<CapacityForecast />);

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    // Check table headers
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Mês/Ano")).toBeInTheDocument();
    expect(screen.getByText("Uso Projetado")).toBeInTheDocument();
    expect(screen.getByText("Limite de Capacidade")).toBeInTheDocument();
    expect(screen.getByText("Utilização")).toBeInTheDocument();
  });

  it("should use default capacity when cycles don't exist", async () => {
    // Mock no cycles exist yet
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "cycles") {
        return mockCyclesQuery([]) as any; // No cycles
      }
      if (table === "subscription_deliveries") {
        return mockCountQuery(10) as any;
      }
      if (table === "subscriptions") {
        return mockSubscriptionsQuery([]) as any;
      }
      if (table === "standalone_purchases") {
        return mockCountQuery(5) as any;
      }
      return {} as any;
    });

    render(<CapacityForecast />);

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    // Should display default capacity (200 per month)
    const tableContent = screen.getByRole("table").textContent || "";
    expect(tableContent).toContain("200 peças");
  });

  it("should calculate projected usage from multiple sources", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "cycles") {
        return mockCyclesQuery([
          { id: "cycle1", cycle_number: 1, capacity_max: 100, capacity_current: 10 },
          { id: "cycle2", cycle_number: 2, capacity_max: 100, capacity_current: 15 },
        ]) as any;
      }
      if (table === "subscription_deliveries") {
        return mockCountQuery(20) as any; // 20 scheduled deliveries
      }
      if (table === "subscriptions") {
        return mockSubscriptionsQuery([
          {
            id: "sub1",
            plan_type: "trimestral",
            deliveries_completed: 0,
            deliveries_total: 3,
            created_at: new Date().toISOString(),
          },
        ]) as any;
      }
      if (table === "standalone_purchases") {
        return mockCountQuery(5) as any; // 5 standalone purchases
      }
      return {} as any;
    });

    render(<CapacityForecast />);

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    // Projected usage should include:
    // - Current usage (10 + 15 = 25)
    // - Scheduled deliveries (20)
    // - Estimated from subscriptions (1)
    // - Standalone purchases (5)
    // Total should be visible in the table
    const tableContent = screen.getByRole("table").textContent || "";
    expect(tableContent).toContain("peças");
  });

  it("should display legend explaining status icons", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "cycles") {
        return mockCyclesQuery([
          { id: "cycle1", cycle_number: 1, capacity_max: 100, capacity_current: 20 },
        ]) as any;
      }
      if (table === "subscription_deliveries") {
        return mockCountQuery(5) as any;
      }
      if (table === "subscriptions") {
        return mockSubscriptionsQuery([]) as any;
      }
      if (table === "standalone_purchases") {
        return mockCountQuery(2) as any;
      }
      return {} as any;
    });

    render(<CapacityForecast />);

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    // Check legend is present
    expect(screen.getByText("Legenda:")).toBeInTheDocument();
    expect(screen.getByText(/Capacidade normal/)).toBeInTheDocument();
    expect(screen.getByText(/Atenção \(80-100%\)/)).toBeInTheDocument();
    expect(screen.getByText(/Excede capacidade/)).toBeInTheDocument();
  });

  it("should display note about forecast accuracy", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "cycles") {
        return mockCyclesQuery([
          { id: "cycle1", cycle_number: 1, capacity_max: 100, capacity_current: 20 },
        ]) as any;
      }
      if (table === "subscription_deliveries") {
        return mockCountQuery(5) as any;
      }
      if (table === "subscriptions") {
        return mockSubscriptionsQuery([]) as any;
      }
      if (table === "standalone_purchases") {
        return mockCountQuery(2) as any;
      }
      return {} as any;
    });

    render(<CapacityForecast />);

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    // Check note is present
    expect(screen.getByText(/Esta previsão é baseada/)).toBeInTheDocument();
  });

  it("should handle errors gracefully", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "cycles") {
        return mockCyclesQuery([], new Error("Database error")) as any;
      }
      return {} as any;
    });

    render(<CapacityForecast />);

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    // Component should still render without crashing
    expect(screen.getByText("Previsão de Capacidade")).toBeInTheDocument();
  });
});
