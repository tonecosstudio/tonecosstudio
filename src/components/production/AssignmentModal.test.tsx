/**
 * Unit tests for AssignmentModal component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssignmentModal } from './AssignmentModal';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('AssignmentModal', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnConfirm = vi.fn();

  const mockTeamMembers = [
    { id: '1', full_name: 'Alice Smith', email: 'alice@example.com' },
    { id: '2', full_name: 'Bob Johnson', email: 'bob@example.com' },
    { id: '3', full_name: 'Charlie Brown', email: 'charlie@example.com' },
  ];

  const mockWorkloadData = [
    { assigned_to: '1' },
    { assigned_to: '1' },
    { assigned_to: '2' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnConfirm.mockResolvedValue(undefined);

    // Mock Supabase queries
    const mockSelect = vi.fn().mockReturnThis();

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: mockSelect,
          order: () => ({
            then: (callback: any) =>
              callback({ data: mockTeamMembers, error: null }),
          }),
        };
      }
      if (table === 'production_queue') {
        return {
          select: () => ({
            not: () => ({
              in: () => ({
                then: (callback: any) =>
                  callback({ data: mockWorkloadData, error: null }),
              }),
            }),
          }),
        };
      }
      return { select: mockSelect };
    });
  });

  it('renders modal with title and description', async () => {
    render(
      <AssignmentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText('Atribuir Item de Produção')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Selecione um membro da equipe para atribuir este item de produção.'
      )
    ).toBeInTheDocument();
  });

  it('displays search input', async () => {
    render(
      <AssignmentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
      />
    );

    const searchInput = screen.getByPlaceholderText('Buscar por nome ou email...');
    expect(searchInput).toBeInTheDocument();
  });

  it('displays team members with workload', async () => {
    render(
      <AssignmentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    expect(screen.getByText('Charlie Brown')).toBeInTheDocument();

    // Check workload display
    expect(screen.getByText(/alice@example\.com • 2 itens atribuídos/i)).toBeInTheDocument();
    expect(screen.getByText(/bob@example\.com • 1 item atribuído/i)).toBeInTheDocument();
    expect(screen.getByText(/charlie@example\.com • 0 itens atribuídos/i)).toBeInTheDocument();
  });

  it('filters team members by search term', async () => {
    const user = userEvent.setup();

    render(
      <AssignmentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Buscar por nome ou email...');
    await user.type(searchInput, 'alice');

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
      expect(screen.queryByText('Charlie Brown')).not.toBeInTheDocument();
    });
  });

  it('shows message when no members match search', async () => {
    const user = userEvent.setup();

    render(
      <AssignmentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Buscar por nome ou email...');
    await user.type(searchInput, 'nonexistent');

    await waitFor(() => {
      expect(
        screen.getByText('Nenhum membro encontrado com esse critério')
      ).toBeInTheDocument();
    });
  });

  it('allows selecting a team member', async () => {
    const user = userEvent.setup();

    render(
      <AssignmentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    const aliceOption = screen.getByLabelText(/Alice Smith/i);
    await user.click(aliceOption);

    expect(aliceOption).toBeChecked();
  });

  it('calls onConfirm when assign button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <AssignmentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    // Select Alice
    const aliceOption = screen.getByLabelText(/Alice Smith/i);
    await user.click(aliceOption);

    // Click assign button
    const assignButton = screen.getByRole('button', { name: /Atribuir/i });
    await user.click(assignButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith('1', undefined);
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('disables assign button when no member is selected', async () => {
    render(
      <AssignmentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    const assignButton = screen.getByRole('button', { name: /Atribuir/i });
    expect(assignButton).toBeDisabled();
  });

  it('calls onOpenChange when cancel button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <AssignmentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('pre-selects current assignee when provided', async () => {
    render(
      <AssignmentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        currentAssignee="2"
        onConfirm={mockOnConfirm}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    const bobOption = screen.getByLabelText(/Bob Johnson/i);
    expect(bobOption).toBeChecked();
  });

  it('shows loading state while fetching team members', () => {
    render(
      <AssignmentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
      />
    );

    // Should show skeleton loaders (check for the animate-pulse class)
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('clears search term when modal is closed', async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <AssignmentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Buscar por nome ou email...');
    await user.type(searchInput, 'alice');

    // Close modal
    const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
    await user.click(cancelButton);

    // Reopen modal
    rerender(
      <AssignmentModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
      />
    );

    await waitFor(() => {
      const searchInputAfterReopen = screen.getByPlaceholderText(
        'Buscar por nome ou email...'
      );
      expect(searchInputAfterReopen).toHaveValue('');
    });
  });
});
