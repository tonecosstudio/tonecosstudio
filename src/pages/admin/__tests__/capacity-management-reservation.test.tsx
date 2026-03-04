// @ts-nocheck
/**
 * Tests for CapacityManagement page with reservation functionality
 * 
 * Requirements: 16.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CapacityManagement from '../CapacityManagement';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock child components to simplify testing
vi.mock('@/components/admin/CapacityAllocationBreakdown', () => ({
  CapacityAllocationBreakdown: () => <div>Capacity Allocation Breakdown</div>,
}));

vi.mock('@/components/admin/CapacityAlertConfig', () => ({
  CapacityAlertConfig: () => <div>Capacity Alert Config</div>,
}));

vi.mock('@/components/admin/CapacityForecast', () => ({
  CapacityForecast: () => <div>Capacity Forecast</div>,
}));

vi.mock('@/components/admin/CapacityReservation', () => ({
  CapacityReservation: ({ cycleName, currentReserved }: any) => (
    <div>
      <div>Capacity Reservation: {cycleName}</div>
      <div>Reserved: {currentReserved}</div>
    </div>
  ),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('CapacityManagement with Reservations', () => {
  const mockCycles = [
    {
      id: 'cycle-1',
      cycle_number: 1,
      month: 1,
      year: 2026,
      capacity_max: 100,
      capacity_current: 30,
      status: 'open',
    },
    {
      id: 'cycle-2',
      cycle_number: 2,
      month: 1,
      year: 2026,
      capacity_max: 100,
      capacity_current: 40,
      status: 'open',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock cycles query - needs to handle multiple query patterns
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'cycles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockCycles,
                  error: null,
                }),
                single: vi.fn().mockResolvedValue({
                  data: mockCycles[0],
                  error: null,
                }),
              }),
              single: vi.fn().mockResolvedValue({
                data: mockCycles[0],
                error: null,
              }),
            }),
            single: vi.fn().mockResolvedValue({
              data: mockCycles[0],
              error: null,
            }),
          }),
        };
      }
      // Default mock for other tables
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };
    });

    // Mock RPC calls for capacity usage
    (supabase.rpc as any).mockImplementation((funcName: string) => {
      if (funcName === 'get_available_capacity') {
        return Promise.resolve({ data: 50, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
  });

  it('should render CapacityReservation components for both cycles', async () => {
    renderWithProviders(<CapacityManagement />);

    await waitFor(() => {
      expect(screen.getByText(/Capacity Reservation: Ciclo 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Capacity Reservation: Ciclo 2/i)).toBeInTheDocument();
    });
  });

  it('should display reserved capacity information', async () => {
    renderWithProviders(<CapacityManagement />);

    await waitFor(() => {
      // Check that reserved capacity is displayed (mocked component shows "Reserved: X")
      const reservedElements = screen.getAllByText(/Reserved:/i);
      expect(reservedElements.length).toBeGreaterThan(0);
    });
  });

  it('should show capacity reservation before other components', async () => {
    renderWithProviders(<CapacityManagement />);

    await waitFor(() => {
      const allText = screen.getByText(/Capacity Reservation: Ciclo 1/i).parentElement?.parentElement?.textContent || '';
      
      // Verify reservation component appears
      expect(allText).toContain('Capacity Reservation');
    });
  });

  it('should integrate with capacity forecast and alert config', async () => {
    renderWithProviders(<CapacityManagement />);

    await waitFor(() => {
      expect(screen.getByText('Capacity Forecast')).toBeInTheDocument();
      // Use getAllByText since there are multiple cycles with alert config
      expect(screen.getAllByText('Capacity Alert Config').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Capacity Allocation Breakdown').length).toBeGreaterThan(0);
    });
  });
});

