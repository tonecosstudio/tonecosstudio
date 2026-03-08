/**
 * Tests for bulk delivery status update functionality
 * 
 * Requirements: 15.9
 * Task: 21.7
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BulkUpdateModal } from '@/components/admin/BulkUpdateModal';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({
        data: {
          session: {
            access_token: 'mock-token',
          },
        },
      })),
    },
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('Bulk Update Delivery Status', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('should display selected delivery count', () => {
    const selectedIds = ['id1', 'id2', 'id3'];
    
    renderWithProviders(
      <BulkUpdateModal
        open={true}
        onOpenChange={() => {}}
        selectedDeliveryIds={selectedIds}
      />
    );

    expect(screen.getByText(/3 entrega\(s\) selecionada\(s\)/i)).toBeInTheDocument();
  });

  it('should render status selection dropdown', () => {
    const selectedIds = ['id1', 'id2'];
    
    renderWithProviders(
      <BulkUpdateModal
        open={true}
        onOpenChange={() => {}}
        selectedDeliveryIds={selectedIds}
      />
    );

    expect(screen.getByText('Novo Status')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should render notes textarea', () => {
    const selectedIds = ['id1'];
    
    renderWithProviders(
      <BulkUpdateModal
        open={true}
        onOpenChange={() => {}}
        selectedDeliveryIds={selectedIds}
      />
    );

    expect(screen.getByPlaceholderText(/Adicione observações/i)).toBeInTheDocument();
  });

  it('should have update button disabled when no status selected', () => {
    const selectedIds = ['id1'];
    
    renderWithProviders(
      <BulkUpdateModal
        open={true}
        onOpenChange={() => {}}
        selectedDeliveryIds={selectedIds}
      />
    );

    const updateButton = screen.getByRole('button', { name: /Atualizar/i });
    expect(updateButton).toBeDisabled();
  });

  it('should render cancel button', () => {
    const selectedIds = ['id1'];
    
    renderWithProviders(
      <BulkUpdateModal
        open={true}
        onOpenChange={() => {}}
        selectedDeliveryIds={selectedIds}
      />
    );

    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
  });
});

