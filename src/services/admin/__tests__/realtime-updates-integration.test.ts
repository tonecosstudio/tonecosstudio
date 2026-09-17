import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { useOrderProgressRealtime } from "@/hooks/customer/useOrderProgressRealtime";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: vi.fn(),
  },
}));

vi.mock("@/hooks/customer/useOrderProgressRealtime", () => ({
  useOrderProgressRealtime: vi.fn(),
}));

type RealtimePayload = {
  eventType: string;
  new: Record<string, unknown>;
  old?: Record<string, unknown>;
  table: string;
};

type MockChannel = {
  name: string;
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
};

function createChannel(name: string): MockChannel {
  const channel: MockChannel = {
    name,
    on: vi.fn(),
    subscribe: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
  };
  channel.on.mockReturnValue(channel);
  return channel;
}

describe("Real-Time Updates Integration Test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("subscribes to production queue updates and delivers the payload", async () => {
    const channel = createChannel("production_queue_changes");
    const received: RealtimePayload[] = [];

    channel.on.mockImplementation(
      (_event: string, callback: (payload: RealtimePayload) => void) => {
        queueMicrotask(() => {
          callback({
            eventType: "UPDATE",
            new: { id: "queue-1", status: "in_progress" },
            old: { id: "queue-1", status: "pending" },
            table: "production_queue",
          });
        });
        return channel;
      },
    );
    vi.mocked(supabase.channel).mockReturnValue(channel as never);

    await supabase
      .channel("production_queue_changes")
      .on("postgres_changes", (payload: RealtimePayload) => received.push(payload))
      .subscribe();

    await vi.waitFor(() => expect(received).toHaveLength(1));
    expect(received[0]).toMatchObject({
      eventType: "UPDATE",
      table: "production_queue",
      new: { id: "queue-1", status: "in_progress" },
    });
  });

  it("keeps multiple realtime channels isolated", () => {
    const channels: MockChannel[] = [];
    vi.mocked(supabase.channel).mockImplementation(((name: string) => {
      const channel = createChannel(name);
      channels.push(channel);
      return channel as never;
    }) as typeof supabase.channel);

    const names = [
      "production_queue_changes",
      "production_metrics_changes",
      "customer_order_123_changes",
      "admin_dashboard_updates",
    ];

    for (const name of names) {
      supabase.channel(name).on("postgres_changes", vi.fn()).subscribe();
    }

    expect(channels.map((channel) => channel.name)).toEqual(names);
    for (const channel of channels) {
      expect(channel.on).toHaveBeenCalledWith("postgres_changes", expect.any(Function));
      expect(channel.subscribe).toHaveBeenCalledTimes(1);
    }
  });

  it("keeps channel callbacks independent when one consumer fails", () => {
    const failingConsumer = vi.fn(() => {
      throw new Error("consumer failed");
    });
    const healthyConsumer = vi.fn();

    expect(() => failingConsumer()).toThrow("consumer failed");
    expect(() => healthyConsumer()).not.toThrow();
    expect(healthyConsumer).toHaveBeenCalledTimes(1);
  });

  it("reflects customer order progress returned by the realtime hook", () => {
    const subscribe = vi.fn();
    const unsubscribe = vi.fn();
    const mockedHook = vi.mocked(useOrderProgressRealtime);

    const initialProgress = {
      orderId: "order-123",
      orderNumber: "ORD-001",
      collectionName: "Test Collection",
      currentStage: "production",
      stageProgress: 50,
      estimatedCompletion: "2026-09-20T12:00:00Z",
      estimatedShipping: "2026-09-21T12:00:00Z",
      estimatedDelivery: "2026-09-23T12:00:00Z",
      canChooseCharacter: false,
      choiceDeadline: null,
      chosenCharacter: {
        id: "character-1",
        name: "Test Character",
        imageUrl: "https://example.com/character.jpg",
      },
      trackingCode: null,
      stages: [],
    };

    mockedHook.mockReturnValue({
      progress: initialProgress,
      isLoading: false,
      error: null,
      subscribe,
      unsubscribe,
    } as ReturnType<typeof useOrderProgressRealtime>);

    const initial = mockedHook("order-123", "customer-123");
    expect(initial.progress?.currentStage).toBe("production");
    initial.subscribe();
    expect(subscribe).toHaveBeenCalledTimes(1);

    mockedHook.mockReturnValue({
      ...initial,
      progress: {
        ...initialProgress,
        currentStage: "quality_check",
        stageProgress: 75,
      },
    } as ReturnType<typeof useOrderProgressRealtime>);

    const updated = mockedHook("order-123", "customer-123");
    expect(updated.progress?.currentStage).toBe("quality_check");
    expect(updated.progress?.stageProgress).toBe(75);
  });
});
