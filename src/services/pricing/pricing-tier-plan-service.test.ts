import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTierWithPlans, updateTierAndRecalculatePlans } from "./pricing-tier-plan-service";

const rpcMock = vi.hoisted(() => vi.fn());
const requireAuthenticatedUserIdMock = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: rpcMock,
  },
}));

vi.mock("@/services/auth/current-user", () => ({
  requireAuthenticatedUserId: requireAuthenticatedUserIdMock,
}));

const validTierId = "123e4567-e89b-42d3-a456-426614174000";

const createInput = {
  name: "Premium",
  price_full: 500,
  deposit_amount: 100,
};

describe("pricing-tier-plan-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedUserIdMock.mockResolvedValue("123e4567-e89b-42d3-a456-426614174001");
  });

  it("accepts a valid create_tier_with_plans response", async () => {
    rpcMock.mockResolvedValue({
      data: { tier_id: validTierId, plans_created: 4 },
      error: null,
    });

    await expect(createTierWithPlans(createInput)).resolves.toEqual({
      tier_id: validTierId,
      plans_created: 4,
    });
  });

  it.each([
    null,
    undefined,
    {},
    { tier_id: "not-a-uuid", plans_created: 4 },
    { tier_id: validTierId, plans_created: -1 },
    { tier_id: validTierId, plans_created: 1.5 },
    { tier_id: validTierId, plans_created: "4" },
  ])("rejects malformed create results %#", async (data) => {
    rpcMock.mockResolvedValue({ data, error: null });

    await expect(createTierWithPlans(createInput)).rejects.toThrow(
      "Resposta invalida ao criar nivel com planos",
    );
  });

  it("preserves create RPC errors", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });

    await expect(createTierWithPlans(createInput)).rejects.toThrow(
      "Erro ao criar nivel com planos: permission denied",
    );
  });

  it("accepts a valid update_tier_and_recalculate_plans response", async () => {
    rpcMock.mockResolvedValue({
      data: { plans_updated: 4, collections_updated: 12 },
      error: null,
    });

    await expect(
      updateTierAndRecalculatePlans({ tierId: validTierId, priceFull: 550 }),
    ).resolves.toEqual({
      plans_updated: 4,
      collections_updated: 12,
    });
  });

  it.each([
    null,
    undefined,
    {},
    { plans_updated: -1, collections_updated: 2 },
    { plans_updated: 1.5, collections_updated: 2 },
    { plans_updated: 2, collections_updated: -1 },
    { plans_updated: 2, collections_updated: 0.5 },
    { plans_updated: "2", collections_updated: 3 },
  ])("rejects malformed update results %#", async (data) => {
    rpcMock.mockResolvedValue({ data, error: null });

    await expect(updateTierAndRecalculatePlans({ tierId: validTierId })).rejects.toThrow(
      "Resposta invalida ao atualizar nivel e recalcular planos",
    );
  });

  it("preserves update RPC errors", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });

    await expect(updateTierAndRecalculatePlans({ tierId: validTierId })).rejects.toThrow(
      "Erro ao atualizar nivel: permission denied",
    );
  });
});
