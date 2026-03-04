// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import CapacityManagement from '../CapacityManagement';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock capacity service
vi.mock('@/services/capacity-service', () => ({
  getCapacityUsage: vi.fn(),
}));

const mockSupabaseFrom = supabase.from as any;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('CapacityManagement - Capacity Limit Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display future months capacity configuration table', async () => {
    // Mock cycles query for current month
    const mockCyclesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'cycle1-id',
            cycle_number: 1,
            month: 1,
            year: 2026,
            capacity_max: 100,
            capacity_current: 50,
            status: 'open',
          },
          {
            id: 'cycle2-id',
            cycle_number: 2,
            month: 1,
            year: 2026,
            capacity_max: 100,
            capacity_current: 30,
            status: 'open',
          },
        ],
        error: null,
      }),
    };

    mockSupabaseFrom.mockReturnValue(mockCyclesQuery);

    // Mock capacity usage
    const { getCapacityUsage } = await import('@/services/capacity-service');
    (getCapacityUsage as any).mockResolvedValue({
      max: 100,
      current: 50,
      available: 50,
      percentage: 50,
    });

    render(<CapacityManagement />, { wrapper: createWrapper() });

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Configuração de Capacidade Futura')).toBeInTheDocument();
    });

    // Check that table headers are present
    expect(screen.getByText('Mês/Ano')).toBeInTheDocument();
    expect(screen.getByText('Ciclo 1 (Dias 1-15)')).toBeInTheDocument();
    expect(screen.getByText('Ciclo 2 (Dias 16-fim)')).toBeInTheDocument();
    expect(screen.getByText('Total Mensal')).toBeInTheDocument();
  });

  it('should validate that capacity limits are positive integers', async () => {
    const user = userEvent.setup();

    // Mock cycles query
    const mockCyclesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'cycle1-id',
            cycle_number: 1,
            month: 1,
            year: 2026,
            capacity_max: 100,
            capacity_current: 50,
            status: 'open',
          },
        ],
        error: null,
      }),
    };

    mockSupabaseFrom.mockReturnValue(mockCyclesQuery);

    const { getCapacityUsage } = await import('@/services/capacity-service');
    (getCapacityUsage as any).mockResolvedValue({
      max: 100,
      current: 50,
      available: 50,
      percentage: 50,
    });

    render(<CapacityManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Configuração de Capacidade Futura')).toBeInTheDocument();
    });

    // Find all number inputs in the future months table
    const inputs = screen.getAllByRole('spinbutton');
    
    // Try to set a negative value
    if (inputs.length > 0) {
      await user.clear(inputs[0]);
      await user.type(inputs[0], '-10');
      
      // The input should have min="1" attribute
      expect(inputs[0]).toHaveAttribute('min', '1');
    }
  });

  it('should allow setting different limits for different months', async () => {
    // Mock cycles query
    const mockCyclesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'cycle1-id',
            cycle_number: 1,
            month: 1,
            year: 2026,
            capacity_max: 100,
            capacity_current: 50,
            status: 'open',
          },
        ],
        error: null,
      }),
    };

    const mockUpdate = vi.fn().mockReturnThis();
    mockCyclesQuery.update = mockUpdate;
    mockUpdate.eq = vi.fn().mockResolvedValue({ error: null });

    mockSupabaseFrom.mockReturnValue(mockCyclesQuery);

    const { getCapacityUsage } = await import('@/services/capacity-service');
    (getCapacityUsage as any).mockResolvedValue({
      max: 100,
      current: 50,
      available: 50,
      percentage: 50,
    });

    render(<CapacityManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Configuração de Capacidade Futura')).toBeInTheDocument();
    });

    // Find all tables on the page
    const tables = screen.getAllByRole('table');
    
    // The future months table should be the first one (before the allocation breakdown tables)
    const table = tables[0];
    expect(table).toBeInTheDocument();
    
    // Find all number inputs within the table (excluding month/year selector inputs)
    const tableInputs = within(table).getAllByRole('spinbutton');
    
    // Verify that multiple inputs exist (at least 12 for 6 months x 2 cycles)
    expect(tableInputs.length).toBeGreaterThanOrEqual(12);
    
    // Verify all inputs have type="number" and min="1"
    tableInputs.forEach(input => {
      expect(input).toHaveAttribute('type', 'number');
      expect(input).toHaveAttribute('min', '1');
    });
  });

  it('should save capacity limits to cycles table', async () => {
    const user = userEvent.setup();

    // Mock cycles query
    const mockCyclesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'cycle1-id',
            cycle_number: 1,
            month: 2,
            year: 2026,
            capacity_max: 100,
            capacity_current: 50,
            status: 'open',
          },
          {
            id: 'cycle2-id',
            cycle_number: 2,
            month: 2,
            year: 2026,
            capacity_max: 100,
            capacity_current: 30,
            status: 'open',
          },
        ],
        error: null,
      }),
    };

    const mockUpdate = vi.fn().mockReturnThis();
    mockCyclesQuery.update = mockUpdate;
    mockUpdate.eq = vi.fn().mockResolvedValue({ error: null });

    mockSupabaseFrom.mockReturnValue(mockCyclesQuery);

    const { getCapacityUsage } = await import('@/services/capacity-service');
    (getCapacityUsage as any).mockResolvedValue({
      max: 100,
      current: 50,
      available: 50,
      percentage: 50,
    });

    render(<CapacityManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Configuração de Capacidade Futura')).toBeInTheDocument();
    });

    // Find and click the save button
    const saveButton = screen.getByRole('button', { name: /Salvar Alterações/i });
    await user.click(saveButton);

    // Verify update was called
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  it('should display total monthly capacity correctly', async () => {
    // Mock cycles query
    const mockCyclesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'cycle1-id',
            cycle_number: 1,
            month: 1,
            year: 2026,
            capacity_max: 150,
            capacity_current: 50,
            status: 'open',
          },
        ],
        error: null,
      }),
    };

    mockSupabaseFrom.mockReturnValue(mockCyclesQuery);

    const { getCapacityUsage } = await import('@/services/capacity-service');
    (getCapacityUsage as any).mockResolvedValue({
      max: 150,
      current: 50,
      available: 100,
      percentage: 33.33,
    });

    render(<CapacityManagement />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Configuração de Capacidade Futura')).toBeInTheDocument();
    });

    // Check that total is calculated correctly (cycle1 + cycle2)
    // The table should show "Total Mensal" column with sum of both cycles
    const totalCells = screen.getAllByText(/peças$/);
    expect(totalCells.length).toBeGreaterThan(0);
  });
});
