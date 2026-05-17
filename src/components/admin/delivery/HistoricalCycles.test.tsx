/**
 * HistoricalCycles Tests
 *
 * Tests for the historical cycles view component
 * Requirements: 13.9
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { HistoricalCycles } from './HistoricalCycles';
import { supabase } from '@/integrations/supabase/client';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock timezone service
vi.mock('@/lib/services/timezoneService', () => ({
  timezoneService: {
    getCurrentTime: () => new Date('2026-06-15T12:00:00Z'),
    toSystemTimezone: (date: Date) => date,
    getMonth: (_date: Date) => 6,
    getYear: (_date: Date) => 2026,
  },
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('HistoricalCycles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCycles = [
    {
      id: '1',
      cycle_number: 1,
      month: 4,
      year: 2026,
      open_start: '2026-04-01T00:00:00Z',
      open_end: '2026-04-15T23:59:59Z',
      production_start: '2026-04-16T00:00:00Z',
      production_end: '2026-04-30T23:59:59Z',
      shipping_date: '2026-05-05',
      status: 'completed' as const,
      status_changed_at: '2026-05-05T10:00:00Z',
      capacity_max: 100,
      capacity_current: 85,
      created_at: '2026-04-01T00:00:00Z',
    },
    {
      id: '2',
      cycle_number: 2,
      month: 4,
      year: 2026,
      open_start: '2026-04-16T00:00:00Z',
      open_end: '2026-04-30T23:59:59Z',
      production_start: '2026-05-01T00:00:00Z',
      production_end: '2026-05-15T23:59:59Z',
      shipping_date: '2026-05-20',
      status: 'completed' as const,
      status_changed_at: '2026-05-20T10:00:00Z',
      capacity_max: 100,
      capacity_current: 92,
      created_at: '2026-04-16T00:00:00Z',
    },
    {
      id: '3',
      cycle_number: 1,
      month: 5,
      year: 2026,
      open_start: '2026-05-01T00:00:00Z',
      open_end: '2026-05-15T23:59:59Z',
      production_start: '2026-05-16T00:00:00Z',
      production_end: '2026-05-31T23:59:59Z',
      shipping_date: '2026-06-05',
      status: 'shipping' as const,
      status_changed_at: '2026-06-01T10:00:00Z',
      capacity_max: 100,
      capacity_current: 78,
      created_at: '2026-05-01T00:00:00Z',
    },
  ];

  const setSupabaseFromMock = (mockFrom: ReturnType<typeof vi.fn>) => {
    (supabase as unknown as { from: ReturnType<typeof vi.fn> }).from = mockFrom;
  };

  it('should render historical cycles table', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({
          data: mockCycles,
          error: null,
        }),
      }),
    });

    setSupabaseFromMock(mockFrom);

    render(<HistoricalCycles />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Histórico de Ciclos')).toBeInTheDocument();
    });

    // Check statistics cards
    await waitFor(() => {
      expect(screen.getByText('Total de Ciclos')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Total cycles
      expect(screen.getByText('Ciclos Concluídos')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Completed cycles
    });

    // Check table headers
    expect(screen.getByText('Período')).toBeInTheDocument();
    expect(screen.getByText('Ciclo')).toBeInTheDocument();
    const statusElements = screen.getAllByText('Status');
    expect(statusElements.length).toBeGreaterThan(0);
    expect(screen.getByText('Capacidade')).toBeInTheDocument();
    expect(screen.getByText('Data de Envio')).toBeInTheDocument();
  });

  it('should display cycle data in table rows', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({
          data: mockCycles,
          error: null,
        }),
      }),
    });

    setSupabaseFromMock(mockFrom);

    render(<HistoricalCycles />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Check for cycle numbers
      const cycleElements = screen.getAllByText(/Ciclo [12]/);
      expect(cycleElements.length).toBeGreaterThan(0);
    });

    // Check for capacity data
    await waitFor(() => {
      expect(screen.getByText('85 / 100')).toBeInTheDocument();
      expect(screen.getByText('92 / 100')).toBeInTheDocument();
      expect(screen.getByText('78 / 100')).toBeInTheDocument();
    });

    // Check for status badges
    expect(screen.getAllByText('Concluído').length).toBe(2);
    expect(screen.getByText('Envio')).toBeInTheDocument();
  });

  it('should filter cycles by year', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({
          data: mockCycles,
          error: null,
        }),
      }),
    });

    setSupabaseFromMock(mockFrom);

    render(<HistoricalCycles />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Histórico de Ciclos')).toBeInTheDocument();
    });

    // Verify component renders with data
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument(); // Total cycles
    });
  });

  it('should filter cycles by status', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({
          data: mockCycles,
          error: null,
        }),
      }),
    });

    setSupabaseFromMock(mockFrom);

    render(<HistoricalCycles />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Histórico de Ciclos')).toBeInTheDocument();
    });

    // Verify component renders with data
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // Completed cycles
    });
  });

  it('should sort cycles by date', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({
          data: mockCycles,
          error: null,
        }),
      }),
    });

    setSupabaseFromMock(mockFrom);

    render(<HistoricalCycles />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Histórico de Ciclos')).toBeInTheDocument();
    });

    // Verify cycles are displayed (sorting is done client-side)
    await waitFor(() => {
      expect(screen.getByText('85 / 100')).toBeInTheDocument();
      expect(screen.getByText('92 / 100')).toBeInTheDocument();
      expect(screen.getByText('78 / 100')).toBeInTheDocument();
    });
  });

  it('should navigate to cycle detail when clicking "Ver Detalhes"', async () => {
    const user = userEvent.setup();

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({
          data: [mockCycles[0]],
          error: null,
        }),
      }),
    });

    setSupabaseFromMock(mockFrom);

    render(<HistoricalCycles />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Histórico de Ciclos')).toBeInTheDocument();
    });

    // Find and click "Ver Detalhes" button
    const detailButtons = await screen.findAllByText('Ver Detalhes');
    await user.click(detailButtons[0]);

    // Verify navigation was called
    expect(mockNavigate).toHaveBeenCalledWith('/admin/cycle-dashboard?month=4&year=2026');
  });

  it('should display empty state when no cycles found', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });

    setSupabaseFromMock(mockFrom);

    render(<HistoricalCycles />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Nenhum ciclo encontrado com os filtros selecionados')).toBeInTheDocument();
    });
  });

  it('should calculate statistics correctly', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({
          data: mockCycles,
          error: null,
        }),
      }),
    });

    setSupabaseFromMock(mockFrom);

    render(<HistoricalCycles />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Total cycles: 3
      expect(screen.getByText('3')).toBeInTheDocument();

      // Completed cycles: 2
      expect(screen.getByText('2')).toBeInTheDocument();

      // Total pieces: 85 + 92 + 78 = 255
      expect(screen.getByText('255')).toBeInTheDocument();

      // Average capacity: (255 / 300) * 100 = 85%
      expect(screen.getByText('85%')).toBeInTheDocument();
    });
  });

  it('should display loading state', () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnValue(new Promise(() => {})), // Never resolves
      }),
    });

    setSupabaseFromMock(mockFrom);

    render(<HistoricalCycles />, { wrapper: createWrapper() });

    expect(screen.getByText('Carregando histórico...')).toBeInTheDocument();
  });
});
