/**
 * Tests for StageTransitionModal validation features
 *
 * Tests the stage validation integration including:
 * - Validation error display
 * - Admin override checkbox
 * - Justification requirement
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StageTransitionModal } from "../StageTransitionModal";
import type { ProductionStageRecord } from "@/hooks/admin/useProductionStages";

// Mock the services
vi.mock("@/services/admin/stage-service", () => ({
  completeStage: vi.fn(),
  uploadStagePhoto: vi.fn(),
}));

vi.mock("@/services/admin/stage-validation", () => ({
  validateStageTransition: vi.fn(),
}));

vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
}));

const createMockStage = (overrides?: Partial<ProductionStageRecord>): ProductionStageRecord => ({
  id: "stage-1",
  productionQueueId: "queue-1",
  stageName: "design",
  stageOrder: 2,
  status: "in_progress",
  startedAt: new Date().toISOString(),
  completedAt: null,
  estimatedDuration: 48,
  actualDuration: null,
  assignedTo: null,
  assignedToName: null,
  assignedAt: null,
  notes: null,
  photos: [],
  isBlocked: false,
  blockReason: null,
  blockedAt: null,
  unblockedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe("StageTransitionModal - Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display validation error when stage transition is invalid", async () => {
    const { validateStageTransition } = await import("@/services/admin/stage-validation");
    vi.mocked(validateStageTransition).mockResolvedValue({
      isValid: false,
      error: "Cannot skip stages. Previous stage must be completed first.",
      canOverride: true,
      requiresJustification: true,
    });

    const currentStage = createMockStage();
    const nextStage = createMockStage({ id: "stage-2", stageName: "production", stageOrder: 3 });

    renderWithProviders(
      <StageTransitionModal
        isOpen={true}
        onOpenChange={vi.fn()}
        currentStage={currentStage}
        nextStage={nextStage}
        productionQueueId="queue-1"
      />
    );

    const completeButton = screen.getByRole("button", { name: /completar/i });
    await userEvent.click(completeButton);

    await waitFor(() => {
      expect(screen.getByText(/validação bloqueada/i)).toBeInTheDocument();
      expect(
        screen.getByText(/cannot skip stages/i)
      ).toBeInTheDocument();
    });
  });

  it("should show admin override checkbox when validation fails with override option", async () => {
    const { validateStageTransition } = await import("@/services/admin/stage-validation");
    vi.mocked(validateStageTransition).mockResolvedValue({
      isValid: false,
      error: "Cannot skip stages.",
      canOverride: true,
      requiresJustification: true,
    });

    const currentStage = createMockStage();
    const nextStage = createMockStage({ id: "stage-2", stageName: "production", stageOrder: 3 });

    renderWithProviders(
      <StageTransitionModal
        isOpen={true}
        onOpenChange={vi.fn()}
        currentStage={currentStage}
        nextStage={nextStage}
        productionQueueId="queue-1"
      />
    );

    const completeButton = screen.getByRole("button", { name: /completar/i });
    await userEvent.click(completeButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/autorizar override administrativo/i)).toBeInTheDocument();
    });
  });

  it("should show justification textarea when override is enabled", async () => {
    const { validateStageTransition } = await import("@/services/admin/stage-validation");
    vi.mocked(validateStageTransition).mockResolvedValue({
      isValid: false,
      error: "Cannot skip stages.",
      canOverride: true,
      requiresJustification: true,
    });

    const currentStage = createMockStage();
    const nextStage = createMockStage({ id: "stage-2", stageName: "production", stageOrder: 3 });

    renderWithProviders(
      <StageTransitionModal
        isOpen={true}
        onOpenChange={vi.fn()}
        currentStage={currentStage}
        nextStage={nextStage}
        productionQueueId="queue-1"
      />
    );

    const completeButton = screen.getByRole("button", { name: /completar/i });
    await userEvent.click(completeButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/autorizar override administrativo/i)).toBeInTheDocument();
    });

    const overrideCheckbox = screen.getByLabelText(/autorizar override administrativo/i);
    await userEvent.click(overrideCheckbox);

    await waitFor(() => {
      expect(screen.getByLabelText(/justificativa/i)).toBeInTheDocument();
    });
  });

  it("should disable complete button when override is enabled but justification is empty", async () => {
    const { validateStageTransition } = await import("@/services/admin/stage-validation");
    vi.mocked(validateStageTransition).mockResolvedValue({
      isValid: false,
      error: "Cannot skip stages.",
      canOverride: true,
      requiresJustification: true,
    });

    const currentStage = createMockStage();
    const nextStage = createMockStage({ id: "stage-2", stageName: "production", stageOrder: 3 });

    renderWithProviders(
      <StageTransitionModal
        isOpen={true}
        onOpenChange={vi.fn()}
        currentStage={currentStage}
        nextStage={nextStage}
        productionQueueId="queue-1"
      />
    );

    const completeButton = screen.getByRole("button", { name: /completar/i });
    await userEvent.click(completeButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/autorizar override administrativo/i)).toBeInTheDocument();
    });

    const overrideCheckbox = screen.getByLabelText(/autorizar override administrativo/i);
    await userEvent.click(overrideCheckbox);

    await waitFor(() => {
      const button = screen.getByRole("button", { name: /override/i });
      expect(button).toBeDisabled();
    });
  });

  it("should call completeStage with override parameters when justification is provided", async () => {
    const { validateStageTransition } = await import("@/services/admin/stage-validation");
    const { completeStage } = await import("@/services/admin/stage-service");

    vi.mocked(validateStageTransition).mockResolvedValue({
      isValid: false,
      error: "Cannot skip stages.",
      canOverride: true,
      requiresJustification: true,
    });

    vi.mocked(completeStage).mockResolvedValue(createMockStage({ status: "completed" }));

    const currentStage = createMockStage();
    const nextStage = createMockStage({ id: "stage-2", stageName: "production", stageOrder: 3 });

    renderWithProviders(
      <StageTransitionModal
        isOpen={true}
        onOpenChange={vi.fn()}
        currentStage={currentStage}
        nextStage={nextStage}
        productionQueueId="queue-1"
      />
    );

    const completeButton = screen.getByRole("button", { name: /completar/i });
    await userEvent.click(completeButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/autorizar override administrativo/i)).toBeInTheDocument();
    });

    const overrideCheckbox = screen.getByLabelText(/autorizar override administrativo/i);
    await userEvent.click(overrideCheckbox);

    await waitFor(() => {
      expect(screen.getByLabelText(/justificativa/i)).toBeInTheDocument();
    });

    const justificationTextarea = screen.getByLabelText(/justificativa/i);
    await userEvent.type(justificationTextarea, "Emergency production deadline");

    const overrideButton = screen.getByRole("button", { name: /override/i });
    await userEvent.click(overrideButton);

    await waitFor(() => {
      expect(completeStage).toHaveBeenCalledWith(
        "stage-1",
        undefined,
        undefined,
        true,
        "Emergency production deadline"
      );
    });
  });
});
