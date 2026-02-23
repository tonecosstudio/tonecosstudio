import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateGroupModal } from "./CreateGroupModal";
import { groupService } from "@/lib/services/groupService";
import { supabase } from "@/integrations/supabase/client";

// Mock dos serviços
vi.mock("@/lib/services/groupService");
vi.mock("@/integrations/supabase/client");
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("CreateGroupModal", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock do usuário autenticado
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: {
        user: { id: "user-123" } as any,
      },
      error: null,
    });

    // Mock das coleções
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: [
          { id: "col-1", name: "Coleção 1" },
          { id: "col-2", name: "Coleção 2" },
        ],
        error: null,
      }),
    } as any);
  });

  it("deve renderizar o modal quando aberto", () => {
    render(
      <CreateGroupModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText("Criar Novo Grupo")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome do Grupo")).toBeInTheDocument();
    expect(screen.getByLabelText("Tipo de Grupo")).toBeInTheDocument();
  });

  it("não deve renderizar quando fechado", () => {
    render(
      <CreateGroupModal
        open={false}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByText("Criar Novo Grupo")).not.toBeInTheDocument();
  });

  it("deve validar nome do grupo (mínimo 3 caracteres)", async () => {
    const user = userEvent.setup();

    render(
      <CreateGroupModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    const nameInput = screen.getByLabelText("Nome do Grupo");
    await user.type(nameInput, "AB");

    const submitButton = screen.getByRole("button", { name: /criar grupo/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Nome deve ter pelo menos 3 caracteres")).toBeInTheDocument();
    });
  });

  it("deve validar nome do grupo (máximo 100 caracteres)", async () => {
    const user = userEvent.setup();

    render(
      <CreateGroupModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    const nameInput = screen.getByLabelText("Nome do Grupo");
    await user.type(nameInput, "A".repeat(101));

    const submitButton = screen.getByRole("button", { name: /criar grupo/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Nome deve ter no máximo 100 caracteres")).toBeInTheDocument();
    });
  });

  it("deve criar grupo manual com sucesso", async () => {
    const user = userEvent.setup();

    vi.mocked(groupService.createGroup).mockResolvedValue({
      id: "group-123",
      name: "Grupo Teste",
      type: "manual",
      membership_criteria: null,
      created_by: "user-123",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      deleted_by: null,
    });

    render(
      <CreateGroupModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Preencher nome
    const nameInput = screen.getByLabelText("Nome do Grupo");
    await user.type(nameInput, "Grupo Teste");

    // Selecionar tipo
    const typeSelect = screen.getByLabelText("Tipo de Grupo");
    await user.click(typeSelect);
    const manualOption = await screen.findByText("Manual");
    await user.click(manualOption);

    // Submeter
    const submitButton = screen.getByRole("button", { name: /criar grupo/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(groupService.createGroup).toHaveBeenCalledWith({
        name: "Grupo Teste",
        type: "manual",
        membership_criteria: null,
        created_by: "user-123",
      });
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("deve mostrar inputs condicionais para tipo assinantes", async () => {
    const user = userEvent.setup();

    render(
      <CreateGroupModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Selecionar tipo assinantes
    const typeSelect = screen.getByLabelText("Tipo de Grupo");
    await user.click(typeSelect);
    const assinantesOption = await screen.findByText("Assinantes");
    await user.click(assinantesOption);

    // Verificar inputs condicionais
    await waitFor(() => {
      expect(screen.getByText("Filtros de Assinantes")).toBeInTheDocument();
      expect(screen.getByLabelText("Coleção (Opcional)")).toBeInTheDocument();
      expect(screen.getByLabelText("Plano (Opcional)")).toBeInTheDocument();
    });
  });

  it("deve criar grupo de assinantes com filtros", async () => {
    const user = userEvent.setup();

    vi.mocked(groupService.createGroup).mockResolvedValue({
      id: "group-123",
      name: "Assinantes Premium",
      type: "assinantes",
      membership_criteria: {
        type: "assinantes",
        subscriptionStatus: "active",
        plan: "premium",
      },
      created_by: "user-123",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      deleted_by: null,
    });

    render(
      <CreateGroupModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Preencher nome
    const nameInput = screen.getByLabelText("Nome do Grupo");
    await user.type(nameInput, "Assinantes Premium");

    // Selecionar tipo
    const typeSelect = screen.getByLabelText("Tipo de Grupo");
    await user.click(typeSelect);
    const assinantesOption = await screen.findByText("Assinantes");
    await user.click(assinantesOption);

    // Preencher plano
    await waitFor(() => {
      expect(screen.getByLabelText("Plano (Opcional)")).toBeInTheDocument();
    });
    const planInput = screen.getByLabelText("Plano (Opcional)");
    await user.type(planInput, "premium");

    // Submeter
    const submitButton = screen.getByRole("button", { name: /criar grupo/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(groupService.createGroup).toHaveBeenCalledWith({
        name: "Assinantes Premium",
        type: "assinantes",
        membership_criteria: {
          type: "assinantes",
          subscriptionStatus: "active",
          plan: "premium",
        },
        created_by: "user-123",
      });
    });
  });

  it("deve mostrar inputs condicionais para tipo coleção", async () => {
    const user = userEvent.setup();

    render(
      <CreateGroupModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Selecionar tipo coleção
    const typeSelect = screen.getByLabelText("Tipo de Grupo");
    await user.click(typeSelect);
    const colecaoOption = await screen.findByText("Coleção");
    await user.click(colecaoOption);

    // Verificar inputs condicionais
    await waitFor(() => {
      expect(screen.getByText("Seleção de Coleção")).toBeInTheDocument();
      expect(screen.getByLabelText("Coleção *")).toBeInTheDocument();
    });
  });

  it("deve validar coleção obrigatória para tipo coleção", async () => {
    const user = userEvent.setup();

    render(
      <CreateGroupModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Preencher nome
    const nameInput = screen.getByLabelText("Nome do Grupo");
    await user.type(nameInput, "Grupo Coleção");

    // Selecionar tipo coleção
    const typeSelect = screen.getByLabelText("Tipo de Grupo");
    await user.click(typeSelect);
    const colecaoOption = await screen.findByText("Coleção");
    await user.click(colecaoOption);

    // Submeter sem selecionar coleção
    const submitButton = screen.getByRole("button", { name: /criar grupo/i });
    await user.click(submitButton);

    // Deve mostrar erro
    await waitFor(() => {
      expect(groupService.createGroup).not.toHaveBeenCalled();
    });
  });

  it("deve mostrar inputs condicionais para tipo lançamentos", async () => {
    const user = userEvent.setup();

    render(
      <CreateGroupModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Selecionar tipo lançamentos
    const typeSelect = screen.getByLabelText("Tipo de Grupo");
    await user.click(typeSelect);
    const lancamentosOption = await screen.findByText("Lançamentos");
    await user.click(lancamentosOption);

    // Verificar inputs condicionais
    await waitFor(() => {
      expect(screen.getByText("Critério de Lançamento")).toBeInTheDocument();
      expect(screen.getByLabelText("Critério *")).toBeInTheDocument();
    });
  });

  it("deve criar grupo de lançamentos com critério", async () => {
    const user = userEvent.setup();

    vi.mocked(groupService.createGroup).mockResolvedValue({
      id: "group-123",
      name: "Novos Lançamentos",
      type: "lancamentos",
      membership_criteria: {
        type: "lancamentos",
        criteria: "all_users",
      },
      created_by: "user-123",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      deleted_by: null,
    });

    render(
      <CreateGroupModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Preencher nome
    const nameInput = screen.getByLabelText("Nome do Grupo");
    await user.type(nameInput, "Novos Lançamentos");

    // Selecionar tipo
    const typeSelect = screen.getByLabelText("Tipo de Grupo");
    await user.click(typeSelect);
    const lancamentosOption = await screen.findByText("Lançamentos");
    await user.click(lancamentosOption);

    // Selecionar critério
    await waitFor(() => {
      expect(screen.getByLabelText("Critério *")).toBeInTheDocument();
    });
    const criteriaSelect = screen.getByLabelText("Critério *");
    await user.click(criteriaSelect);
    const allUsersOption = await screen.findByText("Todos os usuários");
    await user.click(allUsersOption);

    // Submeter
    const submitButton = screen.getByRole("button", { name: /criar grupo/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(groupService.createGroup).toHaveBeenCalledWith({
        name: "Novos Lançamentos",
        type: "lancamentos",
        membership_criteria: {
          type: "lancamentos",
          criteria: "all_users",
        },
        created_by: "user-123",
      });
    });
  });

  it("deve mostrar inputs condicionais para tipo pedidos", async () => {
    const user = userEvent.setup();

    render(
      <CreateGroupModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Selecionar tipo pedidos
    const typeSelect = screen.getByLabelText("Tipo de Grupo");
    await user.click(typeSelect);
    const pedidosOption = await screen.findByText("Pedidos");
    await user.click(pedidosOption);

    // Verificar inputs condicionais
    await waitFor(() => {
      expect(screen.getByText("Filtros de Pedidos")).toBeInTheDocument();
      expect(screen.getByText("Status dos Pedidos")).toBeInTheDocument();
      expect(screen.getByLabelText("Data Inicial (Opcional)")).toBeInTheDocument();
      expect(screen.getByLabelText("Data Final (Opcional)")).toBeInTheDocument();
    });
  });

  it("deve criar grupo de pedidos com filtros", async () => {
    const user = userEvent.setup();

    vi.mocked(groupService.createGroup).mockResolvedValue({
      id: "group-123",
      name: "Pedidos Pendentes",
      type: "pedidos",
      membership_criteria: {
        type: "pedidos",
        status: ["pending", "processing"],
        dateFrom: "2024-01-01",
      },
      created_by: "user-123",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      deleted_by: null,
    });

    render(
      <CreateGroupModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Preencher nome
    const nameInput = screen.getByLabelText("Nome do Grupo");
    await user.type(nameInput, "Pedidos Pendentes");

    // Selecionar tipo
    const typeSelect = screen.getByLabelText("Tipo de Grupo");
    await user.click(typeSelect);
    const pedidosOption = await screen.findByText("Pedidos");
    await user.click(pedidosOption);

    // Selecionar status
    await waitFor(() => {
      expect(screen.getByText("Pendente")).toBeInTheDocument();
    });
    const pendenteCheckbox = screen.getByLabelText("Pendente");
    await user.click(pendenteCheckbox);
    const processandoCheckbox = screen.getByLabelText("Processando");
    await user.click(processandoCheckbox);

    // Preencher data inicial
    const dateFromInput = screen.getByLabelText("Data Inicial (Opcional)");
    await user.type(dateFromInput, "2024-01-01");

    // Submeter
    const submitButton = screen.getByRole("button", { name: /criar grupo/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(groupService.createGroup).toHaveBeenCalledWith({
        name: "Pedidos Pendentes",
        type: "pedidos",
        membership_criteria: {
          type: "pedidos",
          status: ["pending", "processing"],
          dateFrom: "2024-01-01",
        },
        created_by: "user-123",
      });
    });
  });

  it("deve fechar modal ao clicar em cancelar", async () => {
    const user = userEvent.setup();

    render(
      <CreateGroupModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /cancelar/i });
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("deve desabilitar botões durante loading", async () => {
    const user = userEvent.setup();

    // Mock que demora para resolver
    vi.mocked(groupService.createGroup).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(
      <CreateGroupModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Preencher formulário
    const nameInput = screen.getByLabelText("Nome do Grupo");
    await user.type(nameInput, "Grupo Teste");

    const typeSelect = screen.getByLabelText("Tipo de Grupo");
    await user.click(typeSelect);
    const manualOption = await screen.findByText("Manual");
    await user.click(manualOption);

    // Submeter
    const submitButton = screen.getByRole("button", { name: /criar grupo/i });
    await user.click(submitButton);

    // Verificar que botões estão desabilitados
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
    });
  });
});
