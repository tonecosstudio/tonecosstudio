/**
 * Integration test for batch label generation in DeliveryManagement
 * Tests the complete flow from UI interaction to service call
 * Requirements: 18.9
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DeliveryManagement from '../DeliveryManagement';
import { ShippingService } from '@/services/shipping-service';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/SEOHead', () => ({
  default: () => null,
}));

vi.mock('@/services/shipping-service');

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('Batch Label Generation Integration', () => {
  let queryClient: QueryClient;

  const mockDeliveries = [
    {
      id: 'delivery-1',
      subscription_id: 'sub-1',
      cycle_id: 'cycle-1',
      delivery_number: 1,
      status: 'confirmed',
      expected_delivery_date: '2024-02-15',
      tracking_code: null,
      created_at: '2024-01-01T00:00:00Z',
      subscriptions: {
        user_id: 'user-1',
        collection_id: 'col-1',
        collections: {
          name: 'Collection A',
        },
      },
      cycles: {
        id: 'cycle-1',
        cycle_number: 1,
        month: 2,
        year: 2024,
      },
    },
    {
      id: 'delivery-2',
      subscription_id: 'sub-2',
      cycle_id: 'cycle-1',
      delivery_number: 1,
      status: 'confirmed',
      expected_delivery_date: '2024-02-15',
      tracking_code: null,
      created_at: '2024-01-01T00:00:00Z',
      subscriptions: {
        user_id: 'user-2',
        collection_id: 'col-2',
        collections: {
          name: 'Collection B',
        },
      },
      cycles: {
        id: 'cycle-1',
        cycle_number: 1,
        month: 2,
        year: 2024,
      },
    },
  ];

  const mockProfiles = [
    {
      id: 'user-1',
      full_name: 'John Doe',
      email: 'john@example.com',
    },
    {
      id: 'user-2',
      full_name: 'Jane Smith',
      email: 'jane@example.com',
    },
  ];

  const mockCycles = [
    {
      id: 'cycle-1',
      cycle_number: 1,
      month: 2,
      year: 2024,
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();

    // Setup Supabase mocks
    const mockFrom = vi.fn((table: string) => {
      if (table === 'subscription_deliveries') {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              data: mockDeliveries,
              error: null,
            })),
          })),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              data: mockProfiles,
              error: null,
            })),
          })),
        };
      }
      if (table === 'cycles') {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(() => ({
                order: vi.fn(() => ({
                  data: mockCycles,
                  error: null,
                })),
              })),
            })),
          })),
        };
      }
      return {
        select: vi.fn(() => ({
          data: [],
          error: null,
        })),
      };
    });

    vi.mocked(supabase).from = mockFrom;
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <DeliveryManagement />
      </QueryClientProvider>
    );
  };

  it('should successfully generate batch labels for selected deliveries', async () => {
    const user = userEvent.setup();
    const mockGenerateBatchLabels = vi.fn().mockResolvedValue({
      successful: [
        {
          deliveryId: 'delivery-1',
          trackingCode: 'TRACK001',
          labelUrl: 'https://example.com/label1.pdf',
        },
        {
          deliveryId: 'delivery-2',
          trackingCode: 'TRACK002',
          labelUrl: 'https://example.com/label2.pdf',
        },
      ],
      failed: [],
    });

    vi.mocked(ShippingService).mockImplementation(() => ({
      generateBatchLabels: mockGenerateBatchLabels,
    }) as any);

    // Mock window.open
    const mockWindowOpen = vi.fn();
    global.window.open = mockWindowOpen;

    renderComponent();

    // Wait for deliveries to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Select first delivery checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]); // First delivery checkbox (0 is select all)

    // Select second delivery checkbox
    await user.click(checkboxes[2]);

    // Wait for button to appear
    await waitFor(() => {
      expect(screen.getByText(/Imprimir Etiquetas \(2\)/)).toBeInTheDocument();
    });

    // Click the Print Batch Labels button
    const printButton = screen.getByText(/Imprimir Etiquetas \(2\)/);
    await user.click(printButton);

    // Verify generateBatchLabels was called with correct IDs
    await waitFor(() => {
      expect(mockGenerateBatchLabels).toHaveBeenCalledWith(['delivery-1', 'delivery-2']);
    });

    // Verify success toast was shown
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Etiquetas geradas com sucesso',
      description: '2 etiqueta(s) gerada(s) com sucesso.',
    });

    // Verify label URLs were opened
    expect(mockWindowOpen).toHaveBeenCalledTimes(2);
    expect(mockWindowOpen).toHaveBeenCalledWith('https://example.com/label1.pdf', '_blank');
    expect(mockWindowOpen).toHaveBeenCalledWith('https://example.com/label2.pdf', '_blank');
  });

  it('should handle partial success with appropriate messaging', async () => {
    const user = userEvent.setup();
    const mockGenerateBatchLabels = vi.fn().mockResolvedValue({
      successful: [
        {
          deliveryId: 'delivery-1',
          trackingCode: 'TRACK001',
          labelUrl: 'https://example.com/label1.pdf',
        },
      ],
      failed: [
        {
          deliveryId: 'delivery-2',
          error: 'Address not found',
        },
      ],
    });

    vi.mocked(ShippingService).mockImplementation(() => ({
      generateBatchLabels: mockGenerateBatchLabels,
    }) as any);

    const mockWindowOpen = vi.fn();
    global.window.open = mockWindowOpen;

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Select deliveries
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    await user.click(checkboxes[2]);

    // Click print button
    const printButton = await screen.findByText(/Imprimir Etiquetas \(2\)/);
    await user.click(printButton);

    // Verify partial success toast
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Etiquetas geradas parcialmente',
        description: '1 etiqueta(s) gerada(s) com sucesso. 1 falhou(ram).',
        variant: 'default',
      });
    });

    // Verify only successful label was opened
    expect(mockWindowOpen).toHaveBeenCalledTimes(1);
    expect(mockWindowOpen).toHaveBeenCalledWith('https://example.com/label1.pdf', '_blank');
  });

  it('should show error when no deliveries are selected', async () => {
    const user = userEvent.setup();

    vi.mocked(ShippingService).mockImplementation(() => ({
      generateBatchLabels: vi.fn(),
    }) as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Don't select any deliveries, button should not be visible
    expect(screen.queryByText(/Imprimir Etiquetas/)).not.toBeInTheDocument();
  });

  it('should disable button and show loading state during generation', async () => {
    const user = userEvent.setup();
    let resolveGeneration: (value: any) => void;
    const generationPromise = new Promise((resolve) => {
      resolveGeneration = resolve;
    });

    const mockGenerateBatchLabels = vi.fn().mockReturnValue(generationPromise);

    vi.mocked(ShippingService).mockImplementation(() => ({
      generateBatchLabels: mockGenerateBatchLabels,
    }) as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Select a delivery
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);

    // Click print button
    const printButton = await screen.findByText(/Imprimir Etiquetas \(1\)/);
    await user.click(printButton);

    // Verify button shows loading state
    await waitFor(() => {
      expect(screen.getByText('Gerando...')).toBeInTheDocument();
    });

    // Verify button is disabled
    const loadingButton = screen.getByText('Gerando...').closest('button');
    expect(loadingButton).toBeDisabled();

    // Resolve the generation
    resolveGeneration!({
      successful: [
        {
          deliveryId: 'delivery-1',
          trackingCode: 'TRACK001',
          labelUrl: 'https://example.com/label1.pdf',
        },
      ],
      failed: [],
    });

    // Verify button returns to normal state
    await waitFor(() => {
      expect(screen.queryByText('Gerando...')).not.toBeInTheDocument();
    });
  });
});
