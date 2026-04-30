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

  it("should render create form when no method is provided", () => {
    renderComponent();

    expect(screen.getByText("Novo Método de Pagamento")).toBeInTheDocument();
    expect(
      screen.getByText("Configure um novo método de pagamento para os clientes.")
    ).toBeInTheDocument();
    expect(screen.getByText("Criar Método")).toBeInTheDocument();
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

    expect(screen.getByText("Editar Método de Pagamento")).toBeInTheDocument();
    expect(screen.getByText("Editando: PIX")).toBeInTheDocument();
    expect(screen.getByText("Salvar Alterações")).toBeInTheDocument();
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
      "Instruções de Pagamento"
    ) as HTMLTextAreaElement;

    expect(nameInput.value).toBe("PIX");
    expect(pixKeyInput.value).toBe("123.456.789-00");
    expect(instructionsTextarea.value).toBe("Faça o PIX para a chave abaixo");
  });

  it("should show validation error when submitting without name", async () => {
    const { toast } = require("@/hooks/use-toast");
    renderComponent();

    const submitButton = screen.getByText("Criar Método");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Nome obrigatório",
          description: "Por favor, informe o nome do método de pagamento.",
          variant: "destructive",
        })
      );
    });
  });

  it("should show validation error for PIX without key", async () => {
    const { toast } = require("@/hooks/use-toast");
    renderComponent();

    // Fill name
    const nameInput = screen.getByLabelText("Nome *");
    fireEvent.change(nameInput, { target: { value: "PIX" } });

    // Select PIX type
    const typeSelect = screen.getByText("Selecione o tipo");
    fireEvent.click(typeSelect);

    const pixOption = screen.getByText("PIX");
    fireEvent.click(pixOption);

    // Submit without PIX key
    const submitButton = screen.getByText("Criar Método");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Chave PIX obrigatória",
          description: "Para métodos PIX, a chave PIX é obrigatória.",
          variant: "destructive",
        })
      );
    });
  });

  it("should show validation error for bank transfer without account details", async () => {
    const { toast } = require("@/hooks/use-toast");
    renderComponent();

    // Fill name
    const nameInput = screen.getByLabelText("Nome *");
    fireEvent.change(nameInput, { target: { value: "Transferência Bancária" } });

    // Select bank transfer type
    const typeSelect = screen.getByText("Selecione o tipo");
    fireEvent.click(typeSelect);

    const bankTransferOption = screen.getByText("Transferência Bancária");
    fireEvent.click(bankTransferOption);

    // Submit without account details
    const submitButton = screen.getByText("Criar Método");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Dados bancários obrigatórios",
          description: "Para transferência bancária, os dados bancários são obrigatórios.",
          variant: "destructive",
        })
      );
    });
  });

  it("should show validation error for invalid JSON in account details", async () => {
    const { toast } = require("@/hooks/use-toast");
    renderComponent();

    // Fill name
    const nameInput = screen.getByLabelText("Nome *");
    fireEvent.change(nameInput, { target: { value: "Transferência Bancária" } });

    // Select bank transfer type
    const typeSelect = screen.getByText("Selecione o tipo");
    fireEvent.click(typeSelect);

    const bankTransferOption = screen.getByText("Transferência Bancária");
    fireEvent.click(bankTransferOption);

    // Enter invalid JSON
    const accountDetailsTextarea = screen.getByLabelText("Dados Bancários *");
    fireEvent.change(accountDetailsTextarea, { target: { value: "invalid json" } });

    // Submit
    const submitButton = screen.getByText("Criar Método");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Dados bancários inválidos",
          description: "Os dados bancários devem estar em formato JSON válido.",
          variant: "destructive",
        })
      );
    });
  });

  it("should call createPaymentMethod when creating new method", async () => {
    const { createPaymentMethod } = require("@/lib/payment-method-service");
    createPaymentMethod.mockResolvedValue(undefined);

    renderComponent();

    // Fill form
    const nameInput = screen.getByLabelText("Nome *");
    fireEvent.change(nameInput, { target: { value: "PIX" } });

    // Select PIX type
    const typeSelect = screen.getByText("Selecione o tipo");
    fireEvent.click(typeSelect);

    const pixOption = screen.getByText("PIX");
    fireEvent.click(pixOption);

    // Fill PIX key
    const pixKeyInput = screen.getByLabelText("Chave PIX *");
    fireEvent.change(pixKeyInput, { target: { value: "123.456.789-00" } });

    // Fill instructions
    const instructionsTextarea = screen.getByLabelText("Instruções de Pagamento");
    fireEvent.change(instructionsTextarea, { target: { value: "Faça o PIX para a chave abaixo" } });

    // Submit
    const submitButton = screen.getByText("Criar Método");
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
    const { updatePaymentMethod } = require("@/lib/payment-method-service");
    updatePaymentMethod.mockResolvedValue(undefined);

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
    const submitButton = screen.getByText("Salvar Alterações");
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
    const { createPaymentMethod } = require("@/lib/payment-method-service");
    createPaymentMethod.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderComponent();

    // Fill form
    const nameInput = screen.getByLabelText("Nome *");
    fireEvent.change(nameInput, { target: { value: "PIX" } });

    // Select PIX type
    const typeSelect = screen.getByText("Selecione o tipo");
    fireEvent.click(typeSelect);

    const pixOption = screen.getByText("PIX");
    fireEvent.click(pixOption);

    // Fill PIX key
    const pixKeyInput = screen.getByLabelText("Chave PIX *");
    fireEvent.change(pixKeyInput, { target: { value: "123.456.789-00" } });

    // Submit
    const submitButton = screen.getByText("Criar Método");
    fireEvent.click(submitButton);

    // Should show loading state
    expect(screen.getByText("Criar Método")).toBeDisabled();
  });

  it("should call onOpenChange when cancel button is clicked", () => {
    const mockOnOpenChange = vi.fn();
    renderComponent({ onOpenChange: mockOnOpenChange });

    const cancelButton = screen.getByText("Cancelar");
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("should call onSuccess when mutation succeeds", async () => {
    const { createPaymentMethod } = require("@/lib/payment-method-service");
    createPaymentMethod.mockResolvedValue(undefined);
    const mockOnSuccess = vi.fn();

    renderComponent({ onSuccess: mockOnSuccess });

    // Fill form
    const nameInput = screen.getByLabelText("Nome *");
    fireEvent.change(nameInput, { target: { value: "PIX" } });

    // Select PIX type
    const typeSelect = screen.getByText("Selecione o tipo");
    fireEvent.click(typeSelect);

    const pixOption = screen.getByText("PIX");
    fireEvent.click(pixOption);

    // Fill PIX key
    const pixKeyInput = screen.getByLabelText("Chave PIX *");
    fireEvent.change(pixKeyInput, { target: { value: "123.456.789-00" } });

    // Submit
    const submitButton = screen.getByText("Criar Método");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it("should show type-specific fields based on selected type", () => {
    renderComponent();

    // Initially should not show PIX or bank transfer fields
    expect(screen.queryByLabelText("Chave PIX *")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Dados Bancários *")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Link de Pagamento")).not.toBeInTheDocument();

    // Select PIX type
    const typeSelect = screen.getByText("Selecione o tipo");
    fireEvent.click(typeSelect);

    const pixOption = screen.getByText("PIX");
    fireEvent.click(pixOption);

    // Should show PIX fields
    expect(screen.getByLabelText("Chave PIX *")).toBeInTheDocument();

    // Select bank transfer type
    fireEvent.click(typeSelect);
    const bankTransferOption = screen.getByText("Transferência Bancária");
    fireEvent.click(bankTransferOption);

    // Should show bank transfer fields
    expect(screen.getByLabelText("Dados Bancários *")).toBeInTheDocument();

    // Select credit card type
    fireEvent.click(typeSelect);
    const creditCardOption = screen.getByText("Cartão de Crédito");
    fireEvent.click(creditCardOption);

    // Should show payment link field
    expect(screen.getByLabelText("Link de Pagamento")).toBeInTheDocument();
  });
});
