/**
 * PaymentMethodForm Component Tests
 *
 * Unit tests for the PaymentMethodForm component
 *
 * Requirements: 1.1-1.10
 * Task: 11.1 Criar componente PaymentMethodForm
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PaymentMethodForm } from "./PaymentMethodForm";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { createPaymentMethod, updatePaymentMethod } from "@/lib/payment-method-service";
import { toast } from "@/hooks/use-toast";

// Mock the payment method service
vi.mock("@/lib/payment-method-service", () => ({
  createPaymentMethod: vi.fn(),
  updatePaymentMethod: vi.fn(),
}));

// Mock the toast hook
vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("PaymentMethodForm", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      open: true,
      onOpenChange: vi.fn(),
      ...props,
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <PaymentMethodForm {...defaultProps} />
      </QueryClientProvider>
    );
  };

  const selectPaymentType = (label: string) => {
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: label }));
  };

  it("should render create form when no method is provided", () => {
    renderComponent();

    expect(screen.getByText("Novo Metodo de Pagamento")).toBeInTheDocument();
    expect(
      screen.getByText("Configure um novo metodo de pagamento para os clientes.")
    ).toBeInTheDocument();
    expect(screen.getByText("Criar Metodo")).toBeInTheDocument();
  });

  it("should render edit form when method is provided", () => {
    const mockMethod = {
      id: "method-123",
      name: "PIX",
      type: "pix" as const,
      instructions: "Faça o PIX para a chave abaixo",
      payment_link: null,
      pix_key: "123.456.789-00",
      account_details: null,
      is_active: true,
      is_default: true,
      display_order: 0,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    renderComponent({ method: mockMethod });

    expect(screen.getByText("Editar Metodo de Pagamento")).toBeInTheDocument();
    expect(screen.getByText("Editando: PIX")).toBeInTheDocument();
    expect(screen.getByText("Salvar Alteracoes")).toBeInTheDocument();
  });

  it("should pre-fill form fields when editing", () => {
    const mockMethod = {
      id: "method-123",
      name: "PIX",
      type: "pix" as const,
      instructions: "Faça o PIX para a chave abaixo",
      payment_link: null,
      pix_key: "123.456.789-00",
      account_details: null,
      is_active: true,
      is_default: true,
      display_order: 0,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    renderComponent({ method: mockMethod });

    const nameInput = screen.getByLabelText("Nome *") as HTMLInputElement;
    const pixKeyInput = screen.getByLabelText("Chave PIX *") as HTMLInputElement;
    const instructionsTextarea = screen.getByLabelText(
      "Instrucoes de Pagamento"
    ) as HTMLTextAreaElement;

    expect(nameInput.value).toBe("PIX");
    expect(pixKeyInput.value).toBe("123.456.789-00");
    expect(instructionsTextarea.value).toBe("Faça o PIX para a chave abaixo");
  });

  it("should show validation error when submitting without name", async () => {
    renderComponent();

    const submitButton = screen.getByText("Criar Metodo");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Nome obrigatorio",
          description: "Por favor, informe o nome do metodo de pagamento.",
          variant: "destructive",
        })
      );
    });
  });

  it("should show validation error for PIX without key", async () => {
    renderComponent();

    // Fill name
    const nameInput = screen.getByLabelText("Nome *");
    fireEvent.change(nameInput, { target: { value: "PIX" } });

    selectPaymentType("PIX");

    // Submit without PIX key
    const submitButton = screen.getByText("Criar Metodo");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Chave PIX obrigatoria",
          description: "Para metodos PIX, a chave PIX e obrigatoria.",
          variant: "destructive",
        })
      );
    });
  });

  it("should show validation error for bank transfer without account details", async () => {
    renderComponent();

    // Fill name
    const nameInput = screen.getByLabelText("Nome *");
    fireEvent.change(nameInput, { target: { value: "Transferencia Bancaria" } });

    selectPaymentType("Transferencia Bancaria");

    // Submit without account details
    const submitButton = screen.getByText("Criar Metodo");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Dados bancarios obrigatorios",
          description: "Para transferencia bancaria, os dados bancarios sao obrigatorios.",
          variant: "destructive",
        })
      );
    });
  });

  it("should show validation error for invalid JSON in account details", async () => {
    renderComponent();

    // Fill name
    const nameInput = screen.getByLabelText("Nome *");
    fireEvent.change(nameInput, { target: { value: "Transferencia Bancaria" } });

    selectPaymentType("Transferencia Bancaria");

    // Enter invalid JSON
    const accountDetailsTextarea = screen.getByLabelText("Dados Bancarios *");
    fireEvent.change(accountDetailsTextarea, { target: { value: "invalid json" } });

    // Submit
    const submitButton = screen.getByText("Criar Metodo");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Dados bancarios invalidos",
          description: "Os dados bancarios devem estar em formato JSON valido.",
          variant: "destructive",
        })
      );
    });
  });

  it("should call createPaymentMethod when creating new method", async () => {
    vi.mocked(createPaymentMethod).mockResolvedValue(undefined);

    renderComponent();

    // Fill form
    const nameInput = screen.getByLabelText("Nome *");
    fireEvent.change(nameInput, { target: { value: "PIX" } });

    selectPaymentType("PIX");

    // Fill PIX key
    const pixKeyInput = screen.getByLabelText("Chave PIX *");
    fireEvent.change(pixKeyInput, { target: { value: "123.456.789-00" } });

    // Fill instructions
    const instructionsTextarea = screen.getByLabelText("Instrucoes de Pagamento");
    fireEvent.change(instructionsTextarea, { target: { value: "Faça o PIX para a chave abaixo" } });

    // Submit
    const submitButton = screen.getByText("Criar Metodo");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(createPaymentMethod).toHaveBeenCalledWith({
        name: "PIX",
        type: "pix",
        instructions: "Faça o PIX para a chave abaixo",
        payment_link: undefined,
        pix_key: "123.456.789-00",
        account_details: undefined,
        is_active: true,
        is_default: false,
      });
    });
  });

  it("should call updatePaymentMethod when editing method", async () => {
    vi.mocked(updatePaymentMethod).mockResolvedValue(undefined);

    const mockMethod = {
      id: "method-123",
      name: "PIX",
      type: "pix" as const,
      instructions: "Faça o PIX para a chave abaixo",
      payment_link: null,
      pix_key: "123.456.789-00",
      account_details: null,
      is_active: true,
      is_default: true,
      display_order: 0,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    renderComponent({ method: mockMethod });

    // Update name
    const nameInput = screen.getByLabelText("Nome *");
    fireEvent.change(nameInput, { target: { value: "PIX Atualizado" } });

    // Submit
    const submitButton = screen.getByText("Salvar Alteracoes");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(updatePaymentMethod).toHaveBeenCalledWith("method-123", {
        name: "PIX Atualizado",
        type: "pix",
        instructions: "Faça o PIX para a chave abaixo",
        payment_link: undefined,
        pix_key: "123.456.789-00",
        account_details: undefined,
        is_active: true,
        is_default: true,
      });
    });
  });

  it("should show loading state during mutation", async () => {
    vi.mocked(createPaymentMethod).mockImplementation(() => new Promise(() => {})); // Never resolves

    renderComponent();

    // Fill form
    const nameInput = screen.getByLabelText("Nome *");
    fireEvent.change(nameInput, { target: { value: "PIX" } });

    selectPaymentType("PIX");

    // Fill PIX key
    const pixKeyInput = screen.getByLabelText("Chave PIX *");
    fireEvent.change(pixKeyInput, { target: { value: "123.456.789-00" } });

    // Submit
    const submitButton = screen.getByText("Criar Metodo");
    fireEvent.click(submitButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText("Criar Metodo")).toBeDisabled();
    });
  });

  it("should call onOpenChange when cancel button is clicked", () => {
    const mockOnOpenChange = vi.fn();
    renderComponent({ onOpenChange: mockOnOpenChange });

    const cancelButton = screen.getByText("Cancelar");
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("should call onSuccess when mutation succeeds", async () => {
    vi.mocked(createPaymentMethod).mockResolvedValue(undefined);
    const mockOnSuccess = vi.fn();

    renderComponent({ onSuccess: mockOnSuccess });

    // Fill form
    const nameInput = screen.getByLabelText("Nome *");
    fireEvent.change(nameInput, { target: { value: "PIX" } });

    selectPaymentType("PIX");

    // Fill PIX key
    const pixKeyInput = screen.getByLabelText("Chave PIX *");
    fireEvent.change(pixKeyInput, { target: { value: "123.456.789-00" } });

    // Submit
    const submitButton = screen.getByText("Criar Metodo");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it("should show type-specific fields based on selected type", () => {
    renderComponent();

    // Initially "Outro" uses payment link and should not show PIX or bank transfer fields
    expect(screen.queryByLabelText("Chave PIX *")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Dados Bancarios *")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Link de Pagamento")).toBeInTheDocument();

    selectPaymentType("PIX");

    // Should show PIX fields
    expect(screen.getByLabelText("Chave PIX *")).toBeInTheDocument();

    // Select bank transfer type
    selectPaymentType("Transferencia Bancaria");

    // Should show bank transfer fields
    expect(screen.getByLabelText("Dados Bancarios *")).toBeInTheDocument();

    // Select credit card type
    selectPaymentType("Cartao de Credito");

    // Should show payment link field
    expect(screen.getByLabelText("Link de Pagamento")).toBeInTheDocument();
  });
});
