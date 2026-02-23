/**
 * CustomerPaymentDetails Component Tests
 * 
 * Unit tests for the CustomerPaymentDetails component.
 * 
 * Requirements: 13.1-13.15
 * Task: 18.2 Criar componente CustomerPaymentDetails
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { getPaymentById } from '@/lib/payment-service';
import { CustomerPaymentDetails } from './CustomerPaymentDetails';

// Mock dependencies
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/payment-service', () => ({
  getPaymentById: vi.fn(),
}));

vi.mock('./FileUploadComponent', () => ({
  FileUploadComponent: ({ paymentId, onUploadComplete, onError }: any) => (
    <div data-testid="file-upload-component">
      FileUploadComponent for payment: {paymentId}
      <button onClick={() => onUploadComplete?.([{ id: 'file-1', name: 'test.jpg' }])}>
        Simulate Upload
      </button>
      <button onClick={() => onError?.(new Error('Upload failed'))}>
        Simulate Error
      </button>
    </div>
  ),
}));

vi.mock('./UploadedFilesList', () => ({
  UploadedFilesList: ({ paymentId, files }: any) => (
    <div data-testid="uploaded-files-list">
      UploadedFilesList for payment: {paymentId}
      <div data-testid="file-count">{files?.length || 0} files</div>
    </div>
  ),
}));

// Mock icons
vi.mock('lucide-react', () => ({
  Calendar: () => <span>Calendar</span>,
  Clock: () => <span>Clock</span>,
  CheckCircle: () => <span>CheckCircle</span>,
  XCircle: () => <span>XCircle</span>,
  AlertCircle: () => <span>AlertCircle</span>,
  Eye: () => <span>Eye</span>,
  Download: () => <span>Download</span>,
  Upload: () => <span>Upload</span>,
  MessageSquare: () => <span>MessageSquare</span>,
  FileText: () => <span>FileText</span>,
  ArrowLeft: () => <span>ArrowLeft</span>,
  ExternalLink: () => <span>ExternalLink</span>,
  CreditCard: () => <span>CreditCard</span>,
  User: () => <span>User</span>,
  DollarSign: () => <span>DollarSign</span>,
  CalendarDays: () => <span>CalendarDays</span>,
  FileCheck: () => <span>FileCheck</span>,
  History: () => <span>History</span>,
  Info: () => <span>Info</span>,
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn(() => '01 de Janeiro de 2024 às 10:00'),
}));

vi.mock('date-fns/locale', () => ({
  ptBR: {},
}));

describe('CustomerPaymentDetails', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const mockUser = {
    id: 'user-123',
    email: 'customer@example.com',
  };

  const mockPayment = {
    id: 'payment-123',
    reference_number: 'PAY-20240215-1234',
    user_id: 'user-123',
    payment_method_id: 'method-123',
    amount: 100.50,
    currency: 'BRL',
    payment_type: 'one_time' as const,
    status: 'pending' as const,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
    payment_method: {
      id: 'method-123',
      name: 'PIX',
      type: 'pix' as const,
      instructions: 'Faça o pagamento via PIX usando a chave abaixo.',
      pix_key: '123.456.789-00',
      is_active: true,
      is_default: false,
      display_order: 1,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
    },
    files: [],
    audit_logs: [],
    customer_name: 'John Doe',
    customer_email: 'customer@example.com',
  };

  const mockPaymentWithFiles = {
    ...mockPayment,
    files: [
      {
        id: 'file-1',
        payment_id: 'payment-123',
        file_name: 'comprovante.jpg',
        file_path: '/path/to/file.jpg',
        file_size: 1024 * 1024, // 1MB
        file_type: 'image/jpeg',
        uploaded_by: 'user-123',
        created_at: '2024-01-01T10:05:00Z',
      },
    ],
  };

  const mockPaymentWithAuditLogs = {
    ...mockPayment,
    status: 'under_review' as const,
    audit_logs: [
      {
        id: 'log-1',
        payment_id: 'payment-123',
        action_type: 'status_changed' as const,
        old_status: 'pending',
        new_status: 'under_review',
        notes: 'First file uploaded',
        created_at: '2024-01-01T10:05:00Z',
      },
    ],
  };

  const mockRejectedPayment = {
    ...mockPayment,
    status: 'rejected' as const,
    rejection_reason: 'Comprovante ilegível. Por favor, envie uma imagem mais nítida.',
    audit_logs: [
      {
        id: 'log-2',
        payment_id: 'payment-123',
        action_type: 'rejected' as const,
        admin_id: 'admin-123',
        old_status: 'under_review',
        new_status: 'rejected',
        notes: 'Comprovante ilegível',
        created_at: '2024-01-01T11:00:00Z',
      },
    ],
  };

  const mockRequiresInfoPayment = {
    ...mockPayment,
    status: 'requires_info' as const,
    audit_logs: [
      {
        id: 'log-3',
        payment_id: 'payment-123',
        action_type: 'info_requested' as const,
        admin_id: 'admin-123',
        old_status: 'under_review',
        new_status: 'requires_info',
        notes: 'Por favor, envie o comprovante com a data visível.',
        created_at: '2024-01-01T11:30:00Z',
      },
    ],
  };

  const mockApprovedPayment = {
    ...mockPayment,
    status: 'approved' as const,
    approved_at: '2024-01-01T12:00:00Z',
    approved_by: 'admin-123',
    conversation: {
      id: 'conv-123',
      user_id: 'user-123',
      subject: 'Pagamento - Pedido #PAY-20240215-1234',
      status: 'resolved',
      priority: 'medium',
      category: 'payment',
      payment_id: 'payment-123',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T12:00:00Z',
      resolved_at: '2024-01-01T12:00:00Z',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderComponent = (paymentId = 'payment-123', onBack = vi.fn()) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CustomerPaymentDetails paymentId={paymentId} onBack={onBack} />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('should render loading state', () => {
    (getPaymentById as any).mockImplementation(() => new Promise(() => {})); // Never resolves

    renderComponent();

    expect(screen.getByText(/Voltar para Meus Pagamentos/i)).toBeInTheDocument();
    expect(screen.getByTestId(/skeleton/i)).toBeInTheDocument();
  });

  it('should render error state', async () => {
    (getPaymentById as any).mockRejectedValue(new Error('Payment not found'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Erro ao carregar pagamento/i)).toBeInTheDocument();
      expect(screen.getByText(/Payment not found/i)).toBeInTheDocument();
      expect(screen.getByText(/Voltar para Meus Pagamentos/i)).toBeInTheDocument();
    });
  });

  it('should render payment details for pending status', async () => {
    (getPaymentById as any).mockResolvedValue(mockPayment);

    renderComponent();

    await waitFor(() => {
      // Check header
      expect(screen.getByText(/Pagamento PAY-20240215-1234/i)).toBeInTheDocument();
      expect(screen.getByText(/Pendente/i)).toBeInTheDocument();
      
      // Check payment information
      expect(screen.getByText(/Número de Referência/i)).toBeInTheDocument();
      expect(screen.getByText(/PAY-20240215-1234/i)).toBeInTheDocument();
      expect(screen.getByText(/Data de Criação/i)).toBeInTheDocument();
      expect(screen.getByText(/Valor/i)).toBeInTheDocument();
      expect(screen.getByText(/R\$ 100,50/i)).toBeInTheDocument();
      expect(screen.getByText(/Método de Pagamento/i)).toBeInTheDocument();
      expect(screen.getByText(/PIX/i)).toBeInTheDocument();
      
      // Check payment instructions
      expect(screen.getByText(/Instruções de Pagamento/i)).toBeInTheDocument();
      expect(screen.getByText(/Faça o pagamento via PIX usando a chave abaixo./i)).toBeInTheDocument();
      expect(screen.getByText(/Chave PIX: 123.456.789-00/i)).toBeInTheDocument();
      
      // Check tabs
      expect(screen.getByText(/Visão Geral/i)).toBeInTheDocument();
      expect(screen.getByText(/Comprovantes/i)).toBeInTheDocument();
      expect(screen.getByText(/Histórico/i)).toBeInTheDocument();
      
      // Check actions
      expect(screen.getByText(/Enviar Comprovante/i)).toBeInTheDocument();
    });
  });

  it('should show file upload section for pending status', async () => {
    (getPaymentById as any).mockResolvedValue(mockPayment);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Pendente/i)).toBeInTheDocument();
    });

    // Switch to files tab
    fireEvent.click(screen.getByText(/Comprovantes/i));

    await waitFor(() => {
      expect(screen.getByTestId('file-upload-component')).toBeInTheDocument();
      expect(screen.getByText(/FileUploadComponent for payment: payment-123/i)).toBeInTheDocument();
    });
  });

  it('should show uploaded files', async () => {
    (getPaymentById as any).mockResolvedValue(mockPaymentWithFiles);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Pendente/i)).toBeInTheDocument();
    });

    // Switch to files tab
    fireEvent.click(screen.getByText(/Comprovantes/i));

    await waitFor(() => {
      expect(screen.getByTestId('uploaded-files-list')).toBeInTheDocument();
      expect(screen.getByTestId('file-count')).toHaveTextContent('1 files');
    });
  });

  it('should show rejection reason for rejected payment', async () => {
    (getPaymentById as any).mockResolvedValue(mockRejectedPayment);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Rejeitado/i)).toBeInTheDocument();
      expect(screen.getByText(/Motivo da Rejeição/i)).toBeInTheDocument();
      expect(screen.getByText(/Comprovante ilegível. Por favor, envie uma imagem mais nítida./i)).toBeInTheDocument();
      expect(screen.getByText(/Enviar Comprovante/i)).toBeInTheDocument(); // Should allow re-upload
    });
  });

  it('should show admin message for requires_info status', async () => {
    (getPaymentById as any).mockResolvedValue(mockRequiresInfoPayment);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Precisa de Informações/i)).toBeInTheDocument();
      expect(screen.getByText(/Mensagem do Administrador/i)).toBeInTheDocument();
      expect(screen.getByText(/Por favor, envie o comprovante com a data visível./i)).toBeInTheDocument();
      expect(screen.getByText(/Enviar Comprovante/i)).toBeInTheDocument(); // Should allow upload
    });
  });

  it('should show download receipt button for approved payment', async () => {
    (getPaymentById as any).mockResolvedValue(mockApprovedPayment);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Aprovado/i)).toBeInTheDocument();
      expect(screen.getByText(/Baixar Recibo/i)).toBeInTheDocument();
      expect(screen.getByText(/Conversa de Suporte/i)).toBeInTheDocument();
      expect(screen.queryByText(/Enviar Comprovante/i)).not.toBeInTheDocument(); // Should not allow upload
    });
  });

  it('should show status timeline with audit logs', async () => {
    (getPaymentById as any).mockResolvedValue(mockPaymentWithAuditLogs);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Em Análise/i)).toBeInTheDocument();
      expect(screen.getByText(/Linha do Tempo/i)).toBeInTheDocument();
      expect(screen.getByText(/Status alterado de pending para under_review/i)).toBeInTheDocument();
      expect(screen.getByText(/First file uploaded/i)).toBeInTheDocument();
    });
  });

  it('should show complete history tab', async () => {
    (getPaymentById as any).mockResolvedValue(mockPaymentWithAuditLogs);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Em Análise/i)).toBeInTheDocument();
    });

    // Switch to history tab
    fireEvent.click(screen.getByText(/Histórico/i));

    await waitFor(() => {
      expect(screen.getByText(/Histórico Completo/i)).toBeInTheDocument();
      expect(screen.getByText(/Registros de Auditoria/i)).toBeInTheDocument();
      expect(screen.getByText(/Status Alterado/i)).toBeInTheDocument();
    });
  });

  it('should handle file upload completion', async () => {
    (getPaymentById as any).mockResolvedValue(mockPayment);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Pendente/i)).toBeInTheDocument();
    });

    // Switch to files tab
    fireEvent.click(screen.getByText(/Comprovantes/i));

    await waitFor(() => {
      expect(screen.getByTestId('file-upload-component')).toBeInTheDocument();
    });

    // Simulate file upload
    fireEvent.click(screen.getByText(/Simulate Upload/i));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        title: 'Arquivos enviados com sucesso',
        description: 'Seus comprovantes foram enviados para análise.',
      });
    });
  });

  it('should handle file upload error', async () => {
    (getPaymentById as any).mockResolvedValue(mockPayment);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Pendente/i)).toBeInTheDocument();
    });

    // Switch to files tab
    fireEvent.click(screen.getByText(/Comprovantes/i));

    await waitFor(() => {
      expect(screen.getByTestId('file-upload-component')).toBeInTheDocument();
    });

    // Simulate upload error
    fireEvent.click(screen.getByText(/Simulate Error/i));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        title: 'Erro no upload',
        description: 'Upload failed',
        variant: 'destructive',
      });
    });
  });

  it('should handle back button click', async () => {
    (getPaymentById as any).mockResolvedValue(mockPayment);
    const onBack = vi.fn();

    renderComponent('payment-123', onBack);

    await waitFor(() => {
      expect(screen.getByText(/Pendente/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Voltar para Meus Pagamentos/i));

    expect(onBack).toHaveBeenCalled();
  });

  it('should show appropriate guidance for each status', async () => {
    const statusTestCases = [
      { payment: mockPayment, expectedGuidance: ['Envie o comprovante de pagamento', 'Aguarde análise do administrador'] },
      { payment: mockPaymentWithAuditLogs, expectedGuidance: ['Comprovante recebido e em análise', 'Tempo médio: 24 horas úteis'] },
      { payment: mockRequiresInfoPayment, expectedGuidance: ['Envie as informações solicitadas', 'Use a conversa de suporte se necessário'] },
      { payment: mockApprovedPayment, expectedGuidance: ['Pagamento aprovado com sucesso', 'Baixe o recibo para seus registros'] },
      { payment: mockRejectedPayment, expectedGuidance: ['Verifique o motivo da rejeição acima', 'Envie um novo comprovante se necessário'] },
    ];

    for (const testCase of statusTestCases) {
      vi.clearAllMocks();
      (getPaymentById as any).mockResolvedValue(testCase.payment);

      const { unmount } = renderComponent();

      await waitFor(() => {
        expect(screen.getByText(new RegExp(testCase.expectedGuidance[0], 'i'))).toBeInTheDocument();
      });

      for (const guidance of testCase.expectedGuidance) {
        expect(screen.getByText(new RegExp(guidance, 'i'))).toBeInTheDocument();
      }

      unmount();
    }
  });

  it('should not show file upload for approved or under_review status', async () => {
    const noUploadStatuses = [
      mockPaymentWithAuditLogs, // under_review
      mockApprovedPayment, // approved
    ];

    for (const payment of noUploadStatuses) {
      vi.clearAllMocks();
      (getPaymentById as any).mockResolvedValue(payment);

      const { unmount } = renderComponent();

      await waitFor(() => {
        expect(screen.getByText(new RegExp(payment.status === 'under_review' ? 'Em Análise' : 'Aprovado', 'i'))).toBeInTheDocument();
      });

      // Switch to files tab
      fireEvent.click(screen.getByText(/Comprovantes/i));

      await waitFor(() => {
        if (payment.files && payment.files.length > 0) {
          expect(screen.getByTestId('uploaded-files-list')).toBeInTheDocument();
        }
        expect(screen.queryByTestId('file-upload-component')).not.toBeInTheDocument();
        expect(screen.getByText(/Upload não disponível/i)).toBeInTheDocument();
      });

      unmount();
    }
  });
});