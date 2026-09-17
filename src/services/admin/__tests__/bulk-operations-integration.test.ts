import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import {
  bulkAssignProduction,
  bulkUpdateStage,
} from "../operations/bulk-operations-service";

const mutationMocks = vi.hoisted(() => ({
  assignProductionRpc: vi.fn(),
  updateProductionStageRpc: vi.fn(),
}));

const productionServiceMocks = vi.hoisted(() => ({
  fetchProductionQueue: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("@/services/admin/production/admin-production-mutations-service", () => ({
  assignProductionRpc: mutationMocks.assignProductionRpc,
  updateProductionStageRpc: mutationMocks.updateProductionStageRpc,
}));

vi.mock("@/services/admin/production/production-service", () => ({
  fetchProductionQueue: productionServiceMocks.fetchProductionQueue,
}));

function productionItem(
  id: string,
  currentStage: string,
  customerName = `Customer ${id}`,
) {
  return {
    id,
    currentStage,
    customerName,
  };
}

function mockProfile(name = "Team Member") {
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { full_name: name, email: "team@example.com" },
          error: null,
        }),
      }),
    }),
  } as never);
}

function mockProductionQueue(items: Array<Record<string, unknown>>) {
  productionServiceMocks.fetchProductionQueue.mockResolvedValue({
    data: items,
    total: items.length,
    page: 1,
    pageSize: Number.MAX_SAFE_INTEGER,
    totalPages: items.length > 0 ? 1 : 0,
  });
}

describe("Bulk Operations Integration Test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfile();
    mutationMocks.assignProductionRpc.mockResolvedValue(undefined);
    mutationMocks.updateProductionStageRpc.mockResolvedValue(undefined);
    mockProductionQueue([]);
  });

  it("assigns multiple items through the centralized admin mutation authority", async () => {
    const itemIds = ["prod-001", "prod-002", "prod-003"];

    const result = await bulkAssignProduction(itemIds, "team-789");

    expect(result).toEqual({ successful: 3, failed: 0, errors: [] });
    expect(supabase.from).toHaveBeenCalledWith("profiles");
    expect(mutationMocks.assignProductionRpc).toHaveBeenCalledTimes(3);

    for (const itemId of itemIds) {
      expect(mutationMocks.assignProductionRpc).toHaveBeenCalledWith({
        queueId: itemId,
        userId: "team-789",
        reason: "Atribuicao em massa para Team Member",
      });
    }
  });

  it("reports partial assignment failures without aborting the batch", async () => {
    const itemIds = ["prod-001", "prod-002", "prod-003"];
    mutationMocks.assignProductionRpc
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Database constraint violation"))
      .mockResolvedValueOnce(undefined);

    const result = await bulkAssignProduction(itemIds, "team-789");

    expect(result.successful).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.errors).toEqual([
      "Item prod-002: Database constraint violation",
    ]);
  });

  it("updates only items with a valid forward stage transition", async () => {
    mockProductionQueue([
      productionItem("prod-001", "model_preparation", "Customer 1"),
      productionItem("prod-002", "model_preparation", "Customer 2"),
      productionItem("prod-003", "awaiting_choice", "Customer 3"),
    ]);

    const result = await bulkUpdateStage(
      ["prod-001", "prod-002", "prod-003"],
      "printing",
    );

    expect(result.successful).toBe(2);
    expect(result.failed).toBe(1);
    expect(mutationMocks.updateProductionStageRpc).toHaveBeenCalledTimes(2);
    expect(mutationMocks.updateProductionStageRpc).toHaveBeenCalledWith(
      "prod-001",
      "printing",
    );
    expect(mutationMocks.updateProductionStageRpc).toHaveBeenCalledWith(
      "prod-002",
      "printing",
    );
    expect(result.errors[0]).toContain("Customer 3");
    expect(result.errors[0]).toContain("Aguardando Escolha");
    expect(result.errors[0]).toContain("Em Impressão 3D");
  });

  it("reports requested production items that are absent from the hydrated queue", async () => {
    mockProductionQueue([
      productionItem("prod-001", "model_preparation", "Customer 1"),
    ]);

    const result = await bulkUpdateStage(
      ["prod-001", "prod-missing"],
      "printing",
    );

    expect(result.successful).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toContain(
      "Item prod-missing: item de producao nao encontrado",
    );
  });

  it("supports assignment and stage batches running concurrently", async () => {
    const itemIds = ["prod-001", "prod-002"];
    mockProductionQueue([
      productionItem("prod-001", "model_preparation", "Customer 1"),
      productionItem("prod-002", "model_preparation", "Customer 2"),
    ]);

    const [assignment, stageUpdate] = await Promise.all([
      bulkAssignProduction(itemIds, "team-789"),
      bulkUpdateStage(itemIds, "printing"),
    ]);

    expect(assignment).toEqual({ successful: 2, failed: 0, errors: [] });
    expect(stageUpdate).toEqual({ successful: 2, failed: 0, errors: [] });
  });
});
