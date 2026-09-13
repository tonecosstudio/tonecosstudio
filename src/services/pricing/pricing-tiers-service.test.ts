import { beforeEach, describe, expect, it, vi } from "vitest";
import { callAuthenticatedEdgeFunction } from "@/services/supabase/edge-function-client";
import { createPricingTier, propagateTierPricing } from "./pricing-tiers-service";

const rpcMock = vi.hoisted(() => vi.fn());
const requireAuthenticatedUserIdMock = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    rpc: rpcMock,
  },
}));

vi.mock("@/services/auth/current-user", () => ({
  requireAuthenticatedUserId: requireAuthenticatedUserIdMock,
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
    callEdgeFunction.mockResolvedValue(validResponse);
    requireAuthenticatedUserIdMock.mockResolvedValue(
      "123e4567-e89b-42d3-a456-426614174001",
    );
  });

  describe("createPricingTier", () => {
    const createInput = {
      name: "Premium",
      price_full: 500,
      deposit_amount: 100,
    };

    it("returns a valid UUID from the RPC", async () => {
      rpcMock.mockResolvedValue({ data: validTierId, error: null });

      await expect(createPricingTier(createInput)).resolves.toBe(validTierId);
    });

    it.each([null, undefined, "", "not-a-uuid", {}, []])(
      "rejects a malformed created tier id: %j",
      async (data) => {
        rpcMock.mockResolvedValue({ data, error: null });

        await expect(createPricingTier(createInput)).rejects.toThrow(
          "Resposta invalida ao criar nivel",
        );
      },
    );

    it("preserves RPC errors", async () => {
      rpcMock.mockResolvedValue({
        data: null,
        error: { message: "permission denied" },
      });

      await expect(createPricingTier(createInput)).rejects.toThrow(
        "Erro ao criar nivel: permission denied",
      );
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
