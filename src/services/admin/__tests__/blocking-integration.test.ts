import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { blockProduction } from "../production/production-service";
import log from "@/lib/logger";

const serviceMocks = vi.hoisted(() => ({
  calculateEstimatedCompletion: vi.fn(),
  sendDelayNotification: vi.fn(),
  blockProductionRpc: vi.fn(),
  updateProductionEstimatedCompletionRpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("../production/stage-service", () => ({
  calculateEstimatedCompletion: serviceMocks.calculateEstimatedCompletion,
}));

vi.mock("../production/admin-production-mutations-service", () => ({
  blockProductionRpc: serviceMocks.blockProductionRpc,
  updateProductionEstimatedCompletionRpc: serviceMocks.updateProductionEstimatedCompletionRpc,
  assignProductionRpc: vi.fn(),
  unblockProductionRpc: vi.fn(),
  updateProductionNotesRpc: vi.fn(),
  updateProductionScheduleRpc: vi.fn(),
  updateProductionStageRpc: vi.fn(),
}));

vi.mock("@/services/notifications/production-notification-service", () => ({
  productionNotificationService: {
    sendDelayNotification: serviceMocks.sendDelayNotification,
  },
}));

vi.mock("@/lib/logger", () => ({
  default: {
    error: vi.fn(),
  },
}));

const QUEUE_ID = "test-id";
const BLOCK_REASON = "Material shortage";
const ESTIMATED_COMPLETION = new Date("2024-02-01T00:00:00.000Z");

function queueRow(status: string) {
  return {
    id: QUEUE_ID,
    order_id: "order-123",
    order_type: "subscription_delivery",
    user_id: null,
    collection_id: "collection-123",
    collection_name: "Test Collection",
    character_id: "character-123",
    character_name: "Character 1",
    status,
    choice_status: "approved",
    choice_deadline: null,
    choice_made_at: "2024-01-10T00:00:00.000Z",
    priority_score: 50,
    estimated_start_date: null,
    estimated_completion_date: ESTIMATED_COMPLETION.toISOString(),
    actual_start_date: "2024-01-12T00:00:00.000Z",
    actual_completion_date: null,
    admin_notes: status === "on_hold" ? BLOCK_REASON : null,
    notes: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-15T00:00:00.000Z",
  };
}

const stageRow = {
  id: "stage-123",
  production_queue_id: QUEUE_ID,
  stage_name: "printing",
  stage_order: 5,
  status: "in_progress",
  assigned_to: null,
  assigned_to_name: null,
  assigned_at: null,
  created_at: "2024-01-12T00:00:00.000Z",
};

function createQueueLookup(getStatus: () => string) {
  const query: Record<string, unknown> = {};
  query.eq = vi.fn(() => query);
  query.single = vi.fn(async () => ({ data: queueRow(getStatus()), error: null }));
  return query;
}

function createStagesLookup() {
  const query: Record<string, unknown> = {};
  query.in = vi.fn(() => query);
  query.order = vi.fn(async () => ({ data: [stageRow], error: null }));
  return query;
}

function mockHydratedQueueReads(): void {
  let queueReadCount = 0;

  (supabase.from as Mock).mockImplementation((table: string) => {
    if (table === "production_queue") {
      return {
        select: vi.fn(() =>
          createQueueLookup(() => (queueReadCount++ === 0 ? "active" : "on_hold")),
        ),
      };
    }

    if (table === "production_stages") {
      return {
        select: vi.fn(() => createStagesLookup()),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });
}

describe("Blocking Production Integration Test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHydratedQueueReads();
    serviceMocks.calculateEstimatedCompletion.mockResolvedValue(ESTIMATED_COMPLETION);
    serviceMocks.sendDelayNotification.mockResolvedValue(undefined);
    serviceMocks.blockProductionRpc.mockResolvedValue(undefined);
    serviceMocks.updateProductionEstimatedCompletionRpc.mockResolvedValue(undefined);
  });

  it("blocks production through the mutation boundary and sends the delay notification", async () => {
    const result = await blockProduction(QUEUE_ID, BLOCK_REASON);

    expect(supabase.from).toHaveBeenCalledWith("production_queue");
    expect(supabase.from).toHaveBeenCalledWith("production_stages");
    expect(serviceMocks.blockProductionRpc).toHaveBeenCalledWith(QUEUE_ID, BLOCK_REASON);
    expect(serviceMocks.updateProductionEstimatedCompletionRpc).toHaveBeenCalledWith(
      QUEUE_ID,
      ESTIMATED_COMPLETION.toISOString(),
    );
    expect(serviceMocks.calculateEstimatedCompletion).toHaveBeenCalledWith(QUEUE_ID);
    expect(serviceMocks.sendDelayNotification).toHaveBeenCalledWith(QUEUE_ID, BLOCK_REASON);
    expect(result.productionStatus).toBe("on_hold");
    expect(result.currentStage).toBe("printing");
  });

  it("keeps the block successful when non-critical follow-up work fails", async () => {
    serviceMocks.updateProductionEstimatedCompletionRpc.mockRejectedValueOnce(
      new Error("Database error"),
    );
    serviceMocks.sendDelayNotification.mockRejectedValueOnce(new Error("Email provider error"));

    const result = await blockProduction(QUEUE_ID, BLOCK_REASON);

    expect(result.productionStatus).toBe("on_hold");
    expect(serviceMocks.blockProductionRpc).toHaveBeenCalledWith(QUEUE_ID, BLOCK_REASON);
    expect(serviceMocks.calculateEstimatedCompletion).toHaveBeenCalledWith(QUEUE_ID);
    expect(serviceMocks.sendDelayNotification).toHaveBeenCalledWith(QUEUE_ID, BLOCK_REASON);
    expect(log.error).toHaveBeenCalledTimes(2);
  });
});
