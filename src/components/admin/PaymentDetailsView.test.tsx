/**
 * PaymentDetailsView Component Tests
 * 
 * Unit tests for the PaymentDetailsView component
 * 
 * Requirements: 6.1-6.10
 * Task: 13.1 Criar componente PaymentDetailsView
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaymentDetailsView } from './PaymentDetailsView';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock the services
vi.mock('@/lib/payment-service', () => ({
  getPaymentById: vi.fn(),
}));

vi.mock('@/lib/file-upload-service', () => ({
  fileUploadService: {
    getSignedUrl: vi.fn(),
  },
}));

// Mock icons
vi.mock('lucide-react', () => ({
  Eye: () => 'Eye',
  Download: () => 'Download',
  FileText: () => 'FileText',
  ImageIcon: () => 'ImageIcon',
  Calendar: () => 'Calendar',
  User: () => 'User',
  CreditCard: () => 'CreditCard',
  DollarSign: () => 'DollarSign',
  Hash: () => 'Hash',
  Clock: () => 'Clock',
  CheckCircle: () => 'CheckCircle',
  XCircle: () => 'XCircle',
  AlertCircle: () => 'AlertCircle',
  MessageSquare: () => 'MessageSquare',
  ExternalLink: () => 'ExternalLink',
  ChevronRight: () => 'ChevronRight',
  File: () => 'File',
  FileImage: () => 'FileImage',
  FilePdf: () => 'FilePdf',
  History: () => 'History',
  Shield: () => 'Shield',
  Package: () => 'Package',
  Receipt: () => 'Receipt',
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

// Mock PaymentActionButtons
vi.mock('./PaymentActionButtons', () => ({
  PaymentActionButtons: () => <div data-testid="payment-action-buttons">PaymentActionButtons</div>,
}));

describe('PaymentDetailsView', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const mockPayment = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    reference_number: 'PAY-20240215-1234',
    user_id: 'user-123',
    payment_method_id: 'method-123',
    amount: 299.99,
    currency: 'BRL',
    payment_type: 'one_time' as const,
    status: 'under_review' as const,
    created_at: '2024-02-15T10:30:00Z',
    updated_at: '2024-02-15T10:30:00Z',
    payment_method: {
      id: 'method-123',
      name: 'PIX',
      type: 'pix' as const,
      instructions: 'Faça o PIX para a chave: 12345678900',
      is_active: true,
      is_default: true,
      display_order: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    files: [
      {
        id: 'file-1',
        payment_id: '123e4567-e89b-12d3-a456-426614174000',
        file_name: 'comprovante.jpg',
        file_path: 'payment-proofs/comprovante.jpg',
        file_size: 1024000,
        file_type: 'image/jpeg',
        uploaded_by: 'user-123',
        created_at: '2024-02-15T10:35:00Z',
      },
      {
        id: 'file-2',
        payment_id: '123e4567-e89b-12d3-a456-426614174000',
        file_name: 'recibo.pdf',
        file_path: 'payment-proofs/recibo.pdf',
        file_size: 2048000,
        file_type: 'application/pdf',
        uploaded_by: 'user-123',
        created_at: '2024-02-15T10:36:00Z',
      },
    ],
    audit_logs: [
      {
        id: 'log-1',
        payment_id: '123e4567-e89b-12d3-a456-426614174000',
        action_type: 'created' as const,
        created_at: '2024-02-15T10:30:00Z',
      },
      {
        id: 'log-2',
        payment_id: '123e4567-e89b-12d3-a456-426614174000',
        action_type: 'file_uploaded' as const,
        created_at: '2024-02-15T10:35:00Z',
      },
    ],
    customer_name: 'João Silva',
    customer_email: 'joao@example.com',
  };

  it('renders loading state initially', () => {
    const { getPaymentById } = require('@/lib/payment-service');
    getPaymentById.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentDetailsView paymentId="test-id" />
      </QueryClientProvider>
    );

    expect(screen.getByText('Detalhes do Pagamento')).toBeInTheDocument();
    expect(screen.getByTestId('payment-action-buttons')).toBeInTheDocument();
  });

  it('renders payment details when loaded', async () => {
    const { getPaymentById } = require('@/lib/payment-service');
    const { fileUploadService } = require('@/lib/file-upload-service');

    getPaymentById.mockResolvedValue(mockPayment);
    fileUploadService.getSignedUrl.mockResolvedValue('https://example.com/signed-url');

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentDetailsView paymentId="test-id" />
      </QueryClientProvider>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('PAY-20240215-1234')).toBeInTheDocument();
    });

    // Check payment information
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('joao@example.com')).toBeInTheDocument();
    expect(screen.getByText('R$ 299,99')).toBeInTheDocument();
    expect(screen.getByText('PIX')).toBeInTheDocument();
    expect(screen.getByText('Em Revisão')).toBeInTheDocument();

    // Check tabs
    expect(screen.getByText('Comprovantes (2)')).toBeInTheDocument();
    expect(screen.getByText('Histórico')).toBeInTheDocument();
    expect(screen.getByText('Log de Auditoria')).toBeInTheDocument();
  });

  it('displays image files in gallery', async () => {
    const { getPaymentById } = require('@/lib/payment-service');
    const { fileUploadService } = require('@/lib/file-upload-service');

    getPaymentById.mockResolvedValue(mockPayment);
    fileUploadService.getSignedUrl.mockResolvedValue('https://example.com/signed-url');

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentDetailsView paymentId="test-id" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('comprovante.jpg')).toBeInTheDocument();
    });

    // Check image file display
    expect(screen.getByText('Imagens de Comprovante (1)')).toBeInTheDocument();
    expect(screen.getByText('comprovante.jpg')).toBeInTheDocument();
  });

  it('displays PDF files', async () => {
    const { getPaymentById } = require('@/lib/payment-service');
    const { fileUploadService } = require('@/lib/file-upload-service');

    getPaymentById.mockResolvedValue(mockPayment);
    fileUploadService.getSignedUrl.mockResolvedValue('https://example.com/signed-url');

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentDetailsView paymentId="test-id" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('recibo.pdf')).toBeInTheDocument();
    });

    // Check PDF file display
    expect(screen.getByText('PDFs de Comprovante (1)')).toBeInTheDocument();
    expect(screen.getByText('recibo.pdf')).toBeInTheDocument();
  });

  it('displays audit log entries', async () => {
    const { getPaymentById } = require('@/lib/payment-service');
    const { fileUploadService } = require('@/lib/file-upload-service');

    getPaymentById.mockResolvedValue(mockPayment);
    fileUploadService.getSignedUrl.mockResolvedValue('https://example.com/signed-url');

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentDetailsView paymentId="test-id" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Log de Auditoria')).toBeInTheDocument();
    });

    // Switch to audit log tab
    fireEvent.click(screen.getByText('Log de Auditoria'));

    // Check audit log entries
    expect(screen.getByText('Pagamento criado')).toBeInTheDocument();
    expect(screen.getByText('Comprovante enviado')).toBeInTheDocument();
  });

  it('displays timeline entries', async () => {
    const { getPaymentById } = require('@/lib/payment-service');
    const { fileUploadService } = require('@/lib/file-upload-service');

    getPaymentById.mockResolvedValue(mockPayment);
    fileUploadService.getSignedUrl.mockResolvedValue('https://example.com/signed-url');

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentDetailsView paymentId="test-id" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Histórico')).toBeInTheDocument();
    });

    // Switch to timeline tab
    fireEvent.click(screen.getByText('Histórico'));

    // Check timeline entries
    expect(screen.getByText('Pagamento criado')).toBeInTheDocument();
    expect(screen.getByText('Comprovante enviado')).toBeInTheDocument();
  });

  it('handles back button click', async () => {
    const { getPaymentById } = require('@/lib/payment-service');
    const { fileUploadService } = require('@/lib/file-upload-service');
    const mockOnBack = vi.fn();

    getPaymentById.mockResolvedValue(mockPayment);
    fileUploadService.getSignedUrl.mockResolvedValue('https://example.com/signed-url');

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentDetailsView paymentId="test-id" onBack={mockOnBack} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Voltar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Voltar'));
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('displays error state when payment fetch fails', async () => {
    const { getPaymentById } = require('@/lib/payment-service');
    getPaymentById.mockRejectedValue(new Error('Payment not found'));

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentDetailsView paymentId="test-id" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar pagamento')).toBeInTheDocument();
    });

    expect(screen.getByText('Payment not found')).toBeInTheDocument();
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
  });

  it('displays different status badges correctly', async () => {
    const { getPaymentById } = require('@/lib/payment-service');
    const { fileUploadService } = require('@/lib/file-upload-service');

    const approvedPayment = {
      ...mockPayment,
      status: 'approved' as const,
      approved_at: '2024-02-15T11:00:00Z',
      approved_by: 'admin-123',
    };

    getPaymentById.mockResolvedValue(approvedPayment);
    fileUploadService.getSignedUrl.mockResolvedValue('https://example.com/signed-url');

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentDetailsView paymentId="test-id" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Aprovado')).toBeInTheDocument();
    });

    // Check approval info
    expect(screen.getByText('Aprovação')).toBeInTheDocument();
  });

  it('displays rejection reason when payment is rejected', async () => {
    const { getPaymentById } = require('@/lib/payment-service');
    const { fileUploadService } = require('@/lib/file-upload-service');

    const rejectedPayment = {
      ...mockPayment,
      status: 'rejected' as const,
      rejection_reason: 'Comprovante ilegível',
    };

    getPaymentById.mockResolvedValue(rejectedPayment);
    fileUploadService.getSignedUrl.mockResolvedValue('https://example.com/signed-url');

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentDetailsView paymentId="test-id" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Rejeitado')).toBeInTheDocument();
    });

    // Check rejection reason
    expect(screen.getByText('Motivo da Rejeição')).toBeInTheDocument();
    expect(screen.getByText('Comprovante ilegível')).toBeInTheDocument();
  });

  it('displays conversation when available', async () => {
    const { getPaymentById } = require('@/lib/payment-service');
    const { fileUploadService } = require('@/lib/file-upload-service');

    const paymentWithConversation = {
      ...mockPayment,
      conversation: {
        id: 'conv-123',
        user_id: 'user-123',
        subject: 'Pagamento - Pedido #PAY-20240215-1234',
        status: 'waiting_admin',
        priority: 'medium',
        category: 'payment',
        payment_id: '123e4567-e89b-12d3-a456-426614174000',
        created_at: '2024-02-15T10:30:00Z',
        updated_at: '2024-02-15T10:30:00Z',
      },
    };

    getPaymentById.mockResolvedValue(paymentWithConversation);
    fileUploadService.getSignedUrl.mockResolvedValue('https://example.com/signed-url');

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentDetailsView paymentId="test-id" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Conversa de Suporte')).toBeInTheDocument();
    });

    // Check conversation details
    expect(screen.getByText('Pagamento - Pedido #PAY-20240215-1234')).toBeInTheDocument();
    expect(screen.getByText('Abrir Conversa')).toBeInTheDocument();
  });
});