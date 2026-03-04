/**
 * Tests for TeamWorkloadView Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamWorkloadView } from './TeamWorkloadView';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('./AssignmentModal', () => {
  const React = require('react');
  return {
    AssignmentModal: ({ open, onConfirm }: any) => (
      open ? React.createElement('div', { 'data-testid': 'assignment-modal' },
        React.createElement('button', { onClick: () => onConfirm('user-2', 'Test reason') }, 'Confirm Assignment')
      ) : null
    ),
  };
});

vi.mock('@/services/admin/production-service', () => ({
  assignProduction: vi.fn().mockResolvedValue({}),
}));

// Helper function to setup Supabase mocks
const setupSupabaseMocks = (activeItems: any[], completedItems: any[]) => {
  const mockFrom = vi.fn((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockProfiles,
            error: null,
          }),
        }),
      };
    } else if (table === 'production_queue') {
      // Create a new counter for each table call
      let localQueryCount = 0;
      
      return {
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            in: vi.fn().mockImplementation(() => {
              localQueryCount++;
              return Promise.resolve(
                localQueryCount === 1
                  ? { data: activeItems, error: null }
                  : { data: completedItems, error: null }
              );
            }),
          }),
        }),
      };
    }

    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };
  });

  (supabase.from as any).mockImplementation(mockFrom);
};

describe('TeamWorkloadView', () => {
  const mockProfiles = [
    { id: 'user-1', full_name: 'João Silva', email: 'joao@example.com' },
    { id: 'user-2', full_name: 'Maria Santos', email: 'maria@example.com' },
    { id: 'user-3', full_name: 'Pedro Costa', email: 'pedro@example.com' },
  ];

  const mockQueueItems = [
    {
      id: 'item-1',
      order_id: 'order-1',
      order_type: 'subscription_delivery',
      customer_id: 'cust-1',
      customer_name: 'Cliente A',
      customer_email: 'clientea@example.com',
      collection_id: 'col-1',
      collection_name: 'Coleção 1',
      character_id: 'char-1',
      character_name: 'Personagem 1',
      production_status: 'in_production',
      current_stage: 'production',
      choice_status: 'approved',
      choice_deadline: null,
      choice_made_at: null,
      priority: 'high',
      priority_score: 80,
      scheduled_production_date: null,
      estimated_completion_date: null,
      assigned_to: 'user-1',
      assigned_to_name: 'João Silva',
      assigned_at: '2024-01-01T10:00:00Z',
      production_started_at: null,
      production_completed_at: null,
      production_notes: null,
      customer_notes: null,
      internal_flags: [],
      created_at: '2024-01-01T09:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
    },
    {
      id: 'item-2',
      order_id: 'order-2',
      order_type: 'standalone_purchase',
      customer_id: 'cust-2',
      customer_name: 'Cliente B',
      customer_email: 'clienteb@example.com',
      collection_id: 'col-2',
      collection_name: 'Coleção 2',
      character_id: 'char-2',
      character_name: 'Personagem 2',
      production_status: 'in_production',
      current_stage: 'design',
      choice_status: 'approved',
      choice_deadline: '2024-01-15T00:00:00Z',
      choice_made_at: null,
      priority: 'normal',
      priority_score: 50,
      scheduled_production_date: null,
      estimated_completion_date: null,
      assigned_to: 'user-1',
      assigned_to_name: 'João Silva',
      assigned_at: '2024-01-02T10:00:00Z',
      production_started_at: null,
      production_completed_at: null,
      production_notes: null,
      customer_notes: null,
      internal_flags: [],
      created_at: '2024-01-02T09:00:00Z',
      updated_at: '2024-01-02T10:00:00Z',
    },
    {
      id: 'item-3',
      order_id: 'order-3',
      order_type: 'subscription_delivery',
      customer_id: 'cust-3',
      customer_name: 'Cliente C',
      customer_email: 'clientec@example.com',
      collection_id: 'col-1',
      collection_name: 'Coleção 1',
      character_id: 'char-3',
      character_name: 'Personagem 3',
      production_status: 'ready_for_production',
      current_stage: 'design',
      choice_status: 'approved',
      choice_deadline: null,
      choice_made_at: null,
      priority: 'high',
      priority_score: 75,
      scheduled_production_date: null,
      estimated_completion_date: null,
      assigned_to: 'user-2',
      assigned_to_name: 'Maria Santos',
      assigned_at: '2024-01-03T10:00:00Z',
      production_started_at: null,
      production_completed_at: null,
      production_notes: null,
      customer_notes: null,
      internal_flags: [],
      created_at: '2024-01-03T09:00:00Z',
      updated_at: '2024-01-03T10:00:00Z',
    },
  ];

  const mockCompletedItems = [
    {
      assigned_to: 'user-1',
      production_started_at: '2024-01-01T08:00:00Z',
      production_completed_at: '2024-01-01T20:00:00Z', // 12 hours
    },
    {
      assigned_to: 'user-1',
      production_started_at: '2024-01-02T08:00:00Z',
      production_completed_at: '2024-01-02T16:00:00Z', // 8 hours
    },
    {
      assigned_to: 'user-2',
      production_started_at: '2024-01-03T08:00:00Z',
      production_completed_at: '2024-01-03T18:00:00Z', // 10 hours
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    setupSupabaseMocks(mockQueueItems, mockCompletedItems);
  });

  it('renders loading state initially', () => {
    render(<TeamWorkloadView />);
    
    // Check for skeleton loaders
    expect(screen.getAllByRole('generic').some(el => 
      el.className.includes('animate-pulse')
    )).toBe(true);
  });

  it('displays overall statistics', async () => {
    render(<TeamWorkloadView />);

    await waitFor(() => {
      expect(screen.getByText('Visão Geral da Equipe')).toBeInTheDocument();
    });

    // Check for statistics
    expect(screen.getByText('Total de Itens')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // 3 total items
    expect(screen.getByText('Média por Membro')).toBeInTheDocument();
    expect(screen.getByText('Tempo Médio de Conclusão')).toBeInTheDocument();
  });

  it('displays team members with assigned item count', async () => {
    render(<TeamWorkloadView />);

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });

    // João Silva has 2 items
    const joaoCard = screen.getByText('João Silva').closest('div')?.parentElement;
    expect(within(joaoCard!).getByText('2 itens')).toBeInTheDocument();

    // Maria Santos has 1 item
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    const mariaCard = screen.getByText('Maria Santos').closest('div')?.parentElement;
    expect(within(mariaCard!).getByText('1 itens')).toBeInTheDocument();

    // Pedro Costa has 0 items (not shown in active list)
    expect(screen.queryByText('Pedro Costa')).not.toBeInTheDocument();
  });

  it('displays average completion time per team member', async () => {
    render(<TeamWorkloadView />);

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });

    // João Silva average: (12 + 8) / 2 = 10 hours
    const joaoCard = screen.getByText('João Silva').closest('div')?.parentElement;
    expect(within(joaoCard!).getByText(/Média: 10\.0h/)).toBeInTheDocument();

    // Maria Santos average: 10 hours
    const mariaCard = screen.getByText('Maria Santos').closest('div')?.parentElement;
    expect(within(mariaCard!).getByText(/Média: 10\.0h/)).toBeInTheDocument();
  });

  it('expands member card to show assigned items', async () => {
    const user = userEvent.setup();
    render(<TeamWorkloadView />);

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });

    // Initially, items are not visible
    expect(screen.queryByText('Cliente A')).not.toBeInTheDocument();

    // Click to expand
    const joaoCard = screen.getByText('João Silva').closest('div')?.parentElement;
    await user.click(joaoCard!);

    // Now items should be visible
    await waitFor(() => {
      expect(screen.getByText('Cliente A')).toBeInTheDocument();
      expect(screen.getByText('Cliente B')).toBeInTheDocument();
    });

    // Check for stage distribution
    expect(screen.getByText('Distribuição por Estágio')).toBeInTheDocument();
  });

  it('shows reassign button for each item', async () => {
    const user = userEvent.setup();
    render(<TeamWorkloadView />);

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });

    // Expand João's card
    const joaoCard = screen.getByText('João Silva').closest('div')?.parentElement;
    await user.click(joaoCard!);

    await waitFor(() => {
      expect(screen.getByText('Cliente A')).toBeInTheDocument();
    });

    // Check for reassign buttons
    const reassignButtons = screen.getAllByRole('button', { name: /Reatribuir/i });
    expect(reassignButtons.length).toBeGreaterThan(0);
  });

  it('opens assignment modal when reassign is clicked', async () => {
    const user = userEvent.setup();
    render(<TeamWorkloadView />);

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });

    // Expand João's card
    const joaoCard = screen.getByText('João Silva').closest('div')?.parentElement;
    await user.click(joaoCard!);

    await waitFor(() => {
      expect(screen.getByText('Cliente A')).toBeInTheDocument();
    });

    // Click reassign button
    const reassignButtons = screen.getAllByRole('button', { name: /Reatribuir/i });
    await user.click(reassignButtons[0]);

    // Modal should be visible
    await waitFor(() => {
      expect(screen.getByTestId('assignment-modal')).toBeInTheDocument();
    });
  });

  it('identifies overloaded team members', async () => {
    // Mock data where one member has significantly more items
    const overloadedQueueItems = [
      ...mockQueueItems,
      { ...mockQueueItems[0], id: 'item-4', assigned_to: 'user-1' },
      { ...mockQueueItems[0], id: 'item-5', assigned_to: 'user-1' },
      { ...mockQueueItems[0], id: 'item-6', assigned_to: 'user-1' },
    ];

    setupSupabaseMocks(overloadedQueueItems, mockCompletedItems);

    render(<TeamWorkloadView />);

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });

    // Should show overloaded badge
    expect(screen.getByText('Sobrecarregado')).toBeInTheDocument();
  });

  it('shows empty state when no team members have assignments', async () => {
    setupSupabaseMocks([], []);

    render(<TeamWorkloadView />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum membro da equipe com itens atribuídos')).toBeInTheDocument();
    });
  });
});
