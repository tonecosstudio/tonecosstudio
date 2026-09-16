import { beforeEach, describe, expect, it, vi } from "vitest";
import { callAuthenticatedEdgeFunction } from "@/services/supabase/edge-function-client";
import { createPricingTier, deactivatePricingTier, propagateTierPricing, updatePricingTier } from "./pricing-tiers-service";

const savePricingTierPlanRpcMock = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("@/services/admin/config/admin-config-mutations-service", () => ({
  savePricingTierPlanRpc: savePricingTierPlanRpcMock,
}));

vi.mock("@/services/supabase/edge-function-client", () => ({
  callAuthenticatedEdgeFunction: vi.fn(),
}));

const callEdgeFunction = vi.mocked(callAuthenticatedEdgeFunction);
const validTierId = "123e4567-e89b-42d3-a456-426614174000";

const validResponse = {
  ok: true as const,
  updated_count: 1,
  failed_count: 1,
  results: [
    {
      collection_id: "collection-1",
      old_price: 100,
      new_price: 120,
      success: true,
    },
    {
      collection_id: "collection-2",
      old_price: 80,
      new_price: 90,
      success: false,
      error_message: "Collection update failed",
    },
  ],
};

describe("pricing-tiers-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savePricingTierPlanRpcMock.mockResolvedValue(undefined);
    callEdgeFunction.mockResolvedValue(validResponse);
  });

  describe("pricing tier mutations", () => {
    it("routes tier creation through the canonical admin gateway", async () => {
      await expect(
        createPricingTier({
          name: "Premium",
          description: "Tier premium",
          price_full: 500,
          deposit_amount: 0,
          pix_discount_percentage: 5,
          is_default: true,
        }),
      ).resolves.toBeUndefined();

      expect(savePricingTierPlanRpcMock).toHaveBeenCalledWith({
        data: {
          name: "Premium",
          description: "Tier premium",
          price_full: 500,
          deposit_amount: 0,
          pix_discount_percentage: 5,
          is_default: true,
        },
      });
    });

    it("routes updates and deactivation through the same gateway", async () => {
      await expect(
        updatePricingTier({
          tierId: validTierId,
          input: { price_full: 550, deposit_amount: 50 },
        }),
      ).resolves.toBe(validTierId);

      expect(savePricingTierPlanRpcMock).toHaveBeenCalledWith({
        id: validTierId,
        data: {
          name: undefined,
          description: undefined,
          price_full: 550,
          deposit_amount: 50,
          pix_discount_percentage: undefined,
          is_active: undefined,
          is_default: undefined,
          display_order: undefined,
        },
      });

      await expect(deactivatePricingTier(validTierId)).resolves.toBe(validTierId);
      expect(savePricingTierPlanRpcMock).toHaveBeenLastCalledWith({
        id: validTierId,
        data: { is_active: false },
      });
    });

    it("preserves gateway errors", async () => {
      savePricingTierPlanRpcMock.mockRejectedValueOnce(new Error("Admin operation failed"));

      await expect(
        createPricingTier({
          name: "Premium",
          price_full: 500,
          deposit_amount: 0,
        }),
      ).rejects.toThrow("Admin operation failed");
    });
  });

  describe("propagateTierPricing", () => {
    it("accepts a confirmed and internally consistent propagation response", async () => {
      await expect(propagateTierPricing("tier-1")).resolves.toEqual(validResponse);

      expect(callEdgeFunction).toHaveBeenCalledWith(
        "propagate-tier-pricing",
        { tierId: "tier-1" },
        "Erro ao propagar precos",
      );
    });

    it.each([null, undefined, {}, [], "unexpected"])(
      "fails closed for a malformed propagation payload: %j",
      async (payload) => {
        callEdgeFunction.mockResolvedValueOnce(payload as never);

        await expect(propagateTierPricing("tier-1")).rejects.toThrow(
          "Erro ao propagar precos",
        );
      },
    );

    it("requires the Edge Function to confirm ok=true", async () => {
      callEdgeFunction.mockResolvedValueOnce({
        ...validResponse,
        ok: false,
      } as never);

      await expect(propagateTierPricing("tier-1")).rejects.toThrow(
        "Erro ao propagar precos",
      );
    });

    it("rejects propagation counts that do not match the returned results", async () => {
      callEdgeFunction.mockResolvedValueOnce({
        ...validResponse,
        updated_count: 2,
        failed_count: 0,
      } as never);

      await expect(propagateTierPricing("tier-1")).rejects.toThrow(
        "Erro ao propagar precos",
      );
    });

    it("rejects invalid propagation result rows", async () => {
      callEdgeFunction.mockResolvedValueOnce({
        ok: true,
        updated_count: 1,
        failed_count: 0,
        results: [
          {
            collection_id: "collection-1",
            old_price: 100,
            new_price: Number.NaN,
            success: true,
          },
        ],
      } as never);

      await expect(propagateTierPricing("tier-1")).rejects.toThrow(
        "Erro ao propagar precos",
      );
    });
  });
});
