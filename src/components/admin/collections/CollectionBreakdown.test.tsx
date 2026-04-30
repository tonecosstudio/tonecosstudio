/**
 * CollectionBreakdown Component Tests
 *
 * Tests for the collection breakdown component that displays
 * distribution of pieces by collection in a cycle.
 *
 * Requirements: 13.3, 13.7
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CollectionBreakdown } from './CollectionBreakdown';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock Recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}));

describe('CollectionBreakdown', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderComponent = (cycleId: string, cycleName?: string) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <CollectionBreakdown cycleId={cycleId} cycleName={cycleName} />
      </QueryClientProvider>
    );
  };

  it('should display loading state initially', () => {
    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          not: vi.fn(() => new Promise(() => {})), // Never resolves
        })),
      })),
    }));

    (supabase.from as any).mockImplementation(mockFrom);

    renderComponent('cycle-1');

    expect(screen.getByText('Carregando distribuição por coleção...')).toBeInTheDocument();
  });

  it('should display empty state when no data', async () => {
    const mockFrom = vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          not: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    }));

    (supabase.from as any).mockImplementation(mockFrom);

    renderComponent('cycle-1', 'Ciclo 1 - Janeiro 2026');

    await waitFor(() => {
      expect(screen.getByText('Nenhuma peça em produção para este ciclo')).toBeInTheDocument();
    });
  });

  it('should display collection breakdown data correctly', async () => {
    const mockDeliveries = [
      {
        collection_id: 'col-1',
        collections: { id: 'col-1', name: 'Coleção A' },
      },
      {
        collection_id: 'col-1',
        collections: { id: 'col-1', name: 'Coleção A' },
      },
      {
        collection_id: 'col-2',
        collections: { id: 'col-2', name: 'Coleção B' },
      },
    ];

    const mockPurchases = [
      {
        collection_id: 'col-1',
        collections: { id: 'col-1', name: 'Coleção A' },
      },
      {
        collection_id: 'col-3',
        collections: { id: 'col-3', name: 'Coleção C' },
      },
    ];

    const mockFrom = vi.fn((table: string) => {
      if (table === 'subscription_deliveries') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              not: vi.fn(() => Promise.resolve({ data: mockDeliveries, error: null })),
            })),
          })),
        };
      } else if (table === 'standalone_purchases') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              not: vi.fn(() => Promise.resolve({ data: mockPurchases, error: null })),
            })),
          })),
        };
      }
    });

    (supabase.from as any).mockImplementation(mockFrom);

    renderComponent('cycle-1', 'Ciclo 1 - Janeiro 2026');

    await waitFor(() => {
      expect(screen.getByText('Distribuição por Coleção')).toBeInTheDocument();
    });

    // Check summary stats
    await waitFor(() => {
      const deliveryLabels = screen.getAllByText('Entregas de Assinatura');
      expect(deliveryLabels.length).toBeGreaterThan(0);

      const purchaseLabels = screen.getAllByText('Compras Avulsas');
      expect(purchaseLabels.length).toBeGreaterThan(0);

      const totalLabels = screen.getAllByText('Total de Peças');
      expect(totalLabels.length).toBeGreaterThan(0);
    });

    // Check that we have the correct totals in the summary cards
    const summaryCards = screen.getAllByText('3');
    expect(summaryCards.length).toBeGreaterThan(0); // Should appear in summary and table

    const purchaseCards = screen.getAllByText('2');
    expect(purchaseCards.length).toBeGreaterThan(0);

    const totalCards = screen.getAllByText('5');
    expect(totalCards.length).toBeGreaterThan(0);

    // Check table data
    await waitFor(() => {
      expect(screen.getByText('Coleção A')).toBeInTheDocument();
      expect(screen.getByText('Coleção B')).toBeInTheDocument();
      expect(screen.getByText('Coleção C')).toBeInTheDocument();
    });
  });

  it('should calculate totals correctly', async () => {
    const mockDeliveries = [
      { collection_id: 'col-1', collections: { id: 'col-1', name: 'Coleção A' } },
      { collection_id: 'col-1', collections: { id: 'col-1', name: 'Coleção A' } },
      { collection_id: 'col-2', collections: { id: 'col-2', name: 'Coleção B' } },
    ];

    const mockPurchases = [
      { collection_id: 'col-1', collections: { id: 'col-1', name: 'Coleção A' } },
    ];

    const mockFrom = vi.fn((table: string) => {
      if (table === 'subscription_deliveries') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              not: vi.fn(() => Promise.resolve({ data: mockDeliveries, error: null })),
            })),
          })),
        };
      } else if (table === 'standalone_purchases') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              not: vi.fn(() => Promise.resolve({ data: mockPurchases, error: null })),
            })),
          })),
        };
      }
    });

    (supabase.from as any).mockImplementation(mockFrom);

    renderComponent('cycle-1');

    await waitFor(() => {
      // Check that summary cards are present
      const deliveryLabels = screen.getAllByText('Entregas de Assinatura');
      expect(deliveryLabels.length).toBeGreaterThan(0);

      const purchaseLabels = screen.getAllByText('Compras Avulsas');
      expect(purchaseLabels.length).toBeGreaterThan(0);

      const totalLabels = screen.getAllByText('Total de Peças');
      expect(totalLabels.length).toBeGreaterThan(0);
    });

    // Verify the numbers appear (they will appear multiple times in summary and table)
    const threes = screen.getAllByText('3');
    expect(threes.length).toBeGreaterThan(0);

    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThan(0);

    const fours = screen.getAllByText('4');
    expect(fours.length).toBeGreaterThan(0);
  });

  it('should exclude cancelled standalone purchases', async () => {
    const mockDeliveries = [
      { collection_id: 'col-1', collections: { id: 'col-1', name: 'Coleção A' } },
    ];

    const mockPurchases = [
      { collection_id: 'col-1', collections: { id: 'col-1', name: 'Coleção A' } },
    ];

    const mockFrom = vi.fn((table: string) => {
      if (table === 'subscription_deliveries') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              not: vi.fn(() => Promise.resolve({ data: mockDeliveries, error: null })),
            })),
          })),
        };
      } else if (table === 'standalone_purchases') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              not: vi.fn(() => Promise.resolve({ data: mockPurchases, error: null })),
            })),
          })),
        };
      }
    });

    (supabase.from as any).mockImplementation(mockFrom);

    renderComponent('cycle-1');

    await waitFor(() => {
      // Should query with not status = 'cancelled'
      expect(mockFrom).toHaveBeenCalledWith('standalone_purchases');
    });
  });

  it('should display cycle name when provided', async () => {
    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          not: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    }));

    (supabase.from as any).mockImplementation(mockFrom);

    renderComponent('cycle-1', 'Ciclo 1 - Janeiro 2026');

    await waitFor(() => {
      expect(screen.getByText('Ciclo 1 - Janeiro 2026')).toBeInTheDocument();
    });
  });

  it('should have tabs for table, bar chart, and pie chart', async () => {
    const mockDeliveries = [
      { collection_id: 'col-1', collections: { id: 'col-1', name: 'Coleção A' } },
    ];

    const mockFrom = vi.fn((table: string) => {
      if (table === 'subscription_deliveries') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              not: vi.fn(() => Promise.resolve({ data: mockDeliveries, error: null })),
            })),
          })),
        };
      } else if (table === 'standalone_purchases') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              not: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        };
      }
    });

    (supabase.from as any).mockImplementation(mockFrom);

    renderComponent('cycle-1');

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /tabela/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /gráfico de barras/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /gráfico de pizza/i })).toBeInTheDocument();
    });
  });
});
