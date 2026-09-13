import { beforeEach, describe, expect, it, vi } from "vitest";
import { updatePurchaseModeMultiplier } from "./purchase-modes-service";

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

describe("updatePurchaseModeMultiplier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedUserIdMock.mockResolvedValue(
      "123e4567-e89b-42d3-a456-426614174001",
    );
  });

  it("accepts a valid recalculation result", async () => {
    rpcMock.mockResolvedValue({
      data: { plans_updated: 12, tiers_affected: 3 },
      error: null,
    });

    await expect(
      updatePurchaseModeMultiplier({ modeKey: "anual", newMultiplier: 0.8 }),
    ).resolves.toEqual({
      plans_updated: 12,
      tiers_affected: 3,
    });
  });

  it.each([
    null,
    undefined,
    {},
    { plans_updated: -1, tiers_affected: 1 },
    { plans_updated: 1.5, tiers_affected: 1 },
    { plans_updated: 1, tiers_affected: -1 },
    { plans_updated: 1, tiers_affected: 0.5 },
    { plans_updated: "1", tiers_affected: 1 },
  ])("rejects malformed recalculation results %#", async (data) => {
    rpcMock.mockResolvedValue({ data, error: null });

    await expect(
      updatePurchaseModeMultiplier({ modeKey: "anual", newMultiplier: 0.8 }),
    ).rejects.toThrow("Resposta invalida ao atualizar multiplicador");
  });

  it("preserves RPC errors", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });

    await expect(
      updatePurchaseModeMultiplier({ modeKey: "anual", newMultiplier: 0.8 }),
    ).rejects.toThrow("Erro ao atualizar multiplicador: permission denied");
  });
});
