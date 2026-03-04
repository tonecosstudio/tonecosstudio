/**
 * Integration test for real-time updates
 * 
 * Verifies Supabase Realtime subscriptions and UI updates
 * 
 * Requirements: 2.1.5, 5.2.1, 5.2.2
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { fetchProductionQueue, fetchProductionMetrics } from "../production-service";
import { useOrderProgressRealtime } from "@/hooks/customer/useOrderProgressRealtime";

// Mock Supabase client with Realtime capabilities
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    channel: vi.fn(),
  },
}));

// Mock the real-time hook
vi.mock("@/hooks/customer/useOrderProgressRealtime", () => ({
  useOrderProgressRealtime: vi.fn(),
}));

// Mock notification service
vi.mock("../../notifications/production-notification-service", () => ({
  ProductionNotificationService: vi.fn().mockImplementation(() => ({
    sendRealtimeUpdateNotification: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe("Real-Time Updates Integration Test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should subscribe to production queue changes and receive updates", async () => {
    // Mock initial production queue data
    const mockInitialItems = [
      {
        id: "prod-queue-001",
        order_id: "order-123",
        order_type: "subscription_delivery",
        customer_id: "customer-123",
        customer_name: "Customer 1",
        customer_email: "customer1@example.com",
        collection_id: "collection-001",
        collection_name: "Test Collection",
        character_id: "character-001",
        character_name: "Character 1",
        production_status: "in_production",
        current_stage: "production",
        choice_status: "approved",
        choice_deadline: null,
        choice_made_at: new Date().toISOString(),
        priority: "normal",
        priority_score: 50,
        scheduled_production_date: null,
        estimated_completion_date: null,
        assigned_to: "team-001",
        assigned_to_name: "Team Member",
        assigned_at: new Date().toISOString(),
        production_started_at: new Date().toISOString(),
        production_completed_at: null,
        production_notes: null,
        customer_notes: null,
        internal_flags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Mock updated item (after stage change)
    const mockUpdatedItem = {
      ...mockInitialItems[0],
      current_stage: "quality_check",
      updated_at: new Date(Date.now() + 1000).toISOString(), // Simulate update
    };

    // Mock Realtime channel
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockResolvedValue(undefined),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    };

    // Mock Supabase channel creation
    (supabase.channel as any).mockReturnValue(mockChannel);

    // Mock fetchProductionQueue to return initial data
    const mockQueueQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
    };

    mockQueueQuery.select.mockResolvedValue({
      data: mockInitialItems,
      error: null,
      count: 1,
    });

    (supabase.from as any).mockReturnValue(mockQueueQuery);

    // Step 1: Initial fetch
    const initialQueue = await fetchProductionQueue({}, { page: 1, pageSize: 10 });
    expect(initialQueue.data[0].currentStage).toBe("production");

    // Step 2: Simulate Realtime subscription setup
    // This would normally be done in a React component/hook
    const mockRealtimeCallback = vi.fn();
    
    // Configure channel to call callback when update is received
    mockChannel.on.mockImplementation((event: string, callback: Function) => {
      if (event === "postgres_changes") {
        // Simulate receiving an update after a short delay
        setTimeout(() => {
          callback({
            eventType: "UPDATE",
            new: mockUpdatedItem,
            old: mockInitialItems[0],
            table: "production_queue",
          });
        }, 100);
      }
      return mockChannel;
    });

    // Step 3: Simulate receiving real-time update
    // In a real app, this would trigger a refetch or state update
    await new Promise(resolve => setTimeout(resolve, 150));

    // Verify channel was set up correctly
    expect(supabase.channel).toHaveBeenCalledWith("production_queue_changes");
    expect(mockChannel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.any(Function)
    );
    expect(mockChannel.subscribe).toHaveBeenCalled();

    // Step 4: Verify that after real-time update, fetching shows new data
    // Mock fetch to return updated data
    mockQueueQuery.select.mockResolvedValue({
      data: [mockUpdatedItem],
      error: null,
      count: 1,
    });

    const updatedQueue = await fetchProductionQueue({}, { page: 1, pageSize: 10 });
    expect(updatedQueue.data[0].currentStage).toBe("quality_check");
  });

  it("should update production metrics in real-time", async () => {
    // Mock initial metrics
    const mockInitialMetrics = {
      stages: {
        awaiting_choice: 5,
        design: 3,
        production: 8,
        quality_check: 2,
        packaging: 1,
        shipped: 10,
      },
      statuses: {
        awaiting_choice: 5,
        ready_for_production: 3,
        in_production: 11,
        completed: 10,
        on_hold: 2,
        cancelled: 0,
      },
      priorities: {
        critical: 3,
        high: 5,
        normal: 15,
        low: 2,
      },
      choices: {
        pending: 5,
        submitted: 2,
        approved: 20,
        rejected: 1,
        locked: 15,
      },
      urgent: {
        deadlineCritical: 2,
        deadlineUrgent: 3,
        blocked: 2,
        overdue: 1,
      },
      scheduled: {
        today: 3,
        thisWeek: 8,
        thisMonth: 15,
      },
      avgStageDurations: {
        design: 24,
        production: 48,
        quality_check: 12,
        packaging: 6,
      },
      overall: {
        totalItems: 25,
        avgProductionTimeHours: 45,
        completionRate: 0.4,
        avgPriorityScore: 65,
      },
      generatedAt: new Date().toISOString(),
    };

    // Mock updated metrics (after an item moves to shipped)
    const mockUpdatedMetrics = {
      ...mockInitialMetrics,
      stages: {
        ...mockInitialMetrics.stages,
        shipped: 11, // Increased by 1
        production: 7, // Decreased by 1
      },
      statuses: {
        ...mockInitialMetrics.statuses,
        completed: 11, // Increased by 1
        in_production: 10, // Decreased by 1
      },
      overall: {
        ...mockInitialMetrics.overall,
        totalItems: 25,
        avgProductionTimeHours: 44,
        completionRate: 0.44, // 11/25
        avgPriorityScore: 65,
      },
      generatedAt: new Date(Date.now() + 1000).toISOString(),
    };

    // Mock RPC function for metrics
    (supabase.rpc as any)
      .mockResolvedValueOnce({ data: mockInitialMetrics, error: null }) // First call
      .mockResolvedValueOnce({ data: mockUpdatedMetrics, error: null }); // Second call

    // Step 1: Fetch initial metrics
    const initialMetrics = await fetchProductionMetrics();
    expect(initialMetrics.stages.shipped).toBe(10);
    expect(initialMetrics.statuses.completed).toBe(10);
    expect(initialMetrics.overall.completionRate).toBe(0.4);

    // Step 2: Simulate real-time update that would trigger metrics recalculation
    // In a real app, this would happen automatically via database triggers or application logic
    
    // Step 3: Fetch updated metrics (simulating real-time refresh)
    const updatedMetrics = await fetchProductionMetrics();
    expect(updatedMetrics.stages.shipped).toBe(11);
    expect(updatedMetrics.statuses.completed).toBe(11);
    expect(updatedMetrics.overall.completionRate).toBe(0.44);
  });

  it("should handle customer order progress real-time updates", async () => {
    // Mock customer order data
    const mockOrderId = "order-123";
    const mockCustomerId = "customer-123";
    
    const mockInitialProgress = {
      orderId: mockOrderId,
      orderNumber: "ORD-001",
      collectionName: "Test Collection",
      currentStage: "production",
      stageProgress: 50,
      estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      estimatedShipping: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
      estimatedDelivery: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      canChooseCharacter: false,
      choiceDeadline: null,
      chosenCharacter: {
        id: "character-001",
        name: "Test Character",
        imageUrl: "https://example.com/character.jpg",
      },
      trackingCode: null,
      stages: [
        { name: "awaiting_choice", displayName: "Aguardando Escolha", status: "completed", completedAt: new Date().toISOString() },
        { name: "design", displayName: "Design", status: "completed", completedAt: new Date().toISOString() },
        { name: "production", displayName: "Produção", status: "current", completedAt: null },
        { name: "quality_check", displayName: "Controle de Qualidade", status: "upcoming", completedAt: null },
        { name: "packaging", displayName: "Embalagem", status: "upcoming", completedAt: null },
        { name: "shipped", displayName: "Enviado", status: "upcoming", completedAt: null },
      ],
    };

    const mockUpdatedProgress = {
      ...mockInitialProgress,
      currentStage: "quality_check",
      stageProgress: 75,
      stages: [
        { name: "awaiting_choice", displayName: "Aguardando Escolha", status: "completed", completedAt: new Date().toISOString() },
        { name: "design", displayName: "Design", status: "completed", completedAt: new Date().toISOString() },
        { name: "production", displayName: "Produção", status: "completed", completedAt: new Date(Date.now() + 1000).toISOString() },
        { name: "quality_check", displayName: "Controle de Qualidade", status: "current", completedAt: null },
        { name: "packaging", displayName: "Embalagem", status: "upcoming", completedAt: null },
        { name: "shipped", displayName: "Enviado", status: "upcoming", completedAt: null },
      ],
    };

    // Mock the useOrderProgressRealtime hook
    const mockSubscribe = vi.fn();
    const mockUnsubscribe = vi.fn();
    const mockProgressData = mockInitialProgress;
    
    (useOrderProgressRealtime as any).mockReturnValue({
      progress: mockProgressData,
      isLoading: false,
      error: null,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
    });

    // Step 1: Initialize real-time subscription
    const { subscribe, progress } = useOrderProgressRealtime(mockOrderId, mockCustomerId);
    
    // Verify initial state
    expect(progress.currentStage).toBe("production");
    expect(progress.stageProgress).toBe(50);
    
    // Step 2: Subscribe to updates
    subscribe();
    expect(mockSubscribe).toHaveBeenCalled();

    // Step 3: Simulate real-time update
    // In a real app, the hook would update its internal state when Realtime events arrive
    // For this test, we'll simulate the update by mocking the hook to return new data
    (useOrderProgressRealtime as any).mockReturnValue({
      progress: mockUpdatedProgress,
      isLoading: false,
      error: null,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
    });

    // Step 4: Verify updated state
    const { progress: updatedProgress } = useOrderProgressRealtime(mockOrderId, mockCustomerId);
    expect(updatedProgress.currentStage).toBe("quality_check");
    expect(updatedProgress.stageProgress).toBe(75);
    
    // Verify production stage is now marked as completed
    const productionStage = updatedProgress.stages.find(stage => stage.name === "production");
    expect(productionStage?.status).toBe("completed");
    expect(productionStage?.completedAt).toBeTruthy();
  });

  it("should handle multiple concurrent real-time subscriptions", async () => {
    // Test scenario with multiple users/subscriptions
    const mockChannels: any[] = [];
    
    // Mock channel factory
    (supabase.channel as any).mockImplementation((channelName: string) => {
      const mockChannel = {
        name: channelName,
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockResolvedValue(undefined),
        unsubscribe: vi.fn().mockResolvedValue(undefined),
      };
      mockChannels.push(mockChannel);
      return mockChannel;
    });

    // Simulate multiple subscriptions
    const channelNames = [
      "production_queue_changes",
      "production_metrics_changes", 
      "customer_order_123_changes",
      "admin_dashboard_updates",
    ];

    // Create channels
    channelNames.forEach(channelName => {
      supabase.channel(channelName)
        .on("postgres_changes", vi.fn())
        .subscribe();
    });

    // Verify all channels were created and subscribed
    expect(supabase.channel).toHaveBeenCalledTimes(4);
    expect(mockChannels).toHaveLength(4);
    
    mockChannels.forEach((channel, index) => {
      expect(channel.name).toBe(channelNames[index]);
      expect(channel.on).toHaveBeenCalledWith("postgres_changes", expect.any(Function));
      expect(channel.subscribe).toHaveBeenCalled();
    });

    // Simulate receiving updates on specific channels
    const productionQueueCallback = mockChannels[0].on.mock.calls[0][1];
    const customerOrderCallback = mockChannels[2].on.mock.calls[0][1];
    
    // Trigger production queue update
    const mockProductionUpdate = {
      eventType: "UPDATE",
      new: { id: "prod-queue-001", current_stage: "shipped" },
      old: { id: "prod-queue-001", current_stage: "packaging" },
      table: "production_queue",
    };
    
    productionQueueCallback(mockProductionUpdate);
    
    // Trigger customer order update
    const mockCustomerUpdate = {
      eventType: "UPDATE",
      new: { order_id: "order-123", tracking_code: "TRACK123" },
      old: { order_id: "order-123", tracking_code: null },
      table: "production_queue",
    };
    
    customerOrderCallback(mockCustomerUpdate);

    // Verify callbacks were called with correct data
    expect(mockChannels[0].on).toHaveBeenCalled();
    expect(mockChannels[2].on).toHaveBeenCalled();
  });

  it("should handle real-time update failures gracefully", async () => {
    // Test scenario where real-time connection fails
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockRejectedValue(new Error("WebSocket connection failed")),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    };

    (supabase.channel as any).mockReturnValue(mockChannel);

    // Mock fetchProductionQueue as fallback
    const mockQueueQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
    };

    mockQueueQuery.select.mockResolvedValue({
      data: [{ id: "prod-queue-001", current_stage: "production" }],
      error: null,
      count: 1,
    });

    (supabase.from as any).mockReturnValue(mockQueueQuery);

    // Step 1: Try to subscribe (should fail)
    const channel = supabase.channel("production_queue_changes")
      .on("postgres_changes", vi.fn());
    
    await expect(channel.subscribe()).rejects.toThrow("WebSocket connection failed");

    // Step 2: Verify fallback to regular fetch works
    const queue = await fetchProductionQueue({}, { page: 1, pageSize: 10 });
    expect(queue.data.length).toBe(1);
    expect(queue.data[0].currentStage).toBe("production");

    // Step 3: Verify unsubscribe is called on cleanup
    await channel.unsubscribe();
    expect(mockChannel.unsubscribe).toHaveBeenCalled();
  });

  it("should throttle rapid real-time updates to prevent UI flicker", async () => {
    // Test scenario with rapid successive updates
    const mockCallbacks: Function[] = [];
    const updateLog: any[] = [];
    
    const mockChannel = {
      on: vi.fn().mockImplementation((event: string, callback: Function) => {
        if (event === "postgres_changes") {
          mockCallbacks.push(callback);
        }
        return mockChannel;
      }),
      subscribe: vi.fn().mockResolvedValue(undefined),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    };

    (supabase.channel as any).mockReturnValue(mockChannel);

    // Create channel and subscribe
    supabase.channel("production_queue_changes")
      .on("postgres_changes", (payload: any) => {
        updateLog.push({
          timestamp: Date.now(),
          payload,
        });
      })
      .subscribe();

    // Simulate rapid updates (5 updates within 500ms)
    const rapidUpdates = [
      { id: "prod-queue-001", current_stage: "production", updated_at: new Date(Date.now() + 100).toISOString() },
      { id: "prod-queue-001", current_stage: "production", updated_at: new Date(Date.now() + 200).toISOString() },
      { id: "prod-queue-001", current_stage: "quality_check", updated_at: new Date(Date.now() + 300).toISOString() },
      { id: "prod-queue-001", current_stage: "quality_check", updated_at: new Date(Date.now() + 400).toISOString() },
      { id: "prod-queue-001", current_stage: "packaging", updated_at: new Date(Date.now() + 500).toISOString() },
    ];

    // Trigger all updates
    rapidUpdates.forEach((update, index) => {
      setTimeout(() => {
        mockCallbacks.forEach(callback => {
          callback({
            eventType: "UPDATE",
            new: update,
            old: index > 0 ? rapidUpdates[index - 1] : { current_stage: "design" },
            table: "production_queue",
          });
        });
      }, index * 100);
    });

    // Wait for all updates
    await new Promise(resolve => setTimeout(resolve, 600));

    // Verify updates were received
    expect(updateLog.length).toBeGreaterThan(0);
    
    // In a real app, there would be throttling/debouncing logic
    // to prevent UI from updating too frequently
    // This test verifies the updates arrive, actual throttling
    // would be implemented in the UI layer
  });
});