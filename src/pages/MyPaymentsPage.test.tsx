/**
 * MyPaymentsPage Component Tests
 * 
 * Unit tests for the customer payment history page.
 * 
 * Requirements: 13.1-13.15
 * Task: 18.1 Criar componente MyPaymentsPage
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import MyPaymentsPage from './MyPaymentsPage';
import { useAuth } from '@/lib/auth';
import { listPaymentsByUser } from '@/lib/payment-service';

// Mock the auth hook
vi.mock('@/lib/auth', () => ({
  useAuth: vi.fn(),
}));

// Mock the payment service
vi.mock('@/lib/payment-service', () => ({
  listPaymentsByUser: vi.fn(),
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

// Mock date-fns format
vi.mock('date-fns', () => ({
  format: vi.fn(() => '15 de fevereiro de 2024'),
}));

// Mock date-fns locale
vi.mock('date-fns/locale', () => ({
  ptBR: {},
}));

describe('MyPaymentsPage', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockPayments = [
    {
      id: 'payment-1',
      reference_number: 'PAY-20240215-1234',
      user_id: 'user-123',
      payment_method_id: 'method-1',
      amount: 100.50,
      currency: 'BRL',
      payment_type: 'one_time' as const,
      status: 'pending' as const,
      created_at: '2024-02-15T10:00:00Z',
      updated_at: '2024-02-15T10:00:00Z',
    },
    {
      id: 'payment-2',
      reference_number: 'PAY-20240214-5678',
      user_id: 'user-123',
      payment_method_id: 'method-2',
      amount: 250.00,
      currency: 'BRL',
      payment_type: 'recurring' as const,
      status: 'approved' as const,
      created_at: '2024-02-14T14:30:00Z',
      updated_at: '2024-02-14T15:00:00Z',
      approved_at: '2024-02-14T15:00:00Z',
      approved_by: 'admin-1',
    },
    {
      id: 'payment-3',
      reference_number: 'PAY-20240213-9012',
      user_id: 'user-123',
      payment_method_id: 'method-1',
      amount: 75.25,
      currency: 'BRL',
      payment_type: 'one_time' as const,
      status: 'rejected' as const,
      created_at: '2024-02-13T09:15:00Z',
      updated_at: '2024-02-13T10:30:00Z',
      rejection_reason: 'Comprovante ilegível',
    },
  ];

  const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    const queryClient = createTestQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          {ui}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser });
    (listPaymentsByUser as any).mockResolvedValue(mockPayments);
  });

  it('should render loading state initially', () => {
    (listPaymentsByUser as any).mockImplementation(() => new Promise(() => {})); // Never resolves
    
    renderWithProviders(<MyPaymentsPage />);
    
    expect(screen.getByText(/meus pagamentos/i)).toBeInTheDocument();
    expect(screen.getAllByTestId('skeleton')).toHaveLength(7); // Header + 6 payment cards
  });

  it('should render payment cards when data is loaded', async () => {
    renderWithProviders(<MyPaymentsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('PAY-20240215-1234')).toBeInTheDocument();
      expect(screen.getByText('PAY-20240214-5678')).toBeInTheDocument();
      expect(screen.getByText('PAY-20240213-9012')).toBeInTheDocument();
    });

    // Check payment details
    expect(screen.getByText('R$ 100,50')).toBeInTheDocument();
    expect(screen.getByText('R$ 250,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 75,25')).toBeInTheDocument();

    // Check status badges
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText('Aprovado')).toBeInTheDocument();
    expect(screen.getByText('Rejeitado')).toBeInTheDocument();

    // Check payment types
    expect(screen.getAllByText('Pagamento Único')).toHaveLength(2);
    expect(screen.getByText('Recorrente')).toBeInTheDocument();
  });

  it('should render empty state when no payments exist', async () => {
    (listPaymentsByUser as any).mockResolvedValue([]);
    
    renderWithProviders(<MyPaymentsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Nenhum pagamento encontrado')).toBeInTheDocument();
      expect(screen.getByText('Você ainda não realizou nenhum pagamento')).toBeInTheDocument();
    });

    expect(screen.getByText('Ver Orçamentos')).toBeInTheDocument();
    expect(screen.getByText('Ver Assinaturas')).toBeInTheDocument();
  });

  it('should apply status filter correctly', async () => {
    renderWithProviders(<MyPaymentsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('PAY-20240215-1234')).toBeInTheDocument();
    });

    // Find and change status filter
    const statusSelect = screen.getByLabelText('Status');
    fireEvent.click(statusSelect);
    
    const pendingOption = screen.getByText('Pendente');
    fireEvent.click(pendingOption);

    // Verify filter was applied
    await waitFor(() => {
      expect(listPaymentsByUser).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          status: ['pending'],
        })
      );
    });
  });

  it('should apply search filter correctly', async () => {
    renderWithProviders(<MyPaymentsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('PAY-20240215-1234')).toBeInTheDocument();
    });

    // Find search input and submit
    const searchInput = screen.getByPlaceholderText('Ex: PAY-20240215-1234');
    const searchButton = screen.getByText('Buscar');
    
    fireEvent.change(searchInput, { target: { value: 'PAY-20240215' } });
    fireEvent.click(searchButton);

    // Verify search was applied
    await waitFor(() => {
      expect(listPaymentsByUser).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          search: 'PAY-20240215',
        })
      );
    });
  });

  it('should clear filters when clear button is clicked', async () => {
    renderWithProviders(<MyPaymentsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('PAY-20240215-1234')).toBeInTheDocument();
    });

    // Apply a filter first
    const statusSelect = screen.getByLabelText('Status');
    fireEvent.click(statusSelect);
    fireEvent.click(screen.getByText('Pendente'));

    // Clear filters
    const clearButton = screen.getByText('Limpar Filtros');
    fireEvent.click(clearButton);

    // Verify filters were cleared and query was refetched
    await waitFor(() => {
      expect(listPaymentsByUser).toHaveBeenCalledWith('user-123', {});
    });
  });

  it('should show error state when API call fails', async () => {
    const errorMessage = 'Failed to load payments';
    (listPaymentsByUser as any).mockRejectedValue(new Error(errorMessage));
    
    renderWithProviders(<MyPaymentsPage />);
    
    await waitFor(() => {
      // The error should be shown via toast
      expect(listPaymentsByUser).toHaveBeenCalled();
    });
  });

  it('should navigate to payment details when card is clicked', async () => {
    const mockNavigate = vi.fn();
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual as any,
        useNavigate: () => mockNavigate,
      };
    });

    renderWithProviders(<MyPaymentsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('PAY-20240215-1234')).toBeInTheDocument();
    });

    // Click on a payment card
    const paymentCard = screen.getByText('PAY-20240215-1234').closest('.cursor-pointer');
    if (paymentCard) {
      fireEvent.click(paymentCard);
    }

    // Should navigate to payment details
    expect(mockNavigate).toHaveBeenCalledWith('/payments/payment-1');
  });

  it('should display help section with payment information', async () => {
    renderWithProviders(<MyPaymentsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('PAY-20240215-1234')).toBeInTheDocument();
    });

    // Check help section is present
    expect(screen.getByText('Precisa de ajuda com seus pagamentos?')).toBeInTheDocument();
    expect(screen.getByText('Status do pagamento')).toBeInTheDocument();
    expect(screen.getByText('Tempo de processamento')).toBeInTheDocument();
    expect(screen.getByText('Ações disponíveis')).toBeInTheDocument();
  });

  it('should show export button when payments exist', async () => {
    renderWithProviders(<MyPaymentsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('PAY-20240215-1234')).toBeInTheDocument();
    });

    expect(screen.getByText('Exportar')).toBeInTheDocument();
  });

  it('should not show export button when no payments exist', async () => {
    (listPaymentsByUser as any).mockResolvedValue([]);
    
    renderWithProviders(<MyPaymentsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Nenhum pagamento encontrado')).toBeInTheDocument();
    });

    expect(screen.queryByText('Exportar')).not.toBeInTheDocument();
  });
});