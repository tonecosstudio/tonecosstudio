/**
 * Unit Tests for StageTransitionModal Component
 *
 * Tests cover:
 * - Component rendering with current and next stage
 * - Notes textarea functionality
 * - Photo upload (up to 5 photos)
 * - Estimated time display
 * - Complete button functionality
 * - Form validation and error handling
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StageTransitionModal } from "./StageTransitionModal";
import type { ProductionStageRecord } from "@/services/admin/stage-service";
import * as stageService from "@/services/admin/stage-service";

// Mock the stage service
vi.mock("@/services/admin/stage-service", () => ({
  completeStage: vi.fn(),
  uploadStagePhoto: vi.fn(),
}));

// Mock stage validation
vi.mock("@/services/admin/stage-validation", () => ({
  validateStageTransition: vi.fn(),
  logStageTransition: vi.fn(),
  getPreviousStage: vi.fn(),
}));

// Mock toast
vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
}));

// Helper to create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

// Helper to wrap component with providers
const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

// Mock stage data
const mockCurrentStage: ProductionStageRecord = {
  id: "stage-1",
  productionQueueId: "queue-1",
  stageName: "design",
  stageOrder: 2,
  status: "in_progress",
  startedAt: "2024-01-15T10:00:00Z",
  completedAt: null,
  estimatedDuration: 8,
  actualDuration: null,
  assignedTo: "user-1",
  assignedToName: "João Silva",
  assignedAt: "2024-01-15T09:00:00Z",
  notes: null,
  photos: [],
  isBlocked: false,
  blockReason: null,
  blockedAt: null,
  unblockedAt: null,
  createdAt: "2024-01-15T08:00:00Z",
  updatedAt: "2024-01-15T10:00:00Z",
};

const mockNextStage: ProductionStageRecord = {
  id: "stage-2",
  productionQueueId: "queue-1",
  stageName: "production",
  stageOrder: 3,
  status: "pending",
  startedAt: null,
  completedAt: null,
  estimatedDuration: 24,
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
  createdAt: "2024-01-15T08:00:00Z",
  updatedAt: "2024-01-15T08:00:00Z",
};

describe("StageTransitionModal", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnComplete = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Setup default mock for validation to pass
    const { validateStageTransition } = await import("@/services/admin/stage-validation");
    vi.mocked(validateStageTransition).mockResolvedValue({
      isValid: true,
      canOverride: false,
      requiresJustification: false,
    });
  });

  it("renders modal with current and next stage", () => {
    renderWithProviders(
      <StageTransitionModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        currentStage={mockCurrentStage}
        nextStage={mockNextStage}
        productionQueueId="queue-1"
      />
    );

    expect(screen.getByText("Completar Estágio de Produção")).toBeInTheDocument();
    expect(screen.getByText("Design")).toBeInTheDocument();
    expect(screen.getByText("Produção")).toBeInTheDocument();
  });

  it("displays estimated time for next stage", () => {
    renderWithProviders(
      <StageTransitionModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        currentStage={mockCurrentStage}
        nextStage={mockNextStage}
        productionQueueId="queue-1"
      />
    );

    expect(screen.getByText("Tempo Estimado para o Próximo Estágio")).toBeInTheDocument();
    expect(screen.getByText("1 dias")).toBeInTheDocument();
  });

  it("shows 'Concluído' when there is no next stage", () => {
    renderWithProviders(
      <StageTransitionModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        currentStage={mockCurrentStage}
        nextStage={null}
        productionQueueId="queue-1"
      />
    );

    expect(screen.getByText("Concluído")).toBeInTheDocument();
  });

  it("allows entering notes in textarea", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <StageTransitionModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        currentStage={mockCurrentStage}
        nextStage={mockNextStage}
        productionQueueId="queue-1"
      />
    );

    const textarea = screen.getByPlaceholderText("Adicione observações sobre este estágio...");
    await user.type(textarea, "Design aprovado pelo cliente");

    expect(textarea).toHaveValue("Design aprovado pelo cliente");
  });

  it("displays current stage information", () => {
    renderWithProviders(
      <StageTransitionModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        currentStage={mockCurrentStage}
        nextStage={mockNextStage}
        productionQueueId="queue-1"
      />
    );

    expect(screen.getByText("Atribuído a: João Silva")).toBeInTheDocument();
    expect(screen.getByText("Estágio 2 de 6")).toBeInTheDocument();
  });

  it("shows photo upload button with count", () => {
    renderWithProviders(
      <StageTransitionModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        currentStage={mockCurrentStage}
        nextStage={mockNextStage}
        productionQueueId="queue-1"
      />
    );

    expect(screen.getByText(/Adicionar Fotos \(0\/5\)/)).toBeInTheDocument();
  });

  it("allows uploading photos", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <StageTransitionModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        currentStage={mockCurrentStage}
        nextStage={mockNextStage}
        productionQueueId="queue-1"
      />
    );

    // Create a mock file
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

    // Get the hidden file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    // Upload file
    await user.upload(fileInput, file);

    // Wait for preview to appear
    await waitFor(() => {
      expect(screen.getByAltText("Preview 1")).toBeInTheDocument();
    });
  });

  it("prevents uploading more than 5 photos", async () => {
    const user = userEvent.setup();
    const { toast } = await import("@/components/ui/use-toast");

    renderWithProviders(
      <StageTransitionModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        currentStage={mockCurrentStage}
        nextStage={mockNextStage}
        productionQueueId="queue-1"
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Try to upload 6 files
    const files = Array.from({ length: 6 }, (_, i) =>
      new File(["test"], `test${i}.jpg`, { type: "image/jpeg" })
    );

    await user.upload(fileInput, files);

    // Should show error toast
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Limite de Fotos Excedido",
          description: "Você pode adicionar no máximo 5 fotos.",
        })
      );
    });
  });

  it("allows removing uploaded photos", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <StageTransitionModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        currentStage={mockCurrentStage}
        nextStage={mockNextStage}
        productionQueueId="queue-1"
      />
    );

    // Upload a file
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    // Wait for preview
    await waitFor(() => {
      expect(screen.getByAltText("Preview 1")).toBeInTheDocument();
    });

    // Find and click remove button (need to hover first to make it visible)
    const photoContainer = screen.getByAltText("Preview 1").closest("div");
    expect(photoContainer).toBeInTheDocument();

    const removeButton = within(photoContainer!).getByRole("button");
    await user.click(removeButton);

    // Photo should be removed
    await waitFor(() => {
      expect(screen.queryByAltText("Preview 1")).not.toBeInTheDocument();
    });
  });

  it("completes stage without notes or photos", async () => {
    const user = userEvent.setup();
    vi.mocked(stageService.completeStage).mockResolvedValue(mockCurrentStage);

    renderWithProviders(
      <StageTransitionModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        currentStage={mockCurrentStage}
        nextStage={mockNextStage}
        productionQueueId="queue-1"
        onComplete={mockOnComplete}
      />
    );

    const completeButton = screen.getByRole("button", {
      name: /Completar & Avançar para Próximo Estágio/,
    });
    await user.click(completeButton);

    await waitFor(() => {
      expect(stageService.completeStage).toHaveBeenCalledWith("stage-1", undefined, undefined, false, undefined);
      expect(mockOnComplete).toHaveBeenCalledWith(mockCurrentStage);
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("completes stage with notes", async () => {
    const user = userEvent.setup();
    vi.mocked(stageService.completeStage).mockResolvedValue(mockCurrentStage);

    renderWithProviders(
      <StageTransitionModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        currentStage={mockCurrentStage}
        nextStage={mockNextStage}
        productionQueueId="queue-1"
      />
    );

    // Add notes
    const textarea = screen.getByPlaceholderText("Adicione observações sobre este estágio...");
    await user.type(textarea, "Design aprovado");

    // Complete stage
    const completeButton = screen.getByRole("button", {
      name: /Completar & Avançar para Próximo Estágio/,
    });
    await user.click(completeButton);

    await waitFor(() => {
      expect(stageService.completeStage).toHaveBeenCalledWith(
        "stage-1",
        "Design aprovado",
        undefined,
        false,
        undefined
      );
    });
  });

  it("completes stage with photos", async () => {
    const user = userEvent.setup();
    vi.mocked(stageService.uploadStagePhoto).mockResolvedValue("https://example.com/photo.jpg");
    vi.mocked(stageService.completeStage).mockResolvedValue(mockCurrentStage);

    renderWithProviders(
      <StageTransitionModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        currentStage={mockCurrentStage}
        nextStage={mockNextStage}
        productionQueueId="queue-1"
      />
    );

    // Upload a photo
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByAltText("Preview 1")).toBeInTheDocument();
    });

    // Complete stage
    const completeButton = screen.getByRole("button", {
      name: /Completar & Avançar para Próximo Estágio/,
    });
    await user.click(completeButton);

    await waitFor(() => {
      expect(stageService.uploadStagePhoto).toHaveBeenCalledWith("stage-1", file);
      expect(stageService.completeStage).toHaveBeenCalledWith(
        "stage-1",
        undefined,
        ["https://example.com/photo.jpg"],
        false,
        undefined
      );
    });
  });

  it("disables complete button when stage is blocked", () => {
    const blockedStage = { ...mockCurrentStage, isBlocked: true };

    renderWithProviders(
      <StageTransitionModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        currentStage={blockedStage}
        nextStage={mockNextStage}
        productionQueueId="queue-1"
      />
    );

    const completeButton = screen.getByRole("button", {
      name: /Completar & Avançar para Próximo Estágio/,
    });
    expect(completeButton).toBeDisabled();
  });

  it("shows loading state during completion", async () => {
    const user = userEvent.setup();
    vi.mocked(stageService.completeStage).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockCurrentStage), 1000))
    );

    renderWithProviders(
      <StageTransitionModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        currentStage={mockCurrentStage}
        nextStage={mockNextStage}
        productionQueueId="queue-1"
      />
    );

    const completeButton = screen.getByRole("button", {
      name: /Completar & Avançar para Próximo Estágio/,
    });
    await user.click(completeButton);

    // Should show loading state
    expect(screen.getByText("Processando...")).toBeInTheDocument();
    expect(completeButton).toBeDisabled();
  });

  it("handles completion error", async () => {
    const user = userEvent.setup();
    const { toast } = await import("@/components/ui/use-toast");
    vi.mocked(stageService.completeStage).mockRejectedValue(new Error("Erro ao completar"));

    renderWithProviders(
      <StageTransitionModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        currentStage={mockCurrentStage}
        nextStage={mockNextStage}
        productionQueueId="queue-1"
      />
    );

    const completeButton = screen.getByRole("button", {
      name: /Completar & Avançar para Próximo Estágio/,
    });
    await user.click(completeButton);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Erro ao Completar Estágio",
          description: "Erro ao completar",
          variant: "destructive",
        })
      );
    });
  });

  it("resets form when modal is closed", async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithProviders(
      <StageTransitionModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        currentStage={mockCurrentStage}
        nextStage={mockNextStage}
        productionQueueId="queue-1"
      />
    );

    // Add notes
    const textarea = screen.getByPlaceholderText("Adicione observações sobre este estágio...");
    await user.type(textarea, "Test notes");

    // Close modal
    const cancelButton = screen.getByRole("button", { name: "Cancelar" });
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);

    // Reopen modal
    rerender(
      <QueryClientProvider client={createTestQueryClient()}>
        <StageTransitionModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          currentStage={mockCurrentStage}
          nextStage={mockNextStage}
          productionQueueId="queue-1"
        />
      </QueryClientProvider>
    );

    // Form should be reset
    const newTextarea = screen.getByPlaceholderText("Adicione observações sobre este estágio...");
    expect(newTextarea).toHaveValue("");
  });
});
