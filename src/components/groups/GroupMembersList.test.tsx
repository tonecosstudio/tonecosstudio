import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { GroupMembersList } from "./GroupMembersList";
import { membershipService } from "@/services/groups/membership-service";
import type { PaginatedMembers } from "@/types/groups";

vi.mock("@/services/groups/membership-service", () => ({
  membershipService: {
    listMembers: vi.fn(),
    removeMember: vi.fn(),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { gcTime: 0, retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const paginatedMembers = (
  members: PaginatedMembers["members"],
): PaginatedMembers => ({
  members,
  pagination: {
    limit: 50,
    page: 1,
    total: members.length,
    total_pages: members.length > 0 ? 1 : 0,
  },
});

const mockMembers: PaginatedMembers["members"] = [
  {
    joined_at: "2024-01-01T00:00:00Z",
    last_viewed_at: "2024-01-02T00:00:00Z",
    user_email: "user1@example.com",
    user_id: "user-1",
    user_name: "User One",
  },
  {
    joined_at: "2024-01-03T00:00:00Z",
    last_viewed_at: null,
    user_email: "user2@example.com",
    user_id: "user-2",
    user_name: "User Two",
  },
];

describe("GroupMembersList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", async () => {
    let resolveMembers: (value: PaginatedMembers) => void = () => undefined;
    vi.mocked(membershipService.listMembers).mockReturnValue(
      new Promise((resolve) => {
        resolveMembers = resolve;
      }),
    );

    render(<GroupMembersList groupId="group-1" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText(/carregando membros/i)).toBeInTheDocument();

    resolveMembers(paginatedMembers([]));
    await screen.findByText(/nenhum membro neste grupo/i);
  });

  it("renders empty state when no members", async () => {
    vi.mocked(membershipService.listMembers).mockResolvedValue(
      paginatedMembers([]),
    );

    render(<GroupMembersList groupId="group-1" />, {
      wrapper: createWrapper(),
    });

    expect(
      await screen.findByText(/nenhum membro neste grupo/i),
    ).toBeInTheDocument();
  });

  it("renders member list", async () => {
    vi.mocked(membershipService.listMembers).mockResolvedValue(
      paginatedMembers(mockMembers),
    );

    render(<GroupMembersList groupId="group-1" />, {
      wrapper: createWrapper(),
    });

    expect(await screen.findByText("user1@example.com")).toBeInTheDocument();
    expect(screen.getByText("user2@example.com")).toBeInTheDocument();
    expect(screen.getByText("User One")).toBeInTheDocument();
    expect(screen.getByText("User Two")).toBeInTheDocument();
  });

  it("shows add member button when onAddMember provided", async () => {
    const onAddMember = vi.fn();
    vi.mocked(membershipService.listMembers).mockResolvedValue(
      paginatedMembers([]),
    );

    render(<GroupMembersList groupId="group-1" onAddMember={onAddMember} />, {
      wrapper: createWrapper(),
    });

    expect(
      await screen.findByRole("button", { name: /adicionar membro/i }),
    ).toBeInTheDocument();
  });

  it("calls onAddMember when button clicked", async () => {
    const onAddMember = vi.fn();
    const user = userEvent.setup();
    vi.mocked(membershipService.listMembers).mockResolvedValue(
      paginatedMembers([]),
    );

    render(<GroupMembersList groupId="group-1" onAddMember={onAddMember} />, {
      wrapper: createWrapper(),
    });

    await user.click(
      await screen.findByRole("button", { name: /adicionar membro/i }),
    );

    expect(onAddMember).toHaveBeenCalledOnce();
  });

  it("removes member by group and user id", async () => {
    const user = userEvent.setup();
    vi.mocked(membershipService.listMembers).mockResolvedValue(
      paginatedMembers([mockMembers[0]]),
    );
    vi.mocked(membershipService.removeMember).mockResolvedValue(undefined);

    render(<GroupMembersList groupId="group-1" />, {
      wrapper: createWrapper(),
    });

    expect(await screen.findByText("user1@example.com")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remover User One" }));

    await waitFor(() => {
      expect(membershipService.removeMember).toHaveBeenCalledWith(
        "group-1",
        "user-1",
      );
    });
  });

  it("displays member count", async () => {
    vi.mocked(membershipService.listMembers).mockResolvedValue(
      paginatedMembers(mockMembers),
    );

    render(<GroupMembersList groupId="group-1" />, {
      wrapper: createWrapper(),
    });

    expect(await screen.findByText(/membros \(2\)/i)).toBeInTheDocument();
  });
});
