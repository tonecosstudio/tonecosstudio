/**
 * PaymentDetailsView Component Tests
 *
 * Unit tests for the PaymentDetailsView component
 *
 * Requirements: 6.1-6.10
 * Task: 13.1 Criar componente PaymentDetailsView
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { getPaymentById } from "@/lib/payment-service";
import { fileUploadService } from "@/lib/file-upload-service";
import { toast } from "@/hooks/use-toast";
import { PaymentDetailsView } from "./PaymentDetailsView";

// Mock the services
vi.mock("@/lib/payment-service", () => ({
  getPaymentById: vi.fn(),
}));

vi.mock("@/lib/file-upload-service", () => ({
  fileUploadService: {
    getSignedUrl: vi.fn(),
  },
}));

// Mock icons
vi.mock("lucide-react", () => ({
  Eye: () => "Eye",
  Download: () => "Download",
  FileText: () => "FileText",
  Image: () => "Image",
  ImageIcon: () => "ImageIcon",
  Calendar: () => "Calendar",
  User: () => "User",
  CreditCard: () => "CreditCard",
  DollarSign: () => "DollarSign",
  Hash: () => "Hash",
  Clock: () => "Clock",
  CheckCircle: () => "CheckCircle",
  XCircle: () => "XCircle",
  AlertCircle: () => "AlertCircle",
  MessageSquare: () => "MessageSquare",
  ExternalLink: () => "ExternalLink",
  ChevronRight: () => "ChevronRight",
  File: () => "File",
  FileImage: () => "FileImage",
  FilePdf: () => "FilePdf",
  History: () => "History",
  Shield: () => "Shield",
  Package: () => "Package",
  Receipt: () => "Receipt",
}));

// Mock toast
vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

// Mock PaymentActionButtons
vi.mock("./PaymentActionButtons", () => ({
  PaymentActionButtons: () => <div data-testid="payment-action-buttons">PaymentActionButtons</div>,
}));

describe("PaymentDetailsView", () => {
  let queryClient: QueryClient;
  const mockGetPaymentById = vi.mocked(getPaymentById);
  const mockFileUploadService = vi.mocked(fileUploadService);
  const mockToast = vi.mocked(toast);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    mockGetPaymentById.mockReset();
    mockFileUploadService.getSignedUrl.mockReset();
  });

  afterEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  const mockPayment = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    reference_number: "PAY-20240215-1234",
    user_id: "user-123",
    payment_method_id: "method-123",
    amount: 299.99,
    currency: "BRL",
    payment_type: "one_time" as const,
    status: "under_review" as const,
    created_at: "2024-02-15T10:30:00Z",
    updated_at: "2024-02-15T10:30:00Z",
    payment_method: {
      id: "method-123",
      name: "PIX",
      type: "pix" as const,
      instructions: "Faça o PIX para a chave: 12345678900",
      is_active: true,
      is_default: true,
      display_order: 1,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    files: [
      {
        id: "file-1",
        payment_id: "123e4567-e89b-12d3-a456-426614174000",
        file_name: "comprovante.jpg",
        file_path: "payment-proofs/comprovante.jpg",
        file_size: 1024000,
        file_type: "image/jpeg",
        uploaded_by: "user-123",
        created_at: "2024-02-15T10:35:00Z",
      },
      {
        id: "file-2",
        payment_id: "123e4567-e89b-12d3-a456-426614174000",
        file_name: "recibo.pdf",
        file_path: "payment-proofs/recibo.pdf",
        file_size: 2048000,
        file_type: "application/pdf",
        uploaded_by: "user-123",
        created_at: "2024-02-15T10:36:00Z",
      },
    ],
    audit_logs: [
      {
        id: "log-1",
        payment_id: "123e4567-e89b-12d3-a456-426614174000",
        action_type: "created" as const,
        created_at: "2024-02-15T10:30:00Z",
      },
      {
        id: "log-2",
        payment_id: "123e4567-e89b-12d3-a456-426614174000",
        action_type: "file_uploaded" as const,
        created_at: "2024-02-15T10:35:00Z",
      },
    ],
    customer_name: "João Silva",
    customer_email: "joao@example.com",
  };

  it("renders loading state initially", () => {
    mockGetPaymentById.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <PaymentDetailsView paymentId="test-id" />
      </QueryClientProvider>
    );

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.queryByTestId("payment-action-buttons")).not.toBeInTheDocument();
  });

  it("renders payment details when loaded", async () => {
    mockGetPaymentById.mockResolvedValue(mockPayment);
    mockFileUploadService.getSignedUrl.mockResolvedValue("https://example.com/signed-url");

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentDetailsView paymentId="test-id" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText("PAY-20240215-1234").length).toBeGreaterThan(0);
    });

    expect(screen.getByText("João Silva")).toBeInTheDocument();
    expect(screen.getByText("joao@example.com")).toBeInTheDocument();
    expect(screen.getByText((text) => text.includes("299,99"))).toBeInTheDocument();
    expect(screen.getByText("PIX")).toBeInTheDocument();
    expect(screen.getByText(/Em Revisao/)).toBeInTheDocument();

    expect(screen.getByRole("tab", { name: /Comprovantes/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Hist/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Log de Auditoria/ })).toBeInTheDocument();
  });

  it("exports payment details from quick actions", async () => {
    const user = userEvent.setup();
    const createObjectUrlMock = vi.fn(() => "blob:payment-details");
    const revokeObjectUrlMock = vi.fn();
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrlMock,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrlMock,
    });

    mockGetPaymentById.mockResolvedValue(mockPayment);
    mockFileUploadService.getSignedUrl.mockResolvedValue("https://example.com/signed-url");

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentDetailsView paymentId="test-id" />
      </QueryClientProvider>
    );

    await screen.findByText("Detalhes do Pagamento");

    expect(screen.queryByText("Gerar Recibo")).not.toBeInTheDocument();
    expect(screen.queryByText("Enviar Mensagem")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Exportar Detalhes/ }));

    expect(createObjectUrlMock).toHaveBeenCalledOnce();
    expect(anchorClickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectUrlMock).toHaveBeenCalledWith("blob:payment-details");
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Exportacao concluida",
      })
    );

    anchorClickSpy.mockRestore();
  });

  it("displays image files in gallery", async () => {
    const user = userEvent.setup();
    mockGetPaymentById.mockResolvedValue(mockPayment);
    mockFileUploadService.getSignedUrl.mockResolvedValue("https://example.com/signed-url");

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentDetailsView paymentId="test-id" />
      </QueryClientProvider>
    );

    await screen.findByText("Detalhes do Pagamento");
    await user.click(screen.getByRole("tab", { name: /Comprovantes/ }));

    expect(await screen.findByText(/Imagens de Comprovante/)).toBeInTheDocument();
    expect(screen.getByText("comprovante.jpg")).toBeInTheDocument();
  });

  it("displays PDF files", async () => {
    const user = userEvent.setup();
    mockGetPaymentById.mockResolvedValue(mockPayment);
    mockFileUploadService.getSignedUrl.mockResolvedValue("https://example.com/signed-url");

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentDetailsView paymentId="test-id" />
      </QueryClientProvider>
    );

    await screen.findByText("Detalhes do Pagamento");
    await user.click(screen.getByRole("tab", { name: /Comprovantes/ }));

    expect(await screen.findByText(/PDFs de Comprovante/)).toBeInTheDocument();
    expect(screen.getByText("recibo.pdf")).toBeInTheDocument();
  });

  it("displays audit log entries", async () => {
    const user = userEvent.setup();
    mockGetPaymentById.mockResolvedValue(mockPayment);
    mockFileUploadService.getSignedUrl.mockResolvedValue("https://example.com/signed-url");

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentDetailsView paymentId="test-id" />
      </QueryClientProvider>
    );

    await screen.findByText("Detalhes do Pagamento");

    await user.click(screen.getByRole("tab", { name: /Log de Auditoria/ }));

    expect(await screen.findByText("Pagamento criado")).toBeInTheDocument();
    expect(screen.getByText("Comprovante enviado")).toBeInTheDocument();
  });

  it("displays timeline entries", async () => {
    const user = userEvent.setup();
    mockGetPaymentById.mockResolvedValue(mockPayment);
    mockFileUploadService.getSignedUrl.mockResolvedValue("https://example.com/signed-url");

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentDetailsView paymentId="test-id" />
      </QueryClientProvider>
    );

    await screen.findByText("Detalhes do Pagamento");

    await user.click(screen.getByRole("tab", { name: /Hist/ }));

    expect(await screen.findByText("Pagamento criado")).toBeInTheDocument();
    expect(screen.getByText("Comprovante enviado")).toBeInTheDocument();
  });

  it("handles back button click", async () => {
    const mockOnBack = vi.fn();

    mockGetPaymentById.mockResolvedValue(mockPayment);
    mockFileUploadService.getSignedUrl.mockResolvedValue("https://example.com/signed-url");

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentDetailsView paymentId="test-id" onBack={mockOnBack} />
      </QueryClientProvider>
    );

    await screen.findByText("Voltar");

    fireEvent.click(screen.getByText("Voltar"));
    expect(mockOnBack).toHaveBeenCalled();
  });

  it("displays error state when payment fetch fails", async () => {
    mockGetPaymentById.mockRejectedValue(new Error("Payment not found"));

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentDetailsView paymentId="test-id" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Erro ao carregar pagamento")).toBeInTheDocument();
    });

    expect(screen.getByText("Payment not found")).toBeInTheDocument();
    expect(screen.getByText("Tentar novamente")).toBeInTheDocument();
  });

  it("displays different status badges correctly", async () => {
    const approvedPayment = {
      ...mockPayment,
      status: "approved" as const,
      approved_at: "2024-02-15T11:00:00Z",
      approved_by: "admin-123",
    };

    mockGetPaymentById.mockResolvedValue(approvedPayment);
    mockFileUploadService.getSignedUrl.mockResolvedValue("https://example.com/signed-url");

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentDetailsView paymentId="test-id" />
      </QueryClientProvider>
    );

    expect((await screen.findAllByText(/Aprovado/)).length).toBeGreaterThan(0);

    expect(screen.getAllByText(/Aprova/).length).toBeGreaterThan(0);
  });

  it("displays rejection reason when payment is rejected", async () => {
    const rejectedPayment = {
      ...mockPayment,
      status: "rejected" as const,
      rejection_reason: "Comprovante ilegível",
    };

    mockGetPaymentById.mockResolvedValue(rejectedPayment);
    mockFileUploadService.getSignedUrl.mockResolvedValue("https://example.com/signed-url");

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentDetailsView paymentId="test-id" />
      </QueryClientProvider>
    );

    expect((await screen.findAllByText(/Rejeitado/)).length).toBeGreaterThan(0);

    expect(screen.getByText(/Motivo da Rejei/)).toBeInTheDocument();
    expect(screen.getByText("Comprovante ilegível")).toBeInTheDocument();
  });

  it("displays conversation when available", async () => {
    const paymentWithConversation = {
      ...mockPayment,
      conversation: {
        id: "conv-123",
        user_id: "user-123",
        subject: "Pagamento - Pedido #PAY-20240215-1234",
        status: "waiting_admin",
        priority: "medium",
        category: "payment",
        payment_id: "123e4567-e89b-12d3-a456-426614174000",
        created_at: "2024-02-15T10:30:00Z",
        updated_at: "2024-02-15T10:30:00Z",
      },
    };

    mockGetPaymentById.mockResolvedValue(paymentWithConversation);
    mockFileUploadService.getSignedUrl.mockResolvedValue("https://example.com/signed-url");

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentDetailsView paymentId="test-id" />
      </QueryClientProvider>
    );

    expect(await screen.findByText(/Conversa de Suporte/)).toBeInTheDocument();

    expect(screen.getByText("Pagamento - Pedido #PAY-20240215-1234")).toBeInTheDocument();
    expect(screen.getByText(/Abrir Conversa/)).toBeInTheDocument();
  });
});
