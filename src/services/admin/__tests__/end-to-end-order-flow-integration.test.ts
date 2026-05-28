import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchProductionQueue, updateProductionStage, assignProduction } from "../production-service";
import { supabase } from "@/integrations/supabase/client";
import { submitCharacterChoice } from "@/services/customer/choice-service";
import { approveChoice } from "../choice-service";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-123" } } }),
    },
  },
}));

vi.mock("@/services/customer/choice-service", () => ({
  submitCharacterChoice: vi.fn(),
}));

vi.mock("../choice-service", () => ({
  approveChoice: vi.fn(),
}));

vi.mock("../../notifications/production-notification-service", () => ({
  ProductionNotificationService: vi.fn().mockImplementation(() => ({
    sendAssignmentNotification: vi.fn().mockResolvedValue(undefined),
    sendStageUpdateNotification: vi.fn().mockResolvedValue(undefined),
  })),
}));

function productionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "prod-queue-001",
    order_id: "order-123",
    order_type: "subscription_delivery",
    customer_id: "customer-123",
    user_id: "customer-123",
    customer_name: "Test Customer",
    customer_email: "customer@example.com",
    collection_id: "collection-001",
    collection_name: "Test Collection",
    character_id: null,
    character_name: null,
    production_status: "awaiting_choice",
    current_stage: "awaiting_choice",
    choice_status: "pending",
    choice_deadline: null,
    choice_made_at: null,
    priority: "normal",
    priority_score: 50,
    scheduled_production_date: null,
    estimated_completion_date: null,
    assigned_to: null,
    assigned_to_name: null,
    assigned_at: null,
    production_started_at: null,
    production_completed_at: null,
    production_notes: null,
    customer_notes: null,
    internal_flags: [],
    created_at: "2026-03-01T10:00:00Z",
    updated_at: "2026-03-01T10:00:00Z",
    ...overrides,
  };
}

function mockProductionSelect(row: Record<string, unknown>) {
  const query = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: row, error: null }),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({ data: [row], error: null, count: 1 }).then(resolve, reject),
  };

  vi.mocked(supabase.from).mockReturnValue(query as any);
}

describe("End-to-End Order Flow Integration Test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes the order flow through centralized service boundaries", async () => {
    const assignedRow = productionRow({
      choice_status: "approved",
      production_status: "ready_for_production",
      assigned_to: "team-789",
      assigned_to_name: "Team Member",
      assigned_at: "2026-03-01T11:00:00Z",
    });
    const shippedRow = productionRow({
      ...assignedRow,
      current_stage: "shipped",
      production_status: "completed",
      production_completed_at: "2026-03-02T10:00:00Z",
    });

    mockProductionSelect(productionRow());
    vi.mocked(supabase.rpc).mockImplementation((fn: string, args: any) => {
      if (fn === "admin_assign_production") {
        return Promise.resolve({ data: assignedRow, error: null }) as any;
      }

      if (fn === "admin_update_production_stage") {
        return Promise.resolve({
          data: productionRow({
            ...assignedRow,
            current_stage: args.p_stage,
            production_status: args.p_stage === "shipped" ? "completed" : "in_production",
            production_completed_at: args.p_stage === "shipped" ? shippedRow.production_completed_at : null,
          }),
          error: null,
        }) as any;
      }

      return Promise.resolve({ data: null, error: null }) as any;
    });
    vi.mocked(submitCharacterChoice).mockResolvedValue({
      id: "choice-123",
      orderId: "order-123",
      characterId: "character-456",
      status: "submitted",
    } as any);
    vi.mocked(approveChoice).mockResolvedValue({ id: "choice-123", status: "approved" } as any);

    const initialQueue = await fetchProductionQueue({}, { page: 1, pageSize: 10 });
    expect(initialQueue.data[0].productionStatus).toBe("awaiting_choice");

    await expect(submitCharacterChoice("order-123", "character-456")).resolves.toMatchObject({
      status: "submitted",
    });
    await expect(approveChoice("choice-123")).resolves.toMatchObject({ status: "approved" });

    const assignmentResult = await assignProduction("prod-queue-001", "team-789", "Initial assignment");
    expect(assignmentResult.assignedTo).toBe("team-789");
    expect(supabase.rpc).toHaveBeenCalledWith("admin_assign_production", {
      p_queue_id: "prod-queue-001",
      p_user_id: "team-789",
      p_reason: "Initial assignment",
    });

    await expect(updateProductionStage("prod-queue-001", "printing")).resolves.toMatchObject({
      currentStage: "printing",
      productionStatus: "in_production",
    });
    await expect(updateProductionStage("prod-queue-001", "quality_check")).resolves.toMatchObject({
      currentStage: "quality_check",
    });
    await expect(updateProductionStage("prod-queue-001", "packaging")).resolves.toMatchObject({
      currentStage: "packaging",
    });
    await expect(updateProductionStage("prod-queue-001", "shipped")).resolves.toMatchObject({
      currentStage: "shipped",
      productionStatus: "completed",
      productionCompletedAt: shippedRow.production_completed_at,
    });
  });

  it("propagates stage transition errors without breaking queue reads", async () => {
    mockProductionSelect(productionRow({ current_stage: "printing", production_status: "in_production" }));
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: "Database error" },
    } as any);

    await expect(updateProductionStage("prod-queue-001", "quality_check")).rejects.toThrow(
      "Database error"
    );

    const queue = await fetchProductionQueue({}, { page: 1, pageSize: 10 });
    expect(queue.data).toHaveLength(1);
  });
});
