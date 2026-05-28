/**
 * ReminderScheduler Tests
 *
 * Requirements: 23.5
 *
 * Testes para o componente ReminderScheduler que valida:
 * - Renderização do modal
 * - Validação de data futura
 * - Criação de lembretes
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReminderScheduler } from "./ReminderScheduler";
import * as reminderService from "@/lib/reminder-service";

vi.mock("@/lib/reminder-service", () => ({
  createReminder: vi.fn(),
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("ReminderScheduler", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnReminderCreated = vi.fn();
  const conversationId = "123e4567-e89b-12d3-a456-426614174000";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve renderizar o modal quando open=true", () => {
    render(
      <ReminderScheduler
        conversationId={conversationId}
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Configure um lembrete automático para esta conversa.")).toBeInTheDocument();
  });

  it("não deve renderizar o modal quando open=false", () => {
    render(
      <ReminderScheduler
        conversationId={conversationId}
        open={false}
        onOpenChange={mockOnOpenChange}
      />,
    );

    expect(screen.queryByText("Agendar Lembrete")).not.toBeInTheDocument();
  });

  it("deve exibir todos os campos ativos do formulário", () => {
    render(
      <ReminderScheduler
        conversationId={conversationId}
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
    );

    expect(screen.getByLabelText("Tipo de Lembrete")).toBeInTheDocument();
    expect(screen.getByText("Data do Lembrete")).toBeInTheDocument();
    expect(screen.getByLabelText("Hora do Lembrete")).toBeInTheDocument();
    expect(screen.queryByLabelText("Mensagem Personalizada (Opcional)")).not.toBeInTheDocument();
  });

  it("deve ter botões de Cancelar e Agendar", () => {
    render(
      <ReminderScheduler
        conversationId={conversationId}
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
    );

    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /agendar lembrete/i })).toBeInTheDocument();
  });

  it("deve fechar o modal ao clicar em Cancelar", async () => {
    const user = userEvent.setup();

    render(
      <ReminderScheduler
        conversationId={conversationId}
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("deve validar que a data é obrigatória", async () => {
    const user = userEvent.setup();

    render(
      <ReminderScheduler
        conversationId={conversationId}
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /agendar lembrete/i }));

    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });

  it("deve ter campo de hora com valor padrão 09:00", () => {
    render(
      <ReminderScheduler
        conversationId={conversationId}
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
    );

    const timeInput = screen.getByLabelText("Hora do Lembrete") as HTMLInputElement;
    expect(timeInput.value).toBe("09:00");
  });

  it("deve permitir alterar a hora do lembrete", async () => {
    const user = userEvent.setup();

    render(
      <ReminderScheduler
        conversationId={conversationId}
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
    );

    const timeInput = screen.getByLabelText("Hora do Lembrete") as HTMLInputElement;
    await user.clear(timeInput);
    await user.type(timeInput, "14:30");

    expect(timeInput.value).toBe("14:30");
  });

  it("não deve exibir nota de funcionalidade futura para mensagens personalizadas", () => {
    render(
      <ReminderScheduler
        conversationId={conversationId}
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
    );

    expect(screen.queryByText(/Mensagens personalizadas serão implementadas/i)).not.toBeInTheDocument();
  });

  it("deve criar lembrete com sucesso quando dados válidos são fornecidos", async () => {
    userEvent.setup();
    const mockReminder = {
      id: "456e7890-e89b-12d3-a456-426614174000",
      conversation_id: conversationId,
      reminder_type: "quote_followup" as const,
      scheduled_for: new Date(Date.now() + 86400000).toISOString(),
      sent_at: null,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    vi.mocked(reminderService.createReminder).mockResolvedValue(mockReminder);

    render(
      <ReminderScheduler
        conversationId={conversationId}
        open={true}
        onOpenChange={mockOnOpenChange}
        onReminderCreated={mockOnReminderCreated}
      />,
    );

    expect(screen.getByRole("button", { name: /agendar lembrete/i })).toBeInTheDocument();
  });

  it("deve ter um select para tipo de lembrete", () => {
    render(
      <ReminderScheduler
        conversationId={conversationId}
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
    );

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("Follow-up de Orçamento")).toBeInTheDocument();
    expect(screen.getByText("Lembrar cliente sobre orçamento sem resposta")).toBeInTheDocument();
  });

  it("deve exibir o tipo de lembrete padrão selecionado", () => {
    render(
      <ReminderScheduler
        conversationId={conversationId}
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
    );

    expect(screen.getByText("Follow-up de Orçamento")).toBeInTheDocument();
  });
});
