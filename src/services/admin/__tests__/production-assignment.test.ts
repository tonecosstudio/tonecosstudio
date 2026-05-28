import { describe, it, expect, beforeEach, vi } from "vitest";
import { assignProduction } from "../production-service";
import { supabase } from "@/integrations/supabase/client";
import { ProductionNotificationService } from "@/services/notifications/production-notification-service";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock("@/services/notifications/production-notification-service", () => ({
  ProductionNotificationService: vi.fn().mockImplementation(() => ({
    sendAssignmentNotification: vi.fn().mockResolvedValue(undefined),
  })),
}));

function productionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "prod-123",
    order_id: "order-1",
    order_type: "standalone",
    customer_id: "customer-1",
    user_id: "customer-1",
    customer_name: "Cliente Teste",
    customer_email: "cliente@example.com",
    collection_id: "collection-1",
    collection_name: "Colecao Teste",
    character_id: null,
    character_name: null,
    production_status: "in_production",
    current_stage: "modeling",
    choice_status: "completed",
    choice_deadline: null,
    choice_made_at: null,
    priority: "normal",
    priority_score: 0,
    scheduled_production_date: null,
    estimated_completion_date: null,
    assigned_to: "user-456",
    assigned_to_name: "Joao Silva",
    assigned_at: "2026-03-01T10:00:00Z",
    production_started_at: null,
    production_completed_at: null,
    production_notes: null,
    customer_notes: null,
    internal_flags: [],
    created_at: "2026-03-01T09:00:00Z",
    updated_at: "2026-03-01T10:00:00Z",
    ...overrides,
  };
}

function mockCurrentAssignment(current: Record<string, unknown> | null) {
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: current, error: null }),
      }),
    }),
  } as any);
}

describe("Production Assignment Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentAssignment({ assigned_to: null, assigned_to_name: null });
    vi.mocked(supabase.rpc).mockResolvedValue({ data: productionRow(), error: null } as any);
  });

  it("assigns production through the centralized admin RPC", async () => {
    const result = await assignProduction("prod-123", "user-456");

    expect(result.assignedTo).toBe("user-456");
    expect(result.assignedToName).toBe("Joao Silva");
    expect(supabase.rpc).toHaveBeenCalledWith("admin_assign_production", {
      p_queue_id: "prod-123",
      p_user_id: "user-456",
      p_reason: null,
    });
  });

  it("passes reassignment reason to the admin RPC", async () => {
    mockCurrentAssignment({ assigned_to: "user-old", assigned_to_name: "Maria Santos" });

    await assignProduction("prod-123", "user-456", "Balanceamento de carga");

    expect(supabase.rpc).toHaveBeenCalledWith("admin_assign_production", {
      p_queue_id: "prod-123",
      p_user_id: "user-456",
      p_reason: "Balanceamento de carga",
    });
  });

  it("throws when assignment RPC fails", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: "Update failed" },
    } as any);

    await expect(assignProduction("prod-123", "user-456")).rejects.toThrow("Update failed");
  });

  it("continues when assignment notification fails", async () => {
    vi.mocked(ProductionNotificationService).mockImplementationOnce(
      () =>
        ({
          sendAssignmentNotification: vi.fn().mockRejectedValue(new Error("Notification failed")),
        }) as any
    );

    await expect(assignProduction("prod-123", "user-456")).resolves.toBeDefined();
  });
});
