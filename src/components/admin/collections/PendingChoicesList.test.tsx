import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { PendingChoicesList } from "./PendingChoicesList";
import { usePendingChoices } from "@/hooks/admin/usePendingChoices";

vi.mock("@/hooks/admin/usePendingChoices", () => ({
  usePendingChoices: vi.fn(),
}));

vi.mock("@/lib/cutoff-middleware", () => ({
  getCurrentCutoffDate: vi.fn(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59, 999);
  }),
}));

const usePendingChoicesMock = vi.mocked(usePendingChoices);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe("PendingChoicesList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display loading state", () => {
    usePendingChoicesMock.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof usePendingChoices>);

    render(<PendingChoicesList cycleIds={["cycle-1"]} />, { wrapper: createWrapper() });
    expect(screen.getByText("Carregando escolhas pendentes...")).toBeInTheDocument();
  });

  it("should display empty state", () => {
    usePendingChoicesMock.mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof usePendingChoices>);

    render(<PendingChoicesList cycleIds={["cycle-1"]} />, { wrapper: createWrapper() });
    expect(screen.getByText("Todos os assinantes escolheram suas coleções")).toBeInTheDocument();
  });

  it("should render pending choices and profile link", () => {
    usePendingChoicesMock.mockReturnValue({
      data: [
        {
          delivery_id: "delivery-1",
          delivery_number: 1,
          subscription_id: "sub-1",
          user_id: "user-123",
          user_name: "John Doe",
          user_email: "john@example.com",
        },
      ],
      isLoading: false,
    } as ReturnType<typeof usePendingChoices>);

    render(<PendingChoicesList cycleIds={["cycle-1"]} />, { wrapper: createWrapper() });
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("Total: 1 escolha(s) pendente(s)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver Perfil/i })).toHaveAttribute(
      "href",
      "/admin/subscribers/user-123"
    );
  });
});

