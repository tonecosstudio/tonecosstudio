import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import {
  assignProduction,
  blockProduction,
  fetchProductionMetrics,
  fetchProductionQueue,
  unblockProduction,
  updateProductionStage,
  type PaginationParams,
  type ProductionFilters,
} from "./production-service";

const mutationMocks = vi.hoisted(() => ({
  assignProductionRpc: vi.fn(),
  blockProductionRpc: vi.fn(),
  unblockProductionRpc: vi.fn(),
  updateProductionEstimatedCompletionRpc: vi.fn(),
  updateProductionNotesRpc: vi.fn(),
  updateProductionScheduleRpc: vi.fn(),
  updateProductionStageRpc: vi.fn(),
}));

const productionNotificationMocks = vi.hoisted(() => ({
  sendAssignmentNotification: vi.fn().mockResolvedValue(undefined),
  sendDelayNotification: vi.fn().mockResolvedValue(undefined),
  sendStageUpdate: vi.fn().mockResolvedValue(undefined),
}));

const stageServiceMocks = vi.hoisted(() => ({
  calculateEstimatedCompletion: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("./admin-production-mutations-service", () => mutationMocks);

vi.mock("./stage-service", () => ({
  calculateEstimatedCompletion: stageServiceMocks.calculateEstimatedCompletion,
}));

vi.mock("@/services/notifications/production-notification-service", () => ({
  productionNotificationService: {
    sendAssignmentNotification: productionNotificationMocks.sendAssignmentNotification,
    sendDelayNotification: productionNotificationMocks.sendDelayNotification,
    sendStageUpdate: productionNotificationMocks.sendStageUpdate,
  },
}));

let queueRows: Array<Record<string, unknown>> = [];
let stageRows: Array<Record<string, unknown>> = [];
let profileRows: Array<Record<string, unknown>> = [];

function makeQueueRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "1",
    order_id: "order-1",
    order_type: "subscription_delivery",
    user_id: "user-1",
    collection_id: "col-1",
    collection_name: "Colecao",
    character_id: null,
    character_name: null,
    status: "in_progress",
    choice_status: "approved",
    choice_deadline: null,
    choice_made_at: null,
    priority_score: 50,
    estimated_start_date: null,
    estimated_completion_date: null,
    actual_start_date: null,
    actual_completion_date: null,
    admin_notes: null,
    notes: null,
    created_at: "2026-03-01T09:00:00Z",
    updated_at: "2026-03-01T10:00:00Z",
    ...overrides,
  };
}

function makeStageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "stage-1",
    production_queue_id: "1",
    stage_name: "model_preparation",
    stage_order: 1,
    status: "in_progress",
    assigned_to: null,
    assigned_to_name: null,
    assigned_at: null,
    created_at: "2026-03-01T09:00:00Z",
    ...overrides,
  };
}

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    full_name: "Joao Silva",
    email: "joao@example.com",
    ...overrides,
  };
}

function installReadMocks() {
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    if (table === "production_queue") {
      let selectedId: string | null = null;
      const query: Record<string, unknown> = {};
      const chain = () => query;

      query.in = vi.fn(chain);
      query.or = vi.fn(chain);
      query.gte = vi.fn(chain);
      query.lte = vi.fn(chain);
      query.order = vi.fn(chain);
      query.eq = vi.fn((field: string, value: string) => {
        if (field === "id") selectedId = value;
        return query;
      });
      query.single = vi.fn().mockImplementation(async () => ({
        data: queueRows.find((row) => row.id === selectedId) ?? null,
        error: null,
      }));
      query.then = (
        onFulfilled: (value: { data: Array<Record<string, unknown>>; error: null }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => Promise.resolve({ data: queueRows, error: null }).then(onFulfilled, onRejected);

      return {
        select: vi.fn().mockReturnValue(query),
      } as never;
    }

    if (table === "profiles") {
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: profileRows, error: null }),
        }),
      } as never;
    }

    if (table === "production_stages") {
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: stageRows, error: null }),
          }),
        }),
      } as never;
    }

    throw new Error(`Unexpected table in test: ${table}`);
  }) as never);
}

describe("Production Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queueRows = [makeQueueRow()];
    stageRows = [makeStageRow()];
    profileRows = [makeProfile()];
    installReadMocks();

    stageServiceMocks.calculateEstimatedCompletion.mockResolvedValue(
      new Date("2026-03-10T12:00:00Z"),
    );

    mutationMocks.updateProductionStageRpc.mockImplementation(
      async (_queueId: string, stage: string) => {
        stageRows[0] = { ...stageRows[0], stage_name: stage };
      },
    );
    mutationMocks.assignProductionRpc.mockImplementation(
      async ({ userId }: { userId: string }) => {
        stageRows[0] = {
          ...stageRows[0],
          assigned_to: userId,
          assigned_to_name: "Maria Santos",
          assigned_at: "2026-03-02T10:00:00Z",
        };
      },
    );
    mutationMocks.blockProductionRpc.mockImplementation(async (_queueId: string, reason: string) => {
      queueRows[0] = { ...queueRows[0], status: "on_hold", admin_notes: reason };
    });
    mutationMocks.unblockProductionRpc.mockImplementation(async () => {
      queueRows[0] = { ...queueRows[0], status: "in_progress", admin_notes: null };
    });
    mutationMocks.updateProductionEstimatedCompletionRpc.mockResolvedValue(undefined);
  });

  describe("fetchProductionQueue", () => {
    it("hydrates canonical queue rows and paginates the result", async () => {
      const filters: ProductionFilters = {
        collections: ["col-1"],
        priorities: ["normal"],
      };
      const pagination: PaginationParams = { page: 1, pageSize: 10 };

      const result = await fetchProductionQueue(filters, pagination);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0]).toMatchObject({
        id: "1",
        customerName: "Joao Silva",
        currentStage: "model_preparation",
        productionStatus: "ready_for_production",
      });
    });

    it("applies text search after canonical customer hydration", async () => {
      queueRows = [
        makeQueueRow({ id: "1", user_id: "user-1" }),
        makeQueueRow({ id: "2", order_id: "order-2", user_id: "user-2" }),
      ];
      stageRows = [
        makeStageRow({ production_queue_id: "1" }),
        makeStageRow({ id: "stage-2", production_queue_id: "2" }),
      ];
      profileRows = [
        makeProfile(),
        makeProfile({ id: "user-2", full_name: "Maria Santos", email: "maria@example.com" }),
      ];

      const result = await fetchProductionQueue(
        { searchQuery: "joao" },
        { page: 1, pageSize: 10 },
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].customerName).toBe("Joao Silva");
    });
  });

  describe("fetchProductionMetrics", () => {
    it("calculates metrics from hydrated production items", async () => {
      const criticalDeadline = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      queueRows = [
        makeQueueRow({ id: "1", choice_status: "pending", choice_deadline: null }),
        makeQueueRow({ id: "2", order_id: "order-2", status: "completed" }),
        makeQueueRow({
          id: "3",
          order_id: "order-3",
          priority_score: 95,
          choice_status: "pending",
          choice_deadline: criticalDeadline,
        }),
      ];
      stageRows = [
        makeStageRow({ production_queue_id: "1", stage_name: "awaiting_choice" }),
        makeStageRow({ id: "stage-2", production_queue_id: "2", stage_name: "delivered" }),
        makeStageRow({ id: "stage-3", production_queue_id: "3", stage_name: "printing" }),
      ];

      const result = await fetchProductionMetrics();

      expect(result.overall.totalItems).toBe(3);
      expect(result.stages.awaiting_choice).toBe(1);
      expect(result.statuses.completed).toBe(1);
      expect(result.priorities.critical).toBe(1);
      expect(result.urgent.deadlineCritical).toBe(1);
    });
  });

  describe("mutations", () => {
    it("updates the stage through the mutation authority and rehydrates", async () => {
      const result = await updateProductionStage("1", "printing");

      expect(mutationMocks.updateProductionStageRpc).toHaveBeenCalledWith("1", "printing");
      expect(result.currentStage).toBe("printing");
      expect(result.productionStatus).toBe("in_production");
    });

    it("assigns production and sends the assignment notification", async () => {
      const result = await assignProduction("1", "user-2");

      expect(mutationMocks.assignProductionRpc).toHaveBeenCalledWith({
        queueId: "1",
        userId: "user-2",
        reason: undefined,
      });
      expect(productionNotificationMocks.sendAssignmentNotification).toHaveBeenCalledWith(
        "1",
        "user-2",
        false,
      );
      expect(result.assignedTo).toBe("user-2");
    });

    it("blocks production, recalculates the estimate, and notifies", async () => {
      const result = await blockProduction("1", "Falta de material");

      expect(mutationMocks.blockProductionRpc).toHaveBeenCalledWith("1", "Falta de material");
      expect(mutationMocks.updateProductionEstimatedCompletionRpc).toHaveBeenCalledWith(
        "1",
        "2026-03-10T12:00:00.000Z",
      );
      expect(productionNotificationMocks.sendDelayNotification).toHaveBeenCalledWith(
        "1",
        "Falta de material",
      );
      expect(result.productionStatus).toBe("on_hold");
      expect(result.productionNotes).toBe("Falta de material");
    });

    it("unblocks production and reports the current stage", async () => {
      queueRows[0] = { ...queueRows[0], status: "on_hold" };
      stageRows[0] = { ...stageRows[0], stage_name: "printing" };

      const result = await unblockProduction("1");

      expect(mutationMocks.unblockProductionRpc).toHaveBeenCalledWith("1");
      expect(productionNotificationMocks.sendStageUpdate).toHaveBeenCalledWith("1", "printing");
      expect(result.productionStatus).toBe("in_production");
    });
  });
});
