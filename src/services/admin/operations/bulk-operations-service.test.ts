/**
 * Tests for Bulk Operations Service
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { bulkAssignProduction, bulkUpdateStage } from "./bulk-operations-service";

const supabaseClient = vi.hoisted(() => ({
  from: vi.fn(),
}));

const productionMutations = vi.hoisted(() => ({
  assignProductionRpc: vi.fn(),
  updateProductionStageRpc: vi.fn(),
}));

const productionService = vi.hoisted(() => ({
  fetchProductionQueue: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: supabaseClient,
}));

vi.mock("@/services/admin/production/admin-production-mutations-service", () => ({
  assignProductionRpc: productionMutations.assignProductionRpc,
  updateProductionStageRpc: productionMutations.updateProductionStageRpc,
}));

vi.mock("@/services/admin/production/production-service", () => ({
  fetchProductionQueue: productionService.fetchProductionQueue,
}));

function mockAssignedUser() {
  supabaseClient.from.mockReturnValue({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: { full_name: "João Silva", email: "joao@example.com" },
          error: null,
        }),
      })),
    })),
  });
}

function mockQueue(
  items: Array<{ id: string; currentStage: string | null; customerName: string }>,
) {
  productionService.fetchProductionQueue.mockResolvedValue({
    data: items,
    total: items.length,
    page: 1,
    pageSize: Number.MAX_SAFE_INTEGER,
  });
}

describe("bulk-operations-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productionMutations.assignProductionRpc.mockResolvedValue(undefined);
    productionMutations.updateProductionStageRpc.mockResolvedValue(undefined);
  });

  describe("bulkAssignProduction", () => {
    it("successfully assigns items to a user", async () => {
      mockAssignedUser();

      const result = await bulkAssignProduction(["item-1", "item-2"], "user-1");

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(productionMutations.assignProductionRpc).toHaveBeenCalledTimes(2);
      expect(productionMutations.assignProductionRpc).toHaveBeenCalledWith({
        queueId: "item-1",
        userId: "user-1",
        reason: expect.stringContaining("Atribuicao em massa para João Silva"),
      });
    });

    it("handles partial failures", async () => {
      mockAssignedUser();
      productionMutations.assignProductionRpc
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Update failed"));

      const result = await bulkAssignProduction(["item-1", "item-2"], "user-1");

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toEqual(["Item item-2: Update failed"]);
    });
  });

  describe("bulkUpdateStage", () => {
    it("successfully updates stages with valid transitions", async () => {
      mockQueue([
        { id: "item-1", currentStage: "design", customerName: "João" },
        { id: "item-2", currentStage: "design", customerName: "Maria" },
      ]);

      const result = await bulkUpdateStage(["item-1", "item-2"], "production");

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(productionMutations.updateProductionStageRpc).toHaveBeenCalledTimes(2);
      expect(productionMutations.updateProductionStageRpc).toHaveBeenCalledWith(
        "item-1",
        "production",
      );
    });

    it("rejects invalid stage transitions", async () => {
      mockQueue([{ id: "item-1", currentStage: "design", customerName: "João" }]);

      const result = await bulkUpdateStage(["item-1"], "shipped");

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain("Não é possível avançar");
      expect(productionMutations.updateProductionStageRpc).not.toHaveBeenCalled();
    });

    it("allows moving forward one stage", async () => {
      mockQueue([{ id: "item-1", currentStage: "production", customerName: "João" }]);

      const result = await bulkUpdateStage(["item-1"], "quality_check");

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(productionMutations.updateProductionStageRpc).toHaveBeenCalledWith(
        "item-1",
        "quality_check",
      );
    });

    it("propagates queue fetch errors", async () => {
      productionService.fetchProductionQueue.mockRejectedValue(new Error("Fetch failed"));

      await expect(bulkUpdateStage(["item-1"], "production")).rejects.toThrow(
        "Fetch failed",
      );
    });
  });
});
