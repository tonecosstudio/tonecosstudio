import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { blockProduction } from "../production-service";

const serviceMocks = vi.hoisted(() => ({
  calculateEstimatedCompletion: vi.fn(),
  sendDelayNotification: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock("../stage-service", () => ({
  calculateEstimatedCompletion: serviceMocks.calculateEstimatedCompletion,
}));

vi.mock("@/services/notifications/production-notification-service", () => ({
  ProductionNotificationService: vi.fn().mockImplementation(() => ({
    sendDelayNotification: serviceMocks.sendDelayNotification,
  })),
  productionNotificationService: {
    sendDelayNotification: serviceMocks.sendDelayNotification,
  },
}));

const QUEUE_ID = "test-id";
const BLOCK_REASON = "Material shortage";
const ESTIMATED_COMPLETION = new Date("2024-02-01T00:00:00.000Z");

const queueItem = {
  id: QUEUE_ID,
  current_stage: "production",
  customer_id: "customer-123",
  customer_email: "customer@example.com",
  collection_name: "Test Collection",
  order_id: "order-123",
  order_type: "subscription_delivery",
};

const blockedQueueItem = {
  ...queueItem,
  production_status: "on_hold",
  production_notes: BLOCK_REASON,
  updated_at: "2024-01-15T00:00:00.000Z",
};

function mockQueueLookup(): void {
  const query = {
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: queueItem, error: null }),
  };

  (supabase.from as Mock).mockReturnValue({
    select: vi.fn().mockReturnValue(query),
  });
}

function mockProductionRpc(options: { failEstimatedCompletion?: boolean } = {}): void {
  (supabase.rpc as Mock).mockImplementation(
    (name: string, args: Record<string, unknown>) => {
      switch (name) {
        case "admin_block_production":
          expect(args).toEqual({
            p_queue_id: QUEUE_ID,
            p_reason: BLOCK_REASON,
          });
          return Promise.resolve({ data: blockedQueueItem, error: null });

        case "admin_update_production_estimated_completion":
          expect(args).toEqual({
            p_queue_id: QUEUE_ID,
            p_estimated_completion: ESTIMATED_COMPLETION.toISOString(),
          });
          return Promise.resolve({
            data: null,
            error: options.failEstimatedCompletion
              ? { message: "Database error" }
              : null,
          });

        default:
          throw new Error(`Unexpected production RPC: ${name}`);
      }
    }
  );
}

describe("Blocking Production Integration Test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.calculateEstimatedCompletion.mockResolvedValue(ESTIMATED_COMPLETION);
    serviceMocks.sendDelayNotification.mockResolvedValue(undefined);
    mockQueueLookup();
    mockProductionRpc();
  });

  it("blocks production through server-side RPCs and sends the delay notification", async () => {
    const result = await blockProduction(QUEUE_ID, BLOCK_REASON);

    expect(supabase.from).toHaveBeenCalledWith("production_queue");
    expect(supabase.rpc).toHaveBeenCalledWith("admin_block_production", {
      p_queue_id: QUEUE_ID,
      p_reason: BLOCK_REASON,
    });
    expect(supabase.rpc).toHaveBeenCalledWith(
      "admin_update_production_estimated_completion",
      {
        p_queue_id: QUEUE_ID,
        p_estimated_completion: ESTIMATED_COMPLETION.toISOString(),
      }
    );
    expect(serviceMocks.calculateEstimatedCompletion).toHaveBeenCalledWith(QUEUE_ID);
    expect(serviceMocks.sendDelayNotification).toHaveBeenCalledWith(QUEUE_ID, BLOCK_REASON);
    expect(result.productionStatus).toBe("on_hold");
  });

  it("keeps the block successful when non-critical follow-up work fails", async () => {
    mockProductionRpc({ failEstimatedCompletion: true });
    serviceMocks.sendDelayNotification.mockRejectedValueOnce(new Error("Email provider error"));

    const result = await blockProduction(QUEUE_ID, BLOCK_REASON);

    expect(result.productionStatus).toBe("on_hold");
    expect(serviceMocks.calculateEstimatedCompletion).toHaveBeenCalledWith(QUEUE_ID);
    expect(serviceMocks.sendDelayNotification).toHaveBeenCalledWith(QUEUE_ID, BLOCK_REASON);
  });
});
