import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import {
  assignProduction,
  fetchProductionQueue,
  updateProductionStage,
} from "../production/production-service";
import { supabase } from "@/integrations/supabase/client";
import { submitCharacterChoice } from "@/services/customer/choice-service";
import { approveChoice } from "../choices/choice-service";
import type { ProductionStage } from "@/types/production";

const productionMutationMocks = vi.hoisted(() => ({
  assignProductionRpc: vi.fn(),
  updateProductionStageRpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("@/services/customer/choice-service", () => ({
  submitCharacterChoice: vi.fn(),
}));

vi.mock("../choices/choice-service", () => ({
  approveChoice: vi.fn(),
}));

vi.mock("../production/admin-production-mutations-service", () => ({
  assignProductionRpc: productionMutationMocks.assignProductionRpc,
  updateProductionStageRpc: productionMutationMocks.updateProductionStageRpc,
  blockProductionRpc: vi.fn(),
  unblockProductionRpc: vi.fn(),
  updateProductionEstimatedCompletionRpc: vi.fn(),
  updateProductionNotesRpc: vi.fn(),
  updateProductionScheduleRpc: vi.fn(),
}));

vi.mock("@/services/notifications/production-notification-service", () => ({
  productionNotificationService: {
    sendAssignmentNotification: vi.fn().mockResolvedValue(undefined),
    sendStageUpdate: vi.fn().mockResolvedValue(undefined),
  },
}));

const QUEUE_ID = "prod-queue-001";
let currentStage: ProductionStage;
let assignedTo: string | null;
let assignedToName: string | null;

function productionRow() {
  return {
    id: QUEUE_ID,
    order_id: "order-123",
    order_type: "subscription_delivery",
    user_id: null,
    collection_id: "collection-001",
    collection_name: "Test Collection",
    character_id: null,
    character_name: null,
    status: currentStage === "shipped" ? "completed" : "active",
    choice_status: currentStage === "awaiting_choice" ? "pending" : "approved",
    choice_deadline: null,
    choice_made_at: currentStage === "awaiting_choice" ? null : "2026-03-01T10:30:00Z",
    priority_score: 50,
    estimated_start_date: null,
    estimated_completion_date: null,
    actual_start_date: currentStage === "awaiting_choice" ? null : "2026-03-01T12:00:00Z",
    actual_completion_date: currentStage === "shipped" ? "2026-03-02T10:00:00Z" : null,
    admin_notes: null,
    notes: null,
    created_at: "2026-03-01T10:00:00Z",
    updated_at: "2026-03-02T10:00:00Z",
  };
}

function stageRow() {
  return {
    id: "stage-current",
    production_queue_id: QUEUE_ID,
    stage_name: currentStage,
    stage_order: 1,
    status: "in_progress",
    assigned_to: assignedTo,
    assigned_to_name: assignedToName,
    assigned_at: assignedTo ? "2026-03-01T11:00:00Z" : null,
    created_at: "2026-03-01T10:00:00Z",
  };
}

function createProductionQueueQuery() {
  const query: Record<string, unknown> = {};
  const listResult = () => Promise.resolve({ data: [productionRow()], error: null });

  query.in = vi.fn(() => query);
  query.gte = vi.fn(() => query);
  query.lte = vi.fn(() => query);
  query.or = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.single = vi.fn(async () => ({ data: productionRow(), error: null }));
  query.then = (onFulfilled: unknown, onRejected: unknown) =>
    listResult().then(
      onFulfilled as Parameters<Promise<{ data: unknown[]; error: null }>["then"]>[0],
      onRejected as Parameters<Promise<{ data: unknown[]; error: null }>["then"]>[1],
    );

  return query;
}

function createProductionStagesQuery() {
  const query: Record<string, unknown> = {};
  query.in = vi.fn(() => query);
  query.order = vi.fn(async () => ({ data: [stageRow()], error: null }));
  return query;
}

function mockCanonicalProductionReads(): void {
  (supabase.from as Mock).mockImplementation((table: string) => {
    if (table === "production_queue") {
      return {
        select: vi.fn(() => createProductionQueueQuery()),
      };
    }

    if (table === "production_stages") {
      return {
        select: vi.fn(() => createProductionStagesQuery()),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });
}

describe("End-to-End Order Flow Integration Test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentStage = "awaiting_choice";
    assignedTo = null;
    assignedToName = null;
    mockCanonicalProductionReads();

    productionMutationMocks.assignProductionRpc.mockImplementation(
      async ({ userId }: { userId: string }) => {
        assignedTo = userId;
        assignedToName = "Team Member";
      },
    );
    productionMutationMocks.updateProductionStageRpc.mockImplementation(
      async (_queueId: string, stage: ProductionStage) => {
        currentStage = stage;
      },
    );

    vi.mocked(submitCharacterChoice).mockResolvedValue({
      id: "choice-123",
      orderId: "order-123",
      characterId: "character-456",
      status: "submitted",
    } as never);
    vi.mocked(approveChoice).mockResolvedValue({ id: "choice-123", status: "approved" } as never);
  });

  it("completes the order flow through centralized service boundaries", async () => {
    const initialQueue = await fetchProductionQueue({}, { page: 1, pageSize: 10 });
    expect(initialQueue.data[0]).toMatchObject({
      productionStatus: "awaiting_choice",
      currentStage: "awaiting_choice",
    });

    await expect(submitCharacterChoice("order-123", "character-456")).resolves.toMatchObject({
      status: "submitted",
    });
    await expect(approveChoice("choice-123")).resolves.toMatchObject({ status: "approved" });

    const assignmentResult = await assignProduction(QUEUE_ID, "team-789", "Initial assignment");
    expect(assignmentResult.assignedTo).toBe("team-789");
    expect(productionMutationMocks.assignProductionRpc).toHaveBeenCalledWith({
      queueId: QUEUE_ID,
      userId: "team-789",
      reason: "Initial assignment",
    });

    await expect(updateProductionStage(QUEUE_ID, "printing")).resolves.toMatchObject({
      currentStage: "printing",
      productionStatus: "in_production",
    });
    await expect(updateProductionStage(QUEUE_ID, "quality_check")).resolves.toMatchObject({
      currentStage: "quality_check",
    });
    await expect(updateProductionStage(QUEUE_ID, "packaging")).resolves.toMatchObject({
      currentStage: "packaging",
    });
    await expect(updateProductionStage(QUEUE_ID, "shipped")).resolves.toMatchObject({
      currentStage: "shipped",
      productionStatus: "completed",
      productionCompletedAt: "2026-03-02T10:00:00Z",
    });
  });

  it("propagates stage transition errors without breaking queue reads", async () => {
    currentStage = "printing";
    productionMutationMocks.updateProductionStageRpc.mockRejectedValueOnce(
      new Error("Database error"),
    );

    await expect(updateProductionStage(QUEUE_ID, "quality_check")).rejects.toThrow(
      "Database error",
    );

    const queue = await fetchProductionQueue({}, { page: 1, pageSize: 10 });
    expect(queue.data).toHaveLength(1);
    expect(queue.data[0].currentStage).toBe("printing");
  });
});
