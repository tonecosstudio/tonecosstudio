import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BlockProductionModal } from "./BlockProductionModal";

const hookMocks = vi.hoisted(() => ({
  useBlockProduction: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock("@/hooks/admin/useProductionActions", () => ({
  useBlockProduction: hookMocks.useBlockProduction,
}));

vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
}));

const mockOnOpenChange = vi.fn();
const mockOnBlock = vi.fn();

function renderModal(props = {}) {
  return render(
    <BlockProductionModal
      isOpen
      onOpenChange={mockOnOpenChange}
      productionQueueId="test-queue-id"
      currentEstimatedCompletion={new Date("2024-12-31T12:00:00")}
      onBlock={mockOnBlock}
      {...props}
    />,
  );
}

describe("BlockProductionModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookMocks.useBlockProduction.mockImplementation((options) => ({
      isPending: false,
      mutate: (reason: string, callbacks?: { onError?: (error: Error) => void }) =>
        hookMocks.mutate(reason, callbacks, options),
    }));
  });

  it("binds the modal to the canonical block hook", () => {
    renderModal();

    expect(hookMocks.useBlockProduction).toHaveBeenCalledWith(
      expect.objectContaining({ productionQueueId: "test-queue-id", onSuccess: expect.any(Function) }),
    );
    expect(screen.getByRole("heading", { name: /Bloquear Producao/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Motivo do bloqueio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tempo estimado de resolucao/i)).toBeInTheDocument();
  });

  it("keeps the block action disabled until a reason is provided", async () => {
    const user = userEvent.setup();
    renderModal();

    const button = screen.getByRole("button", { name: /Bloquear Producao/i });
    expect(button).toBeDisabled();

    await user.type(screen.getByLabelText(/Motivo do bloqueio/i), "Aguardando material");
    expect(button).not.toBeDisabled();
  });

  it("shows the recalculated completion date and delay", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText(/Tempo estimado de resolucao/i), "48");

    expect(await screen.findByText("Nova data")).toBeInTheDocument();
    expect(screen.getByText(/02\/01\/2025/)).toBeInTheDocument();
    expect(screen.getByText(/Atraso de 2 dias/)).toBeInTheDocument();
  });

  it("sends the composed reason through the hook mutation", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText(/Motivo do bloqueio/i), "Equipamento quebrado");
    await user.type(screen.getByLabelText(/Tempo estimado de resolucao/i), "12");
    await user.click(screen.getByRole("button", { name: /Bloquear Producao/i }));

    expect(hookMocks.mutate).toHaveBeenCalledWith(
      expect.stringContaining("Equipamento quebrado | Tempo estimado de resolucao: 12 horas"),
      expect.objectContaining({ onError: expect.any(Function) }),
      expect.any(Object),
    );
  });

  it("runs the component success flow exposed to the hook", async () => {
    renderModal();

    const options = hookMocks.useBlockProduction.mock.calls[0][0];
    options.onSuccess();

    await waitFor(() => {
      expect(mockOnBlock).toHaveBeenCalledTimes(1);
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("keeps the modal open when the mutation reports an error", async () => {
    const user = userEvent.setup();
    hookMocks.mutate.mockImplementation(
      (_reason, callbacks: { onError?: (error: Error) => void }) => {
        callbacks.onError?.(new Error("Network error"));
      },
    );
    renderModal();

    await user.type(screen.getByLabelText(/Motivo do bloqueio/i), "Problema de qualidade");
    await user.click(screen.getByRole("button", { name: /Bloquear Producao/i }));

    expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("closes through the cancel action", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: /Cancelar/i }));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("handles the modal without an existing completion date", () => {
    renderModal({ currentEstimatedCompletion: null });

    expect(screen.queryByText("Data atual")).not.toBeInTheDocument();
    expect(screen.queryByText("Nova data")).not.toBeInTheDocument();
  });
});
