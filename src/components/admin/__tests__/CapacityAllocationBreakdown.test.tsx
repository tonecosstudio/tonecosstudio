// @ts-nocheck
/**
 * Tests for CapacityAllocationBreakdown Component
 * 
 * Requirements: 16.4
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CapacityAllocationBreakdown } from "../CapacityAllocationBreakdown";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock recharts to avoid rendering issues in tests
vi.mock("recharts", () => ({
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  Legend: () => <div data-testid="legend" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe("CapacityAllocationBreakdown", () => {
  const mockCycleId = "cycle-123";
  const mockCycleName = "Ciclo 1 - Janeiro 2026";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading State", () => {
    it("should display loading state initially", () => {
      // Mock pending queries
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            neq: vi.fn().mockReturnValue(new Promise(() => {})), // Never resolves
          }),
        }),
      });

      (supabase.from as any).mockImplementation(mockFrom);

      render(<CapacityAllocationBreakdown cycleId={mockCycleId} cycleName={mockCycleName} />);

      expect(screen.getByText("Capacity Allocation Breakdown")).toBeInTheDocument();
      // Check for cycle name using partial match
      expect(screen.getByText(/Breakdown for Ciclo 1/i)).toBeInTheDocument();
      // Check for loading spinner
      const loader = document.querySelector('.animate-spin');
      expect(loader).toBeInTheDocument();
    });
  });

  describe("Data Display - By Collection", () => {
    it("should display capacity breakdown by collection", async () => {
      // Mock subscription deliveries
      const mockDeliveries = [
        {
          id: "delivery-1",
          collection_id: "collection-1",
          collections: { id: "collection-1", name: "Collection A" },
        },
        {
          id: "delivery-2",
          collection_id: "collection-1",
          collections: { id: "collection-1", name: "Collection A" },
        },
        {
          id: "delivery-3",
          collection_id: "collection-2",
          collections: { id: "collection-2", name: "Collection B" },
        },
      ];

      // Mock standalone purchases
      const mockStandalone = [
        {
          id: "standalone-1",
          collection_id: "collection-1",
          collections: { id: "collection-1", name: "Collection A" },
        },
      ];

      const mockFrom = vi.fn((table: string) => {
        if (table === "subscription_deliveries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockDeliveries,
                error: null,
              }),
            }),
          };
        } else if (table === "standalone_purchases") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({
                  data: mockStandalone,
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      (supabase.from as any).mockImplementation(mockFrom);

      render(<CapacityAllocationBreakdown cycleId={mockCycleId} cycleName={mockCycleName} />);

      await waitFor(() => {
        expect(screen.getByText("Collection A")).toBeInTheDocument();
        expect(screen.getByText("Collection B")).toBeInTheDocument();
      });

      // Collection A should have 2 subscriptions + 1 standalone = 3 total
      const rows = screen.getAllByRole("row");
      const collectionARow = rows.find((row) => row.textContent?.includes("Collection A"));
      expect(collectionARow).toBeDefined();
      expect(collectionARow?.textContent).toContain("2"); // subscriptions
      expect(collectionARow?.textContent).toContain("1"); // standalone
      expect(collectionARow?.textContent).toContain("3"); // total

      // Collection B should have 1 subscription + 0 standalone = 1 total
      const collectionBRow = rows.find((row) => row.textContent?.includes("Collection B"));
      expect(collectionBRow).toBeDefined();
      expect(collectionBRow?.textContent).toContain("1"); // subscriptions
      expect(collectionBRow?.textContent).toContain("0"); // standalone
      expect(collectionBRow?.textContent).toContain("1"); // total
    });

    it("should calculate correct percentages for collections", async () => {
      const mockDeliveries = [
        {
          id: "delivery-1",
          collection_id: "collection-1",
          collections: { id: "collection-1", name: "Collection A" },
        },
        {
          id: "delivery-2",
          collection_id: "collection-1",
          collections: { id: "collection-1", name: "Collection A" },
        },
        {
          id: "delivery-3",
          collection_id: "collection-2",
          collections: { id: "collection-2", name: "Collection B" },
        },
        {
          id: "delivery-4",
          collection_id: "collection-2",
          collections: { id: "collection-2", name: "Collection B" },
        },
      ];

      const mockFrom = vi.fn((table: string) => {
        if (table === "subscription_deliveries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockDeliveries,
                error: null,
              }),
            }),
          };
        } else if (table === "standalone_purchases") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      (supabase.from as any).mockImplementation(mockFrom);

      render(<CapacityAllocationBreakdown cycleId={mockCycleId} cycleName={mockCycleName} />);

      await waitFor(() => {
        // Total is 4, each collection has 2 = 50% each
        const percentages = screen.getAllByText("50%");
        expect(percentages.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Data Display - By Purchase Type", () => {
    it("should display capacity breakdown by purchase type", async () => {
      const mockDeliveries = [
        {
          id: "delivery-1",
          collection_id: "collection-1",
          collections: { id: "collection-1", name: "Collection A" },
        },
        {
          id: "delivery-2",
          collection_id: "collection-1",
          collections: { id: "collection-1", name: "Collection A" },
        },
      ];

      const mockStandalone = [
        {
          id: "standalone-1",
          collection_id: "collection-1",
          collections: { id: "collection-1", name: "Collection A" },
        },
      ];

      const mockFrom = vi.fn((table: string) => {
        if (table === "subscription_deliveries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockDeliveries,
                error: null,
              }),
            }),
          };
        } else if (table === "standalone_purchases") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({
                  data: mockStandalone,
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      (supabase.from as any).mockImplementation(mockFrom);

      render(<CapacityAllocationBreakdown cycleId={mockCycleId} cycleName={mockCycleName} />);

      await waitFor(() => {
        expect(screen.getByText("Subscription Deliveries")).toBeInTheDocument();
        expect(screen.getByText("Standalone Purchases")).toBeInTheDocument();
      });

      // Should show counts: 2 subscriptions, 1 standalone
      const rows = screen.getAllByRole("row");
      const subscriptionRow = rows.find((row) => row.textContent?.includes("Subscription Deliveries"));
      expect(subscriptionRow?.textContent).toContain("2");

      const standaloneRow = rows.find((row) => row.textContent?.includes("Standalone Purchases"));
      expect(standaloneRow?.textContent).toContain("1");
    });

    it("should calculate correct percentages for purchase types", async () => {
      // 3 subscriptions + 1 standalone = 4 total
      // Subscriptions: 75%, Standalone: 25%
      const mockDeliveries = [
        { id: "d1", collection_id: "c1", collections: { id: "c1", name: "Collection A" } },
        { id: "d2", collection_id: "c1", collections: { id: "c1", name: "Collection A" } },
        { id: "d3", collection_id: "c1", collections: { id: "c1", name: "Collection A" } },
      ];

      const mockStandalone = [
        { id: "s1", collection_id: "c1", collections: { id: "c1", name: "Collection A" } },
      ];

      const mockFrom = vi.fn((table: string) => {
        if (table === "subscription_deliveries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockDeliveries,
                error: null,
              }),
            }),
          };
        } else if (table === "standalone_purchases") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({
                  data: mockStandalone,
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      (supabase.from as any).mockImplementation(mockFrom);

      render(<CapacityAllocationBreakdown cycleId={mockCycleId} cycleName={mockCycleName} />);

      await waitFor(() => {
        expect(screen.getByText("75%")).toBeInTheDocument();
        expect(screen.getByText("25%")).toBeInTheDocument();
      });
    });
  });

  describe("Empty State", () => {
    it("should display empty state when no data", async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            neq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      render(<CapacityAllocationBreakdown cycleId={mockCycleId} cycleName={mockCycleName} />);

      await waitFor(() => {
        // Check for empty state messages in the table body
        const tableCells = screen.getAllByRole("cell");
        const hasEmptyMessage = tableCells.some(
          (cell) =>
            cell.textContent?.includes("No capacity allocated yet") ||
            cell.textContent?.includes("No collections allocated yet")
        );
        expect(hasEmptyMessage).toBe(true);
      });
    });
  });

  describe("Cancelled Purchases Exclusion", () => {
    it("should exclude cancelled standalone purchases from breakdown", async () => {
      const mockDeliveries = [
        {
          id: "delivery-1",
          collection_id: "collection-1",
          collections: { id: "collection-1", name: "Collection A" },
        },
      ];

      // Include a cancelled purchase - should be filtered out
      const mockStandalone = [
        {
          id: "standalone-1",
          collection_id: "collection-1",
          status: "balance_paid",
          collections: { id: "collection-1", name: "Collection A" },
        },
        {
          id: "standalone-2",
          collection_id: "collection-1",
          status: "cancelled", // This should be excluded
          collections: { id: "collection-1", name: "Collection A" },
        },
      ];

      const mockFrom = vi.fn((table: string) => {
        if (table === "subscription_deliveries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockDeliveries,
                error: null,
              }),
            }),
          };
        } else if (table === "standalone_purchases") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({
                  // Simulate the .neq("status", "cancelled") filter
                  data: mockStandalone.filter((p) => p.status !== "cancelled"),
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      (supabase.from as any).mockImplementation(mockFrom);

      render(<CapacityAllocationBreakdown cycleId={mockCycleId} cycleName={mockCycleName} />);

      await waitFor(() => {
        // Should show 1 subscription + 1 standalone (cancelled excluded) = 2 total
        expect(screen.getByText(/Total: 2 pieces/i)).toBeInTheDocument();
      });
    });
  });

  describe("Tab Navigation", () => {
    it("should render both table and chart tabs", async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            neq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      render(<CapacityAllocationBreakdown cycleId={mockCycleId} cycleName={mockCycleName} />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /Table View/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Chart View/i })).toBeInTheDocument();
      });
    });
  });

  describe("Sorting", () => {
    it("should sort collections by total count descending", async () => {
      const mockDeliveries = [
        { id: "d1", collection_id: "c1", collections: { id: "c1", name: "Collection A" } },
        { id: "d2", collection_id: "c2", collections: { id: "c2", name: "Collection B" } },
        { id: "d3", collection_id: "c2", collections: { id: "c2", name: "Collection B" } },
        { id: "d4", collection_id: "c2", collections: { id: "c2", name: "Collection B" } },
      ];

      const mockFrom = vi.fn((table: string) => {
        if (table === "subscription_deliveries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockDeliveries,
                error: null,
              }),
            }),
          };
        } else if (table === "standalone_purchases") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      (supabase.from as any).mockImplementation(mockFrom);

      render(<CapacityAllocationBreakdown cycleId={mockCycleId} cycleName={mockCycleName} />);

      await waitFor(() => {
        const rows = screen.getAllByRole("row");
        const collectionRows = rows.filter(
          (row) => row.textContent?.includes("Collection A") || row.textContent?.includes("Collection B")
        );

        // Collection B (3 pieces) should appear before Collection A (1 piece)
        expect(collectionRows[0].textContent).toContain("Collection B");
        expect(collectionRows[1].textContent).toContain("Collection A");
      });
    });
  });
});
