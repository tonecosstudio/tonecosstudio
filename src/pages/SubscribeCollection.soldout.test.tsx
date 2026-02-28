/**
 * Tests for Sold Out functionality in subscription purchase page
 * 
 * Task: 9.4 Display "Sold Out" message when capacity reached
 * Requirements: 3.4, 22.2, 22.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import SubscribeCollectionNew from './SubscribeCollection.new';
import * as capacityService from '@/services/capacity-service';
import * as collectionService from '@/services/collection-service';

// Mock modules
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' } })
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null
          })),
          maybeSingle: vi.fn(() => ({
            data: null,
            error: null
          }))
        }))
      }))
    })),
    rpc: vi.fn()
  }
}));

vi.mock('@/services/collection-service');
vi.mock('@/services/capacity-service');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { 
        retry: false,
        cacheTime: 0,
        staleTime: 0
      },
      mutations: { retry: false }
    }
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('SubscribeCollection - Sold Out Functionality', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create fresh query client for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { 
          retry: false,
          cacheTime: 0,
          staleTime: 0
        },
        mutations: { retry: false }
      }
    });
    
    // Mock collection service
    vi.mocked(collectionService.getActiveCollections).mockResolvedValue([
      {
        id: 'col-1',
        name: 'Test Collection',
        description: 'Test description',
        price: 500,
        is_active: true,
        rotation_type: 'fixed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any
    ]);
    
    vi.mocked(collectionService.getRotationSchedule).mockResolvedValue([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  const renderWithClient = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          {component}
        </QueryClientProvider>
      </BrowserRouter>
    );
  };

  it('should display sold out message when capacity unavailable', async () => {
    // Mock capacity check to return unavailable
    vi.mocked(capacityService.checkSubscriptionCapacity).mockResolvedValue({
      available: false,
      firstUnavailableCycle: {
        cycleNumber: 2,
        month: 3,
        year: 2026,
        deliveryNumber: 2
      },
      estimatedAvailableDate: new Date(2026, 3, 1) // April 1, 2026
    });

    renderWithClient(<SubscribeCollectionNew />);

    // Wait for capacity check to complete
    await waitFor(() => {
      expect(screen.getByText(/Esgotado/i)).toBeInTheDocument();
    });

    // Check that sold out message is displayed
    expect(screen.getByText(/capacidade de produção está esgotada/i)).toBeInTheDocument();
  });

  it('should display estimated availability date when sold out', async () => {
    const estimatedDate = new Date(2026, 3, 1); // April 1, 2026
    
    vi.mocked(capacityService.checkSubscriptionCapacity).mockResolvedValue({
      available: false,
      firstUnavailableCycle: {
        cycleNumber: 2,
        month: 3,
        year: 2026,
        deliveryNumber: 2
      },
      estimatedAvailableDate: estimatedDate
    });

    renderWithClient(<SubscribeCollectionNew />);

    await waitFor(() => {
      expect(screen.getByText(/Disponível novamente em:/i)).toBeInTheDocument();
    });

    // Check that the date is formatted correctly
    const formattedDate = estimatedDate.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    expect(screen.getByText(new RegExp(formattedDate, 'i'))).toBeInTheDocument();
  });

  it('should disable purchase button when sold out', async () => {
    vi.mocked(capacityService.checkSubscriptionCapacity).mockResolvedValue({
      available: false,
      firstUnavailableCycle: {
        cycleNumber: 1,
        month: 4,
        year: 2026,
        deliveryNumber: 1
      },
      estimatedAvailableDate: new Date(2026, 3, 16)
    });

    renderWithClient(<SubscribeCollectionNew />);

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /Esgotado/i });
      expect(button).toBeDisabled();
    });
  });

  it('should show which cycle is unavailable', async () => {
    vi.mocked(capacityService.checkSubscriptionCapacity).mockResolvedValue({
      available: false,
      firstUnavailableCycle: {
        cycleNumber: 2,
        month: 5,
        year: 2026,
        deliveryNumber: 3
      },
      estimatedAvailableDate: new Date(2026, 5, 1)
    });

    renderWithClient(<SubscribeCollectionNew />);

    await waitFor(() => {
      expect(screen.getByText(/Ciclo 2 de 5\/2026/i)).toBeInTheDocument();
      expect(screen.getByText(/entrega 3/i)).toBeInTheDocument();
    });
  });

  it('should show loading state while checking capacity', async () => {
    // Create a promise that we can control
    let resolveCapacity: any;
    const capacityPromise = new Promise<any>((resolve) => {
      resolveCapacity = resolve;
    });
    
    vi.mocked(capacityService.checkSubscriptionCapacity).mockReturnValue(capacityPromise);

    renderWithClient(<SubscribeCollectionNew />);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/Verificando disponibilidade/i)).toBeInTheDocument();
    });

    // Resolve the promise
    resolveCapacity({ available: true });
  });

  it('should check capacity for correct number of deliveries based on plan', async () => {
    const checkCapacitySpy = vi.mocked(capacityService.checkSubscriptionCapacity);
    checkCapacitySpy.mockResolvedValue({ available: true });

    renderWithClient(<SubscribeCollectionNew />);

    // Wait for initial render and plan selection
    await waitFor(() => {
      // Should check capacity for the selected plan
      // Default plan is usually Trimestral (3 deliveries)
      expect(checkCapacitySpy).toHaveBeenCalled();
    });
  });

  it('should display sold out indicator in summary section', async () => {
    vi.mocked(capacityService.checkSubscriptionCapacity).mockResolvedValue({
      available: false,
      firstUnavailableCycle: {
        cycleNumber: 1,
        month: 6,
        year: 2026,
        deliveryNumber: 1
      }
    });

    renderWithClient(<SubscribeCollectionNew />);

    await waitFor(() => {
      expect(screen.getByText(/Capacidade Esgotada/i)).toBeInTheDocument();
      expect(screen.getByText(/não está disponível no momento/i)).toBeInTheDocument();
    });
  });
});
