import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GroupMembersList } from './GroupMembersList';
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

describe('GroupMembersList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    vi.mocked(membershipService.getGroupMembers).mockReturnValue(
      new Promise(() => {})
    );

    render(<GroupMembersList groupId="group-1" />, { wrapper: createWrapper() });
    expect(screen.getByText(/carregando membros/i)).toBeInTheDocument();
  });

  it('renders empty state when no members', async () => {
    vi.mocked(membershipService.getGroupMembers).mockResolvedValue([]);

    render(<GroupMembersList groupId="group-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/nenhum membro neste grupo/i)).toBeInTheDocument();
    });
  });

  it('renders member list', async () => {
    const members = [
      {
        id: 'member-1',
        group_id: 'group-1',
        user_id: 'user-1',
        user_email: 'user1@example.com',
        joined_at: '2024-01-01T00:00:00Z',
        last_viewed_at: '2024-01-02T00:00:00Z',
      },
      {
        id: 'member-2',
        group_id: 'group-1',
        user_id: 'user-2',
        user_email: 'user2@example.com',
        joined_at: '2024-01-03T00:00:00Z',
        last_viewed_at: null,
      },
    ];

    vi.mocked(membershipService.getGroupMembers).mockResolvedValue(members);

    render(<GroupMembersList groupId="group-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      expect(screen.getByText('user2@example.com')).toBeInTheDocument();
    });
  });

  it('shows add member button when onAddMember provided', async () => {
    vi.mocked(membershipService.getGroupMembers).mockResolvedValue([]);
    const onAddMember = vi.fn();

    render(<GroupMembersList groupId="group-1" onAddMember={onAddMember} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /adicionar membro/i });
      expect(button).toBeInTheDocument();
    });
  });

  it('calls onAddMember when button clicked', async () => {
    vi.mocked(membershipService.getGroupMembers).mockResolvedValue([]);
    const onAddMember = vi.fn();
    const user = userEvent.setup();

    render(<GroupMembersList groupId="group-1" onAddMember={onAddMember} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /adicionar membro/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /adicionar membro/i }));
    expect(onAddMember).toHaveBeenCalledOnce();
  });

  it('removes member when delete button clicked', async () => {
    const members = [
      {
        id: 'member-1',
        group_id: 'group-1',
        user_id: 'user-1',
        user_email: 'user1@example.com',
        joined_at: '2024-01-01T00:00:00Z',
        last_viewed_at: null,
      },
    ];

    vi.mocked(membershipService.getGroupMembers).mockResolvedValue(members);
    vi.mocked(membershipService.removeMember).mockResolvedValue();
    const user = userEvent.setup();

    render(<GroupMembersList groupId="group-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(btn => btn.querySelector('svg'));
    
    if (deleteButton) {
      await user.click(deleteButton);
      await waitFor(() => {
        expect(membershipService.removeMember).toHaveBeenCalledWith('member-1');
      });
    }
  });

  it('displays member count', async () => {
    const members = [
      {
        id: 'member-1',
        group_id: 'group-1',
        user_id: 'user-1',
        user_email: 'user1@example.com',
        joined_at: '2024-01-01T00:00:00Z',
        last_viewed_at: null,
      },
      {
        id: 'member-2',
        group_id: 'group-1',
        user_id: 'user-2',
        user_email: 'user2@example.com',
        joined_at: '2024-01-02T00:00:00Z',
        last_viewed_at: null,
      },
    ];

    vi.mocked(membershipService.getGroupMembers).mockResolvedValue(members);

    render(<GroupMembersList groupId="group-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/membros \(2\)/i)).toBeInTheDocument();
    });
  });
});
