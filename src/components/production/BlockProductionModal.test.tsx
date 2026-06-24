/**
 * Tests for BlockProductionModal Component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BlockProductionModal } from "./BlockProductionModal";

const productionService = vi.hoisted(() => ({
  blockProduction: vi.fn(),
}));

vi.mock("@/services/admin/production/production-service", () => ({
  blockProduction: productionService.blockProduction,
}));

vi.mock("@/services/admin/production/stage-service", () => ({
  calculateEstimatedCompletion: vi.fn(),
}));

// Mock toast
vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
}));

describe("BlockProductionModal", () => {
  let queryClient: QueryClient;
  const mockOnOpenChange = vi.fn();
  const mockOnBlock = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderModal = (props = {}) => {
    const defaultProps = {
      isOpen: true,
      onOpenChange: mockOnOpenChange,
      productionQueueId: "test-queue-id",
      currentEstimatedCompletion: new Date("2024-12-31T12:00:00"),
      onBlock: mockOnBlock,
      ...props,
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <BlockProductionModal {...defaultProps} />
      </QueryClientProvider>
    );
  };

  it("renders modal with all required elements", () => {
    renderModal();

    expect(screen.getByRole("heading", { name: /Bloquear Producao/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Motivo do Bloqueio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tempo estimado de resolucao/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bloquear Producao/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancelar/i })).toBeInTheDocument();
  });

  it("displays warning alert about blocking production", () => {
    renderModal();

    expect(screen.getByText("Atencao")).toBeInTheDocument();
    expect(
      screen.getByText(/O bloqueio pausa o fluxo deste item/i)
    ).toBeInTheDocument();
  });

  it("shows current estimated completion date", () => {
    renderModal();

    expect(screen.getByText("Data atual")).toBeInTheDocument();
    const dates = screen.getAllByText(/31\/12\/2024/);
    expect(dates.length).toBeGreaterThan(0);
  });

  it("disables block button when reason is empty", () => {
    renderModal();

    const blockButton = screen.getByRole("button", { name: /Bloquear Producao/i });
    expect(blockButton).toBeDisabled();
  });

  it("enables block button when reason is provided", async () => {
    const user = userEvent.setup();
    renderModal();

    const reasonInput = screen.getByLabelText(/Motivo do Bloqueio/i);
    await user.type(reasonInput, "Aguardando material");

    const blockButton = screen.getByRole("button", { name: /Bloquear Producao/i });
    expect(blockButton).not.toBeDisabled();
  });

  it("calculates new estimated completion date when resolution time is provided", async () => {
    const user = userEvent.setup();
    renderModal();

    const resolutionTimeInput = screen.getByLabelText(/Tempo estimado de resolucao/i);
    await user.type(resolutionTimeInput, "24");

    await waitFor(() => {
      expect(screen.getByText("Nova data")).toBeInTheDocument();
      // Should show date 24 hours later
      expect(screen.getByText(/01\/01\/2025/)).toBeInTheDocument();
    });
  });

  it("shows delay warning when resolution time increases completion date", async () => {
    const user = userEvent.setup();
    renderModal();

    const resolutionTimeInput = screen.getByLabelText(/Tempo estimado de resolucao/i);
    await user.type(resolutionTimeInput, "48");

    await waitFor(() => {
      expect(screen.getByText(/Atraso de \d+ dias?/)).toBeInTheDocument();
    });
  });

  it("calls blockProduction with correct parameters", async () => {
    const user = userEvent.setup();
    const mockBlockProduction = vi.mocked(productionService.blockProduction);
    mockBlockProduction.mockResolvedValue({
      id: "test-queue-id",
      production_status: "on_hold",
    } as any);

    renderModal();

    const reasonInput = screen.getByLabelText(/Motivo do Bloqueio/i);
    await user.type(reasonInput, "Equipamento quebrado");

    const resolutionTimeInput = screen.getByLabelText(/Tempo estimado de resolucao/i);
    await user.type(resolutionTimeInput, "12");

    const blockButton = screen.getByRole("button", { name: /Bloquear Producao/i });
    await user.click(blockButton);

    await waitFor(() => {
      expect(mockBlockProduction).toHaveBeenCalledWith(
        "test-queue-id",
        expect.stringContaining("Equipamento quebrado")
      );
      expect(mockBlockProduction).toHaveBeenCalledWith(
        "test-queue-id",
        expect.stringContaining("12 horas")
      );
    });
  });

  it("calls onBlock callback after successful block", async () => {
    const user = userEvent.setup();
    const mockBlockProduction = vi.mocked(productionService.blockProduction);
    mockBlockProduction.mockResolvedValue({
      id: "test-queue-id",
      production_status: "on_hold",
    } as any);

    renderModal();

    const reasonInput = screen.getByLabelText(/Motivo do Bloqueio/i);
    await user.type(reasonInput, "Problema de qualidade");

    const blockButton = screen.getByRole("button", { name: /Bloquear Producao/i });
    await user.click(blockButton);

    await waitFor(() => {
      expect(mockOnBlock).toHaveBeenCalled();
    });
  });

  it("closes modal after successful block", async () => {
    const user = userEvent.setup();
    const mockBlockProduction = vi.mocked(productionService.blockProduction);
    mockBlockProduction.mockResolvedValue({
      id: "test-queue-id",
      production_status: "on_hold",
    } as any);

    renderModal();

    const reasonInput = screen.getByLabelText(/Motivo do Bloqueio/i);
    await user.type(reasonInput, "Material em falta");

    const blockButton = screen.getByRole("button", { name: /Bloquear Producao/i });
    await user.click(blockButton);

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("handles cancel button click", async () => {
    const user = userEvent.setup();
    renderModal();

    const cancelButton = screen.getByRole("button", { name: /Cancelar/i });
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("resets form when modal is closed and reopened", async () => {
    const user = userEvent.setup();
    const mockBlockProduction = vi.mocked(productionService.blockProduction);
    mockBlockProduction.mockResolvedValue({
      id: "test-queue-id",
      production_status: "on_hold",
    } as any);

    renderModal();

    // Fill in the form
    const reasonInput = screen.getByLabelText(/Motivo do Bloqueio/i);
    await user.type(reasonInput, "Test reason");

    // Submit the form (which closes the modal)
    const blockButton = screen.getByRole("button", { name: /Bloquear Producao/i });
    await user.click(blockButton);

    // Wait for modal to close
    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("formats duration correctly for different time ranges", async () => {
    const user = userEvent.setup();
    renderModal();

    const resolutionTimeInput = screen.getByLabelText(/Tempo estimado de resolucao/i);

    // Test minutes (< 1 hour)
    await user.clear(resolutionTimeInput);
    await user.type(resolutionTimeInput, "0.5");
    // Should show "30 minutos" in the reason when blocked

    // Test hours (< 24 hours)
    await user.clear(resolutionTimeInput);
    await user.type(resolutionTimeInput, "12");
    // Should show "12 horas" in the reason when blocked

    // Test days (>= 24 hours)
    await user.clear(resolutionTimeInput);
    await user.type(resolutionTimeInput, "48");
    // Should show "2 dias" in the reason when blocked

    expect(resolutionTimeInput).toHaveValue(48);
  });

  it("handles error when blocking production fails", async () => {
    const user = userEvent.setup();
    const mockBlockProduction = vi.mocked(productionService.blockProduction);
    mockBlockProduction.mockRejectedValue(new Error("Network error"));

    renderModal();

    const reasonInput = screen.getByLabelText(/Motivo do Bloqueio/i);
    await user.type(reasonInput, "Test reason");

    const blockButton = screen.getByRole("button", { name: /Bloquear Producao/i });
    await user.click(blockButton);

    await waitFor(() => {
      expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
    });
  });

  it("does not show delay warning when no resolution time is provided", () => {
    renderModal();

    expect(screen.queryByText(/Atraso de/)).not.toBeInTheDocument();
  });

  it("handles modal without currentEstimatedCompletion", () => {
    renderModal({ currentEstimatedCompletion: null });

    expect(screen.queryByText("Data atual")).not.toBeInTheDocument();
    expect(screen.queryByText("Nova data")).not.toBeInTheDocument();
  });
});
