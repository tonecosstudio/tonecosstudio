/**
 * PaymentDashboard Component Tests
 * 
 * Unit tests for the PaymentDashboard component.
 * 
 * Requirements: 5.1-5.10
 * Task: 12.1 Criar componente PaymentDashboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaymentDashboard } from './PaymentDashboard';

// Mock the services
vi.mock('@/lib/admin-payment-service', () => ({
  listPendingPayments: vi.fn(),
  getPaymentStats: vi.fn(),
}));

vi.mock('@/lib/payment-method-service', () => ({
  listAllPaymentMethods: vi.fn(),
}));

const mockPayments = [
  {
    id: '1',
    reference_number: 'PAY-20240101-0001',
    customer_name: 'João Silva',
    customer_email: 'joao@example.com',
    amount: 150.50,
    currency: 'BRL',
    payment_method_name: 'PIX',
    status: 'pending' as const,
    created_at: '2024-01-01T10:00:00Z',
    file_count: 0,
    unread_messages: 0,
  },
  {
    id: '2',
    reference_number: 'PAY-20240101-0002',
    customer_name: 'Maria Santos',
    customer_email: 'maria@example.com',
    amount: 299.99,
    currency: 'BRL',
    payment_method_name: 'Cartão',
    status: 'under_review' as const,
    created_at: '2024-01-01T11:00:00Z',
    file_count: 2,
    unread_messages: 1,
  },
];

const mockStats = {
  pending_count: 5,
  under_review_count: 3,
  requires_info_count: 2,
  total_pending_amount: 1250.75,
  avg_processing_time_hours: 24,
};

const mockPaymentMethods = [
  { id: '1', name: 'PIX', is_active: true },
  { id: '2', name: 'Cartão', is_active: true },
  { id: '3', name: 'Boleto', is_active: false },
];

describe('PaymentDashboard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Reset mocks
    vi.clearAllMocks();
    
    // Setup default mock implementations
    const { listPendingPayments, getPaymentStats } = require('@/lib/admin-payment-service');
    const { listAllPaymentMethods } = require('@/lib/payment-method-service');
    
    listPendingPayments.mockResolvedValue(mockPayments);
    getPaymentStats.mockResolvedValue(mockStats);
    listAllPaymentMethods.mockResolvedValue(mockPaymentMethods);
  });

  const renderPaymentDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <PaymentDashboard />
      </QueryClientProvider>
    );
  };

  it('should render the dashboard with title and stats', async () => {
    renderPaymentDashboard();

    // Check title
    expect(screen.getByText('Dashboard de Pagamentos')).toBeInTheDocument();
    expect(screen.getByText('Gerencie pagamentos manuais pendentes de verificação')).toBeInTheDocument();

    // Wait for stats to load
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // pending_count
      expect(screen.getByText('3')).toBeInTheDocument(); // under_review_count
      expect(screen.getByText('2')).toBeInTheDocument(); // requires_info_count
    });

    // Check stat cards
    expect(screen.getByText('Pendentes')).toBeInTheDocument();
    expect(screen.getByText('Em Revisão')).toBeInTheDocument();
    expect(screen.getByText('Precisa de Info')).toBeInTheDocument();
    expect(screen.getByText('Valor Total')).toBeInTheDocument();
  });

  it('should render payment table with data', async () => {
    renderPaymentDashboard();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('PAY-20240101-0001')).toBeInTheDocument();
      expect(screen.getByText('PAY-20240101-0002')).toBeInTheDocument();
    });

    // Check table headers
    expect(screen.getByText('Referência')).toBeInTheDocument();
    expect(screen.getByText('Cliente')).toBeInTheDocument();
    expect(screen.getByText('Valor')).toBeInTheDocument();
    expect(screen.getByText('Método')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Data')).toBeInTheDocument();
    expect(screen.getByText('Ações')).toBeInTheDocument();

    // Check payment data
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    expect(screen.getByText('PIX')).toBeInTheDocument();
    expect(screen.getByText('Cartão')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText('Em Revisão')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    const { listPendingPayments } = require('@/lib/admin-payment-service');
    listPendingPayments.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderPaymentDashboard();

    // Should show loading skeletons
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('should show error state', async () => {
    const { listPendingPayments } = require('@/lib/admin-payment-service');
    listPendingPayments.mockRejectedValue(new Error('Network error'));

    renderPaymentDashboard();

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar pagamentos')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    // Check retry button
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
  });

  it('should handle empty state', async () => {
    const { listPendingPayments } = require('@/lib/admin-payment-service');
    listPendingPayments.mockResolvedValue([]);

    renderPaymentDashboard();

    // Wait for empty state
    await waitFor(() => {
      expect(screen.getByText('Nenhum pagamento encontrado com os filtros atuais.')).toBeInTheDocument();
    });
  });

  it('should call onViewPayment when view button is clicked', async () => {
    const handleViewPayment = vi.fn();
    
    render(
      <QueryClientProvider client={queryClient}>
        <PaymentDashboard onViewPayment={handleViewPayment} />
      </QueryClientProvider>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('PAY-20240101-0001')).toBeInTheDocument();
    });

    // Find and click view button
    const viewButtons = screen.getAllByRole('button', { name: /ver/i });
    fireEvent.click(viewButtons[0]);

    expect(handleViewPayment).toHaveBeenCalledWith('1');
  });

  it('should apply search filter', async () => {
    renderPaymentDashboard();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('PAY-20240101-0001')).toBeInTheDocument();
    });

    // Find search input
    const searchInput = screen.getByPlaceholderText('Número ou cliente...');
    expect(searchInput).toBeInTheDocument();

    // Type in search
    fireEvent.change(searchInput, { target: { value: 'João' } });

    // Wait for debounce
    await waitFor(() => {
      const { listPendingPayments } = require('@/lib/admin-payment-service');
      expect(listPendingPayments).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'João' })
      );
    });
  });

  it('should clear filters when clear button is clicked', async () => {
    renderPaymentDashboard();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('PAY-20240101-0001')).toBeInTheDocument();
    });

    // Find clear filters button
    const clearButton = screen.getByText('Limpar Filtros');
    expect(clearButton).toBeInTheDocument();

    // Click clear button
    fireEvent.click(clearButton);

    // The component should refetch with empty filters
    await waitFor(() => {
      const { listPendingPayments } = require('@/lib/admin-payment-service');
      expect(listPendingPayments).toHaveBeenCalledWith({});
    });
  });
});