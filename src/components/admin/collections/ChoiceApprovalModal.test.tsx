/**
 * Tests for ChoiceApprovalModal component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChoiceApprovalModal } from "./ChoiceApprovalModal";
import type { CharacterChoice } from "@/hooks/admin/useChoiceApproval";
import * as choiceHooks from "@/hooks/admin/useChoiceApproval";

// Mock the hooks
vi.mock("@/hooks/admin/useChoiceApproval", () => ({
  useApproveChoice: vi.fn(),
  useRejectChoice: vi.fn(),
}));

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { stock_quantity: 10 }, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        neq: vi.fn(() => ({
          gt: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "test-user" } } })),
    },
  },
}));

// Mock toast
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockChoice: CharacterChoice = {
  id: "choice-1",
  orderId: "order-123",
  orderType: "subscription_delivery",
  userId: "user-1",
  customerName: "John Doe",
  customerEmail: "john@example.com",
  collectionId: "collection-1",
  collectionName: "Marvel Heroes",
  characterId: "char-1",
  characterName: "Spider-Man",
  characterImageUrl: "https://example.com/spiderman.jpg",
  status: "submitted",
  submittedAt: "2024-01-15T10:00:00Z",
  approvedAt: null,
  approvedBy: null,
  approvedByName: null,
  rejectedAt: null,
  rejectionReason: null,
  deadline: "2024-01-22T10:00:00Z",
  remindersSent: 1,
  lastReminderAt: "2024-01-20T10:00:00Z",
  previousChoiceId: null,
  changeReason: null,
  changeCount: 0,
  createdAt: "2024-01-15T09:00:00Z",
  updatedAt: "2024-01-15T10:00:00Z",
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("ChoiceApprovalModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(choiceHooks.useApproveChoice).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(mockChoice),
    } as unknown as ReturnType<typeof choiceHooks.useApproveChoice>);
    vi.mocked(choiceHooks.useRejectChoice).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(mockChoice),
    } as unknown as ReturnType<typeof choiceHooks.useRejectChoice>);
  });

  it("renders modal with choice details when open", async () => {
    renderWithProviders(
      <ChoiceApprovalModal choice={mockChoice} open={true} onOpenChange={vi.fn()} />
    );

    // Check for customer information
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();

    // Check for collection information
    expect(screen.getByText("Marvel Heroes")).toBeInTheDocument();

    // Check for character information
    expect(screen.getByText("Spider-Man")).toBeInTheDocument();
    expect(screen.getByAltText("Spider-Man")).toBeInTheDocument();

    // Check for action buttons
    expect(screen.getByRole("button", { name: /aprovar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /rejeitar/i })).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    renderWithProviders(
      <ChoiceApprovalModal choice={mockChoice} open={false} onOpenChange={vi.fn()} />
    );

    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
  });

  it("calls approveChoice when approve button is clicked", async () => {
    const user = userEvent.setup();
    const approveHook = vi.mocked(choiceHooks.useApproveChoice)();
    const mockApprove = vi.mocked(approveHook.mutateAsync);

    renderWithProviders(
      <ChoiceApprovalModal choice={mockChoice} open={true} onOpenChange={vi.fn()} />
    );

    const approveButton = screen.getByRole("button", { name: /aprovar/i });
    await user.click(approveButton);

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith("choice-1");
    });
  });

  it("shows rejection form when reject button is clicked", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ChoiceApprovalModal choice={mockChoice} open={true} onOpenChange={vi.fn()} />
    );

    const rejectButton = screen.getByRole("button", { name: /rejeitar/i });
    await user.click(rejectButton);

    // Check for rejection form elements
    expect(screen.getByLabelText(/motivo da rejeição/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirmar rejeição/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /voltar/i })).toBeInTheDocument();
  });

  it("calls rejectChoice with reason when rejection is confirmed", async () => {
    const user = userEvent.setup();
    const rejectHook = vi.mocked(choiceHooks.useRejectChoice)();
    const mockReject = vi.mocked(rejectHook.mutateAsync);

    renderWithProviders(
      <ChoiceApprovalModal choice={mockChoice} open={true} onOpenChange={vi.fn()} />
    );

    // Click reject button
    const rejectButton = screen.getByRole("button", { name: /rejeitar/i });
    await user.click(rejectButton);

    // Enter rejection reason
    const reasonTextarea = screen.getByLabelText(/motivo da rejeição/i);
    await user.type(reasonTextarea, "Out of stock");

    // Confirm rejection
    const confirmButton = screen.getByRole("button", { name: /confirmar rejeição/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledWith({ choiceId: "choice-1", reason: "Out of stock" });
    });
  });

  it("displays stock level information", async () => {
    renderWithProviders(
      <ChoiceApprovalModal choice={mockChoice} open={true} onOpenChange={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText(/estoque disponível/i)).toBeInTheDocument();
      expect(screen.getByText(/10 unidades/i)).toBeInTheDocument();
    });
  });

  it("shows suggest alternative button when stock is low", async () => {
    // Mock low stock
    const { supabase } = await import("@/integrations/supabase/client");
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { stock_quantity: 3 }, error: null })),
        })),
      })),
    } as unknown as ReturnType<typeof supabase.from>);

    renderWithProviders(
      <ChoiceApprovalModal choice={mockChoice} open={true} onOpenChange={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText(/estoque baixo/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sugerir personagem alternativo/i })).toBeInTheDocument();
    });
  });

  it("disables approve button when character is out of stock", async () => {
    // Mock out of stock
    const { supabase } = await import("@/integrations/supabase/client");
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { stock_quantity: 0 }, error: null })),
        })),
      })),
    } as unknown as ReturnType<typeof supabase.from>);

    renderWithProviders(
      <ChoiceApprovalModal choice={mockChoice} open={true} onOpenChange={vi.fn()} />
    );

    await waitFor(() => {
      const approveButton = screen.getByRole("button", { name: /aprovar/i });
      expect(approveButton).toBeDisabled();
      // Check for the specific "Sem estoque" badge text
      expect(screen.getAllByText(/sem estoque/i).length).toBeGreaterThan(0);
    });
  });

  it("calls onOpenChange when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const mockOnOpenChange = vi.fn();

    renderWithProviders(
      <ChoiceApprovalModal choice={mockChoice} open={true} onOpenChange={mockOnOpenChange} />
    );

    const cancelButton = screen.getByRole("button", { name: /cancelar/i });
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("returns null when choice is null", () => {
    const { container } = renderWithProviders(
      <ChoiceApprovalModal choice={null} open={true} onOpenChange={vi.fn()} />
    );

    expect(container.firstChild).toBeNull();
  });
});
