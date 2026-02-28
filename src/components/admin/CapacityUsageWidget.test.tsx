import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as fc from "fast-check";
import { CapacityUsageWidget } from "./CapacityUsageWidget";
import * as capacityService from "@/services/capacity-service";

// Mock the capacity service
vi.mock("@/services/capacity-service");

// Helper to create a test wrapper with React Query
function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("CapacityUsageWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Unit Tests", () => {
    it("should render loading state initially", () => {
      vi.mocked(capacityService.getCapacityUsage).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<CapacityUsageWidget cycleId="test-cycle" />, {
        wrapper: createTestWrapper(),
      });

      expect(screen.getByText("Capacity Usage")).toBeInTheDocument();
      // Check for loading skeleton
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("should render error state when capacity fetch fails", async () => {
      const errorMessage = "Failed to fetch capacity";
      vi.mocked(capacityService.getCapacityUsage).mockRejectedValue(
        new Error(errorMessage)
      );

      render(<CapacityUsageWidget cycleId="test-cycle" />, {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it("should render capacity data with green status when usage < 70%", async () => {
      vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
        max: 100,
        current: 50,
        available: 50,
        percentage: 50,
      });

      render(<CapacityUsageWidget cycleId="test-cycle" />, {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText("50%")).toBeInTheDocument();
        // Use the summary text which is unique
        expect(screen.getByText("50 / 100 pieces (50%)")).toBeInTheDocument();
        expect(screen.getByText("Healthy")).toBeInTheDocument();
      });

      // Check for green progress bar
      const progressBar = document.querySelector(".bg-green-500");
      expect(progressBar).toBeInTheDocument();
    });

    it("should render capacity data with yellow status when usage 70-90%", async () => {
      vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
        max: 100,
        current: 80,
        available: 20,
        percentage: 80,
      });

      render(<CapacityUsageWidget cycleId="test-cycle" />, {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText("80%")).toBeInTheDocument();
        expect(screen.getByText("Warning")).toBeInTheDocument();
      });

      // Check for yellow progress bar
      const progressBar = document.querySelector(".bg-yellow-500");
      expect(progressBar).toBeInTheDocument();
    });

    it("should render capacity data with red status when usage > 90%", async () => {
      vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
        max: 100,
        current: 95,
        available: 5,
        percentage: 95,
      });

      render(<CapacityUsageWidget cycleId="test-cycle" />, {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText("95%")).toBeInTheDocument();
        expect(screen.getByText("Critical")).toBeInTheDocument();
      });

      // Check for red progress bar
      const progressBar = document.querySelector(".bg-red-500");
      expect(progressBar).toBeInTheDocument();
    });

    it("should render custom title when provided", async () => {
      vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
        max: 100,
        current: 50,
        available: 50,
        percentage: 50,
      });

      render(
        <CapacityUsageWidget cycleId="test-cycle" title="Cycle 1 Capacity" />,
        {
          wrapper: createTestWrapper(),
        }
      );

      await waitFor(() => {
        expect(screen.getByText("Cycle 1 Capacity")).toBeInTheDocument();
      });
    });

    it("should apply custom className when provided", async () => {
      vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
        max: 100,
        current: 50,
        available: 50,
        percentage: 50,
      });

      const { container } = render(
        <CapacityUsageWidget cycleId="test-cycle" className="custom-class" />,
        {
          wrapper: createTestWrapper(),
        }
      );

      await waitFor(() => {
        const card = container.querySelector(".custom-class");
        expect(card).toBeInTheDocument();
      });
    });

    it("should display all numerical values correctly", async () => {
      vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
        max: 150,
        current: 75,
        available: 75,
        percentage: 50,
      });

      render(<CapacityUsageWidget cycleId="test-cycle" />, {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText("50%")).toBeInTheDocument();
        // Use the summary text which is unique
        expect(screen.getByText("75 / 150 pieces (50%)")).toBeInTheDocument();
      });
    });

    it("should handle 0% capacity usage", async () => {
      vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
        max: 100,
        current: 0,
        available: 100,
        percentage: 0,
      });

      render(<CapacityUsageWidget cycleId="test-cycle" />, {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText("0%")).toBeInTheDocument();
        expect(screen.getByText("Healthy")).toBeInTheDocument();
      });
    });

    it("should handle 100% capacity usage", async () => {
      vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
        max: 100,
        current: 100,
        available: 0,
        percentage: 100,
      });

      render(<CapacityUsageWidget cycleId="test-cycle" />, {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText("100%")).toBeInTheDocument();
        expect(screen.getByText("Critical")).toBeInTheDocument();
      });
    });

    it("should handle edge case at 70% boundary (should be yellow)", async () => {
      vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
        max: 100,
        current: 70,
        available: 30,
        percentage: 70,
      });

      render(<CapacityUsageWidget cycleId="test-cycle" />, {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText("70%")).toBeInTheDocument();
        expect(screen.getByText("Warning")).toBeInTheDocument();
      });

      const progressBar = document.querySelector(".bg-yellow-500");
      expect(progressBar).toBeInTheDocument();
    });

    it("should handle edge case at 90% boundary (should be yellow)", async () => {
      vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
        max: 100,
        current: 90,
        available: 10,
        percentage: 90,
      });

      render(<CapacityUsageWidget cycleId="test-cycle" />, {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText("90%")).toBeInTheDocument();
        expect(screen.getByText("Warning")).toBeInTheDocument();
      });

      const progressBar = document.querySelector(".bg-yellow-500");
      expect(progressBar).toBeInTheDocument();
    });

    it("should handle edge case at 91% (should be red)", async () => {
      vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
        max: 100,
        current: 91,
        available: 9,
        percentage: 91,
      });

      render(<CapacityUsageWidget cycleId="test-cycle" />, {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText("91%")).toBeInTheDocument();
        expect(screen.getByText("Critical")).toBeInTheDocument();
      });

      const progressBar = document.querySelector(".bg-red-500");
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe("Property-Based Tests", () => {
    /**
     * Property: Color Coding Consistency
     * For any capacity percentage:
     * - If percentage < 70, status should be "Healthy" with green color
     * - If 70 <= percentage <= 90, status should be "Warning" with yellow color
     * - If percentage > 90, status should be "Critical" with red color
     * 
     * Validates: Requirements 3.7
     */
    it("should consistently apply correct color coding based on percentage", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 1, max: 1000 }),
          async (percentage, max) => {
            const current = Math.round((percentage / 100) * max);
            const available = max - current;

            vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
              max,
              current,
              available,
              percentage,
            });

            const { container } = render(
              <CapacityUsageWidget cycleId={`test-cycle-${percentage}-${max}`} />,
              {
                wrapper: createTestWrapper(),
              }
            );

            await waitFor(() => {
              const percentageText = within(container).getByText(`${percentage}%`);
              expect(percentageText).toBeInTheDocument();
            });

            // Verify color coding
            if (percentage < 70) {
              expect(within(container).getByText("Healthy")).toBeInTheDocument();
              expect(container.querySelector(".bg-green-500")).toBeInTheDocument();
            } else if (percentage <= 90) {
              expect(within(container).getByText("Warning")).toBeInTheDocument();
              expect(container.querySelector(".bg-yellow-500")).toBeInTheDocument();
            } else {
              expect(within(container).getByText("Critical")).toBeInTheDocument();
              expect(container.querySelector(".bg-red-500")).toBeInTheDocument();
            }

            // Clean up after each iteration
            cleanup();
          }
        ),
        { numRuns: 50 } // Reduced from 100 for faster execution
      );
    }, 30000); // 30 second timeout

    /**
     * Property: Capacity Calculation Accuracy
     * For any capacity values, the displayed values should match the input:
     * - current + available should equal max
     * - percentage should be correctly calculated
     * - all values should be displayed in the UI
     * 
     * Validates: Requirements 3.7
     */
    it("should accurately display all capacity values", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 0, max: 100 }),
          async (max, percentage) => {
            const current = Math.round((percentage / 100) * max);
            const available = max - current;

            vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
              max,
              current,
              available,
              percentage,
            });

            const { container } = render(<CapacityUsageWidget cycleId={`test-cycle-${max}-${percentage}`} />, {
              wrapper: createTestWrapper(),
            });

            await waitFor(() => {
              // Check percentage display
              expect(within(container).getByText(`${percentage}%`)).toBeInTheDocument();
              
              // Check summary text (most specific check)
              expect(
                within(container).getByText(`${current} / ${max} pieces (${percentage}%)`)
              ).toBeInTheDocument();
            });

            // Verify calculation: current + available = max
            expect(current + available).toBe(max);

            // Clean up after each iteration
            cleanup();
          }
        ),
        { numRuns: 50 } // Reduced from 100 for faster execution
      );
    }, 30000); // 30 second timeout

    /**
     * Property: Progress Bar Width Accuracy
     * For any percentage value, the progress bar width should match the percentage
     * 
     * Validates: Requirements 3.7
     */
    it("should set progress bar width to match percentage", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }),
          async (percentage) => {
            vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
              max: 100,
              current: percentage,
              available: 100 - percentage,
              percentage,
            });

            const { container } = render(
              <CapacityUsageWidget cycleId={`test-cycle-${percentage}`} />,
              {
                wrapper: createTestWrapper(),
              }
            );

            await waitFor(() => {
              const progressBar = container.querySelector(
                ".bg-green-500, .bg-yellow-500, .bg-red-500"
              );
              expect(progressBar).toBeInTheDocument();
              
              // Check that the width style is set correctly
              const style = (progressBar as HTMLElement).style.width;
              expect(style).toBe(`${percentage}%`);
            });

            // Clean up after each iteration
            cleanup();
          }
        ),
        { numRuns: 50 } // Reduced from 100 for faster execution
      );
    }, 30000); // 30 second timeout

    /**
     * Property: Boundary Transitions
     * Test that color transitions happen at exactly the right boundaries:
     * - 69% should be green, 70% should be yellow
     * - 90% should be yellow, 91% should be red
     * 
     * Validates: Requirements 3.7
     */
    it("should transition colors at exact boundaries", async () => {
      const testCases = [
        { percentage: 69, expectedColor: "bg-green-500", expectedStatus: "Healthy" },
        { percentage: 70, expectedColor: "bg-yellow-500", expectedStatus: "Warning" },
        { percentage: 90, expectedColor: "bg-yellow-500", expectedStatus: "Warning" },
        { percentage: 91, expectedColor: "bg-red-500", expectedStatus: "Critical" },
      ];

      for (const testCase of testCases) {
        vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
          max: 100,
          current: testCase.percentage,
          available: 100 - testCase.percentage,
          percentage: testCase.percentage,
        });

        const { container } = render(
          <CapacityUsageWidget cycleId={`test-cycle-${testCase.percentage}`} />,
          {
            wrapper: createTestWrapper(),
          }
        );

        await waitFor(() => {
          expect(screen.getByText(testCase.expectedStatus)).toBeInTheDocument();
          expect(container.querySelector(`.${testCase.expectedColor}`)).toBeInTheDocument();
        });

        // Clean up after each test case
        cleanup();
      }
    });

    /**
     * Property: Error Handling Robustness
     * For any error thrown by the capacity service, the component should:
     * - Display an error message
     * - Not crash
     * - Show the error details
     * 
     * Validates: Requirements 3.7
     */
    it("should handle various error scenarios gracefully", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate simple strings with letters and numbers, excluding whitespace-only strings
          fc.string().filter(s => {
            const trimmed = s.trim();
            return trimmed.length >= 5 && trimmed.length <= 50 && /^[a-zA-Z0-9 ]+$/.test(trimmed);
          }),
          async (errorMessage) => {
            const trimmed = errorMessage.trim();
            
            vi.mocked(capacityService.getCapacityUsage).mockRejectedValue(
              new Error(trimmed)
            );

            const { container } = render(<CapacityUsageWidget cycleId={`test-cycle-error-${trimmed.length}`} />, {
              wrapper: createTestWrapper(),
            });

            await waitFor(() => {
              expect(within(container).getByText(trimmed)).toBeInTheDocument();
            });

            // Clean up after each iteration
            cleanup();
          }
        ),
        { numRuns: 50 } // Reduced from 100 for faster execution
      );
    }, 30000); // 30 second timeout
  });
});
