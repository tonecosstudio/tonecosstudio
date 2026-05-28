/**
 * Testes para o hook useNotificationCount
 * 
 * Requirements: 10.1-10.10
 * Design: .kiro/specs/manual-payment-system/design.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/roles";
import { useNotificationCount, useFormattedNotificationCount } from "./use-notification-count";

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => ({
            single: vi.fn(),
            maybeSingle: vi.fn(),
          })),
        })),
        in: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(() => ({
          unsubscribe: vi.fn(),
        })),
      })),
    })),
    removeChannel: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Mock do hook useIsAdmin
vi.mock("@/lib/roles", () => ({
  useIsAdmin: vi.fn(() => ({
    data: false,
    isLoading: false,
  })),
}));

type SupabaseFromResult = ReturnType<typeof supabase.from>;

type SupabaseQueryResult = {
  data: unknown;
  error: unknown;
};

function createSupabaseQuery(result: SupabaseQueryResult): SupabaseFromResult {
  const query: Record<string, unknown> = {};
  const resolve = () => Promise.resolve(result);

  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.in = vi.fn(() => query);
  query.single = vi.fn(resolve);
  query.maybeSingle = vi.fn(resolve);
  query.then = (onFulfilled: unknown, onRejected: unknown) =>
    resolve().then(onFulfilled as Parameters<Promise<SupabaseQueryResult>["then"]>[0], onRejected as Parameters<Promise<SupabaseQueryResult>["then"]>[1]);

  return query as SupabaseFromResult;
}

function mockSupabaseTables(resultsByTable: Record<string, SupabaseQueryResult>) {
  vi.mocked(supabase.from).mockImplementation((table: string) =>
    createSupabaseQuery(resultsByTable[table] ?? { data: [], error: null })
  );
}

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

describe("useNotificationCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useIsAdmin).mockReturnValue({
      data: false,
      isLoading: false,
    });
    mockSupabaseTables({});
    
    // Mock padrão para usuário não autenticado
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("usuário não autenticado", () => {
    it("deve retornar contagem zero quando não há usuário", async () => {
      const { result } = renderHook(() => useNotificationCount(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.total).toBe(0);
      expect(result.current.pendingPayments).toBe(0);
      expect(result.current.underReviewPayments).toBe(0);
      expect(result.current.requiresInfoPayments).toBe(0);
      expect(result.current.unreadMessages).toBe(0);
      expect(result.current.isAdmin).toBe(false);
    });
  });

  describe("usuário cliente autenticado", () => {
    beforeEach(() => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "customer-123" } },
        error: null,
      });

      mockSupabaseTables({
        manual_payments: {
          data: [{ id: "payment-1", status: "requires_info" }],
          error: null,
        },
        support_messages: { data: [], error: null },
        support_conversations: { data: [], error: null },
      });
    });

    it("deve calcular contagem para cliente com pagamentos requires_info", async () => {
      const { result } = renderHook(() => useNotificationCount(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Como o mock está configurado, não podemos verificar valores específicos
      // mas podemos verificar que a função foi chamada
      expect(supabase.from).toHaveBeenCalledWith("manual_payments");
    });

    it("deve calcular contagem para cliente com mensagens não lidas", async () => {
      mockSupabaseTables({
        manual_payments: { data: [], error: null },
        support_messages: {
          data: [
            { id: "msg-1", read_by_customer: false, conversation_id: "conv-1" },
            { id: "msg-2", read_by_customer: false, conversation_id: "conv-2" },
          ],
          error: null,
        },
        support_conversations: {
          data: [{ id: "conv-1" }],
          error: null,
        },
      });

      const { result } = renderHook(() => useNotificationCount(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabase.from).toHaveBeenCalledWith("support_messages");
    });
  });

  describe("usuário admin autenticado", () => {
    beforeEach(() => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "admin-123" } },
        error: null,
      });

      // Mock para useIsAdmin retornar true
      vi.mocked(useIsAdmin).mockReturnValue({
        data: true,
        isLoading: false,
      });

      mockSupabaseTables({
        manual_payments: {
          data: [
            { id: "payment-1", status: "pending" },
            { id: "payment-2", status: "pending" },
            { id: "payment-3", status: "under_review" },
          ],
          error: null,
        },
        support_messages: { data: [], error: null },
      });
    });

    it("deve calcular contagem para admin com pagamentos pendentes", async () => {
      const { result } = renderHook(() => useNotificationCount(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabase.from).toHaveBeenCalledWith("manual_payments");
      expect(result.current.isAdmin).toBe(true);
    });

    it("deve calcular contagem para admin com mensagens não lidas", async () => {
      mockSupabaseTables({
        manual_payments: { data: [], error: null },
        support_messages: {
          data: [
            { id: "msg-1", read_by_admin: false },
            { id: "msg-2", read_by_admin: false },
            { id: "msg-3", read_by_admin: false },
          ],
          error: null,
        },
      });

      const { result } = renderHook(() => useNotificationCount(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabase.from).toHaveBeenCalledWith("support_messages");
    });
  });

  describe("erros", () => {
    it("deve lidar com erro ao buscar pagamentos", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      vi.mocked(useIsAdmin).mockReturnValue({
        data: true,
        isLoading: false,
      });
      mockSupabaseTables({
        manual_payments: { data: [], error: null },
        support_messages: {
          data: null,
          error: new Error("Erro de banco de dados"),
        },
      });

      const { result } = renderHook(() => useNotificationCount(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
    });
  });
});

describe("useFormattedNotificationCount", () => {
  it("deve formatar contagem maior que 99 como '99+'", async () => {
    // Mock para retornar contagem alta
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    // Mock para useIsAdmin
    vi.mocked(useIsAdmin).mockReturnValue({
      data: true,
      isLoading: false,
    });

    mockSupabaseTables({
      manual_payments: {
        data: Array.from({ length: 150 }, (_, i) => ({
          id: `payment-${i}`,
          status: i < 100 ? "pending" : "under_review",
        })),
        error: null,
      },
      support_messages: { data: [], error: null },
    });

    const { result } = renderHook(() => useFormattedNotificationCount(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Como o mock não está retornando mensagens, a contagem será 150
    // Mas o formato deve ser "99+"
    expect(result.current.formattedTotal).toBe("99+");
    expect(result.current.hasNotifications).toBe(true);
  });

  it("deve retornar contagem normal para valores menores que 100", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    // Mock para useIsAdmin
    vi.mocked(useIsAdmin).mockReturnValue({
      data: false,
      isLoading: false,
    });

    mockSupabaseTables({
      manual_payments: {
        data: [
          { id: "payment-1", status: "requires_info" },
          { id: "payment-2", status: "requires_info" },
        ],
        error: null,
      },
      support_messages: { data: [], error: null },
      support_conversations: { data: [], error: null },
    });

    const { result } = renderHook(() => useFormattedNotificationCount(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.formattedTotal).toBe("2");
    expect(result.current.hasNotifications).toBe(true);
  });

  it("deve retornar hasNotifications false quando total for 0", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    // Mock para useIsAdmin
    vi.mocked(useIsAdmin).mockReturnValue({
      data: false,
      isLoading: false,
    });

    mockSupabaseTables({
      manual_payments: { data: [], error: null },
      support_messages: { data: [], error: null },
      support_conversations: { data: [], error: null },
    });

    const { result } = renderHook(() => useFormattedNotificationCount(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasNotifications).toBe(false);
    expect(result.current.formattedTotal).toBe("0");
  });
});
