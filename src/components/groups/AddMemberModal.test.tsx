import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddMemberModal } from './AddMemberModal';
import { membershipService } from '@/lib/services/membershipService';

vi.mock('@/lib/services/membershipService');
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('AddMemberModal', () => {
  const defaultProps = {
    groupId: 'group-1',
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open', () => {
    render(<AddMemberModal {...defaultProps} />, { wrapper: createWrapper() });
    expect(screen.getByText('Adicionar Membro')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<AddMemberModal {...defaultProps} open={false} />, { wrapper: createWrapper() });
    expect(screen.queryByText('Adicionar Membro')).not.toBeInTheDocument();
  });

  it('renders user ID input field', () => {
    render(<AddMemberModal {...defaultProps} />, { wrapper: createWrapper() });
    expect(screen.getByLabelText(/id do usuário/i)).toBeInTheDocument();
  });

  it('updates user ID when typing', async () => {
    const user = userEvent.setup();
    render(<AddMemberModal {...defaultProps} />, { wrapper: createWrapper() });

    const input = screen.getByLabelText(/id do usuário/i);
    await user.type(input, 'user-123');

    expect(input).toHaveValue('user-123');
  });

  it('calls addMember when form submitted', async () => {
    vi.mocked(membershipService.addMember).mockResolvedValue({
      id: 'member-1',
      group_id: 'group-1',
      user_id: 'user-123',
      joined_at: new Date().toISOString(),
      last_viewed_at: null,
    });

    const user = userEvent.setup();
    render(<AddMemberModal {...defaultProps} />, { wrapper: createWrapper() });

    await user.type(screen.getByLabelText(/id do usuário/i), 'user-123');
    await user.click(screen.getByRole('button', { name: /^adicionar$/i }));

    await waitFor(() => {
      expect(membershipService.addMember).toHaveBeenCalledWith('group-1', 'user-123');
    });
  });

  it('closes modal after successful submission', async () => {
    vi.mocked(membershipService.addMember).mockResolvedValue({
      id: 'member-1',
      group_id: 'group-1',
      user_id: 'user-123',
      joined_at: new Date().toISOString(),
      last_viewed_at: null,
    });

    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(<AddMemberModal {...defaultProps} onOpenChange={onOpenChange} />, {
      wrapper: createWrapper(),
    });

    await user.type(screen.getByLabelText(/id do usuário/i), 'user-123');
    await user.click(screen.getByRole('button', { name: /^adicionar$/i }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('clears input after successful submission', async () => {
    vi.mocked(membershipService.addMember).mockResolvedValue({
      id: 'member-1',
      group_id: 'group-1',
      user_id: 'user-123',
      joined_at: new Date().toISOString(),
      last_viewed_at: null,
    });

    const user = userEvent.setup();
    render(<AddMemberModal {...defaultProps} />, { wrapper: createWrapper() });

    const input = screen.getByLabelText(/id do usuário/i);
    await user.type(input, 'user-123');
    await user.click(screen.getByRole('button', { name: /^adicionar$/i }));

    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  it('calls onOpenChange when cancel button clicked', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(<AddMemberModal {...defaultProps} onOpenChange={onOpenChange} />, {
      wrapper: createWrapper(),
    });

    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables buttons while submitting', async () => {
    vi.mocked(membershipService.addMember).mockReturnValue(
      new Promise(() => {})
    );

    const user = userEvent.setup();
    render(<AddMemberModal {...defaultProps} />, { wrapper: createWrapper() });

    await user.type(screen.getByLabelText(/id do usuário/i), 'user-123');
    await user.click(screen.getByRole('button', { name: /^adicionar$/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /adicionando/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeDisabled();
    });
  });

  it('shows loading text while submitting', async () => {
    vi.mocked(membershipService.addMember).mockReturnValue(
      new Promise(() => {})
    );

    const user = userEvent.setup();
    render(<AddMemberModal {...defaultProps} />, { wrapper: createWrapper() });

    await user.type(screen.getByLabelText(/id do usuário/i), 'user-123');
    await user.click(screen.getByRole('button', { name: /^adicionar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/adicionando/i)).toBeInTheDocument();
    });
  });
});
