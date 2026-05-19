/**
 * Testes para o hook usePaymentRealtime
 * 
 * Requirements: 16.1-16.15
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { usePaymentRealtime, usePaymentStatusRealtime, useNewPaymentsRealtime } from "./use-payment-realtime";

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: vi.fn(),
    removeChannel: vi.fn(),
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));

// Wrapper para React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe("usePaymentRealtime", () => {
  let mockChannel: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockImplementation((callback) => {
        // Simular conexão bem-sucedida após um delay
        setTimeout(() => {
          callback("SUBSCRIBED", null);
        }, 10);
        return mockChannel;
      }),
    };

    (supabase.channel as any).mockReturnValue(mockChannel);
    (supabase.removeChannel as any).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deve criar um canal de realtime para assinar mudanças de pagamento", async () => {
    const onPaymentChange = vi.fn();
    
    const { result } = renderHook(
      () => usePaymentRealtime({ onPaymentChange }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalled();
      expect(mockChannel.on).toHaveBeenCalledWith(
        "postgres_changes",
        expect.objectContaining({
          schema: "public",
          table: "manual_payments",
        }),
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("deve filtrar por paymentId quando fornecido", async () => {
    const paymentId = "test-payment-id";
    
    renderHook(
      () => usePaymentRealtime({ paymentId }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockChannel.on).toHaveBeenCalledWith(
        "postgres_changes",
        expect.objectContaining({
          filter: `id=eq.${paymentId}`,
        }),
        expect.any(Function)
      );
    });
  });

  it("deve filtrar por userId quando fornecido", async () => {
    const userId = "test-user-id";
    
    renderHook(
      () => usePaymentRealtime({ userId }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockChannel.on).toHaveBeenCalledWith(
        "postgres_changes",
        expect.objectContaining({
          filter: `user_id=eq.${userId}`,
        }),
        expect.any(Function)
      );
    });
  });

  it("deve filtrar por status quando fornecido", async () => {
    const status = "pending";
    
    renderHook(
      () => usePaymentRealtime({ status }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockChannel.on).toHaveBeenCalledWith(
        "postgres_changes",
        expect.objectContaining({
          filter: `status=eq.${status}`,
        }),
        expect.any(Function)
      );
    });
  });

  it("deve filtrar por múltiplos status quando fornecido como array", async () => {
    const status = ["pending", "under_review"];
    
    renderHook(
      () => usePaymentRealtime({ status }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockChannel.on).toHaveBeenCalledWith(
        "postgres_changes",
        expect.objectContaining({
          filter: expect.stringContaining("or(status=eq.pending,status=eq.under_review)"),
        }),
        expect.any(Function)
      );
    });
  });

  it("deve chamar onPaymentChange quando receber uma mudança", async () => {
    const onPaymentChange = vi.fn();
    let changeCallback: (payload: any) => void;
    
    mockChannel.on.mockImplementation((event: string, config: any, callback: (payload: any) => void) => {
      if (event === "postgres_changes") {
        changeCallback = callback;
      }
      return mockChannel;
    });
    
    const { result } = renderHook(
      () => usePaymentRealtime({ onPaymentChange }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simular uma mudança
    const mockPayload = {
      eventType: "UPDATE",
      old: { id: "test-id", status: "pending" },
      new: { id: "test-id", status: "approved" },
    };
    
    act(() => {
      changeCallback!(mockPayload);
    });

    expect(onPaymentChange).toHaveBeenCalledWith({
      event: "UPDATE",
      old: mockPayload.old,
      new: mockPayload.new,
    });
  });

  it("deve lidar com erro de conexão e tentar reconectar", async () => {
    vi.useFakeTimers();
    
    let subscribeCallback: (status: string) => void;
    mockChannel.subscribe.mockImplementation((callback: (status: string) => void) => {
      subscribeCallback = callback;
      return mockChannel;
    });
    
    const { result } = renderHook(
      () => usePaymentRealtime(),
      { wrapper: createWrapper() }
    );

    // Simular erro de conexão
    act(() => {
      subscribeCallback!("CHANNEL_ERROR", new Error("Connection failed"));
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeDefined();
    expect(result.current.isReconnecting).toBe(true);

    // Avançar o tempo para a primeira tentativa de reconexão
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Deve ter tentado reconectar
    expect(supabase.channel).toHaveBeenCalledTimes(2);
  });

  it("deve desconectar quando o hook é desmontado", async () => {
    const { unmount } = renderHook(
      () => usePaymentRealtime(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    unmount();

    expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });

  it("deve permitir reconexão manual", async () => {
    const { result } = renderHook(
      () => usePaymentRealtime(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);

    act(() => {
      result.current.reconnect();
    });

    // Deve ter criado um novo canal
    expect(supabase.channel).toHaveBeenCalledTimes(2);
  });
});

describe("usePaymentStatusRealtime", () => {
  it("deve assinar apenas atualizações de status", async () => {
    const onStatusChange = vi.fn();
    
    renderHook(
      () => usePaymentStatusRealtime("test-payment-id", onStatusChange),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalled();
    });
  });
});

describe("useNewPaymentsRealtime", () => {
  it("deve assinar apenas novos pagamentos", async () => {
    const onNewPayment = vi.fn();
    
    renderHook(
      () => useNewPaymentsRealtime("test-user-id", onNewPayment),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalled();
    });
  });
});
