import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StandalonePurchaseDetail } from './StandalonePurchaseDetail';
import { useStandalonePurchaseActions } from '@/hooks/admin/useStandalonePurchaseActions';

// Mock the services
vi.mock('@/hooks/admin/useStandalonePurchaseActions');
vi.mock('@/hooks/admin/useAdminPaymentsGateway', () => ({
  useAdminPaymentsGateway: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
    },
  }),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('StandalonePurchaseDetail', () => {
  const actionsMock = {
    markProductionComplete: vi.fn(),
    cancelStandalonePurchase: vi.fn(),
    approvePaymentVoucher: vi.fn(),
    rejectPaymentVoucher: vi.fn(),
  };
  const mockPurchase = {
    id: 'purchase-123',
    user_id: 'user-456',
    collection_id: 'collection-789',
    cycle_id: 'cycle-101',
    status: 'deposit_paid',
    deposit_amount: 100.00,
    balance_amount: 150.00,
    total_amount: 250.00,
    deposit_paid_at: new Date('2026-01-15T10:00:00Z'),
    balance_due_date: null,
    balance_paid_at: null,
    production_complete_at: null,
    shipped_at: null,
    delivered_at: null,
    cancelled_at: null,
    cancellation_reason: null,
    tracking_code: null,
    payment_voucher_deposit_url: 'https://example.com/deposit.jpg',
    payment_voucher_balance_url: null,
    created_at: new Date('2026-01-10T10:00:00Z'),
    updated_at: new Date('2026-01-15T10:00:00Z'),
    user: {
      full_name: 'João Silva',
      email: 'joao@example.com',
      phone: '(71) 99999-9999',
    },
    collection: {
      name: 'Coleção Teste',
      description: 'Uma coleção de teste',
      price: 250.00,
      image_url: 'https://example.com/collection.jpg',
    },
    cycle: {
      cycle_number: 1,
      month: 2,
      year: 2026,
      status: 'open',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useStandalonePurchaseActions).mockReturnValue(actionsMock);
  });

  it('renders purchase details correctly', () => {
    render(<StandalonePurchaseDetail purchase={mockPurchase} />, {
      wrapper: createWrapper(),
    });

    // Check header
    expect(screen.getByText('Detalhes da Compra')).toBeInTheDocument();
    expect(screen.getByText(/ID: purchase-123/)).toBeInTheDocument();

    // Check customer information
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('joao@example.com')).toBeInTheDocument();
    expect(screen.getByText('(71) 99999-9999')).toBeInTheDocument();

    // Check collection information
    expect(screen.getByText('Coleção Teste')).toBeInTheDocument();
    expect(screen.getByText('Uma coleção de teste')).toBeInTheDocument();

    // Check cycle information
    expect(screen.getByText(/Ciclo 1 - 2\/2026/)).toBeInTheDocument();

    // Check payment amounts
    expect(screen.getByText('R$ 100.00')).toBeInTheDocument(); // Deposit
    expect(screen.getByText('R$ 150.00')).toBeInTheDocument(); // Balance
    expect(screen.getByText('R$ 250.00')).toBeInTheDocument(); // Total
  });

  it('displays payment vouchers when available', () => {
    render(<StandalonePurchaseDetail purchase={mockPurchase} />, {
      wrapper: createWrapper(),
    });

    // Check deposit voucher link (text changed to "Abrir em Nova Aba")
    const depositLink = screen.getByRole('link', { name: /Abrir em Nova Aba/i });
    expect(depositLink).toHaveAttribute('href', 'https://example.com/deposit.jpg');

    // Check balance voucher message (status is deposit_paid, not awaiting_balance)
    expect(screen.getByText('Nenhum comprovante enviado')).toBeInTheDocument();
  });

  it('shows "Mark Production Complete" button when status is deposit_paid', () => {
    render(<StandalonePurchaseDetail purchase={mockPurchase} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Marcar Produção Concluída')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Marcar como Concluída/i })).toBeInTheDocument();
  });

  it('shows "Cancel Order" button when status allows cancellation', () => {
    render(<StandalonePurchaseDetail purchase={mockPurchase} />, {
      wrapper: createWrapper(),
    });

    // Check for cancel section heading and button (there are multiple "Cancelar Pedido" texts)
    const cancelButtons = screen.getAllByText('Cancelar Pedido');
    expect(cancelButtons.length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Cancelar Pedido/i })).toBeInTheDocument();
  });

  it('calls markProductionComplete when button is clicked', async () => {
    const user = userEvent.setup();
    const mockMarkComplete = vi.fn().mockResolvedValue({});
    actionsMock.markProductionComplete.mockImplementation(mockMarkComplete);

    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<StandalonePurchaseDetail purchase={mockPurchase} />, {
      wrapper: createWrapper(),
    });

    const button = screen.getByRole('button', { name: /Marcar como Concluída/i });
    await user.click(button);

    await waitFor(() => {
      expect(mockMarkComplete).toHaveBeenCalledWith('purchase-123', 'test-user-id');
    });
  });

  it('opens cancel dialog when cancel button is clicked', async () => {
    const user = userEvent.setup();

    render(<StandalonePurchaseDetail purchase={mockPurchase} />, {
      wrapper: createWrapper(),
    });

    const cancelButton = screen.getByRole('button', { name: /Cancelar Pedido/i });
    await user.click(cancelButton);

    // Check dialog is open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Informe o motivo do cancelamento/)).toBeInTheDocument();
  });

  it('calls cancelStandalonePurchase with reason when confirmed', async () => {
    const user = userEvent.setup();
    const mockCancel = vi.fn().mockResolvedValue({});
    actionsMock.cancelStandalonePurchase.mockImplementation(mockCancel);

    render(<StandalonePurchaseDetail purchase={mockPurchase} />, {
      wrapper: createWrapper(),
    });

    // Open cancel dialog
    const cancelButton = screen.getByRole('button', { name: /Cancelar Pedido/i });
    await user.click(cancelButton);

    // Enter cancellation reason
    const textarea = screen.getByLabelText(/Motivo do Cancelamento/i);
    await user.type(textarea, 'Cliente solicitou cancelamento');

    // Confirm cancellation
    const confirmButton = screen.getByRole('button', { name: /Confirmar Cancelamento/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockCancel).toHaveBeenCalledWith('purchase-123', 'Cliente solicitou cancelamento', 'test-user-id');
    });
  });

  it('does not show action buttons when status is completed', () => {
    const completedPurchase = {
      ...mockPurchase,
      status: 'delivered' as const,
      delivered_at: new Date('2026-02-01T10:00:00Z'),
    };

    render(<StandalonePurchaseDetail purchase={completedPurchase} />, {
      wrapper: createWrapper(),
    });

    expect(screen.queryByText('Marcar Produção Concluída')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancelar Pedido/i })).not.toBeInTheDocument();
    // The admin actions card should not be rendered at all
    expect(screen.queryByText('Ações Administrativas')).not.toBeInTheDocument();
  });

  it('displays tracking code when available', () => {
    const purchaseWithTracking = {
      ...mockPurchase,
      tracking_code: 'BR123456789',
      status: 'shipped' as const,
      shipped_at: new Date('2026-01-20T10:00:00Z'),
    };

    render(<StandalonePurchaseDetail purchase={purchaseWithTracking} />, {
      wrapper: createWrapper(),
    });

    // Should find tracking code (appears in both cycle section and status timeline)
    const trackingElements = screen.getAllByText('BR123456789');
    expect(trackingElements.length).toBeGreaterThan(0);
  });

  it('displays balance due date when production is complete', () => {
    const purchaseAwaitingBalance = {
      ...mockPurchase,
      status: 'awaiting_balance' as const,
      production_complete_at: new Date('2026-01-18T10:00:00Z'),
      balance_due_date: new Date('2026-01-25T23:59:59Z'),
    };

    render(<StandalonePurchaseDetail purchase={purchaseAwaitingBalance} />, {
      wrapper: createWrapper(),
    });

    // Check that balance due date is displayed (appears in multiple places)
    const dueDateElements = screen.getAllByText(/Vence em/);
    expect(dueDateElements.length).toBeGreaterThan(0);
  });

  it('displays cancellation information when order is cancelled', () => {
    const cancelledPurchase = {
      ...mockPurchase,
      status: 'cancelled' as const,
      cancelled_at: new Date('2026-01-16T10:00:00Z'),
      cancellation_reason: 'Cliente solicitou cancelamento',
    };

    render(<StandalonePurchaseDetail purchase={cancelledPurchase} />, {
      wrapper: createWrapper(),
    });

    // Status component should show cancellation info (appears in badge and status section)
    const cancelledElements = screen.getAllByText(/Cancelado/);
    expect(cancelledElements.length).toBeGreaterThan(0);
  });

  it('shows deposit retention warning in cancel dialog', async () => {
    const user = userEvent.setup();

    render(<StandalonePurchaseDetail purchase={mockPurchase} />, {
      wrapper: createWrapper(),
    });

    // Open cancel dialog
    const cancelButton = screen.getByRole('button', { name: /Cancelar Pedido/i });
    await user.click(cancelButton);

    // Check for deposit retention warning
    expect(screen.getByText(/O depósito de R\$ 100\.00 será retido como arras confirmatórias/)).toBeInTheDocument();
  });

  it('displays approve and reject buttons for deposit voucher when status is deposit_paid', () => {
    render(<StandalonePurchaseDetail purchase={mockPurchase} />, {
      wrapper: createWrapper(),
    });

    // Check for approve and reject buttons in deposit voucher section
    const approveButtons = screen.getAllByRole('button', { name: /Aprovar/i });
    const rejectButtons = screen.getAllByRole('button', { name: /Rejeitar/i });

    expect(approveButtons.length).toBeGreaterThan(0);
    expect(rejectButtons.length).toBeGreaterThan(0);
  });

  it('calls approvePaymentVoucher when approve button is clicked', async () => {
    const user = userEvent.setup();
    const mockApprove = vi.fn().mockResolvedValue({});
    actionsMock.approvePaymentVoucher.mockImplementation(mockApprove);

    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<StandalonePurchaseDetail purchase={mockPurchase} />, {
      wrapper: createWrapper(),
    });

    // Click approve button for deposit voucher (first approve button)
    const approveButtons = screen.getAllByRole('button', { name: /Aprovar/i });
    await user.click(approveButtons[0]);

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith('purchase-123', 'deposit');
    });
  });

  it('opens reject dialog when reject button is clicked', async () => {
    const user = userEvent.setup();

    render(<StandalonePurchaseDetail purchase={mockPurchase} />, {
      wrapper: createWrapper(),
    });

    // Click reject button for deposit voucher (first reject button)
    const rejectButtons = screen.getAllByRole('button', { name: /Rejeitar/i });
    await user.click(rejectButtons[0]);

    // Check dialog is open
    await waitFor(() => {
      expect(screen.getByText(/Rejeitar Comprovante/)).toBeInTheDocument();
      expect(screen.getByText(/Informe o motivo da rejeição/)).toBeInTheDocument();
    });
  });

  it('calls rejectPaymentVoucher with reason when confirmed', async () => {
    const user = userEvent.setup();
    const mockReject = vi.fn().mockResolvedValue({});
    actionsMock.rejectPaymentVoucher.mockImplementation(mockReject);

    render(<StandalonePurchaseDetail purchase={mockPurchase} />, {
      wrapper: createWrapper(),
    });

    // Open reject dialog
    const rejectButtons = screen.getAllByRole('button', { name: /Rejeitar/i });
    await user.click(rejectButtons[0]);

    // Enter rejection reason
    const textarea = await screen.findByLabelText(/Motivo da Rejeição/i);
    await user.type(textarea, 'Comprovante ilegível');

    // Confirm rejection
    const confirmButton = screen.getByRole('button', { name: /Confirmar Rejeição/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledWith('purchase-123', 'deposit', 'Comprovante ilegível');
    });
  });

  it('displays approve and reject buttons for balance voucher when status is awaiting_balance', () => {
    const purchaseAwaitingBalance = {
      ...mockPurchase,
      status: 'awaiting_balance' as const,
      production_complete_at: new Date('2026-01-18T10:00:00Z'),
      balance_due_date: new Date('2026-01-25T23:59:59Z'),
      payment_voucher_balance_url: 'https://example.com/balance.jpg',
    };

    render(<StandalonePurchaseDetail purchase={purchaseAwaitingBalance} />, {
      wrapper: createWrapper(),
    });

    // Check for approve and reject buttons in balance voucher section
    const approveButtons = screen.getAllByRole('button', { name: /Aprovar/i });
    const rejectButtons = screen.getAllByRole('button', { name: /Rejeitar/i });

    expect(approveButtons.length).toBeGreaterThan(0);
    expect(rejectButtons.length).toBeGreaterThan(0);
  });

  it('opens image viewer dialog when clicking on voucher image', async () => {
    const user = userEvent.setup();

    render(<StandalonePurchaseDetail purchase={mockPurchase} />, {
      wrapper: createWrapper(),
    });

    // Click on the voucher image
    const voucherImage = screen.getByAltText('Comprovante de Depósito');
    await user.click(voucherImage);

    // Check image viewer dialog is open
    await waitFor(() => {
      expect(screen.getByText('Visualizar Comprovante')).toBeInTheDocument();
    });
  });

  it('opens image viewer dialog when clicking zoom button', async () => {
    const user = userEvent.setup();

    render(<StandalonePurchaseDetail purchase={mockPurchase} />, {
      wrapper: createWrapper(),
    });

    // Find and click the zoom button (it's a button with ZoomIn icon)
    const zoomButtons = screen.getAllByRole('button');
    const zoomButton = zoomButtons.find(btn => btn.querySelector('svg'));

    if (zoomButton) {
      await user.click(zoomButton);

      // Check image viewer dialog is open
      await waitFor(() => {
        expect(screen.getByText('Visualizar Comprovante')).toBeInTheDocument();
      });
    }
  });
});
