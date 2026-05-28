/**
 * Testes para o hook useConversationRealtime
 * 
 * Requirements: 16.1-16.15
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { 
  useConversationRealtime, 
  useConversationMessagesRealtime,
  useMessageReadRealtime,
  usePaymentConversationRealtime 
} from "./use-conversation-realtime";

type MockRealtimePayload = {
  eventType?: string;
  old?: unknown;
  new?: unknown;
};

type MockRealtimeChannel = {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
};

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

describe("useConversationRealtime", () => {
  let mockChannel: MockRealtimeChannel;

  beforeEach(() => {
    vi.useRealTimers();
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

    vi.mocked(supabase.channel).mockReturnValue(mockChannel as ReturnType<typeof supabase.channel>);
    vi.mocked(supabase.removeChannel).mockResolvedValue("ok");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deve criar um canal de realtime para assinar mensagens", async () => {
    const onNewMessage = vi.fn();
    
    const { result } = renderHook(
      () => useConversationRealtime({ onNewMessage }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalled();
      expect(mockChannel.on).toHaveBeenCalledWith(
        "postgres_changes",
        expect.objectContaining({
          schema: "public",
          table: "support_messages",
        }),
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
    expect(result.current.error).toBeNull();
  });

  it("deve filtrar por conversationId quando fornecido", async () => {
    const conversationId = "test-conversation-id";
    
    renderHook(
      () => useConversationRealtime({ conversationId }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockChannel.on).toHaveBeenCalledWith(
        "postgres_changes",
        expect.objectContaining({
          filter: `conversation_id=eq.${conversationId}`,
        }),
        expect.any(Function)
      );
    });
  });

  it("deve filtrar por userId quando fornecido", async () => {
    const userId = "test-user-id";
    
    renderHook(
      () => useConversationRealtime({ 
        userId,
        subscribeToConversations: true 
      }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      // Deve ter criado dois canais: um para mensagens e outro para conversas
      expect(supabase.channel).toHaveBeenCalledTimes(2);
    });
  });

  it("deve filtrar por paymentId quando fornecido", async () => {
    const paymentId = "test-payment-id";
    
    renderHook(
      () => useConversationRealtime({ 
        paymentId,
        subscribeToConversations: true 
      }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalledTimes(2);
    });
  });

  it("deve chamar onNewMessage quando receber uma nova mensagem", async () => {
    const onNewMessage = vi.fn();
    let changeCallback: (payload: MockRealtimePayload) => void;
    
    mockChannel.on.mockImplementation((
      event: string,
      _config: unknown,
      callback: (payload: MockRealtimePayload) => void
    ) => {
      if (event === "postgres_changes") {
        changeCallback = callback;
      }
      return mockChannel;
    });
    
    const { result } = renderHook(
      () => useConversationRealtime({ onNewMessage }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simular uma nova mensagem
    const mockPayload = {
      eventType: "INSERT",
      new: { 
        id: "test-message-id", 
        conversation_id: "test-conv-id",
        sender_id: "test-user-id",
        message: "Test message",
        is_internal: false,
        attachments: [],
        read_by_customer: false,
        read_by_admin: false,
        created_at: "2024-01-01T00:00:00Z"
      },
    };
    
    act(() => {
      changeCallback!(mockPayload);
    });

    expect(onNewMessage).toHaveBeenCalledWith(mockPayload.new);
  });

  it("deve chamar onMessageUpdate quando uma mensagem for atualizada", async () => {
    const onMessageUpdate = vi.fn();
    let changeCallback: (payload: MockRealtimePayload) => void;
    
    mockChannel.on.mockImplementation((
      event: string,
      _config: unknown,
      callback: (payload: MockRealtimePayload) => void
    ) => {
      if (event === "postgres_changes") {
        changeCallback = callback;
      }
      return mockChannel;
    });
    
    const { result } = renderHook(
      () => useConversationRealtime({ onMessageUpdate }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simular uma atualização de mensagem
    const mockPayload = {
      eventType: "UPDATE",
      old: { 
        id: "test-message-id", 
        read_by_customer: false,
        read_by_admin: false,
      },
      new: { 
        id: "test-message-id", 
        read_by_customer: true,
        read_by_admin: false,
      },
    };
    
    act(() => {
      changeCallback!(mockPayload);
    });

    expect(onMessageUpdate).toHaveBeenCalledWith(mockPayload.new, mockPayload.old);
  });

  it("deve chamar onConversationUpdate quando uma conversa for atualizada", async () => {
    const onConversationUpdate = vi.fn();
    let changeCallback: (payload: MockRealtimePayload) => void;
    
    mockChannel.on.mockImplementation((
      event: string,
      _config: unknown,
      callback: (payload: MockRealtimePayload) => void
    ) => {
      if (event === "postgres_changes") {
        changeCallback = callback;
      }
      return mockChannel;
    });
    
    const { result } = renderHook(
      () => useConversationRealtime({ 
        subscribeToConversations: true,
        onConversationUpdate 
      }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simular uma atualização de conversa
    const mockPayload = {
      eventType: "UPDATE",
      old: { 
        id: "test-conv-id", 
        status: "waiting_admin",
      },
      new: { 
        id: "test-conv-id", 
        status: "resolved",
      },
    };
    
    act(() => {
      changeCallback!(mockPayload);
    });

    expect(onConversationUpdate).toHaveBeenCalledWith(mockPayload.new, mockPayload.old);
  });

  it("deve lidar com erro de conexão e tentar reconectar", async () => {
    vi.useFakeTimers();
    
    let subscribeCallback: (status: string) => void;
    mockChannel.subscribe.mockImplementation((callback: (status: string) => void) => {
      subscribeCallback = callback;
      return mockChannel;
    });
    
    const { result } = renderHook(
      () => useConversationRealtime(),
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
      () => useConversationRealtime(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    unmount();

    expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });
});

describe("useConversationMessagesRealtime", () => {
  it("deve assinar apenas novas mensagens de uma conversa específica", async () => {
    const onNewMessage = vi.fn();
    const conversationId = "test-conversation-id";
    
    renderHook(
      () => useConversationMessagesRealtime(conversationId, onNewMessage),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalled();
    });
  });
});

describe("useMessageReadRealtime", () => {
  it("deve assinar apenas atualizações de leitura de mensagens", async () => {
    const onMessageRead = vi.fn();
    
    renderHook(
      () => useMessageReadRealtime("test-conversation-id", onMessageRead),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalled();
    });
  });
});

describe("usePaymentConversationRealtime", () => {
  it("deve assinar conversas relacionadas a um pagamento", async () => {
    const onConversationUpdate = vi.fn();
    const paymentId = "test-payment-id";
    
    renderHook(
      () => usePaymentConversationRealtime(paymentId, onConversationUpdate),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalled();
    });
  });
});
