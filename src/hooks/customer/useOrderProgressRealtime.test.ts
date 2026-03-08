/**
 * Tests for useOrderProgressRealtime Hook
 * 
 * Validates real-time subscription functionality for customer order progress.
 * 
 * Task: 5.2.1 Implement Supabase Realtime subscription
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useOrderProgressRealtime } from "./useOrderProgressRealtime";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ProductionStage, ChoiceStatus } from "@/services/admin/production-service";

// Mock dependencies
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(),
}));

describe("useOrderProgressRealtime", () => {
  let queryClient: QueryClient;
  let mockToast: ReturnType<typeof vi.fn>;
  let mockChannel: any;
  let mockSubscribe: ReturnType<typeof vi.fn>;
  let mockOn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup query client
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    // Setup toast mock
    mockToast = vi.fn();
    (useToast as any).mockReturnValue({ toast: mockToast });

    // Setup channel mock
    mockSubscribe = vi.fn((callback) => {
      // Simulate successful subscription
      if (callback) {
        callback("SUBSCRIBED", null);
      }
      return mockChannel;
    });

    mockOn = vi.fn().mockReturnThis();

    mockChannel = {
      on: mockOn,
      subscribe: mockSubscribe,
    };

    (supabase.channel as any).mockReturnValue(mockChannel);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  describe("Subscription Setup", () => {
    it("should create channels for production_queue and character_choices", () => {
      const orderId = "test-order-123";
      const orderType = "subscription_delivery";

      renderHook(
        () =>
          useOrderProgressRealtime({
            orderId,
            orderType,
            enabled: true,
          }),
        { wrapper }
      );

      // Should create two channels
      expect(supabase.channel).toHaveBeenCalledTimes(2);
      expect(supabase.channel).toHaveBeenCalledWith(`production-queue:${orderId}:${orderType}`);
      expect(supabase.channel).toHaveBeenCalledWith(`character-choices:${orderId}:${orderType}`);
    });

    it("should not subscribe when enabled is false", () => {
      renderHook(
        () =>
          useOrderProgressRealtime({
            orderId: "test-order-123",
            orderType: "subscription_delivery",
            enabled: false,
          }),
        { wrapper }
      );

      expect(supabase.channel).not.toHaveBeenCalled();
    });

    it("should not subscribe when orderId is missing", () => {
      renderHook(
        () =>
          useOrderProgressRealtime({
            orderId: "",
            orderType: "subscription_delivery",
            enabled: true,
          }),
        { wrapper }
      );

      expect(supabase.channel).not.toHaveBeenCalled();
    });

    it("should subscribe to UPDATE events on production_queue", () => {
      renderHook(
        () =>
          useOrderProgressRealtime({
            orderId: "test-order-123",
            orderType: "subscription_delivery",
            enabled: true,
          }),
        { wrapper }
      );

      // Find the production queue subscription
      const productionQueueCall = mockOn.mock.calls.find(
        (call) => call[1]?.table === "production_queue"
      );

      expect(productionQueueCall).toBeDefined();
      expect(productionQueueCall[0]).toBe("postgres_changes");
      expect(productionQueueCall[1]).toMatchObject({
        event: "UPDATE",
        schema: "public",
        table: "production_queue",
        filter: "order_id=eq.test-order-123",
      });
    });

    it("should subscribe to UPDATE and INSERT events on character_choices", () => {
      renderHook(
        () =>
          useOrderProgressRealtime({
            orderId: "test-order-123",
            orderType: "subscription_delivery",
            enabled: true,
          }),
        { wrapper }
      );

      // Find character choice subscriptions
      const choiceCalls = mockOn.mock.calls.filter(
        (call) => call[1]?.table === "character_choices"
      );

      expect(choiceCalls.length).toBeGreaterThanOrEqual(2);
      
      const updateCall = choiceCalls.find((call) => call[1]?.event === "UPDATE");
      const insertCall = choiceCalls.find((call) => call[1]?.event === "INSERT");

      expect(updateCall).toBeDefined();
      expect(insertCall).toBeDefined();
    });
  });

  describe("Production Queue Updates", () => {
    it("should invalidate queries when production queue is updated", async () => {
      const orderId = "test-order-123";
      const orderType = "subscription_delivery";
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

      renderHook(
        () =>
          useOrderProgressRealtime({
            orderId,
            orderType,
            enabled: true,
          }),
        { wrapper }
      );

      // Get the production queue update handler
      const productionQueueCall = mockOn.mock.calls.find(
        (call) => call[1]?.table === "production_queue"
      );
      const updateHandler = productionQueueCall[2];

      // Simulate an update
      updateHandler({
        new: {
          id: "prod-123",
          order_id: orderId,
          order_type: orderType,
          current_stage: "production" as ProductionStage,
          production_status: "in_production",
          choice_status: "approved" as ChoiceStatus,
          character_id: "char-123",
          character_name: "Test Character",
          tracking_code: null,
          estimated_completion_date: "2024-12-31",
        },
      });

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: ["customer-order-progress", orderId, orderType],
        });
      });
    });

    it("should show toast notification when stage changes", async () => {
      const orderId = "test-order-123";
      const orderType = "subscription_delivery";

      const { rerender } = renderHook(
        () =>
          useOrderProgressRealtime({
            orderId,
            orderType,
            enabled: true,
            enableToast: true,
          }),
        { wrapper }
      );

      // Get the production queue update handler
      const productionQueueCall = mockOn.mock.calls.find(
        (call) => call[1]?.table === "production_queue"
      );
      const updateHandler = productionQueueCall[2];

      // First update - set initial stage
      updateHandler({
        new: {
          id: "prod-123",
          order_id: orderId,
          order_type: orderType,
          current_stage: "design" as ProductionStage,
          production_status: "in_production",
          choice_status: "approved" as ChoiceStatus,
          character_id: "char-123",
          character_name: "Test Character",
          tracking_code: null,
          estimated_completion_date: "2024-12-31",
        },
      });

      // Second update - change stage
      updateHandler({
        new: {
          id: "prod-123",
          order_id: orderId,
          order_type: orderType,
          current_stage: "production" as ProductionStage,
          production_status: "in_production",
          choice_status: "approved" as ChoiceStatus,
          character_id: "char-123",
          character_name: "Test Character",
          tracking_code: null,
          estimated_completion_date: "2024-12-31",
        },
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Pedido Atualizado",
            description: expect.stringContaining("Produção"),
          })
        );
      });
    });

    it("should show special notification when order is shipped", async () => {
      const orderId = "test-order-123";
      const orderType = "subscription_delivery";

      renderHook(
        () =>
          useOrderProgressRealtime({
            orderId,
            orderType,
            enabled: true,
            enableToast: true,
          }),
        { wrapper }
      );

      // Get the production queue update handler
      const productionQueueCall = mockOn.mock.calls.find(
        (call) => call[1]?.table === "production_queue"
      );
      const updateHandler = productionQueueCall[2];

      // First update - set initial stage
      updateHandler({
        new: {
          id: "prod-123",
          order_id: orderId,
          order_type: orderType,
          current_stage: "packaging" as ProductionStage,
          production_status: "in_production",
          choice_status: "approved" as ChoiceStatus,
          character_id: "char-123",
          character_name: "Test Character",
          tracking_code: null,
          estimated_completion_date: "2024-12-31",
        },
      });

      // Second update - shipped with tracking
      updateHandler({
        new: {
          id: "prod-123",
          order_id: orderId,
          order_type: orderType,
          current_stage: "shipped" as ProductionStage,
          production_status: "completed",
          choice_status: "approved" as ChoiceStatus,
          character_id: "char-123",
          character_name: "Test Character",
          tracking_code: "BR123456789",
          estimated_completion_date: "2024-12-31",
        },
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining("Pedido Enviado"),
            description: expect.stringContaining("BR123456789"),
          })
        );
      });
    });

    it("should not show toast when enableToast is false", async () => {
      const orderId = "test-order-123";
      const orderType = "subscription_delivery";

      renderHook(
        () =>
          useOrderProgressRealtime({
            orderId,
            orderType,
            enabled: true,
            enableToast: false,
          }),
        { wrapper }
      );

      // Get the production queue update handler
      const productionQueueCall = mockOn.mock.calls.find(
        (call) => call[1]?.table === "production_queue"
      );
      const updateHandler = productionQueueCall[2];

      // Simulate stage change
      updateHandler({
        new: {
          id: "prod-123",
          order_id: orderId,
          order_type: orderType,
          current_stage: "design" as ProductionStage,
          production_status: "in_production",
          choice_status: "approved" as ChoiceStatus,
          character_id: "char-123",
          character_name: "Test Character",
          tracking_code: null,
          estimated_completion_date: "2024-12-31",
        },
      });

      updateHandler({
        new: {
          id: "prod-123",
          order_id: orderId,
          order_type: orderType,
          current_stage: "production" as ProductionStage,
          production_status: "in_production",
          choice_status: "approved" as ChoiceStatus,
          character_id: "char-123",
          character_name: "Test Character",
          tracking_code: null,
          estimated_completion_date: "2024-12-31",
        },
      });

      // Wait a bit to ensure no toast is shown
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockToast).not.toHaveBeenCalled();
    });
  });

  describe("Character Choice Updates", () => {
    it("should invalidate queries when character choice is updated", async () => {
      const orderId = "test-order-123";
      const orderType = "subscription_delivery";
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

      renderHook(
        () =>
          useOrderProgressRealtime({
            orderId,
            orderType,
            enabled: true,
          }),
        { wrapper }
      );

      // Get the character choice update handler
      const choiceUpdateCall = mockOn.mock.calls.find(
        (call) => call[1]?.table === "character_choices" && call[1]?.event === "UPDATE"
      );
      const updateHandler = choiceUpdateCall[2];

      // Simulate an update
      updateHandler({
        new: {
          id: "choice-123",
          order_id: orderId,
          order_type: orderType,
          status: "approved" as ChoiceStatus,
          character_id: "char-123",
          character_name: "Test Character",
          approved_at: "2024-01-01T00:00:00Z",
          rejected_at: null,
          rejection_reason: null,
        },
      });

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: ["customer-order-progress", orderId, orderType],
        });
      });
    });

    it("should show toast when choice is approved", async () => {
      const orderId = "test-order-123";
      const orderType = "subscription_delivery";

      renderHook(
        () =>
          useOrderProgressRealtime({
            orderId,
            orderType,
            enabled: true,
            enableToast: true,
          }),
        { wrapper }
      );

      // Get the character choice update handler
      const choiceUpdateCall = mockOn.mock.calls.find(
        (call) => call[1]?.table === "character_choices" && call[1]?.event === "UPDATE"
      );
      const updateHandler = choiceUpdateCall[2];

      // First update - set initial status
      updateHandler({
        new: {
          id: "choice-123",
          order_id: orderId,
          order_type: orderType,
          status: "submitted" as ChoiceStatus,
          character_id: "char-123",
          character_name: "Test Character",
          approved_at: null,
          rejected_at: null,
          rejection_reason: null,
        },
      });

      // Second update - approved
      updateHandler({
        new: {
          id: "choice-123",
          order_id: orderId,
          order_type: orderType,
          status: "approved" as ChoiceStatus,
          character_id: "char-123",
          character_name: "Test Character",
          approved_at: "2024-01-01T00:00:00Z",
          rejected_at: null,
          rejection_reason: null,
        },
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining("Escolha Aprovada"),
            description: expect.stringContaining("Test Character"),
          })
        );
      });
    });

    it("should show toast when choice is rejected", async () => {
      const orderId = "test-order-123";
      const orderType = "subscription_delivery";

      renderHook(
        () =>
          useOrderProgressRealtime({
            orderId,
            orderType,
            enabled: true,
            enableToast: true,
          }),
        { wrapper }
      );

      // Get the character choice update handler
      const choiceUpdateCall = mockOn.mock.calls.find(
        (call) => call[1]?.table === "character_choices" && call[1]?.event === "UPDATE"
      );
      const updateHandler = choiceUpdateCall[2];

      // First update - set initial status
      updateHandler({
        new: {
          id: "choice-123",
          order_id: orderId,
          order_type: orderType,
          status: "submitted" as ChoiceStatus,
          character_id: "char-123",
          character_name: "Test Character",
          approved_at: null,
          rejected_at: null,
          rejection_reason: null,
        },
      });

      // Second update - rejected
      updateHandler({
        new: {
          id: "choice-123",
          order_id: orderId,
          order_type: orderType,
          status: "rejected" as ChoiceStatus,
          character_id: "char-123",
          character_name: "Test Character",
          approved_at: null,
          rejected_at: "2024-01-01T00:00:00Z",
          rejection_reason: "Personagem indisponível",
        },
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Escolha Rejeitada",
            description: expect.stringContaining("Personagem indisponível"),
            variant: "destructive",
          })
        );
      });
    });
  });

  describe("Cleanup", () => {
    it("should remove channels on unmount", () => {
      const { unmount } = renderHook(
        () =>
          useOrderProgressRealtime({
            orderId: "test-order-123",
            orderType: "subscription_delivery",
            enabled: true,
          }),
        { wrapper }
      );

      unmount();

      expect(supabase.removeChannel).toHaveBeenCalledTimes(2);
    });
  });

  describe("Error Handling", () => {
    it("should show toast on channel error", async () => {
      renderHook(
        () =>
          useOrderProgressRealtime({
            orderId: "test-order-123",
            orderType: "subscription_delivery",
            enabled: true,
            enableToast: true,
          }),
        { wrapper }
      );

      // Simulate channel error
      const subscribeCallback = mockSubscribe.mock.calls[0][0];
      subscribeCallback("CHANNEL_ERROR", new Error("Connection failed"));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Erro de Conexão",
            variant: "destructive",
          })
        );
      });
    });

    it("should not show error toast when enableToast is false", async () => {
      renderHook(
        () =>
          useOrderProgressRealtime({
            orderId: "test-order-123",
            orderType: "subscription_delivery",
            enabled: true,
            enableToast: false,
          }),
        { wrapper }
      );

      // Simulate channel error
      const subscribeCallback = mockSubscribe.mock.calls[0][0];
      subscribeCallback("CHANNEL_ERROR", new Error("Connection failed"));

      // Wait a bit to ensure no toast is shown
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockToast).not.toHaveBeenCalled();
    });
  });
});
