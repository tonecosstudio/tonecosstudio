/**
 * Testes para OrderDetailPanel - Foco em funcionalidade de rastreamento
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OrderDetailPanel } from './OrderDetailPanel';
import type { UnifiedOrder } from '@/types/admin/orders';

// Mock do window.open
const mockWindowOpen = vi.fn();
window.open = mockWindowOpen;

// Helper para renderizar com providers
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('OrderDetailPanel - Tracking Link', () => {
  const mockOrderWithTracking: UnifiedOrder = {
    id: 'test-order-123',
    type: 'subscription_delivery',
    status: 'shipped',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
    customer: {
      id: 'customer-1',
      name: 'João Silva',
      email: 'joao@example.com'
    },
    collection: {
      id: 'collection-1',
      name: 'Coleção Teste',
      slug: 'colecao-teste'
    },
    amount: 150.00,
    trackingCode: 'BR123456789BR',
    expectedDeliveryDate: '2024-01-20T00:00:00Z',
    actualDeliveryDate: null,
    subscriptionDelivery: {
      subscriptionId: 'sub-1',
      deliveryNumber: 1,
      cycleId: null,
      characterId: null,
      revealDate: null
    }
  };

  const mockOrderWithoutTracking: UnifiedOrder = {
    ...mockOrderWithTracking,
    trackingCode: null
  };

  it('should display tracking button when tracking code is present', () => {
    renderWithProviders(
      <OrderDetailPanel
        order={mockOrderWithTracking}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Rastrear Pedido')).toBeInTheDocument();
    expect(screen.getByText('BR123456789BR')).toBeInTheDocument();
  });

  it('should not display tracking button when tracking code is absent', () => {
    renderWithProviders(
      <OrderDetailPanel
        order={mockOrderWithoutTracking}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.queryByText('Rastrear Pedido')).not.toBeInTheDocument();
  });

  it('should open Correios tracking URL in new tab when button is clicked', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(
      <OrderDetailPanel
        order={mockOrderWithTracking}
        isOpen={true}
        onClose={() => {}}
      />
    );

    const trackingButton = screen.getByText('Rastrear Pedido');
    await user.click(trackingButton);

    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://rastreamento.correios.com.br/app/index.php?codigo=BR123456789BR',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('should generate correct tracking URL with different tracking codes', async () => {
    const user = userEvent.setup();
    const orderWithDifferentCode = {
      ...mockOrderWithTracking,
      trackingCode: 'AA987654321BR'
    };
    
    renderWithProviders(
      <OrderDetailPanel
        order={orderWithDifferentCode}
        isOpen={true}
        onClose={() => {}}
      />
    );

    const trackingButton = screen.getByText('Rastrear Pedido');
    await user.click(trackingButton);

    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://rastreamento.correios.com.br/app/index.php?codigo=AA987654321BR',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('should not render panel when isOpen is false', () => {
    renderWithProviders(
      <OrderDetailPanel
        order={mockOrderWithTracking}
        isOpen={false}
        onClose={() => {}}
      />
    );

    expect(screen.queryByText('Rastrear Pedido')).not.toBeInTheDocument();
  });
});
