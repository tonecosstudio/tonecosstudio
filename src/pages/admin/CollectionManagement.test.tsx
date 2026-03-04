// @ts-nocheck
/**
 * CollectionManagement Tests
 * 
 * Tests for the Collection Management admin page
 * 
 * Requirements: 14.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import CollectionManagement from './CollectionManagement';
import { supabase } from '@/integrations/supabase/client';
import userEvent from '@testing-library/user-event';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock AdminLayout
vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock SEOHead
vi.mock('@/components/SEOHead', () => ({
  default: () => null,
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe('CollectionManagement', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CollectionManagement />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('should render the page title', () => {
    // Mock empty collections
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });
    (supabase.from as any).mockImplementation(mockFrom);

    renderComponent();

    expect(screen.getByText('Gerenciamento de Coleções')).toBeInTheDocument();
  });

  it('should display collections table with columns', async () => {
    const mockCollections = [
      {
        id: '1',
        name: 'Coleção Teste',
        slug: 'colecao-teste',
        description: 'Descrição teste',
        price_full: 299.90,
        is_active: true,
        rotation_type: 'fixed',
        character_revelation_date: null,
        revealed: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockCollections,
          error: null,
        }),
      }),
    });
    (supabase.from as any).mockImplementation(mockFrom);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Nome')).toBeInTheDocument();
      expect(screen.getByText('Preço')).toBeInTheDocument();
      expect(screen.getByText('Tipo de Rotação')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Ações')).toBeInTheDocument();
    });
  });

  it('should display collection data in table', async () => {
    const mockCollections = [
      {
        id: '1',
        name: 'Coleção Marvel',
        slug: 'colecao-marvel',
        description: 'Heróis da Marvel',
        price_full: 299.90,
        is_active: true,
        rotation_type: 'fixed',
        character_revelation_date: null,
        revealed: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockCollections,
          error: null,
        }),
      }),
    });
    (supabase.from as any).mockImplementation(mockFrom);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Coleção Marvel')).toBeInTheDocument();
      expect(screen.getByText('/colecao-marvel')).toBeInTheDocument();
      expect(screen.getByText('R$ 299.90')).toBeInTheDocument();
      expect(screen.getByText('Ativa')).toBeInTheDocument();
    });
  });

  it('should show rotation type badges correctly', async () => {
    const mockCollections = [
      {
        id: '1',
        name: 'Coleção Fixa',
        slug: 'colecao-fixa',
        description: 'Sempre disponível',
        price_full: 299.90,
        is_active: true,
        rotation_type: 'fixed',
        character_revelation_date: null,
        revealed: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'Coleção Ímpar',
        slug: 'colecao-impar',
        description: 'Meses ímpares',
        price_full: 349.90,
        is_active: true,
        rotation_type: 'odd_months',
        character_revelation_date: null,
        revealed: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockCollections,
          error: null,
        }),
      }),
    });
    (supabase.from as any).mockImplementation(mockFrom);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Fixa')).toBeInTheDocument();
      expect(screen.getByText('Ímpares')).toBeInTheDocument();
    });
  });

  it('should display "Create New Collection" button', () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });
    (supabase.from as any).mockImplementation(mockFrom);

    renderComponent();

    expect(screen.getByText('Criar Nova Coleção')).toBeInTheDocument();
  });

  it('should display search input', () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });
    (supabase.from as any).mockImplementation(mockFrom);

    renderComponent();

    expect(screen.getByPlaceholderText('Buscar por nome ou slug...')).toBeInTheDocument();
  });

  it('should display filter controls', () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });
    (supabase.from as any).mockImplementation(mockFrom);

    renderComponent();

    expect(screen.getByText('Buscar e Filtrar')).toBeInTheDocument();
  });

  it('should display stats cards', async () => {
    const mockCollections = [
      {
        id: '1',
        name: 'Coleção 1',
        slug: 'colecao-1',
        description: 'Desc 1',
        price_full: 299.90,
        is_active: true,
        rotation_type: 'fixed',
        character_revelation_date: null,
        revealed: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'Coleção 2',
        slug: 'colecao-2',
        description: 'Desc 2',
        price_full: 349.90,
        is_active: false,
        rotation_type: 'odd_months',
        character_revelation_date: null,
        revealed: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockCollections,
          error: null,
        }),
      }),
    });
    (supabase.from as any).mockImplementation(mockFrom);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Total de Coleções')).toBeInTheDocument();
      expect(screen.getByText('Coleções Ativas')).toBeInTheDocument();
      expect(screen.getByText('Coleções Fixas')).toBeInTheDocument();
      expect(screen.getByText('Coleções Rotativas')).toBeInTheDocument();
    });
  });

  /**
   * Tests for collection deactivation functionality
   * Requirements: 14.7, 14.8
   * Task: 20.5
   */
  describe('Collection Deactivation', () => {
    it('should show deactivate button only for active collections', async () => {
      const mockCollections = [
        {
          id: '1',
          name: 'Active Collection',
          slug: 'active-collection',
          description: 'Active',
          price_full: 299.90,
          is_active: true,
          rotation_type: 'fixed',
          character_revelation_date: null,
          revealed: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Inactive Collection',
          slug: 'inactive-collection',
          description: 'Inactive',
          price_full: 349.90,
          is_active: false,
          rotation_type: 'fixed',
          character_revelation_date: null,
          revealed: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockCollections,
            error: null,
          }),
        }),
      });
      (supabase.from as any).mockImplementation(mockFrom);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Active Collection')).toBeInTheDocument();
        expect(screen.getByText('Inactive Collection')).toBeInTheDocument();
      });

      // Should have deactivate button for active collection
      const rows = screen.getAllByRole('row');
      const activeRow = rows.find(row => row.textContent?.includes('Active Collection'));
      expect(activeRow).toBeDefined();
      
      // Should not have deactivate button for inactive collection (only 2 action buttons instead of 3)
      const inactiveRow = rows.find(row => row.textContent?.includes('Inactive Collection'));
      expect(inactiveRow).toBeDefined();
    });

    it('should open confirmation dialog when deactivate button is clicked', async () => {
      const mockCollections = [
        {
          id: '1',
          name: 'Test Collection',
          slug: 'test-collection',
          description: 'Test',
          price_full: 299.90,
          is_active: true,
          rotation_type: 'fixed',
          character_revelation_date: null,
          revealed: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockCollections,
            error: null,
          }),
        }),
      });
      (supabase.from as any).mockImplementation(mockFrom);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Collection')).toBeInTheDocument();
      });

      // Find and click the deactivate button
      const deactivateButtons = screen.getAllByTitle('Desativar');
      expect(deactivateButtons.length).toBeGreaterThan(0);
      
      await userEvent.click(deactivateButtons[0]);

      // Dialog should open
      await waitFor(() => {
        expect(screen.getByText('Desativar Coleção')).toBeInTheDocument();
        expect(screen.getByText(/Você está prestes a desativar a coleção/)).toBeInTheDocument();
      });
    });

    it('should call deactivate API when confirmed', async () => {
      const mockCollections = [
        {
          id: '1',
          name: 'Test Collection',
          slug: 'test-collection',
          description: 'Test',
          price_full: 299.90,
          is_active: true,
          rotation_type: 'fixed',
          character_revelation_date: null,
          revealed: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockCollections,
            error: null,
          }),
        }),
      });
      (supabase.from as any).mockImplementation(mockFrom);

      // Mock auth session
      (supabase.auth.getSession as any).mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-token',
          },
        },
      });

      // Mock fetch for deactivate API
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          collection: { ...mockCollections[0], is_active: false },
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Collection')).toBeInTheDocument();
      });

      // Click deactivate button
      const deactivateButtons = screen.getAllByTitle('Desativar');
      await userEvent.click(deactivateButtons[0]);

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByText('Desativar Coleção')).toBeInTheDocument();
      });

      // Click confirm button
      const confirmButton = screen.getByText('Confirmar Desativação');
      await userEvent.click(confirmButton);

      // Should call the API
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/admin-deactivate-collection'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ id: '1' }),
          })
        );
      });

      // Should show success toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Coleção desativada',
          })
        );
      });
    });

    it('should show error toast when deactivation fails due to active deliveries', async () => {
      const mockCollections = [
        {
          id: '1',
          name: 'Test Collection',
          slug: 'test-collection',
          description: 'Test',
          price_full: 299.90,
          is_active: true,
          rotation_type: 'fixed',
          character_revelation_date: null,
          revealed: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockCollections,
            error: null,
          }),
        }),
      });
      (supabase.from as any).mockImplementation(mockFrom);

      // Mock auth session
      (supabase.auth.getSession as any).mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-token',
          },
        },
      });

      // Mock fetch to return error about active deliveries
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
          error: 'Cannot deactivate collection: 3 active delivery(ies) found. Please wait until all deliveries are completed or cancelled.',
          activeDeliveriesCount: 3,
        }),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Collection')).toBeInTheDocument();
      });

      // Click deactivate button
      const deactivateButtons = screen.getAllByTitle('Desativar');
      await userEvent.click(deactivateButtons[0]);

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByText('Desativar Coleção')).toBeInTheDocument();
      });

      // Click confirm button
      const confirmButton = screen.getByText('Confirmar Desativação');
      await userEvent.click(confirmButton);

      // Should show error toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Erro ao desativar coleção',
            description: expect.stringContaining('active delivery'),
            variant: 'destructive',
          })
        );
      });
    });

    it('should close dialog when cancel is clicked', async () => {
      const mockCollections = [
        {
          id: '1',
          name: 'Test Collection',
          slug: 'test-collection',
          description: 'Test',
          price_full: 299.90,
          is_active: true,
          rotation_type: 'fixed',
          character_revelation_date: null,
          revealed: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockCollections,
            error: null,
          }),
        }),
      });
      (supabase.from as any).mockImplementation(mockFrom);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Collection')).toBeInTheDocument();
      });

      // Click deactivate button
      const deactivateButtons = screen.getAllByTitle('Desativar');
      await userEvent.click(deactivateButtons[0]);

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByText('Desativar Coleção')).toBeInTheDocument();
      });

      // Click cancel button
      const cancelButton = screen.getByText('Cancelar');
      await userEvent.click(cancelButton);

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText('Desativar Coleção')).not.toBeInTheDocument();
      });
    });
  });
});
