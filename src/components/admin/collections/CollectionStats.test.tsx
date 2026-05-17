/**
 * CollectionStats Component Tests
 *
 * Tests for the CollectionStats component that displays collection statistics
 * including total pieces sold, current month selections, and revenue generated.
 *
 * Requirements: 14.9
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CollectionStats } from './CollectionStats';
import { supabase } from '@/integrations/supabase/client';

type FromMockCall = [string];
type MockFrom = {
  mock: { calls: FromMockCall[] };
  mockImplementation: (fn: (table: string) => unknown) => void;
};

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('CollectionStats', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const renderComponent = (props: { collectionId: string; collectionName?: string }) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <CollectionStats {...props} />
      </QueryClientProvider>
    );
  };

  const mockSupabaseQuery = (table: string, data: unknown, error: unknown = null) => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data, error }),
      then: vi.fn((resolve) => resolve({ data, error })),
    };

    (supabase as unknown as { from: MockFrom }).from.mockImplementation((tableName: string) => {
      if (tableName === table) {
        return mockChain;
      }
      return mockChain;
    });

    return mockChain;
  };

  it('should render loading state initially', () => {
    mockSupabaseQuery('subscription_deliveries', []);
    mockSupabaseQuery('standalone_purchases', []);
    mockSupabaseQuery('collections', { price_full: 100 });

    renderComponent({ collectionId: 'test-collection-id' });

    expect(screen.getByText('Estatísticas da Coleção')).toBeInTheDocument();
  });

  it('should display collection name when provided', async () => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Mock all deliveries
    const allDeliveriesMock = mockSupabaseQuery('subscription_deliveries', [
      { id: '1', status: 'delivered' },
      { id: '2', status: 'shipped' },
    ]);

    // Mock current month deliveries
    const currentMonthDeliveriesMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { id: '1', cycle_id: 'cycle-1', cycles: { month: currentMonth, year: currentYear } },
        ],
        error: null,
      }),
    };

    // Mock standalone purchases
    const allPurchasesMock = mockSupabaseQuery('standalone_purchases', [
      { id: '1', status: 'delivered', total_amount: 150 },
    ]);

    const currentMonthPurchasesMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockResolvedValue({
        data: [
          { id: '1', cycle_id: 'cycle-1', cycles: { month: currentMonth, year: currentYear } },
        ],
        error: null,
      }),
    };

    // Mock collection price
    const collectionMock = mockSupabaseQuery('collections', { price_full: 100 });

    (supabase as unknown as { from: MockFrom }).from.mockImplementation((table: string) => {
      if (table === 'subscription_deliveries') {
        // Return different mocks based on call order
        const callCount = (supabase as unknown as { from: MockFrom }).from.mock.calls.filter((c) => c[0] === 'subscription_deliveries').length;
        return callCount === 1 ? allDeliveriesMock : currentMonthDeliveriesMock;
      }
      if (table === 'standalone_purchases') {
        const callCount = (supabase as unknown as { from: MockFrom }).from.mock.calls.filter((c) => c[0] === 'standalone_purchases').length;
        return callCount === 1 ? allPurchasesMock : currentMonthPurchasesMock;
      }
      if (table === 'collections') {
        return collectionMock;
      }
      return allDeliveriesMock;
    });

    renderComponent({
      collectionId: 'test-collection-id',
      collectionName: 'Test Collection'
    });

    await waitFor(() => {
      expect(screen.getByText('Test Collection')).toBeInTheDocument();
    });
  });

  it('should display total pieces sold (subscription deliveries + standalone purchases)', async () => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Mock 3 subscription deliveries
    const allDeliveriesMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { id: '1', status: 'delivered' },
          { id: '2', status: 'shipped' },
          { id: '3', status: 'confirmed' },
        ],
        error: null,
      }),
    };

    const currentMonthDeliveriesMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { id: '1', cycle_id: 'cycle-1', cycles: { month: currentMonth, year: currentYear } },
        ],
        error: null,
      }),
    };

    // Mock 2 standalone purchases
    const allPurchasesMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockResolvedValue({
        data: [
          { id: '1', status: 'delivered', total_amount: 150 },
          { id: '2', status: 'shipped', total_amount: 150 },
        ],
        error: null,
      }),
    };

    const currentMonthPurchasesMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    const collectionMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { price_full: 100 },
        error: null,
      }),
    };

    (supabase as unknown as { from: MockFrom }).from.mockImplementation((table: string) => {
      if (table === 'subscription_deliveries') {
        const callCount = (supabase as unknown as { from: MockFrom }).from.mock.calls.filter((c) => c[0] === 'subscription_deliveries').length;
        return callCount === 1 ? allDeliveriesMock : currentMonthDeliveriesMock;
      }
      if (table === 'standalone_purchases') {
        const callCount = (supabase as unknown as { from: MockFrom }).from.mock.calls.filter((c) => c[0] === 'standalone_purchases').length;
        return callCount === 1 ? allPurchasesMock : currentMonthPurchasesMock;
      }
      if (table === 'collections') {
        return collectionMock;
      }
      return allDeliveriesMock;
    });

    renderComponent({ collectionId: 'test-collection-id' });

    await waitFor(() => {
      // Total should be 3 + 2 = 5
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('3 assinaturas + 2 avulsas')).toBeInTheDocument();
    });
  });

  it('should display current month selections count', async () => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const allDeliveriesMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { id: '1', status: 'delivered' },
        ],
        error: null,
      }),
    };

    // Mock 2 current month deliveries
    const currentMonthDeliveriesMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { id: '1', cycle_id: 'cycle-1', cycles: { month: currentMonth, year: currentYear } },
          { id: '2', cycle_id: 'cycle-1', cycles: { month: currentMonth, year: currentYear } },
        ],
        error: null,
      }),
    };

    const allPurchasesMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    // Mock 1 current month purchase
    const currentMonthPurchasesMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockResolvedValue({
        data: [
          { id: '1', cycle_id: 'cycle-1', cycles: { month: currentMonth, year: currentYear } },
        ],
        error: null,
      }),
    };

    const collectionMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { price_full: 100 },
        error: null,
      }),
    };

    (supabase as unknown as { from: MockFrom }).from.mockImplementation((table: string) => {
      if (table === 'subscription_deliveries') {
        const callCount = (supabase as unknown as { from: MockFrom }).from.mock.calls.filter((c) => c[0] === 'subscription_deliveries').length;
        return callCount === 1 ? allDeliveriesMock : currentMonthDeliveriesMock;
      }
      if (table === 'standalone_purchases') {
        const callCount = (supabase as unknown as { from: MockFrom }).from.mock.calls.filter((c) => c[0] === 'standalone_purchases').length;
        return callCount === 1 ? allPurchasesMock : currentMonthPurchasesMock;
      }
      if (table === 'collections') {
        return collectionMock;
      }
      return allDeliveriesMock;
    });

    renderComponent({ collectionId: 'test-collection-id' });

    await waitFor(() => {
      // Current month should be 2 + 1 = 3
      const currentMonthElements = screen.getAllByText('3');
      expect(currentMonthElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Seleções do Mês Atual')).toBeInTheDocument();
    });
  });

  it('should calculate and display revenue correctly', async () => {
    // Mock 2 subscription deliveries at R$100 each = R$200
    const allDeliveriesMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { id: '1', status: 'delivered' },
          { id: '2', status: 'shipped' },
        ],
        error: null,
      }),
    };

    const currentMonthDeliveriesMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    // Mock 1 standalone purchase at R$150 = R$150
    const allPurchasesMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockResolvedValue({
        data: [
          { id: '1', status: 'delivered', total_amount: 150 },
        ],
        error: null,
      }),
    };

    const currentMonthPurchasesMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    const collectionMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { price_full: 100 },
        error: null,
      }),
    };

    (supabase as unknown as { from: MockFrom }).from.mockImplementation((table: string) => {
      if (table === 'subscription_deliveries') {
        const callCount = (supabase as unknown as { from: MockFrom }).from.mock.calls.filter((c) => c[0] === 'subscription_deliveries').length;
        return callCount === 1 ? allDeliveriesMock : currentMonthDeliveriesMock;
      }
      if (table === 'standalone_purchases') {
        const callCount = (supabase as unknown as { from: MockFrom }).from.mock.calls.filter((c) => c[0] === 'standalone_purchases').length;
        return callCount === 1 ? allPurchasesMock : currentMonthPurchasesMock;
      }
      if (table === 'collections') {
        return collectionMock;
      }
      return allDeliveriesMock;
    });

    renderComponent({ collectionId: 'test-collection-id' });

    await waitFor(() => {
      // Total revenue should be R$200 + R$150 = R$350.00
      expect(screen.getByText('R$ 350.00')).toBeInTheDocument();
      expect(screen.getByText('Receita Gerada')).toBeInTheDocument();
    });
  });

  it('should handle zero statistics gracefully', async () => {
    const allDeliveriesMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    const currentMonthDeliveriesMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    const allPurchasesMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    const currentMonthPurchasesMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    const collectionMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { price_full: 100 },
        error: null,
      }),
    };

    (supabase as unknown as { from: MockFrom }).from.mockImplementation((table: string) => {
      if (table === 'subscription_deliveries') {
        const callCount = (supabase as unknown as { from: MockFrom }).from.mock.calls.filter((c) => c[0] === 'subscription_deliveries').length;
        return callCount === 1 ? allDeliveriesMock : currentMonthDeliveriesMock;
      }
      if (table === 'standalone_purchases') {
        const callCount = (supabase as unknown as { from: MockFrom }).from.mock.calls.filter((c) => c[0] === 'standalone_purchases').length;
        return callCount === 1 ? allPurchasesMock : currentMonthPurchasesMock;
      }
      if (table === 'collections') {
        return collectionMock;
      }
      return allDeliveriesMock;
    });

    renderComponent({ collectionId: 'test-collection-id' });

    await waitFor(() => {
      expect(screen.getByText('0 assinaturas + 0 avulsas')).toBeInTheDocument();
      expect(screen.getByText('R$ 0.00')).toBeInTheDocument();
    });
  });
});
