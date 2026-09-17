import { describe, it, expect, beforeEach, vi } from "vitest";
import { assignProduction } from "../production/production-service";
import { supabase } from "@/integrations/supabase/client";
import { productionNotificationService } from "@/services/notifications/production-notification-service";
import log from "@/lib/logger";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const mutationMocks = vi.hoisted(() => ({
  assignProductionRpc: vi.fn(),
}));

vi.mock("../production/admin-production-mutations-service", () => ({
  assignProductionRpc: mutationMocks.assignProductionRpc,
  blockProductionRpc: vi.fn(),
  unblockProductionRpc: vi.fn(),
  updateProductionEstimatedCompletionRpc: vi.fn(),
  updateProductionNotesRpc: vi.fn(),
  updateProductionScheduleRpc: vi.fn(),
  updateProductionStageRpc: vi.fn(),
}));

const notificationMocks = vi.hoisted(() => ({
  sendAssignmentNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/notifications/production-notification-service", () => ({
  productionNotificationService: {
    sendAssignmentNotification: notificationMocks.sendAssignmentNotification,
  },
}));

vi.mock("@/lib/logger", () => ({
  default: {
    error: vi.fn(),
  },
}));

let currentAssignee: string | null;
let currentAssigneeName: string | null;

function queueRow() {
  return {
    id: "prod-123",
    order_id: "order-1",
    order_type: "standalone_purchase",
    user_id: "customer-1",
    collection_id: "collection-1",
    collection_name: "Colecao Teste",
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
  };
}

function stageRow() {
  return {
    id: "stage-1",
    production_queue_id: "prod-123",
    stage_name: "printing",
    stage_order: 1,
    status: "in_progress",
    assigned_to: currentAssignee,
    assigned_to_name: currentAssigneeName,
    assigned_at: currentAssignee ? "2026-03-01T10:00:00Z" : null,
    created_at: "2026-03-01T09:00:00Z",
  };
}

function installHydrationMocks() {
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    if (table === "production_queue") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: queueRow(), error: null }),
          }),
        }),
      } as never;
    }

    if (table === "profiles") {
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: "customer-1", full_name: "Cliente Teste", email: "cliente@example.com" }],
            error: null,
          }),
        }),
      } as never;
    }

    if (table === "production_stages") {
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [stageRow()], error: null }),
          }),
        }),
      } as never;
    }

    throw new Error(`Unexpected table in test: ${table}`);
  }) as never);
}

describe("Production Assignment Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentAssignee = null;
    currentAssigneeName = null;
    installHydrationMocks();

    mutationMocks.assignProductionRpc.mockImplementation(async ({ userId }: { userId: string }) => {
      currentAssignee = userId;
      currentAssigneeName = "Joao Silva";
    });
  });

  it("assigns production through the centralized admin RPC", async () => {
    const result = await assignProduction("prod-123", "user-456");

    expect(result.assignedTo).toBe("user-456");
    expect(result.assignedToName).toBe("Joao Silva");
    expect(mutationMocks.assignProductionRpc).toHaveBeenCalledWith({
      queueId: "prod-123",
      userId: "user-456",
      reason: undefined,
    });
  });

  it("passes reassignment reason to the admin RPC", async () => {
    currentAssignee = "user-old";
    currentAssigneeName = "Maria Santos";

    await assignProduction("prod-123", "user-456", "Balanceamento de carga");

    expect(mutationMocks.assignProductionRpc).toHaveBeenCalledWith({
      queueId: "prod-123",
      userId: "user-456",
      reason: "Balanceamento de carga",
    });
  });

  it("throws when assignment RPC fails", async () => {
    mutationMocks.assignProductionRpc.mockRejectedValueOnce(new Error("Update failed"));

    await expect(assignProduction("prod-123", "user-456")).rejects.toThrow("Update failed");
  });

  it("continues when assignment notification fails", async () => {
    notificationMocks.sendAssignmentNotification.mockRejectedValueOnce(new Error("Notification failed"));

    await expect(assignProduction("prod-123", "user-456")).resolves.toBeDefined();
    expect(productionNotificationService.sendAssignmentNotification).toHaveBeenCalledWith(
      "prod-123",
      "user-456",
      false,
    );
    expect(log.error).toHaveBeenCalled();
  });
});
