/**
 * Unit tests for PaymentMethodList component
 * 
 * Tests the PaymentMethodList component functionality including:
 * - Display of payment methods with active/inactive indicators
 * - Toggle active/inactive buttons
 * - Set as default button
 * - Edit and delete actions
 * - Drag and drop for display_order
 * 
 * Requirements: 1.1-1.10
 * Task: 11.2 Criar componente PaymentMethodList
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaymentMethodList } from './PaymentMethodList';
import type { PaymentMethod } from '@/types/manual-payment';
import * as paymentMethodService from '@/lib/payment-method-service';

// Mock the payment method service
jest.mock('@/lib/payment-method-service', () => ({
  listAllPaymentMethods: jest.fn(),
  togglePaymentMethodActive: jest.fn(),
  setDefaultPaymentMethod: jest.fn(),
  updatePaymentMethod: jest.fn(),
  clearPaymentMethodCache: jest.fn(),
}));

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

// Mock @dnd-kit components
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-context">{children}</div>,
  closestCenter: jest.fn(),
  KeyboardSensor: jest.fn(),
  PointerSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(),
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div data-testid="sortable-context">{children}</div>,
  sortableKeyboardCoordinates: jest.fn(),
  verticalListSortingStrategy: jest.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: jest.fn(),
    },
  },
}));

// Create a test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock payment methods data
const mockPaymentMethods: PaymentMethod[] = [
  {
    id: '1',
    name: 'PIX',
    type: 'pix',
    instructions: 'Faça o PIX para a chave abaixo',
    payment_link: null,
    pix_key: '123.456.789-00',
    account_details: null,
    is_active: true,
    is_default: true,
    display_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Cartão de Crédito',
    type: 'other',
    instructions: 'Pagamento via cartão de crédito',
    payment_link: 'https://pagseguro.com/pay',
    pix_key: null,
    account_details: null,
    is_active: true,
    is_default: false,
    display_order: 1,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: '3',
    name: 'Boleto Bancário',
    type: 'bank_transfer',
    instructions: 'Pague o boleto em qualquer banco',
    payment_link: null,
    pix_key: null,
    account_details: { bank: 'Banco do Brasil', agency: '1234', account: '56789-0' },
    is_active: false,
    is_default: false,
    display_order: 2,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
];

describe('PaymentMethodList Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <PaymentMethodList />
      </QueryClientProvider>
    );
  };

  test('should display loading state initially', () => {
    (paymentMethodService.listAllPaymentMethods as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves to show loading
    );

    renderComponent();
    
    expect(screen.getByText('Carregando métodos de pagamento...')).toBeInTheDocument();
  });

  test('should display error state when fetch fails', async () => {
    const errorMessage = 'Failed to fetch payment methods';
    (paymentMethodService.listAllPaymentMethods as jest.Mock).mockRejectedValue(
      new Error(errorMessage)
    );

    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar métodos de pagamento')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  test('should display empty state when no payment methods', async () => {
    (paymentMethodService.listAllPaymentMethods as jest.Mock).mockResolvedValue([]);

    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Nenhum método de pagamento configurado.')).toBeInTheDocument();
      expect(screen.getByText(/Clique em "Adicionar Método"/)).toBeInTheDocument();
    });
  });

  test('should display payment methods table with correct data', async () => {
    (paymentMethodService.listAllPaymentMethods as jest.Mock).mockResolvedValue(mockPaymentMethods);

    renderComponent();
    
    await waitFor(() => {
      // Check table headers
      expect(screen.getByText('Nome')).toBeInTheDocument();
      expect(screen.getByText('Tipo')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Padrão')).toBeInTheDocument();
      expect(screen.getByText('Ordem')).toBeInTheDocument();
      expect(screen.getByText('Ações')).toBeInTheDocument();
      
      // Check payment method names
      expect(screen.getByText('PIX')).toBeInTheDocument();
      expect(screen.getByText('Cartão de Crédito')).toBeInTheDocument();
      expect(screen.getByText('Boleto Bancário')).toBeInTheDocument();
      
      // Check payment method types
      expect(screen.getByText('pix')).toBeInTheDocument();
      expect(screen.getByText('other')).toBeInTheDocument();
      expect(screen.getByText('bank_transfer')).toBeInTheDocument();
      
      // Check status indicators
      expect(screen.getAllByText('Ativo')).toHaveLength(2);
      expect(screen.getByText('Inativo')).toBeInTheDocument();
      
      // Check default indicators
      expect(screen.getByText('Padrão')).toBeInTheDocument();
      expect(screen.getAllByText('Não padrão')).toHaveLength(2);
      
      // Check display order
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  test('should call onEdit when edit button is clicked', async () => {
    (paymentMethodService.listAllPaymentMethods as jest.Mock).mockResolvedValue([mockPaymentMethods[0]]);
    
    const mockOnEdit = jest.fn();
    
    render(
      <QueryClientProvider client={queryClient}>
        <PaymentMethodList onEdit={mockOnEdit} />
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('PIX')).toBeInTheDocument();
    });
    
    // Find and click the more options button
    const moreButtons = screen.getAllByRole('button', { name: /more/i });
    fireEvent.click(moreButtons[0]);
    
    // Find and click the edit option
    const editOption = screen.getByText('Editar');
    fireEvent.click(editOption);
    
    expect(mockOnEdit).toHaveBeenCalledWith(mockPaymentMethods[0]);
  });

  test('should open delete dialog when delete button is clicked', async () => {
    (paymentMethodService.listAllPaymentMethods as jest.Mock).mockResolvedValue([mockPaymentMethods[0]]);
    
    const mockOnDelete = jest.fn();
    
    render(
      <QueryClientProvider client={queryClient}>
        <PaymentMethodList onDelete={mockOnDelete} />
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('PIX')).toBeInTheDocument();
    });
    
    // Find and click the more options button
    const moreButtons = screen.getAllByRole('button', { name: /more/i });
    fireEvent.click(moreButtons[0]);
    
    // Find and click the delete option
    const deleteOption = screen.getByText('Excluir');
    fireEvent.click(deleteOption);
    
    // Check that delete dialog opens
    expect(screen.getByText('Excluir método de pagamento')).toBeInTheDocument();
    expect(screen.getByText(`Tem certeza que deseja excluir o método de pagamento "PIX"?`)).toBeInTheDocument();
  });

  test('should call togglePaymentMethodActive when switch is toggled', async () => {
    (paymentMethodService.listAllPaymentMethods as jest.Mock).mockResolvedValue([mockPaymentMethods[0]]);
    (paymentMethodService.togglePaymentMethodActive as jest.Mock).mockResolvedValue(undefined);
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('PIX')).toBeInTheDocument();
    });
    
    // Find the switch and toggle it
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    
    expect(paymentMethodService.togglePaymentMethodActive).toHaveBeenCalledWith('1', false);
  });

  test('should call setDefaultPaymentMethod when set default button is clicked', async () => {
    (paymentMethodService.listAllPaymentMethods as jest.Mock).mockResolvedValue([mockPaymentMethods[1]]); // Not default
    (paymentMethodService.setDefaultPaymentMethod as jest.Mock).mockResolvedValue(undefined);
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Cartão de Crédito')).toBeInTheDocument();
    });
    
    // Find and click the set default button (star icon)
    const setDefaultButtons = screen.getAllByTitle('Definir como padrão');
    fireEvent.click(setDefaultButtons[0]);
    
    expect(paymentMethodService.setDefaultPaymentMethod).toHaveBeenCalledWith('2');
  });

  test('should not show set default button for already default payment method', async () => {
    (paymentMethodService.listAllPaymentMethods as jest.Mock).mockResolvedValue([mockPaymentMethods[0]]); // Already default
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('PIX')).toBeInTheDocument();
    });
    
    // Should not find set default button for already default method
    const setDefaultButtons = screen.queryAllByTitle('Definir como padrão');
    expect(setDefaultButtons).toHaveLength(0);
  });

  test('should display drag and drop hint text', async () => {
    (paymentMethodService.listAllPaymentMethods as jest.Mock).mockResolvedValue(mockPaymentMethods);
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText(/Arraste os itens pelo ícone/)).toBeInTheDocument();
      expect(screen.getByText(/A ordem afeta como os métodos são exibidos para os clientes/)).toBeInTheDocument();
    });
  });
});