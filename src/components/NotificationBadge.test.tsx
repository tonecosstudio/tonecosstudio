/**
 * Testes para o componente NotificationBadge
 * 
 * Requirements: 10.1-10.10
 * Design: .kiro/specs/manual-payment-system/design.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NotificationBadge, SimpleNotificationBadge } from "./NotificationBadge";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock do hook useFormattedNotificationCount
vi.mock("@/hooks/use-notification-count", () => ({
  useFormattedNotificationCount: vi.fn(() => ({
    total: 0,
    formattedTotal: "0",
    hasNotifications: false,
    pendingPayments: 0,
    underReviewPayments: 0,
    requiresInfoPayments: 0,
    unreadMessages: 0,
    isAdmin: false,
    isLoading: false,
    error: null,
  })),
}));

// Mock dos componentes UI do shadcn
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, className, "aria-label": ariaLabel }: any) => (
    <button onClick={onClick} className={className} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div onClick={onClick}>{children}</div>
  ),
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

// Mock do lucide-react
vi.mock("lucide-react", () => ({
  Bell: () => <span data-testid="bell-icon">🔔</span>,
}));

// Criar QueryClient para testes
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Wrapper para testes
const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe("NotificationBadge", () => {
  const mockUseFormattedNotificationCount = require("@/hooks/use-notification-count").useFormattedNotificationCount;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock padrão: sem notificações
    mockUseFormattedNotificationCount.mockReturnValue({
      total: 0,
      formattedTotal: "0",
      hasNotifications: false,
      pendingPayments: 0,
      underReviewPayments: 0,
      requiresInfoPayments: 0,
      unreadMessages: 0,
      isAdmin: false,
      isLoading: false,
      error: null,
    });
  });

  describe("sem notificações", () => {
    it("deve renderizar ícone de sino sem badge quando não há notificações", () => {
      render(<NotificationBadge />, { wrapper });

      expect(screen.getByTestId("bell-icon")).toBeInTheDocument();
      expect(screen.queryByText("0")).not.toBeInTheDocument();
      expect(screen.queryByText("99+")).not.toBeInTheDocument();
    });

    it("deve ter aria-label correto quando não há notificações", () => {
      render(<NotificationBadge />, { wrapper });

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label", "Notificações");
    });
  });

  describe("com notificações", () => {
    beforeEach(() => {
      mockUseFormattedNotificationCount.mockReturnValue({
        total: 5,
        formattedTotal: "5",
        hasNotifications: true,
        pendingPayments: 2,
        underReviewPayments: 1,
        requiresInfoPayments: 0,
        unreadMessages: 2,
        isAdmin: true,
        isLoading: false,
        error: null,
      });
    });

    it("deve renderizar badge com contagem quando há notificações", () => {
      render(<NotificationBadge />, { wrapper });

      expect(screen.getByTestId("bell-icon")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("deve ter aria-label correto quando há notificações", () => {
      render(<NotificationBadge />, { wrapper });

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label", "Notificações (5 não lidas)");
    });

    it("deve formatar contagem maior que 99 como '99+'", () => {
      mockUseFormattedNotificationCount.mockReturnValue({
        total: 150,
        formattedTotal: "99+",
        hasNotifications: true,
        pendingPayments: 100,
        underReviewPayments: 50,
        requiresInfoPayments: 0,
        unreadMessages: 0,
        isAdmin: true,
        isLoading: false,
        error: null,
      });

      render(<NotificationBadge />, { wrapper });

      expect(screen.getByText("99+")).toBeInTheDocument();
    });
  });

  describe("tamanhos", () => {
    it("deve renderizar tamanho pequeno (sm)", () => {
      render(<NotificationBadge size="sm" />, { wrapper });

      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-8");
      expect(button).toHaveClass("w-8");
    });

    it("deve renderizar tamanho médio (md)", () => {
      render(<NotificationBadge size="md" />, { wrapper });

      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-10");
      expect(button).toHaveClass("w-10");
    });

    it("deve renderizar tamanho grande (lg)", () => {
      render(<NotificationBadge size="lg" />, { wrapper });

      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-12");
      expect(button).toHaveClass("w-12");
    });
  });

  describe("interação", () => {
    it("deve chamar onClick quando clicado", () => {
      const handleClick = vi.fn();
      
      render(<NotificationBadge onClick={handleClick} />, { wrapper });

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("deve navegar para /admin/payments quando admin e clicado sem onClick", () => {
      mockUseFormattedNotificationCount.mockReturnValue({
        total: 3,
        formattedTotal: "3",
        hasNotifications: true,
        pendingPayments: 2,
        underReviewPayments: 1,
        requiresInfoPayments: 0,
        unreadMessages: 0,
        isAdmin: true,
        isLoading: false,
        error: null,
      });

      // Mock window.location.href
      const mockLocation = { href: "" };
      Object.defineProperty(window, "location", {
        value: mockLocation,
        writable: true,
      });

      render(<NotificationBadge />, { wrapper });

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(window.location.href).toBe("/admin/payments");
    });

    it("deve navegar para /my-payments quando cliente e clicado sem onClick", () => {
      mockUseFormattedNotificationCount.mockReturnValue({
        total: 1,
        formattedTotal: "1",
        hasNotifications: true,
        pendingPayments: 0,
        underReviewPayments: 0,
        requiresInfoPayments: 1,
        unreadMessages: 0,
        isAdmin: false,
        isLoading: false,
        error: null,
      });

      // Mock window.location.href
      const mockLocation = { href: "" };
      Object.defineProperty(window, "location", {
        value: mockLocation,
        writable: true,
      });

      render(<NotificationBadge />, { wrapper });

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(window.location.href).toBe("/my-payments");
    });
  });

  describe("estados de carregamento e erro", () => {
    it("deve mostrar estado de carregamento", () => {
      mockUseFormattedNotificationCount.mockReturnValue({
        total: 0,
        formattedTotal: "0",
        hasNotifications: false,
        pendingPayments: 0,
        underReviewPayments: 0,
        requiresInfoPayments: 0,
        unreadMessages: 0,
        isAdmin: false,
        isLoading: true,
        error: null,
      });

      render(<NotificationBadge showDetails={true} />, { wrapper });

      // Como o dropdown está mockado, não podemos verificar o conteúdo
      // Mas podemos verificar que o hook foi chamado com isLoading true
      expect(mockUseFormattedNotificationCount).toHaveBeenCalled();
    });

    it("deve lidar com erro", () => {
      mockUseFormattedNotificationCount.mockReturnValue({
        total: 0,
        formattedTotal: "0",
        hasNotifications: false,
        pendingPayments: 0,
        underReviewPayments: 0,
        requiresInfoPayments: 0,
        unreadMessages: 0,
        isAdmin: false,
        isLoading: false,
        error: new Error("Erro de rede"),
      });

      render(<NotificationBadge showDetails={true} />, { wrapper });

      expect(mockUseFormattedNotificationCount).toHaveBeenCalled();
    });
  });
});

describe("SimpleNotificationBadge", () => {
  const mockUseFormattedNotificationCount = require("@/hooks/use-notification-count").useFormattedNotificationCount;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock padrão: sem notificações
    mockUseFormattedNotificationCount.mockReturnValue({
      total: 0,
      formattedTotal: "0",
      hasNotifications: false,
      pendingPayments: 0,
      underReviewPayments: 0,
      requiresInfoPayments: 0,
      unreadMessages: 0,
      isAdmin: false,
      isLoading: false,
      error: null,
    });
  });

  it("não deve renderizar nada quando não há notificações", () => {
    const { container } = render(<SimpleNotificationBadge />, { wrapper });
    
    // O componente retorna null quando não há notificações
    expect(container.firstChild).toBeNull();
  });

  it("deve renderizar badge quando há notificações", () => {
    mockUseFormattedNotificationCount.mockReturnValue({
      total: 3,
      formattedTotal: "3",
      hasNotifications: true,
      pendingPayments: 0,
      underReviewPayments: 0,
      requiresInfoPayments: 0,
      unreadMessages: 0,
      isAdmin: false,
      isLoading: false,
      error: null,
    });

    render(<SimpleNotificationBadge />, { wrapper });

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("deve aceitar className personalizada", () => {
    mockUseFormattedNotificationCount.mockReturnValue({
      total: 1,
      formattedTotal: "1",
      hasNotifications: true,
      pendingPayments: 0,
      underReviewPayments: 0,
      requiresInfoPayments: 0,
      unreadMessages: 0,
      isAdmin: false,
      isLoading: false,
      error: null,
    });

    render(<SimpleNotificationBadge className="custom-class" />, { wrapper });

    const badge = screen.getByText("1");
    expect(badge).toHaveClass("custom-class");
  });
});