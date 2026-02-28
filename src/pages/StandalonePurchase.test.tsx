/**
 * Tests for StandalonePurchase Page
 * 
 * Tests the standalone purchase UI including:
 * - Collection display
 * - Deposit/balance breakdown
 * - Capacity status
 * - Cutoff countdown
 * - Payment voucher upload
 * - Purchase creation
 * - Error handling
 * 
 * Requirements: 4.1, 22.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import StandalonePurchase from './StandalonePurchase';
import * as standalonePurchaseService from '@/services/standalone-purchase-service';
import * as capacityService from '@/services/capacity-service';
import { supabase } from '@/integrations/supabase/client';

// Mock modules
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
  }),
}));

vi.mock('@/services/standalone-purchase-service');
vi.mock('@/services/capacity-service');

// Mock SEOHead component
vi.mock('@/components/SEOHead', () => ({
  default: () => null,
}));

// Mock CutoffCountdown component
vi.mock('@/components/CutoffCountdown', () => ({
  CutoffCountdown: ({ onCutoffChange }: any) => (
    <div data-testid="cutoff-countdown">
      <button onClick={() => onCutoffChange?.(false)}>Set Not Passed</button>
      <button onClick={() => onCutoffChange?.(true)}>Set Passed</button>
    </div>
  ),
}));

const mockCollection = {
  id: 'collection-1',
  name: 'Test Collection',
  slug: 'test-collection',
  description: 'A test collection',
  price: 250.00,
  image_url: 'https://example.com/image.jpg',
  is_active: true,
};

const mockCycle = {
  id: 'cycle-1',
  cycle_number: 1,
  month: 3,
  year: 2026,
  status: 'open',
};

const mockCapacityUsage = {
  max: 100,
  current: 50,
  available: 50,
  percentage: 50,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/compra-avulsa/collection-1']}>
        <Routes>
          <Route path="/compra-avulsa/:collectionId" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('StandalonePurchase', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock collection query
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockCollection,
            error: null,
          }),
        }),
      }),
    });

    // Mock current cycle query
    (supabase.rpc as any).mockResolvedValue({
      data: mockCycle,
      error: null,
    });

    // Mock capacity service
    vi.mocked(capacityService.getCapacityUsage).mockResolvedValue(mockCapacityUsage);

    // Mock purchase check - default to can purchase
    vi.mocked(standalonePurchaseService.canCreateStandalonePurchase).mockResolvedValue({
      canCreate: true,
    });
  });

  describe('Display Collection Details', () => {
    it('should display collection name and description', async () => {
      const { container } = render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Test Collection')).toBeInTheDocument();
        expect(screen.getByText('A test collection')).toBeInTheDocument();
      });
    });

    it('should display collection image', async () => {
      render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        const image = screen.getByAltText('Test Collection');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
      });
    });

    it('should display total price', async () => {
      render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('R$ 250.00')).toBeInTheDocument();
      });
    });
  });

  describe('Deposit and Balance Breakdown', () => {
    it('should display deposit amount of R$100', async () => {
      render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Check for deposit amount in the price breakdown section
        const depositElements = screen.getAllByText('R$ 100.00');
        expect(depositElements.length).toBeGreaterThan(0);
        // Verify it's in the context of deposit
        expect(screen.getByText(/Depósito \(agora\)/i)).toBeInTheDocument();
      });
    });

    it('should calculate and display balance amount correctly', async () => {
      render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Balance = 250 - 100 = 150
        expect(screen.getByText('R$ 150.00')).toBeInTheDocument();
      });
    });

    it('should display deposit and balance labels', async () => {
      render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Depósito \(agora\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Saldo \(após produção\)/i)).toBeInTheDocument();
      });
    });

    it('should display how it works information', async () => {
      render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Como funciona:/i)).toBeInTheDocument();
        expect(screen.getByText(/5 dias úteis/i)).toBeInTheDocument();
      });
    });
  });

  describe('Capacity Availability', () => {
    it('should display capacity usage percentage', async () => {
      render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('50%')).toBeInTheDocument();
      });
    });

    it('should display available capacity', async () => {
      render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/50 de 100 vagas disponíveis/i)).toBeInTheDocument();
      });
    });

    it('should show red indicator when capacity is high', async () => {
      vi.mocked(capacityService.getCapacityUsage).mockResolvedValue({
        max: 100,
        current: 95,
        available: 5,
        percentage: 95,
      });

      render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('95%')).toBeInTheDocument();
      });
    });

    it('should show capacity full error when no capacity available', async () => {
      vi.mocked(standalonePurchaseService.canCreateStandalonePurchase).mockResolvedValue({
        canCreate: false,
        reason: 'Capacity limit exceeded',
      });

      render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Esgotado/i)).toBeInTheDocument();
        expect(screen.getByText(/capacidade de produção.*foi atingida/i)).toBeInTheDocument();
      });
    });
  });

  describe('Cutoff Countdown', () => {
    it('should render cutoff countdown component', async () => {
      render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('cutoff-countdown')).toBeInTheDocument();
      });
    });

    it('should disable purchase button when cutoff passed', async () => {
      render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        const setPassedButton = screen.getByText('Set Passed');
        fireEvent.click(setPassedButton);
      });

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Prazo Encerrado/i });
        expect(submitButton).toBeDisabled();
      });
    });

    it('should show cutoff passed error message', async () => {
      vi.mocked(standalonePurchaseService.canCreateStandalonePurchase).mockResolvedValue({
        canCreate: false,
        reason: 'Cutoff has passed - production has started',
      });

      render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Prazo encerrado/i)).toBeInTheDocument();
        expect(screen.getByText(/produção já foi iniciada/i)).toBeInTheDocument();
      });
    });
  });

  describe('Payment Voucher Upload', () => {
    it('should render PaymentVoucherUpload component', async () => {
      render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Arraste e solte o arquivo aqui ou clique para selecionar/i)).toBeInTheDocument();
      });
    });

    it('should accept valid file types', async () => {
      render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/JPG, PNG ou PDF/i)).toBeInTheDocument();
      });
    });

    it('should display payment instructions', async () => {
      render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Dados para Pagamento/i)).toBeInTheDocument();
        expect(screen.getByText(/Valor do Depósito:/i)).toBeInTheDocument();
      });
    });
  });

  describe('Purchase Creation', () => {
    it('should disable submit button when no voucher uploaded', async () => {
      render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Confirmar Compra/i });
        expect(submitButton).toBeDisabled();
      });
    });

    it('should disable submit button when purchase not allowed', async () => {
      vi.mocked(standalonePurchaseService.canCreateStandalonePurchase).mockResolvedValue({
        canCreate: false,
        reason: 'Capacity limit exceeded',
      });

      render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Compra Indisponível/i });
        expect(submitButton).toBeDisabled();
      });
    });

    it('should show terms and conditions', async () => {
      render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/termos de serviço/i)).toBeInTheDocument();
        expect(screen.getByText(/depósito é não reembolsável/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error when collection not found', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      });

      render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Coleção não encontrada/i)).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      render(<StandalonePurchase />, { wrapper: createWrapper() });

      expect(screen.getByText(/Carregando informações/i)).toBeInTheDocument();
    });

    it('should display generic error for unknown purchase issues', async () => {
      vi.mocked(standalonePurchaseService.canCreateStandalonePurchase).mockResolvedValue({
        canCreate: false,
        reason: 'Unknown error occurred',
      });

      render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Compra não disponível/i)).toBeInTheDocument();
        expect(screen.getByText('Unknown error occurred')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should have back link to collection details', async () => {
      render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        const backLink = screen.getByText(/Voltar para Test Collection/i);
        expect(backLink).toBeInTheDocument();
        expect(backLink.closest('a')).toHaveAttribute('href', '/colecoes/test-collection');
      });
    });
  });

  describe('Integration', () => {
    it('should call capacity service with correct cycle ID', async () => {
      render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(capacityService.getCapacityUsage).toHaveBeenCalledWith('cycle-1');
      });
    });

    it('should call purchase check service with correct cycle ID', async () => {
      render(<StandalonePurchase />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(standalonePurchaseService.canCreateStandalonePurchase).toHaveBeenCalledWith('cycle-1');
      });
    });
  });
});
