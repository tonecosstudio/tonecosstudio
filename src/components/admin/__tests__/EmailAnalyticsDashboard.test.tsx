import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EmailAnalyticsDashboard } from "../email/EmailAnalyticsDashboard";
import { useEmailLogs, useEmailStats } from "@/hooks/admin/useEmailAnalytics";

vi.mock("@/hooks/admin/useEmailAnalytics", () => ({
  useEmailStats: vi.fn(),
  useEmailLogs: vi.fn(),
}));

const useEmailStatsMock = vi.mocked(useEmailStats);
const useEmailLogsMock = vi.mocked(useEmailLogs);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("EmailAnalyticsDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEmailStatsMock.mockReturnValue({
      data: {
        total: 7,
        sent: 2,
        failed: 2,
        bounced: 1,
        opened: 2,
        clicked: 1,
        pending: 1,
      },
    } as ReturnType<typeof useEmailStats>);
    useEmailLogsMock.mockReturnValue({
      data: [
        {
          id: "1",
          recipient_email: "user1@example.com",
          email_type: "welcome",
          subject: "Welcome to ORDAX",
          status: "sent",
          provider: "sendgrid",
          error_message: null,
          retry_count: 0,
          sent_at: "2024-01-01T10:00:00Z",
          opened_at: null,
          clicked_at: null,
          bounced_at: null,
          created_at: "2024-01-01T10:00:00Z",
        },
      ],
      isLoading: false,
    } as ReturnType<typeof useEmailLogs>);
  });

  it("should display statistics cards", () => {
    render(<EmailAnalyticsDashboard />, { wrapper: createWrapper() });

    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText(/2 entregues/)).toBeInTheDocument();
    expect(screen.getByText("100.0%")).toBeInTheDocument();
    expect(screen.getByText("50.0%")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("should display email logs", () => {
    render(<EmailAnalyticsDashboard />, { wrapper: createWrapper() });

    expect(screen.getByText("user1@example.com")).toBeInTheDocument();
    expect(screen.getByText("Welcome to ORDAX")).toBeInTheDocument();
    expect(screen.getByText("Boas-vindas")).toBeInTheDocument();
    expect(screen.getByText("Enviado")).toBeInTheDocument();
  });

  it("should show empty state when no logs", () => {
    useEmailLogsMock.mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useEmailLogs>);

    render(<EmailAnalyticsDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText("Nenhum email encontrado")).toBeInTheDocument();
  });

  it("should show loading state", () => {
    useEmailLogsMock.mockReturnValue({
      data: [],
      isLoading: true,
    } as ReturnType<typeof useEmailLogs>);

    render(<EmailAnalyticsDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });
});

