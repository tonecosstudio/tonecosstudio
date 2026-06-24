import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UnblockProductionModal } from "./UnblockProductionModal";

const unblockHooks = vi.hoisted(() => ({
  useProductionBlockInfo: vi.fn(),
  useEstimatedProductionCompletion: vi.fn(),
  useUnblockProduction: vi.fn(),
}));

vi.mock("@/hooks/admin/useUnblockProduction", () => unblockHooks);

describe("UnblockProductionModal", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnUnblock = vi.fn();
  const mutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    unblockHooks.useProductionBlockInfo.mockReturnValue({
      data: {
        blockReason: "Aguardando material em falta",
        blockedAt: "2024-01-15T10:00:00Z",
      },
      isLoading: false,
    });

    unblockHooks.useEstimatedProductionCompletion.mockReturnValue({
      data: new Date("2024-02-01T10:00:00Z"),
    });

    unblockHooks.useUnblockProduction.mockReturnValue({
      mutate,
      isPending: false,
    });
  });

  function renderComponent(props = {}) {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <UnblockProductionModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          productionQueueId="queue-1"
          onUnblock={mockOnUnblock}
          {...props}
        />
      </QueryClientProvider>
    );
  }

  it("renders title and description", () => {
    renderComponent();

    expect(screen.getByText("Desbloquear Producao")).toBeInTheDocument();
    expect(screen.getByText(/Retome este item somente depois de resolver a causa do bloqueio/i)).toBeInTheDocument();
  });

  it("shows loading state while block info is loading", () => {
    unblockHooks.useProductionBlockInfo.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    renderComponent();

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("displays block info and estimated completion", () => {
    renderComponent();

    expect(screen.getByText("Aguardando material em falta")).toBeInTheDocument();
    expect(screen.getByText(/Duracao:/i)).toBeInTheDocument();
    expect(screen.getByText("Nova Data Estimada de Conclusao")).toBeInTheDocument();
  });

  it("allows entering resolution notes", async () => {
    const user = userEvent.setup();
    renderComponent();

    const textarea = screen.getByPlaceholderText(/Descreva como o problema foi resolvido/i);
    await user.type(textarea, "Material recebido e verificado");

    expect(textarea).toHaveValue("Material recebido e verificado");
  });

  it("calls unblock mutation with resolution notes", async () => {
    const user = userEvent.setup();
    renderComponent();

    const textarea = screen.getByPlaceholderText(/Descreva como o problema foi resolvido/i);
    await user.type(textarea, "Material recebido");
    await user.click(screen.getByRole("button", { name: /Desbloquear e Retomar/i }));

    expect(mutate).toHaveBeenCalledWith("Material recebido");
  });

  it("closes when cancel is clicked", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole("button", { name: /Cancelar/i }));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables controls while unblocking", () => {
    unblockHooks.useUnblockProduction.mockReturnValue({
      mutate,
      isPending: true,
    });

    renderComponent();

    expect(screen.getByRole("button", { name: /Cancelar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Desbloqueando/i })).toBeDisabled();
  });
});
