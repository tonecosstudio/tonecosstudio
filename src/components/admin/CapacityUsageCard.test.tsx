import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CapacityUsageCard } from './CapacityUsageCard';
import * as capacityService from '@/services/capacity-service';

// Mock the capacity service
vi.mock('@/services/capacity-service', () => ({
  getCapacityUsage: vi.fn(),
}));

describe('CapacityUsageCard', () => {
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

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <CapacityUsageCard cycleId="test-cycle-id" {...props} />
      </QueryClientProvider>
    );
  };

  it('should display loading state initially', () => {
    vi.mocked(capacityService.getCapacityUsage).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderComponent();
    expect(screen.getByText('Uso de Capacidade')).toBeInTheDocument();
  });

  it('should display capacity data with green color when usage < 70%', async () => {
    vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
      max: 100,
      current: 45,
      available: 55,
      percentage: 45,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('45%')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument(); // current
      expect(screen.getByText('100')).toBeInTheDocument(); // max
      expect(screen.getByText('55')).toBeInTheDocument(); // available
      expect(screen.getByText('Saudável')).toBeInTheDocument();
    });
  });

  it('should display capacity data with yellow color when usage 70-90%', async () => {
    vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
      max: 100,
      current: 80,
      available: 20,
      percentage: 80,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText('80')).toBeInTheDocument(); // current
      expect(screen.getByText('20')).toBeInTheDocument(); // available
      expect(screen.getByText('Atenção')).toBeInTheDocument();
    });
  });

  it('should display capacity data with red color when usage > 90%', async () => {
    vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
      max: 100,
      current: 95,
      available: 5,
      percentage: 95,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('95')).toBeInTheDocument(); // current
      expect(screen.getByText('5')).toBeInTheDocument(); // available
      expect(screen.getByText('Crítico')).toBeInTheDocument();
    });
  });

  it('should display all three numerical values: current, max, and available', async () => {
    vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
      max: 150,
      current: 60,
      available: 90,
      percentage: 40,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('60')).toBeInTheDocument(); // current
      expect(screen.getByText('150')).toBeInTheDocument(); // max
      expect(screen.getByText('90')).toBeInTheDocument(); // available
      expect(screen.getByText('Atual')).toBeInTheDocument();
      expect(screen.getByText('Máximo')).toBeInTheDocument();
      expect(screen.getByText('Disponível')).toBeInTheDocument();
    });
  });

  it('should display custom title when provided', async () => {
    vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
      max: 100,
      current: 50,
      available: 50,
      percentage: 50,
    });

    renderComponent({ title: 'Capacidade Ciclo 1' });

    await waitFor(() => {
      expect(screen.getByText('Capacidade Ciclo 1')).toBeInTheDocument();
    });
  });

  it('should display error state when capacity service fails', async () => {
    vi.mocked(capacityService.getCapacityUsage).mockRejectedValue(
      new Error('Failed to fetch capacity')
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch capacity')).toBeInTheDocument();
    });
  });

  it('should display summary text with current/max format', async () => {
    vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
      max: 200,
      current: 120,
      available: 80,
      percentage: 60,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('120 / 200 peças (60%)')).toBeInTheDocument();
    });
  });

  it('should apply custom className when provided', async () => {
    vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
      max: 100,
      current: 50,
      available: 50,
      percentage: 50,
    });

    const { container } = renderComponent({ className: 'custom-class' });

    await waitFor(() => {
      const card = container.querySelector('.custom-class');
      expect(card).toBeInTheDocument();
    });
  });

  it('should handle edge case of 0% usage', async () => {
    vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
      max: 100,
      current: 0,
      available: 100,
      percentage: 0,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument(); // current
      expect(screen.getByText('Saudável')).toBeInTheDocument();
    });
  });

  it('should handle edge case of 100% usage', async () => {
    vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
      max: 100,
      current: 100,
      available: 0,
      percentage: 100,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument(); // available
      expect(screen.getByText('Crítico')).toBeInTheDocument();
    });
  });

  it('should handle exactly 70% usage (boundary)', async () => {
    vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
      max: 100,
      current: 70,
      available: 30,
      percentage: 70,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('70%')).toBeInTheDocument();
      expect(screen.getByText('Atenção')).toBeInTheDocument(); // Should be yellow at 70%
    });
  });

  it('should handle exactly 90% usage (boundary)', async () => {
    vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
      max: 100,
      current: 90,
      available: 10,
      percentage: 90,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('90%')).toBeInTheDocument();
      expect(screen.getByText('Atenção')).toBeInTheDocument(); // Should still be yellow at 90%
    });
  });
});
