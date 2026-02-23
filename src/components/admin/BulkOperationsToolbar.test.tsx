/**
 * Testes para o componente BulkOperationsToolbar
 * 
 * Requirements: 12.1-12.15
 * Task: 14.2 Criar componente BulkOperationsToolbar
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BulkOperationsToolbar } from './BulkOperationsToolbar';
import type { PaymentListItem } from '@/types/manual-payment';

// Mock do hook useAuth
jest.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'admin-123' },
    isLoading: false,
  }),
}));

// Mock dos serviços
jest.mock('@/lib/admin-payment-service', () => ({
  bulkApprovePayments: jest.fn(),
  exportPaymentsToCSV: jest.fn(),
  bulkSendMessage: jest.fn(),
  startAsyncBulkApprove: jest.fn(),
  startAsyncBulkMessage: jest.fn(),
  startAsyncBulkExport: jest.fn(),
  getBulkOperationStatus: jest.fn(),
}));

// Mock do toast
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

const mockPayments: PaymentListItem[] = [
  {
    id: 'payment-1',
    reference_number: 'PAY-20240101-0001',
    customer_name: 'João Silva',
    customer_email: 'joao@email.com',
    amount: 100.50,
    currency: 'BRL',
    payment_method_name: 'PIX',
    status: 'under_review',
    created_at: '2024-01-01T10:00:00Z',
    file_count: 2,
    unread_messages: 1,
  },
  {
    id: 'payment-2',
    reference_number: 'PAY-20240101-0002',
    customer_name: 'Maria Santos',
    customer_email: 'maria@email.com',
    amount: 200.75,
    currency: 'BRL',
    payment_method_name: 'Cartão',
    status: 'pending',
    created_at: '2024-01-01T11:00:00Z',
    file_count: 0,
    unread_messages: 0,
  },
  {
    id: 'payment-3',
    reference_number: 'PAY-20240101-0003',
    customer_name: 'Pedro Oliveira',
    customer_email: 'pedro@email.com',
    amount: 150.25,
    currency: 'BRL',
    payment_method_name: 'Boleto',
    status: 'requires_info',
    created_at: '2024-01-01T12:00:00Z',
    file_count: 1,
    unread_messages: 2,
  },
];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('BulkOperationsToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('não renderiza quando nenhum pagamento está selecionado', () => {
    const { container } = renderWithProviders(
      <BulkOperationsToolbar
        selectedPayments={[]}
        payments={mockPayments}
        onSelectAll={() => {}}
        onClearSelection={() => {}}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renderiza corretamente quando pagamentos estão selecionados', () => {
    renderWithProviders(
      <BulkOperationsToolbar
        selectedPayments={['payment-1', 'payment-2']}
        payments={mockPayments}
        onSelectAll={() => {}}
        onClearSelection={() => {}}
      />
    );

    expect(screen.getByText('2 selecionado(s)')).toBeInTheDocument();
    expect(screen.getByText('R$ 301,25')).toBeInTheDocument();
    expect(screen.getByText('1 Em Revisão')).toBeInTheDocument();
    expect(screen.getByText('1 Pendente')).toBeInTheDocument();
    
    expect(screen.getByText('Aprovar Selecionados')).toBeInTheDocument();
    expect(screen.getByText('Exportar CSV')).toBeInTheDocument();
    expect(screen.getByText('Enviar Mensagem')).toBeInTheDocument();
    expect(screen.getByText('Limpar')).toBeInTheDocument();
  });

  it('chama onSelectAll quando o botão de selecionar todos é clicado', () => {
    const mockOnSelectAll = jest.fn();
    
    renderWithProviders(
      <BulkOperationsToolbar
        selectedPayments={['payment-1']}
        payments={mockPayments}
        onSelectAll={mockOnSelectAll}
        onClearSelection={() => {}}
      />
    );

    const selectAllButton = screen.getByTitle('Marcar todos');
    fireEvent.click(selectAllButton);

    expect(mockOnSelectAll).toHaveBeenCalledWith(true);
  });

  it('chama onClearSelection quando o botão Limpar é clicado', () => {
    const mockOnClearSelection = jest.fn();
    
    renderWithProviders(
      <BulkOperationsToolbar
        selectedPayments={['payment-1']}
        payments={mockPayments}
        onSelectAll={() => {}}
        onClearSelection={mockOnClearSelection}
      />
    );

    const clearButton = screen.getByText('Limpar');
    fireEvent.click(clearButton);

    expect(mockOnClearSelection).toHaveBeenCalled();
  });

  it('mostra diálogo de confirmação para aprovação em lote', () => {
    renderWithProviders(
      <BulkOperationsToolbar
        selectedPayments={['payment-1']}
        payments={mockPayments}
        onSelectAll={() => {}}
        onClearSelection={() => {}}
      />
    );

    const approveButton = screen.getByText('Aprovar Selecionados');
    fireEvent.click(approveButton);

    expect(screen.getByText('Confirmar Aprovação em Lote')).toBeInTheDocument();
    expect(screen.getByText('Você está prestes a aprovar 1 pagamento(s).')).toBeInTheDocument();
  });

  it('abre o sheet para enviar mensagem em lote', () => {
    renderWithProviders(
      <BulkOperationsToolbar
        selectedPayments={['payment-1']}
        payments={mockPayments}
        onSelectAll={() => {}}
        onClearSelection={() => {}}
      />
    );

    const messageButton = screen.getByText('Enviar Mensagem');
    fireEvent.click(messageButton);

    expect(screen.getByText('Enviar Mensagem em Lote')).toBeInTheDocument();
    expect(screen.getByText('Envie uma mensagem para 1 cliente(s) selecionado(s).')).toBeInTheDocument();
  });

  it('desabilita botão de aprovação quando não há pagamentos em revisão', () => {
    // Criar pagamentos sem status 'under_review'
    const paymentsWithoutReview = mockPayments.map(p => ({
      ...p,
      status: 'pending' as const,
    }));

    renderWithProviders(
      <BulkOperationsToolbar
        selectedPayments={['payment-1', 'payment-2']}
        payments={paymentsWithoutReview}
        onSelectAll={() => {}}
        onClearSelection={() => {}}
      />
    );

    const approveButton = screen.getByText('Aprovar Selecionados');
    expect(approveButton).toBeDisabled();
  });

  it('mostra contagem de status corretamente', () => {
    renderWithProviders(
      <BulkOperationsToolbar
        selectedPayments={['payment-1', 'payment-2', 'payment-3']}
        payments={mockPayments}
        onSelectAll={() => {}}
        onClearSelection={() => {}}
      />
    );

    // Verificar se todos os status estão representados
    expect(screen.getByText('1 Em Revisão')).toBeInTheDocument();
    expect(screen.getByText('1 Pendente')).toBeInTheDocument();
    expect(screen.getByText('1 Precisa de Info')).toBeInTheDocument();
  });
});